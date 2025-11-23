from sqlalchemy import Column, Integer, String, Float, PrimaryKeyConstraint, DateTime
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class OHLCV(Base):
    __tablename__ = 'ohlcv'

    symbol = Column(String, nullable=False)
    timeframe = Column(String, nullable=False)
    timestamp = Column(Integer, nullable=False)
    open = Column(Float)
    high = Column(Float)
    low = Column(Float)
    close = Column(Float)
    volume = Column(Float)

    __table_args__ = (
        PrimaryKeyConstraint('symbol', 'timeframe', 'timestamp'),
    )

    def __repr__(self):
        return f"<OHLCV(symbol='{self.symbol}', timeframe='{self.timeframe}', timestamp={self.timestamp})>"

class CoinGeckoData(Base):
    __tablename__ = 'coingecko_data'

    coin_id = Column(String, nullable=False, primary_key=True)
    symbol = Column(String, nullable=False)
    name = Column(String, nullable=False)
    current_price = Column(Float)
    market_cap = Column(Float)
    market_cap_rank = Column(Integer)
    fully_diluted_valuation = Column(Float)
    total_volume = Column(Float)
    high_24h = Column(Float)
    low_24h = Column(Float)
    price_change_24h = Column(Float)
    price_change_percentage_24h = Column(Float)
    price_change_percentage_7d = Column(Float)
    price_change_percentage_30d = Column(Float)
    circulating_supply = Column(Float)
    total_supply = Column(Float)
    max_supply = Column(Float)
    ath = Column(Float)
    ath_change_percentage = Column(Float)
    ath_date = Column(String)
    atl = Column(Float)
    atl_change_percentage = Column(Float)
    atl_date = Column(String)
    last_updated = Column(String)
    timestamp = Column(Integer, nullable=False)

    def __repr__(self):
        return f"<CoinGeckoData(coin_id='{self.coin_id}', symbol='{self.symbol}', price=${self.current_price})>"
