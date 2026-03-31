from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import JSONResponse
from app.services.ingestion import ingest_namaste_csv, ingest_xls_files
import os
import traceback

router = APIRouter(prefix="/admin", tags=["admin"])

@router.post("/ingest")
async def ingest(filepath: str = "/app/data/namaste_sample.csv"):
    try:
        if not os.path.exists(filepath):
            return JSONResponse(status_code=404, content={"detail": f"File not found: {filepath}", "files": os.listdir("/app/data") if os.path.exists("/app/data") else []})
        result = await ingest_namaste_csv(filepath)
        return {"message": "Ingestion complete", "result": result}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e), "trace": traceback.format_exc()})

@router.post("/ingest-xls")
async def ingest_xls(background_tasks: BackgroundTasks, data_dir: str = "/app/data"):
    try:
        if not os.path.exists(data_dir):
            return JSONResponse(status_code=404, content={"detail": f"Data dir not found: {data_dir}"})
        files = os.listdir(data_dir)
        xls_files = [f for f in files if f.endswith('.xls')]
        if not xls_files:
            return JSONResponse(status_code=404, content={"detail": "No XLS files found", "files": files})
        background_tasks.add_task(ingest_xls_files, data_dir)
        return {"message": "XLS ingestion started in background", "files_found": xls_files}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e), "trace": traceback.format_exc()})
