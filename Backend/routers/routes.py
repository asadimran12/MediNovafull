from fastapi import APIRouter, HTTPException, File, UploadFile
from controllers.controller import get_all_data, reportanalyze, report_analyze_image

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/GetAllData")
def download(username: str):
    data = get_all_data(username)
    if data is None:
        raise HTTPException(status_code=404, detail=f"No backup found for user '{username}'")
    return data

@router.get("/GetAllUsers")
def download():
    data = getAllUsers()
    if data is None:
        raise HTTPException(status_code=404, detail=f"No backup found for users")
    return data
