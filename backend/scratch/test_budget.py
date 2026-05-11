
import asyncio
from unittest.mock import MagicMock, AsyncMock

FIXED_COST = {
    "parse_resume_pdf": 35,
    "embed_resume": 6,
}

async def deduct_coins_batch_test(operations):
    total_cost = 0
    for op in operations:
        if op not in FIXED_COST:
            raise ValueError(f"Unknown operation: {op}")
        total_cost += FIXED_COST[op]
    
    print(f"Total cost calculated: {total_cost}")
    
    coins_balance = 35 # User has 35 coins
    if coins_balance < total_cost:
        print(f"Error: Insufficient coins. Required: {total_cost}, Balance: {coins_balance}")
        return False
    
    coins_balance -= total_cost
    print(f"New balance: {coins_balance}")
    return True

async def main():
    print("Testing with ['parse_resume_pdf', 'embed_resume']")
    await deduct_coins_batch_test(["parse_resume_pdf", "embed_resume"])

if __name__ == "__main__":
    asyncio.run(main())
