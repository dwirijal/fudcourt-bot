import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.sqlite import insert
from database.models import Base, OHLCV

DATABASE_URL = "sqlite+aiosqlite:///./database/antigravity.db"

engine = create_async_engine(DATABASE_URL, echo=False)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def upsert_candles(session: AsyncSession, candles_data: list):
    if not candles_data:
        return

    stmt = insert(OHLCV).values(candles_data)
    stmt = stmt.on_conflict_do_update(
        index_elements=['symbol', 'timeframe', 'timestamp'],
        set_={
            'open': stmt.excluded.open,
            'high': stmt.excluded.high,
            'low': stmt.excluded.low,
            'close': stmt.excluded.close,
            'volume': stmt.excluded.volume,
        }
    )
    await session.execute(stmt)
    await session.commit()

async def upsert_coingecko_data(session: AsyncSession, coingecko_data: list):
    if not coingecko_data:
        return

    from database.models import CoinGeckoData

    stmt = insert(CoinGeckoData).values(coingecko_data)
    stmt = stmt.on_conflict_do_update(
        index_elements=['coin_id'],
        set_={
            'symbol': stmt.excluded.symbol,
            'name': stmt.excluded.name,
            'current_price': stmt.excluded.current_price,
            'market_cap': stmt.excluded.market_cap,
            'market_cap_rank': stmt.excluded.market_cap_rank,
            'fully_diluted_valuation': stmt.excluded.fully_diluted_valuation,
            'total_volume': stmt.excluded.total_volume,
            'high_24h': stmt.excluded.high_24h,
            'low_24h': stmt.excluded.low_24h,
            'price_change_24h': stmt.excluded.price_change_24h,
            'price_change_percentage_24h': stmt.excluded.price_change_percentage_24h,
            'price_change_percentage_7d': stmt.excluded.price_change_percentage_7d,
            'price_change_percentage_30d': stmt.excluded.price_change_percentage_30d,
            'circulating_supply': stmt.excluded.circulating_supply,
            'total_supply': stmt.excluded.total_supply,
            'max_supply': stmt.excluded.max_supply,
            'ath': stmt.excluded.ath,
            'ath_change_percentage': stmt.excluded.ath_change_percentage,
            'ath_date': stmt.excluded.ath_date,
            'atl': stmt.excluded.atl,
            'atl_change_percentage': stmt.excluded.atl_change_percentage,
            'atl_date': stmt.excluded.atl_date,
            'last_updated': stmt.excluded.last_updated,
            'timestamp': stmt.excluded.timestamp,
        }
    )
    await session.execute(stmt)
    await session.commit()
