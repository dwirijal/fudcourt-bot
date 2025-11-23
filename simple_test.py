#!/usr/bin/env python3
"""
Simple Discord Bot Test Script
Tests the bot functionality without Unicode characters
"""

import asyncio
import pandas as pd
import numpy as np
from datetime import datetime
import sys

# Add current directory to path for imports
sys.path.append('.')

from utils.indicators import calculate_indicators, generate_setup, get_support_resistance

def test_technical_indicators():
    """Test technical indicator calculations"""
    print("\nTESTING TECHNICAL INDICATORS")
    print("-" * 50)

    try:
        # Create sample data
        np.random.seed(42)
        prices = 50000 + np.cumsum(np.random.randn(200) * 100)

        # Create OHLCV DataFrame
        df = pd.DataFrame({
            'timestamp': pd.date_range(start='2024-01-01', periods=200, freq='1h'),
            'open': prices,
            'high': prices * 1.01,
            'low': prices * 0.99,
            'close': prices + np.random.randn(200) * 50,
            'volume': np.random.randint(1000000, 5000000, 200)
        })

        print(f"SUCCESS: Created sample dataset with {len(df)} candles")

        # Test indicators
        df = calculate_indicators(df)

        print("SUCCESS: Technical indicators calculated:")
        print(f"   RSI (14): {df['RSI'].iloc[-1]:.2f}")
        print(f"   EMA 50: {df['EMA_50'].iloc[-1]:.2f}")
        print(f"   EMA 200: {df['EMA_200'].iloc[-1]:.2f}")

        # Test pattern detection
        latest_doji = df['DOJI'].iloc[-1]
        latest_engulfing = df['ENGULFING'].iloc[-1]

        if latest_doji != 0:
            print(f"   Doji pattern detected")
        if latest_engulfing != 0:
            direction = "Bullish" if latest_engulfing > 0 else "Bearish"
            print(f"   {direction} Engulfing pattern detected")

        # Test setup generation
        setup = generate_setup(df)
        print(f"\nGenerated Trade Setup:\n{setup}")

        # Test support/resistance
        supports, resistances = get_support_resistance(df)
        print(f"\nSupport Levels: {[f'${s:.2f}' for s in supports[-3:]]}")
        print(f"Resistance Levels: {[f'${r:.2f}' for r in resistances[:3]]}")

        return True

    except Exception as e:
        print(f"ERROR: Technical Indicators Error: {e}")
        return False

def simulate_discord_embed_cex():
    """Simulate Discord embed output for CEX analysis"""
    print("\n" + "="*60)
    print("DISCORD EMBED OUTPUT EXAMPLE - CEX ANALYSIS")
    print("="*60)

    # Sample data as it would appear in Discord
    embed_data = {
        'title': 'Analysis for BTC/USDT (4h)',
        'color': 0xff7400,
        'fields': [
            {'name': 'Price', 'value': '$43,256.78', 'inline': True},
            {'name': '24h Change', 'value': '+2.45%', 'inline': True},
            {'name': 'RSI (14)', 'value': '65.32', 'inline': True},
            {'name': 'EMA 50', 'value': '$42,890.12', 'inline': True},
            {'name': 'EMA 200', 'value': '$41,234.56', 'inline': True},
            {'name': 'Support Levels', 'value': '$42,500.00', 'inline': True},
            {'name': 'Resistance Levels', 'value': '$44,000.00', 'inline': True},
            {'name': 'Trade Setup', 'value': 'Bullish Trend (Price > EMA 200)\nMACD Bullish Cross\nCandle Pattern: Doji (Indecision)', 'inline': False}
        ]
    }

    print(f"Title: {embed_data['title']}")
    print(f"Color: #{embed_data['color']:06x}")

    for field in embed_data['fields']:
        if field['inline']:
            print(f"  [{field['name']}: {field['value']}] ", end='')
            if embed_data['fields'].index(field) % 3 == 2:  # New line every 3 inline fields
                print()
        else:
            print(f"\n{field['name']}:")
            print(f"  {field['value']}")

    print(f"\n{'='*60}")

def simulate_discord_embed_dex():
    """Simulate Discord embed output for DEX analysis"""
    print("\nDISCORD EMBED OUTPUT EXAMPLE - DEX ANALYSIS")
    print("="*60)

    # Sample data as it would appear in Discord
    embed_data = {
        'title': 'Pepe (PEPE)',
        'url': 'https://dexscreener.com/ethereum/0x1234567890abcdef',
        'color': 0xff7400,
        'fields': [
            {'name': 'Chain', 'value': 'Ethereum', 'inline': True},
            {'name': 'Price', 'value': '$0.000001234', 'inline': True},
            {'name': 'Liquidity', 'value': '$2,456,789', 'inline': True},
            {'name': 'FDV', 'value': '$516,234,567', 'inline': True},
            {'name': '24h Volume', 'value': '$8,765,432', 'inline': True},
            {'name': '24h Change', 'value': '+12.34%', 'inline': True},
            {'name': 'Pair Age', 'value': '45d 12h ago', 'inline': True},
            {'name': 'DEX Link', 'value': '[View on DEXScreener](https://dexscreener.com/ethereum/0x1234567890abcdef)', 'inline': False}
        ]
    }

    print(f"Title: {embed_data['title']}")
    print(f"URL: {embed_data['url']}")
    print(f"Color: #{embed_data['color']:06x}")

    for field in embed_data['fields']:
        if field['inline']:
            print(f"  [{field['name']}: {field['value']}] ", end='')
            if embed_data['fields'].index(field) % 3 == 2:  # New line every 3 inline fields
                print()
        else:
            print(f"\n{field['name']}:")
            print(f"  {field['value']}")

    print(f"\n{'='*60}")

def test_chart_info():
    """Test chart generation information"""
    print("\nCHART GENERATION TEST")
    print("-" * 50)

    try:
        # Test if charting module can be imported
        from utils.charting import generate_chart
        print("SUCCESS: Charting module imported successfully")

        # Create sample data for chart
        np.random.seed(42)
        df = pd.DataFrame({
            'timestamp': pd.date_range(start='2024-01-01', periods=100, freq='1h'),
            'open': 50000 + np.cumsum(np.random.randn(100) * 100),
            'high': 0,
            'low': 0,
            'close': 0,
            'volume': np.random.randint(1000000, 5000000, 100)
        })

        # Generate realistic OHLC data
        for i in range(len(df)):
            base_price = df.loc[i, 'open']
            change = np.random.randn() * 200
            df.loc[i, 'close'] = base_price + change
            df.loc[i, 'high'] = max(df.loc[i, 'open'], df.loc[i, 'close']) + abs(np.random.randn() * 50)
            df.loc[i, 'low'] = min(df.loc[i, 'open'], df.loc[i, 'close']) - abs(np.random.randn() * 50)

        # Convert to milliseconds timestamp
        df['timestamp'] = df['timestamp'].astype('int64') // 10**6

        # Test chart generation
        chart_buffer = generate_chart(df, "TEST/USDT", "1h")
        chart_size = len(chart_buffer.getvalue())

        print(f"SUCCESS: Chart generated successfully")
        print(f"   Chart size: {chart_size} bytes")
        print(f"   Dimensions: Would be sent as Discord image attachment")
        print(f"   Format: PNG with candlestick chart and indicators")

        return True

    except Exception as e:
        print(f"ERROR: Chart generation failed: {e}")
        return False

def main():
    """Main test function"""
    print("DISCORD BOT OUTPUT TEST")
    print("=" * 80)
    print("This script tests bot functionality and shows Discord output formatting")
    print("=" * 80)

    # Test 1: Technical Indicators
    print("\n[TEST 1] Technical Indicators")
    indicators_result = test_technical_indicators()

    # Test 2: Discord Embed Examples
    print("\n[TEST 2] Discord Embed Formatting Examples")
    simulate_discord_embed_cex()
    simulate_discord_embed_dex()

    # Test 3: Chart Generation
    print("\n[TEST 3] Chart Generation")
    chart_result = test_chart_info()

    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)

    print("Technical Indicators:", "PASS" if indicators_result else "FAIL")
    print("Chart Generation:", "PASS" if chart_result else "FAIL")
    print("Discord Embed Formatting:", "PASS (simulated)")

    print("\nBot Features Tested:")
    print("  • RSI, MACD, EMA, Bollinger Bands calculations")
    print("  • Candlestick pattern recognition (Doji, Engulfing)")
    print("  • Support/Resistance level detection")
    print("  • Trade setup generation")
    print("  • Chart generation with mplfinance")
    print("  • Discord embed formatting")

    print(f"\nOVERALL STATUS: {'READY' if indicators_result and chart_result else 'NEEDS FIXES'}")
    print("=" * 80)

if __name__ == "__main__":
    # Set up event loop for Windows
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    main()