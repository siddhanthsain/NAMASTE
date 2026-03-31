from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import get_db
from datetime import datetime, timedelta
from jose import jwt, JWTError
import hashlib
import os

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()

SECRET_KEY = os.getenv("JWT_SECRET", "namaste-fhir-secret-2025")
ALGORITHM = "HS256"

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(email: str) -> str:
    expire = datetime.utcnow() + timedelta(days=7)
    return jwt.encode({"sub": email, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_expert(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token")
        db = get_db()
        expert = await db["experts"].find_one({"email": email, "is_active": True}, {"_id": 0})
        if not expert:
            raise HTTPException(status_code=401, detail="Expert not found")
        return expert
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@router.post("/register")
async def register(email: str, name: str, credentials: str, invite_code: str, password: str):
    db = get_db()
    invite = await db["invites"].find_one({"code": invite_code, "used": False})
    if not invite:
        raise HTTPException(status_code=403, detail="Invalid or used invite code")
    existing = await db["experts"].find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    expert = {
        "email": email,
        "name": name,
        "credentials": credentials,
        "specialization": "Ayurveda",
        "password_hash": hash_password(password),
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    await db["experts"].insert_one(expert)
    await db["invites"].update_one({"code": invite_code}, {"$set": {"used": True, "used_by": email}})
    token = create_token(email)
    return {"token": token, "expert": {k: v for k, v in expert.items() if k != "password_hash" and k != "_id"}}

@router.post("/login")
async def login(email: str, password: str):
    db = get_db()
    expert = await db["experts"].find_one({"email": email})
    if not expert or expert["password_hash"] != hash_password(password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not expert.get("is_active"):
        raise HTTPException(status_code=403, detail="Account inactive")
    token = create_token(email)
    return {"token": token, "name": expert["name"], "email": expert["email"]}

@router.post("/create-invite")
async def create_invite(admin_key: str, expert_name: str):
    if admin_key != os.getenv("ADMIN_KEY", "namaste-admin-2025"):
        raise HTTPException(status_code=403, detail="Invalid admin key")
    db = get_db()
    import secrets
    code = secrets.token_urlsafe(16)
    await db["invites"].insert_one({
        "code": code,
        "for_name": expert_name,
        "used": False,
        "created_at": datetime.utcnow()
    })
    return {"invite_code": code, "for": expert_name}

@router.get("/me")
async def me(expert=Depends(get_current_expert)):
    return expert
