import { RSI, MACD, EMA, BollingerBands } from 'technicalindicators';

interface Candle {
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    timestamp: number;
}

export function calculateIndicators(data: Candle[]): any[] {
    if (data.length < 50) {
        return data;
    }

    const closePrices = data.map(d => d.close);

    // RSI
    const rsi = RSI.calculate({ period: 14, values: closePrices });

    // MACD
    const macdInput = {
        values: closePrices,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
    };
    const macd = MACD.calculate(macdInput);

    // EMA
    const ema50 = EMA.calculate({ period: 50, values: closePrices });
    const ema200 = EMA.calculate({ period: 200, values: closePrices });

    // Bollinger Bands
    const bbInput = {
        period: 20,
        values: closePrices,
        stdDev: 2,
    };
    const bb = BollingerBands.calculate(bbInput);

    // Combine indicators with original data
    const dataWithIndicators = data.map((d, i) => {
        return {
            ...d,
            RSI: rsi[i - 14 + 1] || null,
            MACD: macd[i - 26 + 1] || null,
            EMA50: ema50[i - 50 + 1] || null,
            EMA200: ema200[i - 200 + 1] || null,
            BB: bb[i - 20 + 1] || null,
        };
    });


    return dataWithIndicators;
}

function detectDoji(candle: Candle, threshold = 0.1): number {
    const bodySize = Math.abs(candle.close - candle.open);
    const rangeSize = candle.high - candle.low;
    if (rangeSize === 0) {
        return 0;
    }
    return (bodySize / rangeSize) < threshold ? 1 : 0;
}

function detectEngulfing(candles: Candle[]): number {
    if (candles.length < 2) {
        return 0;
    }

    const current = candles[candles.length - 1];
    const prev = candles[candles.length - 2];

    const prevBody = prev.close - prev.open;
    const currentBody = current.close - current.open;

    // Bullish engulfing
    if (prevBody < 0 && currentBody > 0) {
        if (current.open <= prev.close && current.close >= prev.open) {
            return 1;
        }
    }

    // Bearish engulfing
    if (prevBody > 0 && currentBody < 0) {
        if (current.open >= prev.close && current.close <= prev.open) {
            return -1;
        }
    }

    return 0;
}

export function getSupportResistance(data: Candle[]): [number[], number[]] {
    const n = 20; // window size
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const resistances: number[] = [];
    const supports: number[] = [];

    for (let i = n; i < data.length - n; i++) {
        const isResistance = highs.slice(i - n, i + n + 1).every(h => h <= highs[i]);
        if (isResistance) {
            resistances.push(highs[i]);
        }

        const isSupport = lows.slice(i - n, i + n + 1).every(l => l >= lows[i]);
        if (isSupport) {
            supports.push(lows[i]);
        }
    }


    const currentPrice = data[data.length - 1].close;
    const recentResistances = resistances.filter(r => r > currentPrice);
    const recentSupports = supports.filter(s => s < currentPrice);


    return [
        recentSupports.sort((a, b) => b - a).slice(0, 3),
        recentResistances.sort((a, b) => a - b).slice(0, 3)
    ];
}

export function generateSetup(df: any[]): string {
    if (df.length === 0) {
        return 'No data available';
    }

    const lastRow = df[df.length - 1];

    const price = lastRow.close;
    const rsi = lastRow.RSI;
    const ema200 = lastRow.EMA200;
    const macd = lastRow.MACD;

    const setup = [];

    // Trend
    if (price > ema200) {
        setup.push('Bullish Trend (Price > EMA 200)');
    } else {
        setup.push('Bearish Trend (Price < EMA 200)');
    }

    // RSI
    if (rsi < 30) {
        setup.push('RSI Oversold (< 30) - Potential Long');
    } else if (rsi > 70) {
        setup.push('RSI Overbought (> 70) - Potential Short');
    }

    // MACD
    if (macd && macd.MACD > macd.signal) {
        setup.push('MACD Bullish Cross');
    } else {
        setup.push('MACD Bearish Cross');
    }

    // Patterns
    if (detectDoji(lastRow) !== 0) {
        setup.push('Candle Pattern: Doji (Indecision)');
    }
    if (detectEngulfing(df.slice(df.length - 2)) !== 0) {
        setup.push(`Candle Pattern: ${detectEngulfing(df.slice(df.length - 2)) > 0 ? 'Bullish' : 'Bearish'} Engulfing`);
    }


    return setup.join('\n');
}
