import mplfinance as mpf
import pandas as pd
import io

def generate_chart(df: pd.DataFrame, symbol: str, timeframe: str):
    """
    Membuat chart candlestick + indikator dan menyimpannya ke buffer memory (bukan file disk)
    agar cepat dikirim ke Discord.
    """
    # Pastikan Index adalah DatetimeIndex
    df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
    df.set_index('timestamp', inplace=True)

    # Setup Style dengan warna Antigravity (#ff7400)
    mc = mpf.make_marketcolors(up='#ff7400', down='#1a1a1a', inherit=True)
    s = mpf.make_mpf_style(marketcolors=mc, style='nightclouds', gridstyle=':')

    # Siapkan buffer untuk menyimpan gambar
    buf = io.BytesIO()

    # Tambahkan plot tambahan (Indicator)
    # Contoh: EMA 50 & 200
    # Pastikan panjang array sama dengan plot_data (tail 100)
    # Kita hitung indikator dulu di luar atau pastikan df sudah punya
    
    apds = []
    if 'EMA_50' in df.columns:
        apds.append(mpf.make_addplot(df['EMA_50'].tail(100), color='cyan', width=1.0))
    if 'EMA_200' in df.columns:
        apds.append(mpf.make_addplot(df['EMA_200'].tail(100), color='white', width=1.5))

    # Plotting (Ambil 100 candle terakhir saja biar jelas)
    plot_data = df.tail(100)
    
    mpf.plot(
        plot_data,
        type='candle',
        style=s,
        title=f'\n{symbol} - {timeframe}',
        volume=True,
        addplot=apds,
        savefig=dict(fname=buf, dpi=100, bbox_inches='tight'),
        warn_too_much_data=2000
    )
    
    buf.seek(0)
    return buf
