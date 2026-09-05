#!/usr/bin/env python3
import requests
import bitcoin_explorer_starter as btc

def get_mempool_status():
    print("\n=== BONUS 2: Current Mempool & Fees ===")
    # The instructions specify fetching from mempool.space for the bonus
    MEMPOOL_API = "https://mempool.space/api"
    
    # Get mempool tx count
    try:
        r_mempool = requests.get(MEMPOOL_API + "/mempool", timeout=10)
        r_mempool.raise_for_status()
        mempool = r_mempool.json()
        print(f"Transactions waiting in mempool: {mempool['count']:,}")
    except Exception as e:
        print(f"Failed to fetch mempool status: {e}")
    
    # Get recommended fees
    try:
        r_fees = requests.get(MEMPOOL_API + "/v1/fees/recommended", timeout=10)
        r_fees.raise_for_status()
        fees = r_fees.json()
        print("Current Recommended Fees (sat/vB):")
        print(f"  - High Priority (Fastest): {fees['fastestFee']}")
        print(f"  - Medium Priority (Half Hour): {fees['halfHourFee']}")
        print(f"  - Low Priority (1 Hour): {fees['hourFee']}")
        print(f"  - Minimum: {fees['minimumFee']}")
    except Exception as e:
        print(f"Failed to fetch fee recommendations: {e}")

def run_yesterdays_block():
    print("\n=== BONUS 1: Testing Yesterday's Block ===")
    
    # Force the main script to go online to fetch real-time data
    btc.OFFLINE = False
    
    # Get current tip to find yesterday's block
    tip = int(btc.get("/blocks/tip/height", as_json=False))
    
    # About 144 blocks are mined per day, so tip - 144 is yesterday's tip
    yesterday_tip = tip - 144
    
    print(f"Current tip is {tip:,}. Fetching data for yesterday's block #{yesterday_tip:,} online...")
    
    # Override the PINNED_HEIGHT in the starter module
    btc.PINNED_HEIGHT = yesterday_tip
    
    # Run the 3 tasks
    blk_hash, blk = btc.task1()
    txids = btc.task2(blk_hash)
    btc.task3(blk_hash, txids, blk)
    
    print("\nAll checks passed successfully for the newly fetched block!")

if __name__ == "__main__":
    get_mempool_status()
    run_yesterdays_block()
