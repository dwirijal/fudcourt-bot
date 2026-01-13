
import { CommandInteraction, SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ChatInputCommandInteraction } from 'discord.js';
import { fetchCexData } from '../utils/data_fetcher.js';
import { generateChart } from '../utils/charting.js';

export default {
    data: new SlashCommandBuilder()
        .setName('chart')
        .setDescription('Display a chart for a given ticker.')
        .addStringOption(option =>
            option.setName('ticker')
                .setDescription('The ticker symbol (e.g., BTC)')
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

            // Generate Chart
            const chartBuffer = generateChart(df, normalizedSymbol, timeframe);
            const chartFile = new AttachmentBuilder(chartBuffer, { name: 'chart.png' });

            const embed = new EmbedBuilder()
                .setTitle(`Chart for ${normalizedSymbol} (${timeframe})`)
                .setColor(0xff7400)
                .setImage('attachment://chart.png');

            await interaction.followUp({ embeds: [embed], files: [chartFile] });

        } catch (error) {
            console.error(error);
            await interaction.followUp(`An error occurred: ${error}`);
        }
    },
};
