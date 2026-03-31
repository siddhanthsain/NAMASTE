from fastapi import APIRouter
from app.database import get_db

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("/")
async def get_stats():
    db = get_db()
    collection = db["namaste_codes"]

    total = await collection.count_documents({})
    complete = await collection.count_documents({"mapping_status": "complete"})
    partial = await collection.count_documents({"mapping_status": "partial"})
    unmapped = await collection.count_documents({"mapping_status": "unmapped"})
    no_match = await collection.count_documents({"mapping_status": "no_match"})

    by_system = {}
    for system in ["Ayurveda", "Siddha", "Unani"]:
        by_system[system] = {
            "total": await collection.count_documents({"system": system}),
            "mapped": await collection.count_documents({"system": system, "mapping_status": {"$in": ["complete", "partial"]}}),
            "no_match": await collection.count_documents({"system": system, "mapping_status": "no_match"})
        }

    return {
        "total": total,
        "mapping_status": {
            "complete": complete,
            "partial": partial,
            "no_match": no_match,
            "unmapped": unmapped,
            "auto_mapped_total": complete + partial,
            "auto_mapped_pct": round((complete + partial) / total * 100, 1)
        },
        "by_system": by_system
    }
