import { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } from 'discord.js';
import ccxt from 'ccxt';
import { renderCandlestickChart } from '../../utils/CanvasUtils';

// Cache map to prevent API spam (simple in-memory cache)
const cache = new Map<string, { data: any, timestamp: number }>();

export const data = new SlashCommandBuilder()
    .setName('coin')
    .setDescription('Get CEX market analysis (Binance)')
    .addStringOption(option =>
        option.setName('symbol')
            .setDescription('The coin symbol (e.g. BTC, ETH)')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('timeframe')
            .setDescription('Timeframe (15m, 1h, 4h, 1d)')
            .setRequired(false));

export async function execute(interaction: any) {
    await interaction.deferReply();

    const rawSymbol = interaction.options.getString('symbol').toUpperCase();
    const timeframe = interaction.options.getString('timeframe') || '4h';

    // Normalize symbol (ensure /USDT)
    const symbol = rawSymbol.includes('/') ? rawSymbol : `${rawSymbol}/USDT`;

    try {
        // Check Cache
        const cacheKey = `${symbol}-${timeframe}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes
            console.log(`[Cache Hit] ${cacheKey}`);
            // Use cached data
            var candles = cached.data;
        } else {
            console.log(`[API Fetch] ${cacheKey}`);
            const exchange = new ccxt.binance();
            const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, 100);

            if (!ohlcv || ohlcv.length === 0) {
                await interaction.editReply(`No data found for ${symbol}. Check the symbol or try again.`);
                return;
            }

            // Map to object format
            candles = ohlcv.map(c => ({
                timestamp: c[0] as number,
                open: c[1] as number,
                high: c[2] as number,
                low: c[3] as number,
                close: c[4] as number,
                volume: c[5] as number
            }));

            // Save to Cache
            cache.set(cacheKey, { data: candles, timestamp: Date.now() });
        }

        // Render Chart
        const chartState = {
            symbol,
            timeframe,
            candles: candles
        };
        const attachment = await renderCandlestickChart(chartState);

        // Current Price info
        const lastCandle = candles[candles.length - 1];
        const prevCandle = candles[candles.length - 2];
        const priceChange = ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100;
        const color = priceChange >= 0 ? 0x00FF00 : 0xFF0000;

        const embed = new EmbedBuilder()
            .setTitle(`${symbol} Analysis (${timeframe})`)
            .setColor(color)
            .addFields(
                { name: 'Price', value: `$${lastCandle.close.toFixed(2)}`, inline: true },
                { name: '24h Change (est)', value: `${priceChange.toFixed(2)}%`, inline: true },
                { name: 'High', value: `$${lastCandle.high.toFixed(2)}`, inline: true },
                { name: 'Low', value: `$${lastCandle.low.toFixed(2)}`, inline: true }
            )
            .setImage('attachment://chart.png')
            .setTimestamp();

        await interaction.editReply({
            embeds: [embed],
            files: [attachment]
        });

    } catch (error: any) {
        console.error(error);
        await interaction.editReply(`Error fetching data: ${error.message}`);
    }
}
