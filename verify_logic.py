import asyncio
import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from utils.data_fetcher import fetch_cex_data, fetch_dex_data
from utils.indicators import calculate_indicators, generate_setup
from database.db import init_db

async def test_cex():
    print("Testing CEX Data Fetching...")
    await init_db()
    # Use a small timeframe/symbol to avoid long wait
    # Note: This might take a while if it fetches 5000 candles
    # Let's try to fetch, but maybe interrupt if it takes too long? 
    # No, let's just let it run.
    df = await fetch_cex_data("ETH/USDT", "1h")
    print(f"Fetched {len(df)} candles for ETH/USDT 1h")
    
    if not df.empty:
        print("Calculating indicators...")
        df = calculate_indicators(df)
        setup = generate_setup(df)
        print(f"Setup: {setup}")
        
        from utils.indicators import get_support_resistance
        supports, resistances = get_support_resistance(df)
        print(f"Supports: {supports}")
        print(f"Resistances: {resistances}")
        
        from utils.charting import generate_chart
        print("Generating chart...")
        try:
            buf = generate_chart(df, "ETH/USDT", "1h")
            print(f"Chart generated successfully, size: {buf.getbuffer().nbytes} bytes")
        except Exception as e:
            print(f"Chart generation failed: {e}")
            
        print("Last 5 rows:")
        print(df.tail())

async def test_dex():
    print("\nTesting DEX Data Fetching...")
    # Test with a known token
    data = await fetch_dex_data("WIF")
    if data:
        print(f"Found pair: {data.get('baseToken', {}).get('symbol')} / {data.get('quoteToken', {}).get('symbol')}")
        print(f"Price: {data.get('priceUsd')}")
    else:
        print("No DEX data found")

async def main():
    await test_cex()
    await test_dex()

if __name__ == "__main__":
    asyncio.run(main())
