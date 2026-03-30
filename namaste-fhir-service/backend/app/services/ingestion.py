import pandas as pd
from app.database import get_db
from datetime import datetime

async def ingest_namaste_csv(filepath: str) -> dict:
    db = get_db()
    collection = db["namaste_codes"]

    await collection.create_index("namaste_code", unique=True)

    df = pd.read_csv(filepath)
    inserted = 0
    skipped = 0

    for _, row in df.iterrows():
        doc = {
            "namaste_code": row["namaste_code"],
            "term_english": row["term_english"],
            "term_original": row["term_original"],
            "system": row["system"],
            "category": row["category"],
            "tm2_code": None,
            "tm2_display": None,
            "icd_biomedicine_code": None,
            "icd_biomedicine_display": None,
            "confidence_score": None,
            "mapping_status": "unmapped",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        try:
            await collection.insert_one(doc)
            inserted += 1
        except Exception:
            skipped += 1

    return {"inserted": inserted, "skipped": skipped, "total": inserted + skipped}
