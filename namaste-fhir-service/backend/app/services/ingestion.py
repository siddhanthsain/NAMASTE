import pandas as pd
from app.database import get_db
from datetime import datetime
import os

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


async def ingest_xls_files(data_dir: str) -> dict:
    db = get_db()
    collection = db["namaste_codes"]
    await collection.create_index("namaste_code", unique=True)

    total_inserted = 0
    total_skipped = 0
    results = {}

    # Ayurveda
    ayurveda_path = os.path.join(data_dir, "NATIONAL AYURVEDA MORBIDITY CODES.xls")
    if os.path.exists(ayurveda_path):
        df = pd.read_excel(ayurveda_path, engine="xlrd")
        ins, skp = 0, 0
        for _, row in df.iterrows():
            code = str(row.get("NAMC_CODE", "")).strip()
            term = str(row.get("Name English", "")).strip()
            original = str(row.get("NAMC_term", "")).strip()
            if not code or code in ["-", "nan"] or not term or term in ["-", "nan"]:
                skp += 1
                continue
            doc = {
                "namaste_code": f"AYU-{code}",
                "term_english": term,
                "term_original": original,
                "system": "Ayurveda",
                "category": str(row.get("Ontology_branches", "General")).strip(),
                "short_definition": str(row.get("Short_definition", "")).strip(),
                "tm2_code": None, "tm2_display": None,
                "icd_biomedicine_code": None, "icd_biomedicine_display": None,
                "confidence_score": None, "mapping_status": "unmapped",
                "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()
            }
            try:
                await collection.insert_one(doc)
                ins += 1
            except Exception:
                skp += 1
        results["ayurveda"] = {"inserted": ins, "skipped": skp}
        total_inserted += ins
        total_skipped += skp

    # Siddha
    siddha_path = os.path.join(data_dir, "NATIONAL SIDDHA MORBIDITY CODES.xls")
    if os.path.exists(siddha_path):
        df = pd.read_excel(siddha_path, engine="xlrd")
        ins, skp = 0, 0
        for _, row in df.iterrows():
            code = str(row.get("NAMC_CODE", "")).strip()
            term = str(row.get("NAMC_TERM", "")).strip()
            if not code or code in ["-", "nan"] or not term or term in ["-", "nan"]:
                skp += 1
                continue
            doc = {
                "namaste_code": f"SID-{code}",
                "term_english": term,
                "term_original": str(row.get("Tamil_term", "")).strip(),
                "system": "Siddha",
                "category": "General",
                "short_definition": str(row.get("Short_definition", "")).strip(),
                "tm2_code": None, "tm2_display": None,
                "icd_biomedicine_code": None, "icd_biomedicine_display": None,
                "confidence_score": None, "mapping_status": "unmapped",
                "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()
            }
            try:
                await collection.insert_one(doc)
                ins += 1
            except Exception:
                skp += 1
        results["siddha"] = {"inserted": ins, "skipped": skp}
        total_inserted += ins
        total_skipped += skp

    # Unani
    unani_path = os.path.join(data_dir, "NATIONAL UNANI MORBIDITY CODES.xls")
    if os.path.exists(unani_path):
        df = pd.read_excel(unani_path, engine="xlrd")
        ins, skp = 0, 0
        for _, row in df.iterrows():
            code = str(row.get("NUMC_CODE", "")).strip()
            term = str(row.get("NUMC_TERM", "")).strip()
            if not code or code in ["-", "nan"] or not term or term in ["-", "nan"]:
                skp += 1
                continue
            doc = {
                "namaste_code": f"UNA-{code}",
                "term_english": term,
                "term_original": str(row.get("Arabic_term", "")).strip(),
                "system": "Unani",
                "category": "General",
                "short_definition": str(row.get("Short_definition", "")).strip(),
                "tm2_code": None, "tm2_display": None,
                "icd_biomedicine_code": None, "icd_biomedicine_display": None,
                "confidence_score": None, "mapping_status": "unmapped",
                "created_at": datetime.utcnow(), "updated_at": datetime.utcnow()
            }
            try:
                await collection.insert_one(doc)
                ins += 1
            except Exception:
                skp += 1
        results["unani"] = {"inserted": ins, "skipped": skp}
        total_inserted += ins
        total_skipped += skp

    return {
        "total_inserted": total_inserted,
        "total_skipped": total_skipped,
        "breakdown": results
    }
