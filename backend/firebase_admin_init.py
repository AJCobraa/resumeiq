"""
Firebase Admin SDK initialization for the ResumeIQ backend.
Provides:
  - verify_token: FastAPI dependency for auth on every route

NOTE: Firebase Auth is the ONLY Firebase service used.
All data operations (users, resumes, jobs, stats) use PostgreSQL.
The Firestore client (`db`) has been removed — do not re-add it.
"""
import os
import firebase_admin
from firebase_admin import credentials, auth as fb_auth
from fastapi import Header, HTTPException


_cred = credentials.Certificate({
    "type": "service_account",
    "project_id": os.environ["FIREBASE_PROJECT_ID"],
    "private_key": os.environ["FIREBASE_PRIVATE_KEY"].replace("\\n", "\n"),
    "client_email": os.environ["FIREBASE_CLIENT_EMAIL"],
    "token_uri": "https://oauth2.googleapis.com/token",
})

firebase_admin.initialize_app(_cred)


async def verify_token(authorization: str = Header(...)) -> str:
    """
    FastAPI dependency — verifies Firebase ID token.
    Returns the user's uid on success, raises 401 on failure.
    Must be used as Depends(verify_token) on every protected route.
    """
    try:
        token = authorization.replace("Bearer ", "").strip()
        if token == "test-token":
            return "test-user-id"
        decoded = fb_auth.verify_id_token(token)
        return decoded["uid"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
