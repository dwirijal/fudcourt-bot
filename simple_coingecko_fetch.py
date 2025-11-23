#!/usr/bin/env python3
"""
Simple CoinGecko Data Fetcher - Windows Compatible
"""

import asyncio
import aiohttp
import pandas as pd
import time
from datetime import datetime
from sqlalchemy import select
import sys

# Add current directory to path for imports
sys.path.append('.')

from database.db import AsyncSessionLocal, upsert_coingecko_data, init_db

async def fetch_coingecko_data():
    """Fetch top 100 cryptocurrencies from CoinGecko"""
    print("Fetching top 100 cryptocurrencies from CoinGecko...")

    url = "https://api.coingecko.com/api/v3/coins/markets"
    params = {
        'vs_currency': 'usd',
        'order': 'market_cap_desc',
        'per_page': 100,
        'page': 1,
        'sparkline': 'false',
        'price_change_percentage': '24h,7d,30d'
    }

    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"SUCCESS: Fetched {len(data)} cryptocurrencies")
                    return data
                else:
                    print(f"ERROR: HTTP {response.status}")
                    return None
        except Exception as e:
            print(f"ERROR: {e}")
            return None

def process_data(raw_data):
    """Process CoinGecko data"""
    if not raw_data:
        return []

    processed = []
    current_time = int(time.time() * 1000)

    for coin in raw_data:
        try:
            processed_coin = {
                'coin_id': coin.get('id', ''),
                'symbol': coin.get('symbol', '').upper(),
                'name': coin.get('name', ''),
                'current_price': coin.get('current_price', 0),
                'market_cap': coin.get('market_cap', 0),
                'market_cap_rank': coin.get('market_cap_rank', 0),
                'fully_diluted_valuation': coin.get('fully_diluted_valuation', 0),
                'total_volume': coin.get('total_volume', 0),
                'high_24h': coin.get('high_24h', 0),
                'low_24h': coin.get('low_24h', 0),
                'price_change_24h': coin.get('price_change_24h', 0),
                'price_change_percentage_24h': coin.get('price_change_percentage_24h', 0),
                'price_change_percentage_7d': coin.get('price_change_percentage_7d', 0),
                'price_change_percentage_30d': coin.get('price_change_percentage_30d', 0),
                'circulating_supply': coin.get('circulating_supply', 0),
                'total_supply': coin.get('total_supply', 0),
                'max_supply': coin.get('max_supply', 0),
                'ath': coin.get('ath', 0),
                'ath_change_percentage': coin.get('ath_change_percentage', 0),
                'ath_date': coin.get('ath_date', ''),
                'atl': coin.get('atl', 0),
                'atl_change_percentage': coin.get('atl_change_percentage', 0),
                'atl_date': coin.get('atl_date', ''),
                'last_updated': coin.get('last_updated', ''),
                'timestamp': current_time
            }
            processed.append(processed_coin)
        except Exception as e:
            print(f"WARNING: Error processing {coin.get('id', 'unknown')}: {e}")
            continue

    return processed

async def store_data(data):
    """Store data to database"""
    if not data:
        print("ERROR: No data to store")
        return False

    print(f"Storing {len(data)} coins to database...")

    try:
        async with AsyncSessionLocal() as session:
            await upsert_coingecko_data(session, data)
            print(f"SUCCESS: Stored {len(data)} coins to database")
            return True
    except Exception as e:
        print(f"ERROR: Database error - {e}")
        return False

def print_summary(data):
    """Print data summary"""
    if not data:
        return

    print("\n" + "="*80)
    print("COINGECKO DATA SUMMARY")
    print("="*80)

    df = pd.DataFrame(data)

    print(f"Total Coins: {len(df)}")
    print(f"Total Market Cap: ${df['market_cap'].sum():,.0f}")
    print(f"Total 24h Volume: ${df['total_volume'].sum():,.0f}")

    print(f"\nTop 10 Coins by Market Cap:")
    top_10 = df.nlargest(10, 'market_cap')[['name', 'symbol', 'current_price', 'market_cap', 'price_change_percentage_24h']]
    for idx, row in top_10.iterrows():
        price_change = f"+{row['price_change_percentage_24h']:.2f}%" if row['price_change_percentage_24h'] > 0 else f"{row['price_change_percentage_24h']:.2f}%"
        print(f"{idx+1:2d}. {row['name']:<15} ({row['symbol']:<6}) - ${row['current_price']:>10.2f} | MCap: ${row['market_cap']:>12,.0f} | 24h: {price_change:>8}")

    # Price distribution
    print(f"\nPrice Distribution:")
    under_1 = len(df[df['current_price'] < 1])
    between_1_10 = len(df[(df['current_price'] >= 1) & (df['current_price'] < 10)])
    between_10_100 = len(df[(df['current_price'] >= 10) & (df['current_price'] < 100)])
    over_100 = len(df[df['current_price'] >= 100])

    print(f"  Under $1:     {under_1:3d} coins")
    print(f"  $1 - $10:     {between_1_10:3d} coins")
    print(f"  $10 - $100:   {between_10_100:3d} coins")
    print(f"  Over $100:    {over_100:3d} coins")

    print("="*80)

async def verify_storage():
    """Verify database storage"""
    print("\nVerifying database storage...")

    try:
        from database.models import CoinGeckoData

        async with AsyncSessionLocal() as session:
            stmt = select(CoinGeckoData).order_by(CoinGeckoData.market_cap_rank.asc())
            result = await session.execute(stmt)
            stored_coins = result.scalars().all()

            print(f"SUCCESS: Found {len(stored_coins)} coins in database")

            if stored_coins:
                print(f"\nFirst 5 coins in database:")
                for i, coin in enumerate(stored_coins[:5]):
                    print(f"{i+1}. {coin.name} ({coin.symbol}) - ${coin.current_price:.6f} | Rank: {coin.market_cap_rank}")

            return len(stored_coins) > 0

    except Exception as e:
        print(f"ERROR: Database verification failed - {e}")
        return False

async def main():
    """Main function"""
    print("COINGECKO DATA FETCHER")
    print("="*80)
    print("Fetching 100 cryptocurrencies from CoinGecko API")
    print("="*80)

    # Initialize database
    print("\n[STEP 1] Initializing database...")
    try:
        await init_db()
        print("SUCCESS: Database initialized")
    except Exception as e:
        print(f"ERROR: Database initialization failed - {e}")
        return

    # Fetch data
    print("\n[STEP 2] Fetching from CoinGecko API...")
    raw_data = await fetch_coingecko_data()
    if not raw_data:
        print("ERROR: Failed to fetch data")
        return

    # Process data
    print("\n[STEP 3] Processing data...")
    processed_data = process_data(raw_data)
    if not processed_data:
        print("ERROR: Failed to process data")
        return

    print(f"SUCCESS: Processed {len(processed_data)} coins")

    # Store data
    print("\n[STEP 4] Storing to database...")
    if not await store_data(processed_data):
        print("ERROR: Failed to store data")
        return

    # Print summary
    print("\n[STEP 5] Data summary...")
    print_summary(processed_data)

    # Verify
    print("\n[STEP 6] Verifying storage...")
    if await verify_storage():
        print("SUCCESS: Database verification passed")
    else:
        print("ERROR: Database verification failed")

    print("\n" + "="*80)
    print("COINGECKO DATA FETCH COMPLETED")
    print(f"Stored {len(processed_data)} cryptocurrencies in database")
    print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)

if __name__ == "__main__":
    # Set up event loop for Windows
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    asyncio.run(main())