from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import connect_db, close_db
from app.routes.ingestion import router as ingestion_router
from app.routes.namaste import router as namaste_router
from app.routes.mapping import router as mapping_router
from app.routes.fhir import router as fhir_router
from app.routes.stats import router as stats_router
from app.routes.auth import router as auth_router
from app.routes.validation import router as validation_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    yield
    await close_db()

app = FastAPI(
    title="NAMASTE FHIR Terminology Service",
    description="NAMASTE to ICD-11 TM2 to Biomedicine mapping microservice",
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingestion_router)
app.include_router(namaste_router)
app.include_router(mapping_router)
app.include_router(fhir_router)
app.include_router(stats_router)
app.include_router(auth_router)
app.include_router(validation_router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "namaste-fhir"}
