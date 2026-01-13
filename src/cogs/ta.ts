
import { CommandInteraction, SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ChatInputCommandInteraction } from 'discord.js';
import { fetchCexData } from '../utils/data_fetcher.js';
import { calculateIndicators, generateSetup, getSupportResistance } from '../utils/indicators.js';
import { generateChart } from '../utils/charting.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ta')
        .setDescription('Get technical analysis for a coin')
        .addStringOption(option =>
            option.setName('ticker')
                .setDescription('The coin symbol (e.g., BTC)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('timeframe')
                .setDescription('The timeframe (e.g., 4h)')
                .setRequired(false)),
    async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        await interaction.deferReply();

        const ticker = interaction.options.getString('ticker', true);
        let timeframe = interaction.options.getString('timeframe');
        if (!timeframe) {
            timeframe = '4h';
        }

        try {
            // Normalize symbol (e.g., BTC -> BTC/USDT)
            let normalizedSymbol = ticker.toUpperCase();
            if (!normalizedSymbol.includes('/')) {
                normalizedSymbol = `${normalizedSymbol}/USDT`;
            }

            const df = await fetchCexData(normalizedSymbol, timeframe);

            if (df.length === 0) {
                await interaction.followUp(`No data found for ${normalizedSymbol}`);
                return;
            }

            const dfWithIndicators = calculateIndicators(df);
            const setupText = generateSetup(dfWithIndicators);
            const [supports, resistances] = getSupportResistance(dfWithIndicators);

            const lastRow = dfWithIndicators[dfWithIndicators.length - 1];
            const price = lastRow.close;

            // Calculate 24h change logic (simplified)
            let lookback = 1;
            if (timeframe === '15m') lookback = 96;
            else if (timeframe === '1h') lookback = 24;
            else if (timeframe === '4h') lookback = 6;
            else if (timeframe === '1d') lookback = 1;

            let change24h = 0;
            if (dfWithIndicators.length > lookback) {
                const prevPrice = dfWithIndicators[dfWithIndicators.length - lookback - 1].close;
                change24h = ((price - prevPrice) / prevPrice) * 100;
            }

            // Generate Chart
            const chartBuffer = generateChart(dfWithIndicators, normalizedSymbol, timeframe);
            const chartFile = new AttachmentBuilder(chartBuffer, { name: 'chart.png' });

            const embed = new EmbedBuilder()
                .setTitle(`Analysis for ${normalizedSymbol} (${timeframe})`)
                .setColor(0xff7400)
                .addFields(
                    { name: 'Price', value: `$${price.toFixed(4)}`, inline: true },
                    { name: '24h Change', value: `${change24h.toFixed(2)}%`, inline: true },
                    { name: 'RSI (14)', value: lastRow.RSI ? lastRow.RSI.toFixed(2) : 'N/A', inline: true },
                )
                .setImage('attachment://chart.png');

            if (supports.length > 0) {
                embed.addFields({ name: 'Support', value: supports.map((s: number) => `$${s.toFixed(4)}`).join('\n'), inline: true });
            }
            if (resistances.length > 0) {
                embed.addFields({ name: 'Resistance', value: resistances.map((r: number) => `$${r.toFixed(4)}`).join('\n'), inline: true });
            }

            embed.addFields({ name: 'Trade Setup', value: setupText, inline: false });


            await interaction.followUp({ embeds: [embed], files: [chartFile] });

        } catch (error) {
            console.error(error);
            await interaction.followUp(`An error occurred: ${error}`);
        }
    },
};
