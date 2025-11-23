import pandas as pd
import numpy as np

def calculate_rsi(prices, window=14):
    """Calculate RSI indicator"""
    delta = prices.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

def calculate_ema(prices, window):
    """Calculate EMA indicator"""
    return prices.ewm(span=window, adjust=False).mean()

def calculate_macd(prices, fast=12, slow=26, signal=9):
    """Calculate MACD indicator"""
    ema_fast = calculate_ema(prices, fast)
    ema_slow = calculate_ema(prices, slow)
    macd_line = ema_fast - ema_slow
    signal_line = calculate_ema(macd_line, signal)
    histogram = macd_line - signal_line

    return pd.DataFrame({
        'MACD_12_26_9': macd_line,
        'MACDs_12_26_9': signal_line,
        'MACDh_12_26_9': histogram
    })

def calculate_bollinger_bands(prices, window=20, num_std=2):
    """Calculate Bollinger Bands"""
    sma = prices.rolling(window=window).mean()
    std = prices.rolling(window=window).std()
    upper_band = sma + (std * num_std)
    lower_band = sma - (std * num_std)

    return pd.DataFrame({
        'BBM_20_2.0': sma,
        'BBU_20_2.0': upper_band,
        'BBL_20_2.0': lower_band
    })

def detect_doji(open_price, high, low, close, threshold=0.1):
    """Simple doji pattern detection"""
    body_size = abs(close - open_price)
    range_size = high - low
    if range_size == 0:
        return 0
    return 1 if (body_size / range_size) < threshold else 0

def detect_engulfing(open_prices, high_prices, low_prices, close_prices):
    """Simple engulfing pattern detection"""
    if len(open_prices) < 2:
        return 0

    current = len(open_prices) - 1
    prev = current - 1

    prev_body = close_prices.iloc[prev] - open_prices.iloc[prev]
    current_body = close_prices.iloc[current] - open_prices.iloc[current]

    # Bullish engulfing
    if prev_body < 0 and current_body > 0:
        if open_prices.iloc[current] <= close_prices.iloc[prev] and \
           close_prices.iloc[current] >= open_prices.iloc[prev]:
            return 1

    # Bearish engulfing
    if prev_body > 0 and current_body < 0:
        if open_prices.iloc[current] >= close_prices.iloc[prev] and \
           close_prices.iloc[current] <= open_prices.iloc[prev]:
            return -1

    return 0

def calculate_indicators(df: pd.DataFrame):
    """Calculate all technical indicators"""
    if df.empty or len(df) < 50:
        return df

    # RSI
    df['RSI'] = calculate_rsi(df['close'])

    # MACD
    macd_data = calculate_macd(df['close'])
    df = pd.concat([df, macd_data], axis=1)

    # EMA
    df['EMA_50'] = calculate_ema(df['close'], 50)
    df['EMA_200'] = calculate_ema(df['close'], 200)

    # Bollinger Bands
    bb_data = calculate_bollinger_bands(df['close'])
    df = pd.concat([df, bb_data], axis=1)

    # Pattern Recognition
    df['DOJI'] = 0
    df['ENGULFING'] = 0

    for i in range(1, len(df)):
        df.loc[df.index[i], 'DOJI'] = detect_doji(
            df['open'].iloc[i], df['high'].iloc[i],
            df['low'].iloc[i], df['close'].iloc[i]
        )
        df.loc[df.index[i], 'ENGULFING'] = detect_engulfing(
            df['open'].iloc[:i+1], df['high'].iloc[:i+1],
            df['low'].iloc[:i+1], df['close'].iloc[:i+1]
        )

    return df

import numpy as np
from scipy.signal import argrelextrema

def get_support_resistance(df):
    # Cari local max (resistance) dan local min (support)
    n = 20 # window size
    
    # Menggunakan iloc untuk akses via integer index
    # Kita butuh values array
    highs = df['high'].values
    lows = df['low'].values
    
    res_idx = argrelextrema(highs, np.greater_equal, order=n)[0]
    sup_idx = argrelextrema(lows, np.less_equal, order=n)[0]
    
    # Ambil 3 level teratas/terbawah yang paling dekat dengan harga sekarang
    current_price = df['close'].iloc[-1]
    
    resistances = [highs[i] for i in res_idx if highs[i] > current_price]
    supports = [lows[i] for i in sup_idx if lows[i] < current_price]
    
    return sorted(supports)[-3:], sorted(resistances)[:3]

def generate_setup(df: pd.DataFrame):
    if df.empty:
        return "No data available"
        
    last_row = df.iloc[-1]
    
    price = last_row['close']
    rsi = last_row['RSI']
    ema_200 = last_row['EMA_200']
    ema_50 = last_row['EMA_50']
    
    # MACD logic (using default column names from pandas_ta)
    # Usually: MACD_12_26_9, MACDh_12_26_9 (hist), MACDs_12_26_9 (signal)
    macd_col = 'MACD_12_26_9'
    macd_signal_col = 'MACDs_12_26_9'
    
    macd_val = last_row.get(macd_col, 0)
    macd_signal = last_row.get(macd_signal_col, 0)
    
    setup = []
    
    # Trend
    if price > ema_200:
        setup.append("Bullish Trend (Price > EMA 200)")
    else:
        setup.append("Bearish Trend (Price < EMA 200)")
        
    # RSI
    if rsi < 30:
        setup.append("RSI Oversold (< 30) - Potential Long")
    elif rsi > 70:
        setup.append("RSI Overbought (> 70) - Potential Short")
        
    # MACD
    if macd_val > macd_signal:
        setup.append("MACD Bullish Cross")
    else:
        setup.append("MACD Bearish Cross")
        
    # Patterns
    if last_row['DOJI'] != 0:
        setup.append("Candle Pattern: Doji (Indecision)")
    if last_row['ENGULFING'] != 0:
        setup.append(f"Candle Pattern: {'Bullish' if last_row['ENGULFING'] > 0 else 'Bearish'} Engulfing")
        
    return "\n".join(setup)
