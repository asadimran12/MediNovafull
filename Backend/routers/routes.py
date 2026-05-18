from fastapi import APIRouter, HTTPException, File, UploadFile
from controllers.controller import get_all_data , getAllUsers, addPayment

router = APIRouter(prefix="/users", tags=["users"])

from pydantic import BaseModel

class PaymentPayload(BaseModel):
    username: str
    name: str
    price: int
    card_number: str
    exp_month: int
    exp_year: int
    cvc: str





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


# Payment Routes
@router.post("/Addpayment")
def Addpayment(items: PaymentPayload):
    try:
        return addPayment(items)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
