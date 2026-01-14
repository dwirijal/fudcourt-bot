import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { fetchCexData } from '../../utils/data_fetcher';
import { renderCandlestickChart } from '../../utils/CanvasUtils';

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
        // Fetch Data (Optimized DB + API)
        const candles = await fetchCexData(symbol, timeframe);

        if (!candles || candles.length === 0) {
            await interaction.editReply(`No data found for ${symbol}. Check the symbol or try again.`);
            return;
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
        // Fallback for previous candle if only 1 exists
        const prevCandle = candles.length > 1 ? candles[candles.length - 2] : lastCandle;

        const priceChange = prevCandle.close !== 0
            ? ((lastCandle.close - prevCandle.close) / prevCandle.close) * 100
            : 0;

        const color = priceChange >= 0 ? 0x00FF00 : 0xFF0000;

        const embed = new EmbedBuilder()
            .setTitle(`${symbol} Analysis (${timeframe})`)
            .setColor(color)
            .addFields(
                { name: 'Price', value: `$${lastCandle.close.toFixed(2)}`, inline: true },
                { name: 'Change', value: `${priceChange.toFixed(2)}%`, inline: true },
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
