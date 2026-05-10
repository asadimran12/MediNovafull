from db import get_database
from bson import ObjectId

def get_all_data(username: str):
    client, db = get_database()
    data = db.collection.find_one({"primary_username": {"$regex": f"^{username}$", "$options": "i"}})
    if data is None:
        return None
    if "_id" in data:
        data["_id"] = str(data["_id"])
    return data


def getAllUsers():
    client, db = get_database()
    data = db.collection.find()
    data = list(data)
    
    if data is None:
        return None
    for item in data:
        if "_id" in item:
            item["_id"] = str(item["_id"])
    return data