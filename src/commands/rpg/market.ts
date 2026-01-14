import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { marketOracle } from '../../services/market_oracle';

export const data = new SlashCommandBuilder()
    .setName('market')
    .setDescription('Check current RPG World Status & Market Buffs');

export async function execute(interaction: any) {
    const marketState = marketOracle.getState();
    let color = '#95a5a6'; // Crab (Grey)
    let title = "🦀 CRAB MARKET (Normal Mode)";
    let desc = "The market is stable. Monsters and Players have normal stats.";

    if (marketState.status === 'BULL') {
        color = '#00ff00';
        title = "🚀 BULL RUN DETECTED (Easy Mode)";
        desc = "**Effect:**\n✅ Player Damage +20%\n✅ XP Gain +10%\n✅ Gold Drop +10%\n🏷️ Shop Discount -20%\n\n*Time to farm!*";
    } else if (marketState.status === 'BEAR') {
        color = '#ff0000';
        title = "🩸 BEAR MARKET CRASH (Hard Mode)";
        desc = "**Effect:**\n⚠️ Monster Damage +50%\n⚠️ Player Damage -20%\n📈 Shop Prices Inflation (+100%)\n\n*Be careful, warrior...*";
    }

    const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(desc)
        .addFields({
            name: 'Bitcoin Price',
            value: `$${marketState.btcPrice.toLocaleString()} (${marketState.change24h > 0 ? '+' : ''}${marketState.change24h.toFixed(2)}%)`
        })
        .setColor(color as any)
        .setTimestamp(marketState.lastUpdate);

    await interaction.reply({ embeds: [embed] });
}
