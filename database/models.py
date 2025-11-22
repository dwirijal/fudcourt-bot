from sqlalchemy import Column, Integer, String, Float, PrimaryKeyConstraint
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
