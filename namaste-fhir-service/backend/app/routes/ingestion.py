from fastapi import APIRouter, HTTPException
from app.services.ingestion import ingest_namaste_csv
import os

router = APIRouter(prefix="/admin", tags=["admin"])

@router.post("/ingest")
async def ingest(filepath: str = "/app/data/namaste_sample.csv"):
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"File not found: {filepath}")
    result = await ingest_namaste_csv(filepath)
    return {"message": "Ingestion complete", "result": result}
