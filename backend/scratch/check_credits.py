
import asyncio
import sys
import os

sys.path.append(os.path.join(os.getcwd(), 'backend'))

from core.database import async_session
from models.postgres_schema import UserCredit, CoinTransaction
from sqlalchemy import select, func

async def check():
    uid = 'W5jcUTNnXCShUoMKQlmbaCj07YA2'
    async with async_session() as db:
        res = await db.execute(select(UserCredit).where(UserCredit.user_id == uid))
        credit = res.scalar_one_or_none()
        
        trans_res = await db.execute(select(func.sum(CoinTransaction.coins_charged)).where(CoinTransaction.user_id == uid))
        total_charged = trans_res.scalar() or 0
        
        print(f"UID: {uid}")
        print(f"Current Balance: {credit.coins_balance if credit else 'N/A'}")
        print(f"Total Charged (Transactions): {total_charged}")

if __name__ == "__main__":
    asyncio.run(check())
