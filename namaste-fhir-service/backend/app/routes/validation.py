from fastapi import APIRouter, Depends
from app.database import get_db
from app.routes.auth import get_current_expert
from datetime import datetime
from typing import Optional
import random

router = APIRouter(prefix="/validation", tags=["validation"])

@router.get("/queue")
async def get_queue(limit: int = 50, system: Optional[str] = None, expert=Depends(get_current_expert)):
    db = get_db()
    collection = db["namaste_codes"]

    validated = await db["validations"].distinct("namaste_code", {"expert_email": expert["email"]})
    
    results = []
    systems = [system] if system else ["Ayurveda", "Siddha", "Unani"]
    per_system = max(1, limit // len(systems))

    for sys in systems:
        query = {"mapping_status": "no_match", "system": sys}
        if validated:
            query["namaste_code"] = {"$nin": validated}
        cursor = collection.find(query, {"_id": 0}).limit(per_system)
        docs = await cursor.to_list(length=per_system)
        results.extend(docs)

    random.shuffle(results)

    total_queue = await collection.count_documents({"mapping_status": "no_match"})
    expert_done = await db["validations"].count_documents({"expert_email": expert["email"]})

    return {
        "codes": results[:limit],
        "total_queue": total_queue,
        "your_contributions": expert_done
    }

@router.post("/decide/{namaste_code}")
async def decide(
    namaste_code: str,
    decision: str,
    tm2_code: Optional[str] = None,
    tm2_display: Optional[str] = None,
    icd_biomedicine_code: Optional[str] = None,
    icd_biomedicine_display: Optional[str] = None,
    notes: Optional[str] = None,
    expert=Depends(get_current_expert)
):
    db = get_db()
    collection = db["namaste_codes"]

    validation = {
        "namaste_code": namaste_code,
        "expert_email": expert["email"],
        "expert_name": expert["name"],
        "decision": decision,
        "tm2_code": tm2_code,
        "tm2_display": tm2_display,
        "icd_biomedicine_code": icd_biomedicine_code,
        "icd_biomedicine_display": icd_biomedicine_display,
        "notes": notes,
        "created_at": datetime.utcnow()
    }
    await db["validations"].insert_one(validation)

    if decision in ["approved", "edited"] and (tm2_code or icd_biomedicine_code):
        update = {
            "mapping_status": "complete" if (tm2_code and icd_biomedicine_code) else "partial",
            "updated_at": datetime.utcnow(),
            "validated_by": expert["email"]
        }
        if tm2_code:
            update["tm2_code"] = tm2_code
            update["tm2_display"] = tm2_display
        if icd_biomedicine_code:
            update["icd_biomedicine_code"] = icd_biomedicine_code
            update["icd_biomedicine_display"] = icd_biomedicine_display
        await collection.update_one({"namaste_code": namaste_code}, {"$set": update})

    return {"message": f"Decision '{decision}' recorded", "namaste_code": namaste_code}

@router.get("/leaderboard")
async def leaderboard():
    db = get_db()
    pipeline = [
        {"$group": {"_id": "$expert_email", "name": {"$first": "$expert_name"}, "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    results = await db["validations"].aggregate(pipeline).to_list(length=10)
    return {"leaderboard": [{"expert": r["name"], "contributions": r["count"]} for r in results]}
