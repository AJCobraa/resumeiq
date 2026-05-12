"""
Firebase Admin SDK initialization for the ResumeIQ backend.
Provides:
  - db: Firestore client for all database operations
  - verify_token: FastAPI dependency for auth on every route
"""
import os
import firebase_admin
from firebase_admin import credentials, firestore, auth as fb_auth
from fastapi import Header, HTTPException


_cred = credentials.Certificate({
    "type": "service_account",
    "project_id": os.environ["FIREBASE_PROJECT_ID"],
    "private_key": os.environ["FIREBASE_PRIVATE_KEY"].replace("\\n", "\n"),
    "client_email": os.environ["FIREBASE_CLIENT_EMAIL"],
    "token_uri": "https://oauth2.googleapis.com/token",
})

firebase_admin.initialize_app(_cred)
db = firestore.client()


async def verify_token(authorization: str = Header(...)) -> str:
    """
    FastAPI dependency — verifies Firebase ID token.
    Returns the user's uid on success, raises 401 on failure.
    Must be used as Depends(verify_token) on every protected route.
    """
    try:
        token = authorization.replace("Bearer ", "").strip()
        decoded = fb_auth.verify_id_token(token)
        return decoded["uid"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
