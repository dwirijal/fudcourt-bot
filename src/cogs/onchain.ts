import { CommandInteraction, SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';
import { fetchDexData } from '../utils/data_fetcher.js';
import { formatDistanceToNow } from 'date-fns';

export default {
    data: new SlashCommandBuilder()
        .setName('dex')
        .setDescription('Get DEX analysis for a token')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The token symbol or address')
                .setRequired(true)),
    async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        await interaction.deferReply();

        const query = interaction.options.getString('query', true);

        try {
            const pairData = await fetchDexData(query);

            if (!pairData) {
                await interaction.followUp(`No DEX data found for ${query}`);
                return;
            }

            const baseToken = pairData.baseToken || {};
            const quoteToken = pairData.quoteToken || {};
            const priceUsd = pairData.priceUsd || 'N/A';
            const liquidity = pairData.liquidity?.usd || 0;
            const fdv = pairData.fdv || 0;
            const pairCreatedAt = pairData.pairCreatedAt;
            const url = pairData.url || '';
            const chainId = pairData.chainId || 'unknown';

            const embed = new EmbedBuilder()
                .setTitle(`${baseToken.name || 'Unknown'} (${baseToken.symbol || ''})`)
                .setURL(url)
                .setColor(0xff7400)
                .addFields(
                    { name: 'Chain', value: chainId.charAt(0).toUpperCase() + chainId.slice(1), inline: true },
                    { name: 'Price', value: `$${priceUsd}`, inline: true },
                    { name: 'Liquidity', value: `$${liquidity.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, inline: true },
                    { name: 'FDV', value: `$${fdv.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, inline: true },
                );

            if (pairCreatedAt) {
                const createdAt = new Date(pairCreatedAt);
                embed.addFields({ name: 'Pair Age', value: `${formatDistanceToNow(createdAt)} ago`, inline: true });
            }

            await interaction.followUp({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.followUp(`An error occurred: ${error}`);
        }
    },
};