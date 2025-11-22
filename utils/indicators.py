import pandas as pd
import pandas_ta as ta

def calculate_indicators(df: pd.DataFrame):
    # Ensure timestamp is datetime if needed, but pandas_ta works with whatever index usually
    # But for safety let's keep it simple
    
    # RSI
    df['RSI'] = ta.rsi(df['close'], length=14)
    
    # MACD
    macd = ta.macd(df['close'])
    df = pd.concat([df, macd], axis=1)
    # Rename columns for easier access if needed, but default names are MACD_12_26_9, MACDh_12_26_9, MACDs_12_26_9
    
    # EMA
    df['EMA_50'] = ta.ema(df['close'], length=50)
    df['EMA_200'] = ta.ema(df['close'], length=200)
    
    # Bollinger Bands
    bb = ta.bbands(df['close'], length=20)
    df = pd.concat([df, bb], axis=1)
    # Default cols: BBL_20_2.0, BBM_20_2.0, BBU_20_2.0
    
    # Pattern Recognition
    # Doji: Indikasi keraguan pasar
    df['DOJI'] = df.ta.cdl_pattern(name="doji")['CDL_DOJI']
    # Engulfing: Indikasi pembalikan arah kuat
    df['ENGULFING'] = df.ta.cdl_pattern(name="engulfing")['CDL_ENGULFING']
    
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
