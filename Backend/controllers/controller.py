from db import get_database
from bson import ObjectId

def get_all_data():
    client, db = get_database()
    data = db.collection.find_one()
    if data and "_id" in data:
        data["_id"] = str(data["_id"])  # Convert ObjectId → string so FastAPI can serialize it
    return data  # Return dict, NOT json.dumps() — FastAPI handles JSON encoding itself