from fastapi import APIRouter, HTTPException, Query
from app.database import get_db
from typing import Optional

router = APIRouter(prefix="/namaste", tags=["namaste"])

@router.get("/search")
async def search(
    q: str = Query(..., min_length=2, description="Search term"),
    system: Optional[str] = Query(None, description="Ayurveda / Siddha / Unani")
):
    db = get_db()
    collection = db["namaste_codes"]

    query = {
        "$or": [
            {"term_english": {"$regex": q, "$options": "i"}},
            {"term_original": {"$regex": q, "$options": "i"}},
            {"namaste_code": {"$regex": q, "$options": "i"}}
        ]
    }

    if system:
        query["system"] = system

    cursor = collection.find(query, {"_id": 0}).limit(20)
    results = await cursor.to_list(length=20)

    if not results:
        return {"results": [], "count": 0}

    return {"results": results, "count": len(results)}

@router.get("/code/{namaste_code}")
async def get_by_code(namaste_code: str):
    db = get_db()
    collection = db["namaste_codes"]
    result = await collection.find_one({"namaste_code": namaste_code}, {"_id": 0})
    if not result:
        raise HTTPException(status_code=404, detail=f"Code {namaste_code} not found")
    return result
