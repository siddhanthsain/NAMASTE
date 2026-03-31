import httpx
from app.config import settings
import time

_token_cache = {"token": None, "expires_at": 0}

async def get_icd_token() -> str:
    if _token_cache["token"] and time.time() < _token_cache["expires_at"]:
        return _token_cache["token"]

    async with httpx.AsyncClient() as client:
        response = await client.post(
            settings.WHO_ICD_TOKEN_URL,
            data={
                "client_id": settings.WHO_CLIENT_ID,
                "client_secret": settings.WHO_CLIENT_SECRET,
                "scope": "icdapi_access",
                "grant_type": "client_credentials"
            }
        )
        data = response.json()
        _token_cache["token"] = data["access_token"]
        _token_cache["expires_at"] = time.time() + data["expires_in"] - 60
        return _token_cache["token"]

async def search_icd11(query: str, use_tm2: bool = False) -> list:
    try:
        token = await get_icd_token()
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "Accept-Language": "en",
            "API-Version": "v2"
        }

        # Use 2025 release for TM2 (TM2 was added Feb 2025)
        release = "2025-01" if use_tm2 else "2024-01"
        params = {"q": query, "flatResults": "true", "highlightingEnabled": "false"}
        if use_tm2:
            params["chapterFilter"] = "26"

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"https://id.who.int/icd/release/11/{release}/mms/search",
                headers=headers,
                params=params
            )

        if response.status_code != 200:
            return []

        data = response.json()
        results = []
        for entity in data.get("destinationEntities", [])[:5]:
            results.append({
                "code": entity.get("theCode", ""),
                "display": entity.get("title", ""),
                "score": entity.get("score", 0.0),
                "chapter": entity.get("chapter", "")
            })
        return results

    except Exception as e:
        print(f"ICD API error: {e}")
        return []
