from db import get_database
from bson import ObjectId
import stripe




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
    print("data", data)
    data = list(data)
    
    if data is None:
        return None
    for item in data:
        if "_id" in item:
            item["_id"] = str(item["_id"])
    return data



def addPayment(items):
    payment_method = stripe.PaymentMethod.create(
        type="card",
        card={
            "token": "tok_visa" 
        },
    )


    intent = stripe.PaymentIntent.create(
        amount=items.price * 100,
        currency="usd",
        payment_method=payment_method.id,
        payment_method_types=["card"],
        confirm=True, 
        return_url="https://example.com/success", 
    )

    # 3. Check if the payment succeeded
    if intent.status == "succeeded":
        return {
            "success": True,
            "message": "Payment successful! The dummy card was charged.",
            "transaction_id": intent.id,
            "username": items.username,
            "model_name": items.name
        }
    else:
        return {
            "success": False,
            "message": f"Payment status: {intent.status}"
        }
