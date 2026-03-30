from fastapi import APIRouter, HTTPException
from app.services.icd_client import search_icd11
from app.services.term_extractor import extract_search_term
from app.database import get_db
from datetime import datetime

router = APIRouter(prefix="/mapping", tags=["mapping"])

@router.post("/suggest/{namaste_code}")
async def suggest_mapping(namaste_code: str):
    db = get_db()
    collection = db["namaste_codes"]

    doc = await collection.find_one({"namaste_code": namaste_code}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Code {namaste_code} not found")

    search_term = extract_search_term(doc["term_english"])
    print(f"Searching ICD for: '{search_term}'")

    tm2_results = await search_icd11(search_term, use_tm2=True)
    bio_results = await search_icd11(search_term, use_tm2=False)

    update = {"updated_at": datetime.utcnow()}

    if tm2_results:
        update["tm2_code"] = tm2_results[0]["code"]
        update["tm2_display"] = tm2_results[0]["display"]

    if bio_results:
        update["icd_biomedicine_code"] = bio_results[0]["code"]
        update["icd_biomedicine_display"] = bio_results[0]["display"]
        update["confidence_score"] = round(bio_results[0]["score"], 3)

    if tm2_results and bio_results:
        update["mapping_status"] = "complete"
    elif tm2_results or bio_results:
        update["mapping_status"] = "partial"

    await collection.update_one({"namaste_code": namaste_code}, {"$set": update})

    return {
        "namaste_code": namaste_code,
        "term": doc["term_english"],
        "search_term_used": search_term,
        "tm2_suggestions": tm2_results,
        "biomedicine_suggestions": bio_results,
        "auto_applied": update
    }
