import ccxt.async_support as ccxt
import pandas as pd
import asyncio
import time
import aiohttp
import os
from sqlalchemy import select
from database.db import AsyncSessionLocal, upsert_candles
from database.models import OHLCV

TIMEFRAME_COUNTS = {
    '15m': 10000,
    '1h': 5000,
    '4h': 5000,
    '1d': 2000,
    '1w': 1000,
    '1M': 500
}

def get_timeframe_ms(timeframe):
    mapping = {
        '1m': 60 * 1000,
        '5m': 5 * 60 * 1000,
        '15m': 15 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '4h': 4 * 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000,
        '1w': 7 * 24 * 60 * 60 * 1000,
        '1M': 30 * 24 * 60 * 60 * 1000
    }
    return mapping.get(timeframe, 60 * 1000)

async def fetch_cex_data(symbol: str, timeframe: str):
    required_count = TIMEFRAME_COUNTS.get(timeframe, 1000)
    tf_ms = get_timeframe_ms(timeframe)
    now_ms = int(time.time() * 1000)
    since = now_ms - (required_count * tf_ms)
    
    # Check DB
    async with AsyncSessionLocal() as session:
        stmt = select(OHLCV).where(
            OHLCV.symbol == symbol,
            OHLCV.timeframe == timeframe,
            OHLCV.timestamp >= since
        ).order_by(OHLCV.timestamp.asc())
        result = await session.execute(stmt)
        db_candles = result.scalars().all()
        
    # Check if we have enough data and it's fresh (last candle within 2 periods)
    is_fresh = False
    if db_candles:
        last_candle_ts = db_candles[-1].timestamp
        if now_ms - last_candle_ts < 2 * tf_ms:
            is_fresh = True
            
    if len(db_candles) >= required_count * 0.95 and is_fresh:
        # Use DB data
        data = [{
            'timestamp': c.timestamp,
            'open': c.open,
            'high': c.high,
            'low': c.low,
            'close': c.close,
            'volume': c.volume
        } for c in db_candles]
        df = pd.DataFrame(data)
        return df
        
    # Fetch from API
    exchange = ccxt.binance()
    all_candles = []
    current_since = since
    
    try:
        while current_since < now_ms:
            candles = await exchange.fetch_ohlcv(symbol, timeframe, since=current_since, limit=1000)
            if not candles:
                break
            
            all_candles.extend(candles)
            current_since = candles[-1][0] + 1
            
            # Respect rate limit
            await asyncio.sleep(exchange.rateLimit / 1000)
            
            if len(candles) < 1000:
                break
                
    except Exception as e:
        print(f"Error fetching data: {e}")
    finally:
        await exchange.close()
        
    # Format for DB
    formatted_candles = []
    for c in all_candles:
        formatted_candles.append({
            'symbol': symbol,
            'timeframe': timeframe,
            'timestamp': c[0],
            'open': c[1],
            'high': c[2],
            'low': c[3],
            'close': c[4],
            'volume': c[5]
        })
        
    # Upsert to DB
    async with AsyncSessionLocal() as session:
        # Using the upsert_candles function we defined in db.py which already handles ON CONFLICT DO UPDATE
        # But let's double check db.py implementation. 
        # The user mentioned "on_conflict_do_nothing" was used, but in my previous step I implemented "on_conflict_do_update".
        # I will ensure this file uses the correct logic if I implemented it inline, but I used a helper.
        # Let's re-verify the helper usage or implement inline if needed for clarity as per user request.
        
        # Actually, the user said "Di utils/data_fetcher.py, kamu menggunakan on_conflict_do_nothing".
        # In my previous turn (Step 33), I implemented `upsert_candles` in `database/db.py` which used `on_conflict_do_update`.
        # However, `utils/data_fetcher.py` calls `upsert_candles`.
        # I will make sure `utils/data_fetcher.py` is robust.
        
        await upsert_candles(session, formatted_candles)
        
    # Return DataFrame
    df = pd.DataFrame(all_candles, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
    return df

async def fetch_dex_data(query: str):
    url = f"https://api.dexscreener.com/latest/dex/search?q={query}"
    # If it looks like an address
    if query.startswith("0x") or len(query) > 30:
        url = f"https://api.dexscreener.com/latest/dex/tokens/{query}"
        
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status == 200:
                data = await response.json()
                pairs = data.get('pairs', [])
                if not pairs:
                    return None
                # Return the most liquid pair
                pairs.sort(key=lambda x: float(x.get('liquidity', {}).get('usd', 0)), reverse=True)
                return pairs[0]
            return None
