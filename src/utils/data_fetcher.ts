
import ccxt from 'ccxt';
import axios from 'axios';
import { PrismaClient, Ohlcv } from '@prisma/client';

const prisma = new PrismaClient();

interface Candle {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

const TIMEFRAME_COUNTS: { [key: string]: number } = {
    '15m': 10000,
    '1h': 5000,
    '4h': 5000,
    '1d': 2000,
    '1w': 1000,
    '1M': 500,
};

function getTimeframeMs(timeframe: string): number {
    const mapping: { [key: string]: number } = {
        '1m': 60 * 1000,
        '5m': 5 * 60 * 1000,
        '15m': 15 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '4h': 4 * 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000,
        '1w': 7 * 24 * 60 * 60 * 1000,
        '1M': 30 * 24 * 60 * 60 * 1000,
    };
    return mapping[timeframe] || 60 * 1000;
}

export async function fetchCexData(symbol: string, timeframe: string): Promise<Candle[]> {
    const requiredCount = TIMEFRAME_COUNTS[timeframe] || 1000;
    const tfMs = getTimeframeMs(timeframe);
    const nowMs = Date.now();
    const since = nowMs - requiredCount * tfMs;

    // Check DB
    const dbCandles = await prisma.ohlcv.findMany({
        where: {
            symbol,
            timeframe,
            timestamp: {
                gte: BigInt(since),
            },
        },
        orderBy: {
            timestamp: 'asc',
        },
    });

    // Check if we have enough data and it's fresh (last candle within 2 periods)
    let isFresh = false;
    if (dbCandles.length > 0) {
        const lastCandleTs = Number(dbCandles[dbCandles.length - 1].timestamp);
        if (nowMs - lastCandleTs < 2 * tfMs) {
            isFresh = true;
        }
    }

    if (dbCandles.length >= requiredCount * 0.95 && isFresh) {
        // Use DB data
        return dbCandles.map((c: Ohlcv) => ({
            timestamp: Number(c.timestamp),
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
        }));
    }

    // Fetch from API
    const exchange = new ccxt.binance();
    let allCandles: any[] = [];
    let currentSince = since;

    try {
        while (currentSince < nowMs) {
            const candles = await exchange.fetchOHLCV(symbol, timeframe, currentSince, 1000);
            if (candles.length === 0) {
                break;
            }

            allCandles = allCandles.concat(candles);
            if (candles.length > 0) {
                const lastCandle = candles[candles.length - 1];
                if (lastCandle && lastCandle.length > 0 && lastCandle[0]) {
                    currentSince = lastCandle[0] + 1;
                }
            }




            // Respect rate limit
            await new Promise(resolve => setTimeout(resolve, exchange.rateLimit));

            if (candles.length < 1000) {
                break;
            }
        }
    } catch (e) {
        console.error(`Error fetching data: ${e}`);
    } finally {
        // In the node-ccxt library, there is no explicit close method for exchanges.
    }

    // Format for DB
    const formattedCandles = allCandles.map(c => ({
        symbol,
        timeframe,
        timestamp: BigInt(c[0]),
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
        volume: c[5],
    }));

    // Upsert to DB
    for (const candle of formattedCandles) {
        await prisma.ohlcv.upsert({
            where: {
                symbol_timeframe_timestamp: {
                    symbol: candle.symbol,
                    timeframe: candle.timeframe,
                    timestamp: candle.timestamp,
                }
            },
            update: candle,
            create: candle,
        });
    }


    // Return array of objects
    return allCandles.map(c => ({
        timestamp: c[0],
        open: c[1],
        high: c[2],
        low: c[3],
        close: c[4],
        volume: c[5],
    }));
}

export async function fetchDexData(query: string): Promise<any | null> {
    let url = `https://api.dexscreener.com/latest/dex/search?q=${query}`;
    // If it looks like an address
    if (query.startsWith('0x') || query.length > 30) {
        url = `https://api.dexscreener.com/latest/dex/tokens/${query}`;
    }

    try {
        const response = await axios.get(url);
        if (response.status === 200) {
            const data = response.data;
            const pairs = data.pairs || [];
            if (pairs.length === 0) {
                return null;
            }
            // Return the most liquid pair
            pairs.sort((a: any, b: any) => parseFloat(b.liquidity?.usd || 0) - parseFloat(a.liquidity?.usd || 0));
            return pairs[0];
        }
        return null;
    } catch (error) {
        console.error(error);
        return null;
    }
}
