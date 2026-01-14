jest.mock('../db', () => ({
    prisma: {
        ohlcv: {
            findMany: jest.fn(),
            delete: jest.fn(),
            createMany: jest.fn(),
        },
    },
}));

// No longer define mockResolvedValueOnce here
const mockedCcxtBinanceFetchOHLCV = jest.fn();

jest.mock('ccxt', () => ({
    binance: jest.fn(() => ({
        fetchOHLCV: mockedCcxtBinanceFetchOHLCV,
    })),
}));

describe('data_fetcher open candle handling (isolated)', () => {
    afterEach(() => {
        jest.clearAllMocks();
        mockedCcxtBinanceFetchOHLCV.mockReset(); // Explicitly reset the mock
    });

    it('should invalidate an open candle and fetch the updated version', async () => {
        const { prisma } = require('../db');
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
        mockedCcxtBinanceFetchOHLCV
            .mockResolvedValueOnce([updatedCandle])
            .mockResolvedValueOnce([]); // This will ensure the loop terminates

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
        
        expect(mockedCcxtBinanceFetchOHLCV).toHaveBeenCalledWith(symbol, timeframe, openCandleTimestamp, 1000);

        expect(result.candles).toHaveLength(1);
        expect(result.candles[0].close).toBe(115);
        expect(result.isStale).toBe(false);
    });

    it('should fetch data from API and save to DB when no existing data', async () => {
        const { prisma } = require('../db');
        const { fetchCexData } = require('../utils/data_fetcher');

        const timeframe = '1h';
        const symbol = 'ETH/USDT';
        const now = Date.now();
        const tfMs = 60 * 60 * 1000;
        const initialTimestamp = now - (10 * tfMs); // Fetch 10 candles

        const fetchedCandle = [initialTimestamp, 2000, 2100, 1900, 2050, 5000];

        prisma.ohlcv.findMany.mockResolvedValue([]);
        mockedCcxtBinanceFetchOHLCV.mockResolvedValueOnce([fetchedCandle]);

        const result = await fetchCexData(symbol, timeframe);

        expect(prisma.ohlcv.findMany).toHaveBeenCalledTimes(1);
        expect(mockedCcxtBinanceFetchOHLCV).toHaveBeenCalledWith(symbol, timeframe, expect.any(Number), 1000);
        expect(prisma.ohlcv.createMany).toHaveBeenCalledWith({
            data: [
                {
                    symbol,
                    timeframe,
                    timestamp: BigInt(fetchedCandle[0]),
                    open: fetchedCandle[1],
                    high: fetchedCandle[2],
                    low: fetchedCandle[3],
                    close: fetchedCandle[4],
                    volume: fetchedCandle[5],
                },
            ],
        });

        expect(result.candles).toHaveLength(1);
        expect(result.candles[0].close).toBe(2050);
        expect(result.isStale).toBe(false);
    });
});
