from fastapi import APIRouter, HTTPException
from app.services.icd_client import search_icd11
from app.services.term_extractor import extract_search_term
from app.database import get_db
from datetime import datetime
import asyncio

router = APIRouter(prefix="/mapping", tags=["mapping"])

@router.post("/suggest/{namaste_code}")
async def suggest_mapping(namaste_code: str):
    db = get_db()
    collection = db["namaste_codes"]
    doc = await collection.find_one({"namaste_code": namaste_code}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail=f"Code {namaste_code} not found")

    english_term = extract_search_term(doc["term_english"])
    original_term = doc.get("term_original", "").strip()

    # For TM2: use original Sanskrit/Tamil/Arabic term
    # For biomedicine: use English term
    tm2_query = original_term if original_term and original_term not in ["nan", "-", ""] else english_term
    bio_query = english_term

    tm2_results = await search_icd11(tm2_query, use_tm2=True)
    bio_results = await search_icd11(bio_query, use_tm2=False)

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
    else:
        update["mapping_status"] = "no_match"

    await collection.update_one({"namaste_code": namaste_code}, {"$set": update})
    return {
        "namaste_code": namaste_code,
        "term": doc["term_english"],
        "tm2_query": tm2_query,
        "bio_query": bio_query,
        "tm2_suggestions": tm2_results,
        "biomedicine_suggestions": bio_results,
        "auto_applied": update
    }

@router.post("/bulk")
async def bulk_map(batch_size: int = 50, system: str = None, status: str = "unmapped"):
    db = get_db()
    collection = db["namaste_codes"]

    query = {"mapping_status": status}
    if system:
        query["system"] = system

    cursor = collection.find(query, {"_id": 0}).limit(batch_size)
    docs = await cursor.to_list(length=batch_size)

    if not docs:
        return {"message": f"No codes with status '{status}' found", "processed": 0}

    processed = 0
    mapped = 0
    no_match = 0
    failed = 0

    for doc in docs:
        try:
            english_term = extract_search_term(doc["term_english"])
            original_term = doc.get("term_original", "").strip()
            tm2_query = original_term if original_term and original_term not in ["nan", "-", ""] else english_term
            bio_query = english_term

            tm2_results = await search_icd11(tm2_query, use_tm2=True)
            bio_results = await search_icd11(bio_query, use_tm2=False)

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
                mapped += 1
            elif tm2_results or bio_results:
                update["mapping_status"] = "partial"
                mapped += 1
            else:
                update["mapping_status"] = "no_match"
                no_match += 1

            await collection.update_one({"namaste_code": doc["namaste_code"]}, {"$set": update})
            processed += 1
            await asyncio.sleep(0.1)

        except Exception as e:
            failed += 1
            print(f"Error mapping {doc['namaste_code']}: {e}")

    remaining = await collection.count_documents({"mapping_status": status})
    return {
        "processed": processed,
        "mapped": mapped,
        "no_match": no_match,
        "failed": failed,
        "remaining_unmapped": remaining
    }
