from fastapi import APIRouter
from app.fhir.codesystem import generate_fhir_codesystem, generate_fhir_conceptmap

router = APIRouter(prefix="/fhir", tags=["fhir"])

@router.get("/CodeSystem/namaste")
async def get_codesystem():
    return await generate_fhir_codesystem()

@router.get("/ConceptMap/namaste-to-icd11")
async def get_conceptmap():
    return await generate_fhir_conceptmap()
