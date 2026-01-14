import ccxt from 'ccxt';
import axios from 'axios';
import { Ohlcv } from '@prisma/client';
import { prisma } from '../db';
import { config } from '../config';

export interface Candle {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface FetchCexDataResult {
    candles: Candle[];
    isStale: boolean;
}

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

export async function fetchCexData(symbol: string, timeframe: string): Promise<FetchCexDataResult> {
    const requiredCount = (config.data_fetcher.timeframe_counts as any)[timeframe] || 100;
    const tfMs = getTimeframeMs(timeframe);
    const nowMs = Date.now();
    const since = nowMs - requiredCount * tfMs;

    // 1. Check DB for existing data
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

    let fetchSince = since;

    // 2. Check for Open Candle & Invalidate
    if (dbCandles.length > 0) {
        const lastCandle = dbCandles[dbCandles.length - 1];
        const lastCandleTs = Number(lastCandle.timestamp);

        // If the last candle's period hasn't finished yet, it's an "open" candle.
        // We must fetch the latest version of it.
        // Logic: If (timestamp + duration) > now, it is still active.
        if (lastCandleTs + tfMs > nowMs) {
            console.log(`[DataFetcher] Invalidating open candle at ${lastCandleTs} (Now: ${nowMs})`);

            // Delete from DB to avoid staleness (since createMany doesn't update)
            await prisma.ohlcv.delete({
                where: {
                     symbol_timeframe_timestamp: {
                        symbol,
                        timeframe,
                        timestamp: lastCandle.timestamp
                    }
                }
            });

            // Remove from local array
            dbCandles.pop();

            // Start fetching from this timestamp to get the updated version
            fetchSince = lastCandleTs;
        } else {
            // It is closed. Start fetching from the next period.
            fetchSince = lastCandleTs + tfMs;
        }
    }

    // 3. Fetch from API (Only if needed)
    let allNewCandles: any[] = [];
    let isStale = false;

    // Only fetch if we are behind
    if (fetchSince < nowMs) {
        console.log(`[DataFetcher] Fetching ${symbol} ${timeframe} from API (since ${fetchSince})...`);
        const exchange = new (ccxt as any)[config.data_fetcher.defaultExchange]({ enableRateLimit: true });
        
        try {
            const candles = await exchange.fetchOHLCV(symbol, timeframe, fetchSince, 1000);
            if (candles && candles.length > 0) {
                allNewCandles = allNewCandles.concat(candles);
            }
        } catch (e) {
            console.error(`Error fetching data: ${e}`);
            isStale = true;
            // If API fails, return what we have from DB
            if (dbCandles.length > 0) {
                 return {
                    candles: dbCandles.map((c: Ohlcv) => ({
                        timestamp: Number(c.timestamp),
                        open: c.open,
                        high: c.high,
                        low: c.low,
                        close: c.close,
                        volume: c.volume,
                    })),
                    isStale: true,
                };
            }
            throw e;
        }
    }

    // 4. Batch Insert New Data
    if (allNewCandles.length > 0) {
        const formattedCandles = allNewCandles.map(c => ({
            symbol,
            timeframe,
            timestamp: BigInt(c[0]),
            open: c[1],
            high: c[2],
            low: c[3],
            close: c[4],
            volume: c[5],
        }));

        // createMany is faster but doesn't handle duplicates/updates well on SQLite in strict mode.
        // However, our fetch logic ensures we don't fetch duplicates of what's in DB.
        // And we deleted the potentially overlapping "open" candle.
        await prisma.ohlcv.createMany({
            data: formattedCandles,
        });

        console.log(`[DataFetcher] Saved ${formattedCandles.length} candles to DB.`);
    }

    // 5. Return Combined Data (DB + New)
    const combined = [
        ...dbCandles.map((c: Ohlcv) => ({
            timestamp: Number(c.timestamp),
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume,
        })),
        ...allNewCandles.map(c => ({
            timestamp: c[0],
            open: c[1],
            high: c[2],
            low: c[3],
            close: c[4],
            volume: c[5],
        }))
    ];

    return {
        candles: combined.sort((a, b) => a.timestamp - b.timestamp),
        isStale,
    };
}

export async function fetchDexData(query: string): Promise<any | null> {
    let url = `https://api.dexscreener.com/latest/dex/search?q=${query}`;
    if (query.startsWith('0x') || query.length > 30) {
        url = `https://api.dexscreener.com/latest/dex/tokens/${query}`;
    }

    try {
        const response = await axios.get(url);
        if (response.status === 200) {
            const data = response.data;
            const pairs = data.pairs || [];
            if (pairs.length === 0) return null;

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
