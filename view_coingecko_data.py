#!/usr/bin/env python3
"""
View CoinGecko Data from Database
"""

import asyncio
from sqlalchemy import select, func
import pandas as pd
import sys

# Add current directory to path for imports
sys.path.append('.')

from database.db import AsyncSessionLocal
from database.models import CoinGeckoData

async def view_all_coins():
    """View all coins in database"""
    print("\n" + "="*100)
    print("ALL COINS IN DATABASE")
    print("="*100)

    async with AsyncSessionLocal() as session:
        stmt = select(CoinGeckoData).order_by(CoinGeckoData.market_cap_rank.asc())
        result = await session.execute(stmt)
        coins = result.scalars().all()

        print(f"Total coins: {len(coins)}")
        print(f"{'Rank':<5} {'Name':<20} {'Symbol':<8} {'Price':<12} {'24h Change':<12} {'Market Cap':<20} {'Volume'}")
        print("-" * 100)

        for coin in coins:
            price_change = f"{coin.price_change_percentage_24h:+.2f}%" if coin.price_change_percentage_24h else "N/A"
            price_str = f"${coin.current_price:,.8f}" if coin.current_price < 1 else f"${coin.current_price:,.2f}"
            volume_str = f"${coin.total_volume:,.0f}" if coin.total_volume > 0 else "N/A"

            print(f"{coin.market_cap_rank:<5} {coin.name:<20} {coin.symbol:<8} {price_str:<12} {price_change:<12} ${coin.market_cap:,.0f:<19} {volume_str}")

        print("="*100)

async def get_top_gainers():
    """Show top gainers"""
    print("\n" + "="*80)
    print("TOP 10 GAINERS (24h)")
    print("="*80)

    async with AsyncSessionLocal() as session:
        # Filter coins with price change data
        stmt = select(CoinGeckoData).where(
            CoinGeckoData.price_change_percentage_24h.isnot(None)
        ).order_by(CoinGeckoData.price_change_percentage_24h.desc()).limit(10)

        result = await session.execute(stmt)
        gainers = result.scalars().all()

        print(f"{'Rank':<5} {'Name':<20} {'Symbol':<8} {'Price':<12} {'24h Change':<12} {'Volume'}")
        print("-" * 80)

        for i, coin in enumerate(gainers, 1):
            price_str = f"${coin.current_price:,.8f}" if coin.current_price < 1 else f"${coin.current_price:,.2f}"
            volume_str = f"${coin.total_volume:,.0f}" if coin.total_volume > 0 else "N/A"

            print(f"{i:<5} {coin.name:<20} {coin.symbol:<8} {price_str:<12} {coin.price_change_percentage_24h:+.2f}%{'':<6} {volume_str}")

        print("="*80)

async def get_top_losers():
    """Show top losers"""
    print("\n" + "="*80)
    print("TOP 10 LOSERS (24h)")
    print("="*80)

    async with AsyncSessionLocal() as session:
        stmt = select(CoinGeckoData).where(
            CoinGeckoData.price_change_percentage_24h.isnot(None)
        ).order_by(CoinGeckoData.price_change_percentage_24h.asc()).limit(10)

        result = await session.execute(stmt)
        losers = result.scalars().all()

        print(f"{'Rank':<5} {'Name':<20} {'Symbol':<8} {'Price':<12} {'24h Change':<12} {'Volume'}")
        print("-" * 80)

        for i, coin in enumerate(losers, 1):
            price_str = f"${coin.current_price:,.8f}" if coin.current_price < 1 else f"${coin.current_price:,.2f}"
            volume_str = f"${coin.total_volume:,.0f}" if coin.total_volume > 0 else "N/A"

            print(f"{i:<5} {coin.name:<20} {coin.symbol:<8} {price_str:<12} {coin.price_change_percentage_24h:+.2f}%{'':<6} {volume_str}")

        print("="*80)

async def get_market_stats():
    """Show market statistics"""
    print("\n" + "="*80)
    print("MARKET STATISTICS")
    print("="*80)

    async with AsyncSessionLocal() as session:
        # Total market cap
        stmt = select(func.sum(CoinGeckoData.market_cap), func.sum(CoinGeckoData.total_volume))
        result = await session.execute(stmt)
        total_mcap, total_volume = result.first()

        # Number of coins with positive/negative changes
        positive_stmt = select(func.count(CoinGeckoData.coin_id)).where(
            CoinGeckoData.price_change_percentage_24h > 0
        )
        negative_stmt = select(func.count(CoinGeckoData.coin_id)).where(
            CoinGeckoData.price_change_percentage_24h < 0
        )

        positive_count = (await session.execute(positive_stmt)).scalar()
        negative_count = (await session.execute(negative_stmt)).scalar()

        print(f"Total Market Cap: ${total_mcap or 0:,.0f}")
        print(f"Total 24h Volume: ${total_volume or 0:,.0f}")
        print(f"Coins with Gains: {positive_count}")
        print(f"Coins with Losses: {negative_count}")
        print(f"Neutral/Stable: {100 - positive_count - negative_count}")

        # Average price change
        avg_stmt = select(func.avg(CoinGeckoData.price_change_percentage_24h)).where(
            CoinGeckoData.price_change_percentage_24h.isnot(None)
        )
        avg_change = (await session.execute(avg_stmt)).scalar()
        print(f"Average 24h Change: {avg_change:+.2f}%" if avg_change else "N/A")

        print("="*80)

async def search_coin(symbol_or_name):
    """Search for a specific coin"""
    print(f"\n" + "="*80)
    print(f"SEARCH RESULTS FOR: {symbol_or_name.upper()}")
    print("="*80)

    async with AsyncSessionLocal() as session:
        stmt = select(CoinGeckoData).where(
            (CoinGeckoData.symbol.ilike(f"%{symbol_or_name}%")) |
            (CoinGeckoData.name.ilike(f"%{symbol_or_name}%")) |
            (CoinGeckoData.coin_id.ilike(f"%{symbol_or_name}%"))
        )

        result = await session.execute(stmt)
        coins = result.scalars().all()

        if not coins:
            print(f"No coins found matching '{symbol_or_name}'")
            return

        for coin in coins:
            print(f"\nName: {coin.name}")
            print(f"Symbol: {coin.symbol}")
            print(f"Coin ID: {coin.coin_id}")
            print(f"Current Price: ${coin.current_price:,.8f}" if coin.current_price < 1 else f"${coin.current_price:,.2f}")
            print(f"Market Cap Rank: {coin.market_cap_rank}")
            print(f"Market Cap: ${coin.market_cap:,.0f}" if coin.market_cap > 0 else "N/A")
            print(f"24h Volume: ${coin.total_volume:,.0f}" if coin.total_volume > 0 else "N/A")
            print(f"24h Change: {coin.price_change_percentage_24h:+.2f}%" if coin.price_change_percentage_24h else "N/A")
            print(f"7d Change: {coin.price_change_percentage_7d:+.2f}%" if coin.price_change_percentage_7d else "N/A")
            print(f"30d Change: {coin.price_change_percentage_30d:+.2f}%" if coin.price_change_percentage_30d else "N/A")
            print(f"High 24h: ${coin.high_24h:,.2f}" if coin.high_24h > 0 else "N/A")
            print(f"Low 24h: ${coin.low_24h:,.2f}" if coin.low_24h > 0 else "N/A")
            print(f"Circulating Supply: {coin.circulating_supply:,.0f}" if coin.circulating_supply > 0 else "N/A")
            print(f"ATH: ${coin.ath:,.2f}" if coin.ath > 0 else "N/A")
            print(f"Last Updated: {coin.last_updated}")
            print("-" * 40)

        print("="*80)

async def main():
    """Main function"""
    print("COINGECKO DATA VIEWER")
    print("="*100)
    print("View and analyze the 100 cryptocurrencies stored in database")
    print("="*100)

    # Show market statistics
    await get_market_stats()

    # Show top gainers
    await get_top_gainers()

    # Show top losers
    await get_top_losers()

    # Show all coins (compact view)
    print("\nCOMPACT VIEW (First 20 coins):")
    async with AsyncSessionLocal() as session:
        stmt = select(CoinGeckoData).order_by(CoinGeckoData.market_cap_rank.asc()).limit(20)
        result = await session.execute(stmt)
        coins = result.scalars().all()

        print(f"{'Rank':<5} {'Name':<15} {'Symbol':<6} {'Price':<10} {'24h%':<7}")
        print("-" * 50)

        for coin in coins:
            price_str = f"${coin.current_price:,.6f}" if coin.current_price < 1 else f"${coin.current_price:,.2f}"
            change_str = f"{coin.price_change_percentage_24h:+.1f}%" if coin.price_change_percentage_24h else "N/A"
            print(f"{coin.market_cap_rank:<5} {coin.name:<15} {coin.symbol:<6} {price_str:<10} {change_str:<7}")

    print("\nExample searches: bitcoin, eth, doge, solana")
    print("To search for a specific coin, modify the search_coin() call in main()")

if __name__ == "__main__":
    # Set up event loop for Windows
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    asyncio.run(main())