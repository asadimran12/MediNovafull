from fastapi import APIRouter, HTTPException
from controllers.controller import get_all_data

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/GetAllData")
def download(username: str):
    data = get_all_data(username)
    if data is None:
        raise HTTPException(status_code=404, detail=f"No backup found for user '{username}'")
    return data