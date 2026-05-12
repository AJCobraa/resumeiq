import os
import asyncio
import sys
from unittest.mock import MagicMock
from dotenv import load_dotenv

load_dotenv()
sys.path.append(os.getcwd())

from routers.stats import get_my_stats

async def test():
    # Real UID from the user
    uid = "W5jcUTNnXCShUoMKQlmbaCj07YA2"
    try:
        result = await get_my_stats(uid)
        print("SUCCESS")
        print(result)
    except Exception as e:
        print(f"FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
