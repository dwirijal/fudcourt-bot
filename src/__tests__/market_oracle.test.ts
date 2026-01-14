import { marketOracle } from '../services/market_oracle';
import ccxt from 'ccxt';
import { config } from '../config';

// Mock ccxt
const mockedCcxtFetchTicker = jest.fn();
jest.mock('ccxt', () => ({
    binance: jest.fn(() => ({
        fetchTicker: mockedCcxtFetchTicker,
    })),
    kucoin: jest.fn(() => ({
        fetchTicker: mockedCcxtFetchTicker,
    })),
}));

describe('MarketOracle', () => {
    afterEach(() => {
        jest.clearAllMocks();
        mockedCcxtFetchTicker.mockReset();
    });

    it('should initialize marketState correctly', () => {
        const state = marketOracle.getState();
        expect(state.status).toBe('CRAB');
        expect(state.btcPrice).toBe(0);
        expect(state.change24h).toBe(0);
        expect(state.ethPrice).toBe(config.oracle.defaultEthPrice);
        expect(state.dogePrice).toBe(config.oracle.defaultDogePrice);
    });

    it('should return the current marketState', () => {
        const state = marketOracle.getState();
        // Modify some state to ensure it's the same object
        state.btcPrice = 12345;
        expect(marketOracle.getState().btcPrice).toBe(12345);
    });

    it('should determine BULL status correctly', async () => {
        mockedCcxtFetchTicker.mockResolvedValueOnce({
            last: 50000,
            percentage: config.oracle.bullThreshold + 1,
            symbol: 'BTC/USDT',
        });
        mockedCcxtFetchTicker.mockResolvedValueOnce({ last: 2000 }); // ETH
        mockedCcxtFetchTicker.mockResolvedValueOnce({ last: 0.1 }); // DOGE

        await (marketOracle as any).updateMarketState(); // Access private method for testing
        expect(marketOracle.getState().status).toBe('BULL');
        expect(marketOracle.getState().btcPrice).toBe(50000);
    });

    it('should determine BEAR status correctly', async () => {
        mockedCcxtFetchTicker.mockResolvedValueOnce({
            last: 40000,
            percentage: config.oracle.bearThreshold - 1,
            symbol: 'BTC/USDT',
        });
        mockedCcxtFetchTicker.mockResolvedValueOnce({ last: 2000 }); // ETH
        mockedCcxtFetchTicker.mockResolvedValueOnce({ last: 0.1 }); // DOGE

        await (marketOracle as any).updateMarketState();
        expect(marketOracle.getState().status).toBe('BEAR');
        expect(marketOracle.getState().btcPrice).toBe(40000);
    });

    it('should determine CRAB status correctly', async () => {
        mockedCcxtFetchTicker.mockResolvedValueOnce({
            last: 45000,
            percentage: 0.5,
            symbol: 'BTC/USDT',
        });
        mockedCcxtFetchTicker.mockResolvedValueOnce({ last: 2000 }); // ETH
        mockedCcxtFetchTicker.mockResolvedValueOnce({ last: 0.1 }); // DOGE

        await (marketOracle as any).updateMarketState();
        expect(marketOracle.getState().status).toBe('CRAB');
        expect(marketOracle.getState().btcPrice).toBe(45000);
    });

    it('should fall back to another exchange on API failure', async () => {
        // Binance fails
        mockedCcxtFetchTicker.mockRejectedValueOnce(new Error('Binance API error'));
        // KuCoin succeeds
        mockedCcxtFetchTicker.mockResolvedValueOnce({
            last: 51000,
            percentage: 3.0,
            symbol: 'BTC/USDT',
        });
        mockedCcxtFetchTicker.mockResolvedValueOnce({ last: 2100 }); // ETH
        mockedCcxtFetchTicker.mockResolvedValueOnce({ last: 0.11 }); // DOGE

        await (marketOracle as any).updateMarketState();
        expect(marketOracle.getState().status).toBe('BULL');
        expect(marketOracle.getState().btcPrice).toBe(51000);
    });

    it('should log an error if all exchanges fail', async () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        // All exchanges fail
        mockedCcxtFetchTicker.mockRejectedValue(new Error('API error'));

        // Manually reset state for this test, as previous tests might have changed it
        (marketOracle as any).marketState = {
            btcPrice: 0,
            change24h: 0,
            status: 'CRAB',
            lastUpdate: new Date(),
            ethPrice: config.oracle.defaultEthPrice,
            dogePrice: config.oracle.defaultDogePrice,
        };

        await (marketOracle as any).updateMarketState();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
            '[Oracle] Failed to update market state from all sources.'
        );
        // Ensure state remains unchanged if all fail
        expect(marketOracle.getState().status).toBe('CRAB');
        expect(marketOracle.getState().btcPrice).toBe(0);

        consoleErrorSpy.mockRestore();
    });
});
