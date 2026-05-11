"""
Auth router — handles user authentication and profile management.
Creates user + credit records in PostgreSQL on first login.
Firebase Auth verifies the JWT; all data lives in Postgres.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from firebase_admin_init import verify_token
from core.database import get_db_session
from models.postgres_schema import User, UserCredit
from datetime import datetime, timezone

router = APIRouter(prefix="/api", tags=["auth"])

# Free tier signup bonus
FREE_TIER_COINS = 100


@router.get("/me")
async def get_me(
    uid: str = Depends(verify_token),
    db: AsyncSession = Depends(get_db_session),
):
    """
    Returns user profile from PostgreSQL.
    Creates user + credit record on first login if they don't exist.
    """
    result = await db.execute(select(User).where(User.uid == uid))
    user = result.scalar_one_or_none()

    if user:
        return {
            "userId": user.uid,
            "email": user.email,
            "displayName": user.display_name or "",
            "photoURL": user.photo_url or "",
            "createdAt": user.created_at.isoformat() if user.created_at else "",
            "plan": user.plan_type.value if user.plan_type else "free",
        }

    # First login — create user record
    # Firebase Auth has already verified this user, so we trust the uid
    from firebase_admin import auth as fb_auth
    try:
        firebase_user = fb_auth.get_user(uid)
        email = firebase_user.email or ""
        display_name = firebase_user.display_name or ""
        photo_url = firebase_user.photo_url or ""
    except Exception:
        email = ""
        display_name = ""
        photo_url = ""

    new_user = User(
        uid=uid,
        email=email,
        display_name=display_name,
        photo_url=photo_url,
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_user)

    # Grant free tier coins
    new_credit = UserCredit(
        user_id=uid,
        coins_balance=FREE_TIER_COINS,
    )
    db.add(new_credit)

    await db.commit()

    return {
        "userId": uid,
        "email": email,
        "displayName": display_name,
        "photoURL": photo_url,
        "createdAt": new_user.created_at.isoformat(),
        "plan": "free",
    }
