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
