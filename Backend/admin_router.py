import random
import string
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Any
from db import get_database

router = APIRouter(prefix="/admin", tags=["admin"])

# ─── helpers ──────────────────────────────────────────────────────────────────

def _rand_id(n: int = 5) -> str:
    return "".join(random.choices(string.ascii_lowercase + string.digits, k=n))

def _serialize(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc

def _find_user(db, username: str):
    doc = db.collection.find_one(
        {"primary_username": {"$regex": f"^{username}$", "$options": "i"}}
    )
    if doc is None:
        raise HTTPException(status_code=404, detail=f"User '{username}' not found")
    return _serialize(doc)

# ─── GET /admin/users/list ─────────────────────────────────────────────────────

@router.get("/users/list")
def list_users():
    _, db = get_database()
    raw = list(db.collection.find({}))
    users = []
    total_plans = 0
    total_chats = 0
    users_with_conditions = 0

    for doc in raw:
        doc = _serialize(doc)
        plans_count = len(doc.get("plans") or {})
        chats_count = len(doc.get("chats") or {})
        total_plans += plans_count
        total_chats += chats_count
        conditions = (doc.get("profile") or {}).get("conditions", "")
        if conditions and conditions.strip():
            users_with_conditions += 1
        users.append({
            "primary_username": doc.get("primary_username"),
            "profile": doc.get("profile"),
            "chats": doc.get("chats"),
            "plans": doc.get("plans"),
            "auth": doc.get("auth"),
            "lastSync": doc.get("timestamp"),
        })

    return {
        "users": users,
        "stats": {
            "users": len(users),
            "plans": total_plans,
            "chats": total_chats,
            "conditions": users_with_conditions,
        },
    }

# ─── GET /admin/users/{username} ──────────────────────────────────────────────

@router.get("/users/{username}")
def get_user(username: str):
    _, db = get_database()
    return _find_user(db, username)

# ─── POST /admin/users ────────────────────────────────────────────────────────

class CreateUserBody(BaseModel):
    username: str
    password: str
    age: Optional[str] = None
    gender: Optional[str] = None
    conditions: Optional[str] = None
    severity: Optional[str] = None

@router.post("/users", status_code=201)
def create_user(body: CreateUserBody):
    _, db = get_database()
    existing = db.collection.find_one(
        {"primary_username": {"$regex": f"^{body.username}$", "$options": "i"}}
    )
    if existing:
        raise HTTPException(status_code=409, detail=f"User '{body.username}' already exists")

    doc = {
        "primary_username": body.username,
        "timestamp": None,
        "profile": {
            "age": body.age or "",
            "gender": body.gender or "",
            "conditions": body.conditions or "",
            "severity": body.severity or "",
            "isSet": bool(body.age or body.gender or body.conditions),
        },
        "chats": {},
        "plans": {},
        "auth": [
            {
                "id": _rand_id(5),
                "username": body.username,
                "passwordHash": body.password,
                "createdAt": None,
            }
        ],
    }
    result = db.collection.insert_one(doc)
    return {"message": "User created successfully", "id": str(result.inserted_id)}

# ─── PUT /admin/users/{username}/profile ──────────────────────────────────────

class UpdateProfileBody(BaseModel):
    profile: Any

@router.put("/users/{username}/profile")
def update_profile(username: str, body: UpdateProfileBody):
    _, db = get_database()
    _find_user(db, username)  # ensure exists
    db.collection.update_one(
        {"primary_username": {"$regex": f"^{username}$", "$options": "i"}},
        {"$set": {"profile": body.profile}},
    )
    return {"message": "Profile updated successfully"}

# ─── PUT /admin/users/{username}/password ─────────────────────────────────────

class UpdatePasswordBody(BaseModel):
    password: str

@router.put("/users/{username}/password")
def update_password(username: str, body: UpdatePasswordBody):
    _, db = get_database()
    _find_user(db, username)  # ensure exists
    db.collection.update_one(
        {"primary_username": {"$regex": f"^{username}$", "$options": "i"}},
        {"$set": {"auth.0.passwordHash": body.password}},
    )
    return {"message": "Password updated successfully"}

# ─── DELETE /admin/users/{username} ───────────────────────────────────────────

@router.delete("/users/{username}")
def delete_user(username: str):
    _, db = get_database()
    _find_user(db, username)  # ensure exists
    db.collection.delete_one(
        {"primary_username": {"$regex": f"^{username}$", "$options": "i"}}
    )
    return {"message": f"User '{username}' deleted successfully"}

# ─── DELETE /admin/users/{username}/chats ─────────────────────────────────────

@router.delete("/users/{username}/chats")
def clear_chats(username: str):
    _, db = get_database()
    _find_user(db, username)
    db.collection.update_one(
        {"primary_username": {"$regex": f"^{username}$", "$options": "i"}},
        {"$set": {"chats": {}}},
    )
    return {"message": "Chats cleared"}

# ─── DELETE /admin/users/{username}/plans ─────────────────────────────────────

@router.delete("/users/{username}/plans")
def clear_plans(username: str):
    _, db = get_database()
    _find_user(db, username)
    db.collection.update_one(
        {"primary_username": {"$regex": f"^{username}$", "$options": "i"}},
        {"$set": {"plans": {}}},
    )
    return {"message": "Plans cleared"}

# ─── GET /admin/stats ─────────────────────────────────────────────────────────

@router.get("/stats")
def get_stats():
    _, db = get_database()
    raw = list(db.collection.find({}))
    total_plans = 0
    total_chats = 0
    users_with_conditions = 0
    for doc in raw:
        total_plans += len(doc.get("plans") or {})
        total_chats += len(doc.get("chats") or {})
        c = (doc.get("profile") or {}).get("conditions", "")
        if c and c.strip():
            users_with_conditions += 1
    return {
        "users": len(raw),
        "plans": total_plans,
        "chats": total_chats,
        "conditions": users_with_conditions,
    }
