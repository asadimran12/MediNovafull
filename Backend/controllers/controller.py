from db import get_database
from bson import ObjectId

def get_all_data(username: str):
    client, db = get_database()
    # Search for the backup using the top-level primary_username field
    data = db.collection.find_one({"primary_username": {"$regex": f"^{username}$", "$options": "i"}})
    if data is None:
        return None
    if "_id" in data:
        data["_id"] = str(data["_id"])  # Convert ObjectId → string so FastAPI can serialize it
    return data