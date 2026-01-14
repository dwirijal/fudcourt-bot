import ccxt from 'ccxt';

export interface MarketState {
    btcPrice: number;
    change24h: number;
    status: 'BULL' | 'BEAR' | 'CRAB';
    lastUpdate: Date;
    // Cache for special weapons to avoid spamming APIs in battle loop
    ethPrice: number;
    dogePrice: number;
}

export let marketState: MarketState = {
    btcPrice: 0,
    change24h: 0,
    status: 'CRAB', // Default safe state
    lastUpdate: new Date(),
    ethPrice: 2000,
    dogePrice: 0.1
};

export async function startOracle() {
    console.log('[Oracle] Starting Market Oracle...');
    await updateMarketState();

    // Update every 5 minutes
    setInterval(updateMarketState, 5 * 60 * 1000);
}

async function updateMarketState() {
    try {
        const exchange = new ccxt.binance({ enableRateLimit: true });

        // Fetch BTC for World State
        const btcTicker = await exchange.fetchTicker('BTC/USDT');

        // Fetch ETH & DOGE for Weapons
        // Note: fetchTickers is more efficient if supported, but let's be safe with separate calls or try fetchTickers
        let ethTicker, dogeTicker;
        try {
             ethTicker = await exchange.fetchTicker('ETH/USDT');
             dogeTicker = await exchange.fetchTicker('DOGE/USDT');
        } catch (e) {
            console.warn("[Oracle] Failed to fetch altcoin prices, keeping old values");
        }

        if (btcTicker) {
            marketState.btcPrice = btcTicker.last || 0;
            marketState.change24h = btcTicker.percentage || 0;
            marketState.lastUpdate = new Date();

            // Determine RPG World Status
            if (marketState.change24h >= 2.0) {
                marketState.status = 'BULL';
            } else if (marketState.change24h <= -2.0) {
                marketState.status = 'BEAR';
            } else {
                marketState.status = 'CRAB';
            }
        }

        if (ethTicker) marketState.ethPrice = ethTicker.last || 2000;
        if (dogeTicker) marketState.dogePrice = dogeTicker.last || 0.1;

        console.log(`[Oracle] 🌍 World State: ${marketState.status} (BTC: $${marketState.btcPrice}, 24h: ${marketState.change24h.toFixed(2)}%)`);
    } catch (e) {
        console.error("[Oracle] Failed to update market state:", e);
    }
}
