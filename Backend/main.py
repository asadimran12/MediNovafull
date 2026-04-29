from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Any, Optional
from db import get_database
from routers.routes import router  # ← Router was missing before!

app = FastAPI()

# ── CORS Middleware ───────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # Change to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ──────────────────────────────────────────────────────────
app.include_router(router)      # ← This was the critical missing line

# ── Request model ─────────────────────────────────────────────────────────────
class UploadPayload(BaseModel):
    primary_username: Optional[str] = None  # Top-level field for fast lookup
    timestamp:        Optional[str] = None
    profile:          Optional[Any] = None
    chats:            Optional[Any] = None
    plans:            Optional[Any] = None
    auth:             Optional[Any] = None

# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/checkDB")
def checkDB():
    try:
        client, db = get_database()
        return {"message": "Database connection successful!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database connection failed: {e}")

@app.post("/upload")
def upload(payload: UploadPayload):
    try:z
        client, db = get_database()
        data = payload.model_dump()

        if payload.primary_username:
            # Upsert: update existing doc for this user or insert new one
            result = db.collection.update_one(
                {"primary_username": {"$regex": f"^{payload.primary_username}$", "$options": "i"}},
                {"$set": data},
                upsert=True,
            )
            updated = result.matched_count > 0
            return {
                "message": "Updated successfully!" if updated else "Upload successful!",
                "updated": updated,
            }
        else:
            # Fallback: plain insert (old clients without primary_username)
            result = db.collection.insert_one(data)
            return {"message": "Upload successful!", "id": str(result.inserted_id), "updated": False}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)