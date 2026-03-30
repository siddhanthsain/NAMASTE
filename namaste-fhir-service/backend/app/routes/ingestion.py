from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from app.services.ingestion import ingest_namaste_csv
import os
import traceback

router = APIRouter(prefix="/admin", tags=["admin"])

@router.post("/ingest")
async def ingest(filepath: str = "/app/data/namaste_sample.csv"):
    try:
        if not os.path.exists(filepath):
            return JSONResponse(status_code=404, content={"detail": f"File not found: {filepath}", "cwd": os.getcwd(), "files": os.listdir("/app")})
        result = await ingest_namaste_csv(filepath)
        return {"message": "Ingestion complete", "result": result}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e), "trace": traceback.format_exc()})
