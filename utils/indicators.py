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
    
    return df

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
        
    return "\n".join(setup)
