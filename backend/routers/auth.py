"""
Auth router — handles user authentication and profile management.
"""
from fastapi import APIRouter, Depends
from firebase_admin_init import db, verify_token
from datetime import datetime

router = APIRouter(prefix="/api", tags=["auth"])


@router.get("/me")
async def get_me(uid: str = Depends(verify_token)):
    """
    Returns user document from Firestore.
    Creates user document on first login if it doesn't exist.
    """
    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()

    if user_doc.exists:
        return user_doc.to_dict()

    # First login — create user document
    # Firebase Auth has already verified this user, so we trust the uid
    from firebase_admin import auth as fb_auth
    try:
        firebase_user = fb_auth.get_user(uid)
        user_data = {
            "userId": uid,
            "email": firebase_user.email or "",
            "displayName": firebase_user.display_name or "",
            "photoURL": firebase_user.photo_url or "",
            "createdAt": datetime.utcnow(),
            "plan": "free",
        }
    except Exception:
        user_data = {
            "userId": uid,
            "email": "",
            "displayName": "",
            "photoURL": "",
            "createdAt": datetime.utcnow(),
            "plan": "free",
        }

    user_ref.set(user_data)
    return user_data
