#!/usr/bin/env python3
"""
CoinGecko Data Fetcher
Fetches 100 cryptocurrencies from CoinGecko API and stores them in database
"""

import asyncio
import aiohttp
import pandas as pd
import time
from datetime import datetime
from sqlalchemy import select
from database.db import AsyncSessionLocal, upsert_coingecko_data
import sys

# Add current directory to path for imports
sys.path.append('.')

class CoinGeckoFetcher:
    def __init__(self):
        self.base_url = "https://api.coingecko.com/api/v3"
        self.session = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def fetch_top_100_coins(self):
        """Fetch top 100 cryptocurrencies by market cap from CoinGecko"""
        print("Fetching top 100 cryptocurrencies from CoinGecko...")

        url = f"{self.base_url}/coins/markets"
        params = {
            'vs_currency': 'usd',
            'order': 'market_cap_desc',
            'per_page': 100,
            'page': 1,
            'sparkline': 'false',
            'price_change_percentage': '24h,7d,30d'
        }

        try:
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    print(f"✅ Successfully fetched {len(data)} cryptocurrencies")
                    return data
                else:
                    print(f"❌ Error fetching data: {response.status}")
                    return None
        except Exception as e:
            print(f"❌ Network error: {e}")
            return None

    def process_coingecko_data(self, data):
        """Process CoinGecko API response into structured format"""
        if not data:
            return []

        processed_data = []
        current_timestamp = int(time.time() * 1000)

        for coin in data:
            try:
                # Extract relevant data
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
                    'timestamp': current_timestamp
                }

                processed_data.append(processed_coin)

            except Exception as e:
                print(f"⚠️ Error processing coin {coin.get('id', 'unknown')}: {e}")
                continue

        return processed_data

    async def store_to_database(self, data):
        """Store processed data to database"""
        if not data:
            print("❌ No data to store")
            return False

        print(f"Storing {len(data)} coins to database...")

        try:
            async with AsyncSessionLocal() as session:
                await upsert_coingecko_data(session, data)
                print(f"✅ Successfully stored {len(data)} coins to database")
                return True
        except Exception as e:
            print(f"❌ Database error: {e}")
            return False

async def create_coingecko_model():
    """Create CoinGecko data model if it doesn't exist"""
    try:
        from database.models import CoinGeckoData
        from database.db import init_db

        # Initialize database (this will create the table if it doesn't exist)
        await init_db()
        print("✅ Database initialized successfully")
        return True
    except Exception as e:
        print(f"❌ Error creating database model: {e}")
        return False

def print_summary(data):
    """Print summary of fetched data"""
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

async def verify_database_storage():
    """Verify that data was stored correctly"""
    print("\nVerifying database storage...")

    try:
        from database.models import CoinGeckoData

        async with AsyncSessionLocal() as session:
            stmt = select(CoinGeckoData).order_by(CoinGeckoData.market_cap_rank.desc())
            result = await session.execute(stmt)
            stored_coins = result.scalars().all()

            print(f"✅ Found {len(stored_coins)} coins in database")

            if stored_coins:
                print(f"\nFirst 5 coins in database:")
                for i, coin in enumerate(stored_coins[:5]):
                    print(f"{i+1}. {coin.name} ({coin.symbol}) - ${coin.current_price} | Rank: {coin.market_cap_rank}")

            return len(stored_coins) > 0

    except Exception as e:
        print(f"❌ Error verifying database: {e}")
        return False

async def main():
    """Main function to fetch and store CoinGecko data"""
    print("COINGECKO DATA FETCHER")
    print("="*80)
    print("Fetching 100 cryptocurrencies from CoinGecko API and storing to database")
    print("="*80)

    # Initialize database model
    print("\n[STEP 1] Initializing database...")
    if not await create_coingecko_model():
        print("❌ Failed to initialize database")
        return

    # Fetch data from CoinGecko
    print("\n[STEP 2] Fetching data from CoinGecko API...")
    async with CoinGeckoFetcher() as fetcher:
        raw_data = await fetcher.fetch_top_100_coins()

        if not raw_data:
            print("❌ Failed to fetch data from CoinGecko")
            return

    # Process the data
    print("\n[STEP 3] Processing data...")
    processed_data = fetcher.process_coingecko_data(raw_data)

    if not processed_data:
        print("❌ Failed to process data")
        return

    print(f"✅ Processed {len(processed_data)} coins")

    # Store to database
    print("\n[STEP 4] Storing to database...")
    async with CoinGeckoFetcher() as fetcher:  # Reuse for the store method
        if not await fetcher.store_to_database(processed_data):
            print("❌ Failed to store data to database")
            return

    # Print summary
    print("\n[STEP 5] Data summary...")
    print_summary(processed_data)

    # Verify storage
    print("\n[STEP 6] Verifying database storage...")
    if await verify_database_storage():
        print("✅ Database verification successful")
    else:
        print("❌ Database verification failed")

    print("\n" + "="*80)
    print("✅ COINGECKO DATA FETCH COMPLETED SUCCESSFULLY")
    print(f"📊 {len(processed_data)} cryptocurrencies stored in database")
    print(f"⏰ Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*80)

if __name__ == "__main__":
    # Set up event loop for Windows
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    asyncio.run(main())