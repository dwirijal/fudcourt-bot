jest.mock('../db', () => ({
    prisma: {
        ohlcv: {
            findMany: jest.fn(),
            delete: jest.fn(),
            createMany: jest.fn(),
        },
    },
}));

jest.mock('ccxt', () => ({
    binance: jest.fn(() => ({
        fetchOHLCV: jest.fn(),
    })),
}));

describe('data_fetcher open candle handling (isolated)', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should invalidate an open candle and fetch the updated version', async () => {
        const { prisma } = require('../db');
        const ccxt = require('ccxt');
        const { fetchCexData } = require('../utils/data_fetcher');

        const timeframe = '15m';
        const symbol = 'BTC/USDT';
        const now = Date.now();
        const tfMs = 15 * 60 * 1000;
        const openCandleTimestamp = now - (now % tfMs);

        const openCandle = {
            id: 1,
            symbol,
            timeframe,
            timestamp: BigInt(openCandleTimestamp),
            open: 100,
            high: 110,
            low: 90,
            close: 105,
            volume: 1000,
            createdAt: new Date(),
        };

        const updatedCandle = [openCandleTimestamp, 100, 120, 90, 115, 1500];

        prisma.ohlcv.findMany.mockResolvedValue([openCandle]);
        (ccxt.binance().fetchOHLCV as jest.Mock)
            .mockResolvedValueOnce([updatedCandle])
            .mockResolvedValueOnce([]);

        const result = await fetchCexData(symbol, timeframe);

        expect(prisma.ohlcv.delete).toHaveBeenCalledWith({
            where: {
                symbol_timeframe_timestamp: {
                    symbol,
                    timeframe,
                    timestamp: openCandle.timestamp,
                },
            },
        });
        
        expect(ccxt.binance().fetchOHLCV).toHaveBeenCalledWith(symbol, timeframe, openCandleTimestamp, 1000);

        expect(result.candles).toHaveLength(1);
        expect(result.candles[0].close).toBe(115);
        expect(result.isStale).toBe(false);
    });
});
