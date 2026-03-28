import os
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# Load environment variables from .env file
load_dotenv()

MONGO_URL = os.getenv("MONGO_URL")

# Singleton — created once, reused across all requests
_client = None
_db = None

def get_database():
    """
    Returns the shared MongoDB client and database instance.
    Creates the connection only once (connection pooling).
    """
    global _client, _db

    if _client is not None:
        return _client, _db  # Reuse existing connection

    if not MONGO_URL:
        raise ValueError("MONGO_URL environment variable is not set. Please check your .env file.")

    try:
        _client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=5000)

        # Ping to verify the connection is live
        _client.admin.command('ping')
        print("Successfully connected to MongoDB!")

        _db = _client.get_default_database(default='app_db')
        return _client, _db

    except ConnectionFailure as e:
        print(f"Failed to connect to MongoDB. Error: {e}")
        raise e

if __name__ == "__main__":
    try:
        client, db = get_database()
        print(f"Active databases: {client.list_database_names()}")
    except Exception as e:
        print(f"Database connection check failed: {e}")
