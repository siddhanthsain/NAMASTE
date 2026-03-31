from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGO_URL: str = "mongodb://localhost:27017"
    DB_NAME: str = "namaste_fhir"
    WHO_ICD_API_BASE: str = "https://id.who.int/icd/release/11/2024-01"
    WHO_ICD_TOKEN_URL: str = "https://icdaccessmanagement.who.int/connect/token"
    WHO_CLIENT_ID: str = ""
    WHO_CLIENT_SECRET: str = ""
    APP_ENV: str = "development"
    JWT_SECRET: str = "namaste-fhir-jwt-2025-secure"
    ADMIN_KEY: str = "namaste-admin-2025"

    class Config:
        env_file = ".env"

settings = Settings()
