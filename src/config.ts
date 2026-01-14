export const config = {
    oracle: {
        updateInterval: 5 * 60 * 1000, // 5 minutes
        bullThreshold: 2.0,
        bearThreshold: -2.0,
        defaultEthPrice: 2000,
        defaultDogePrice: 0.1,
        exchanges: ['binance', 'kucoin'],
    },
    data_fetcher: {
        defaultExchange: 'binance',
        timeframe_counts: {
            '15m': 1000,
            '1h': 1000,
            '4h': 500,
            '1d': 365,
            '1w': 52,
            '1M': 12,
        },
    },
};
