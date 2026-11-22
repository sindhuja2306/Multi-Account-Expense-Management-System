from datetime import datetime, timezone
from bson import ObjectId
from fastapi import HTTPException

def now_utc():
    return datetime.now(timezone.utc)

def oid(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail="Invalid ID")
    return ObjectId(value)

def serialize(doc: dict) -> dict:
    result = dict(doc)
    result["id"] = str(result.pop("_id"))
    if "account_id" in result:
        result["account_id"] = str(result["account_id"])
    return result

def rupees(paise: int) -> float:
    return round(paise / 100, 2)
