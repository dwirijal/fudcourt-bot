import ccxt from 'ccxt';
import { config } from '../config';

export interface MarketState {
    btcPrice: number;
    change24h: number;
    status: 'BULL' | 'BEAR' | 'CRAB';
    lastUpdate: Date;
    // Cache for special weapons to avoid spamming APIs in battle loop
    ethPrice: number;
    dogePrice: number;
}

class MarketOracle {
    private marketState: MarketState;

    constructor() {
        this.marketState = {
            btcPrice: 0,
            change24h: 0,
            status: 'CRAB', // Default safe state
            lastUpdate: new Date(),
            ethPrice: config.oracle.defaultEthPrice,
            dogePrice: config.oracle.defaultDogePrice,
        };
    }

    public async start() {
        console.log('[Oracle] Starting Market Oracle...');
        await this.updateMarketState();

        // Update every 5 minutes
        setInterval(() => this.updateMarketState(), config.oracle.updateInterval);
    }

    public getState(): MarketState {
        return this.marketState;
    }

    private async updateMarketState() {
        let success = false;
        for (const exchangeId of config.oracle.exchanges) {
            try {
                const exchange = new (ccxt as any)[exchangeId]({ enableRateLimit: true });

                // Fetch BTC for World State
                const btcTicker = await exchange.fetchTicker('BTC/USDT');

                // Fetch ETH & DOGE for Weapons
                let ethTicker, dogeTicker;
                try {
                    ethTicker = await exchange.fetchTicker('ETH/USDT');
                    dogeTicker = await exchange.fetchTicker('DOGE/USDT');
                } catch (e) {
                    console.warn(`[Oracle] Failed to fetch altcoin prices from ${exchangeId}, keeping old values`);
                }

                if (btcTicker) {
                    this.marketState.btcPrice = btcTicker.last || 0;
                    this.marketState.change24h = btcTicker.percentage || 0;
                    this.marketState.lastUpdate = new Date();

                    // Determine RPG World Status
                    if (this.marketState.change24h >= config.oracle.bullThreshold) {
                        this.marketState.status = 'BULL';
                    } else if (this.marketState.change24h <= config.oracle.bearThreshold) {
                        this.marketState.status = 'BEAR';
                    } else {
                        this.marketState.status = 'CRAB';
                    }
                }

                if (ethTicker) this.marketState.ethPrice = ethTicker.last || config.oracle.defaultEthPrice;
                if (dogeTicker) this.marketState.dogePrice = dogeTicker.last || config.oracle.defaultDogePrice;

                console.log(`[Oracle] 🌍 World State from ${exchangeId}: ${this.marketState.status} (BTC: $${this.marketState.btcPrice}, 24h: ${this.marketState.change24h.toFixed(2)}%)`);
                success = true;
                break; // Exit loop on success
            } catch (e) {
                console.error(`[Oracle] Failed to fetch from ${exchangeId}:`, e);
            }
        }

        if (!success) {
            console.error("[Oracle] Failed to update market state from all sources.");
        }
    }
}

export const marketOracle = new MarketOracle();
