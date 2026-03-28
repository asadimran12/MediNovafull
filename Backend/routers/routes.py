from fastapi import APIRouter
from controllers.controller import get_all_data

router=APIRouter(prefix="/users",tags=["users"])

@router.get("/GetAllData")
def download():
    return get_all_data()