import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import axios from 'axios';
import { renderTokenCard } from '../../utils/CanvasUtils';

const cache = new Map<string, { data: any, timestamp: number }>();

export const data = new SlashCommandBuilder()
    .setName('dex')
    .setDescription('Get DEX token analysis (DEXScreener)')
    .addStringOption(option =>
        option.setName('query')
            .setDescription('Token symbol or address')
            .setRequired(true));

export async function execute(interaction: any) {
    await interaction.deferReply();

    try {

        const query = interaction.options.getString('query');

        const cacheKey = `dex-${query}`;
        const cached = cache.get(cacheKey);
        let pairs;

        if (cached && Date.now() - cached.timestamp < 60 * 1000) { // 1 minute cache for DEX
            pairs = cached.data;
        } else {
            let url = `https://api.dexscreener.com/latest/dex/search?q=${query}`;
            if (query.startsWith('0x') && query.length > 30) {
                url = `https://api.dexscreener.com/latest/dex/tokens/${query}`;
            }
            const response = await axios.get(url);
            pairs = response.data.pairs;
            cache.set(cacheKey, { data: pairs, timestamp: Date.now() });
        }

        if (!pairs || pairs.length === 0) {
            await interaction.editReply(`No DEX data found for "${query}"`);
            return;
        }

        // Sort by liquidity USD desc
        pairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
        const pair = pairs[0];

        // Prepare data for Canvas
        const price = parseFloat(pair.priceUsd || '0');
        const liquidity = parseFloat(pair.liquidity?.usd || '0');
        const fdv = parseFloat(pair.fdv || '0');
        const change24h = parseFloat(pair.priceChange?.h24 || '0');

        const formatMoney = (n: number) => {
            if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
            if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
            return `$${n.toFixed(0)}`;
        };

        const attachment = await renderTokenCard({
            name: pair.baseToken.name,
            symbol: pair.baseToken.symbol,
            chain: pair.chainId,
            price: `$${price < 0.01 ? price.toFixed(6) : price.toFixed(2)}`,
            liquidity: formatMoney(liquidity),
            fdv: formatMoney(fdv),
            change24h: change24h
        });

        await interaction.editReply({ files: [attachment] });

    } catch (error: any) {
        console.error(error);
        await interaction.editReply(`Error fetching DEX data: ${error.message}`);
    }
}
