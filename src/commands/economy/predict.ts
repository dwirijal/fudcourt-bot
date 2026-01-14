import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '../../db';
import { marketOracle } from '../../services/market_oracle';

export const data = new SlashCommandBuilder()
    .setName('predict')
    .setDescription('Bet on BTC price movement (5 Minutes)')
    .addStringOption(option =>
        option.setName('direction')
            .setDescription('Will BTC go UP or DOWN?')
            .setRequired(true)
            .addChoices(
                { name: '🚀 UP (Bull)', value: 'UP' },
                { name: '📉 DOWN (Bear)', value: 'DOWN' }
            ))
    .addIntegerOption(option =>
        option.setName('amount')
            .setDescription('Amount of Gold to bet')
            .setRequired(true));

export async function execute(interaction: any) {
    await interaction.deferReply();
    const userId = interaction.user.id;
    const direction = interaction.options.getString('direction');
    const amount = interaction.options.getInteger('amount');

    if (amount <= 0) {
        return interaction.editReply("❌ Bet amount must be positive!");
    }

    const currentPrice = marketOracle.getState().btcPrice;
    if (currentPrice === 0) {
        return interaction.editReply("❌ Market Oracle is initializing. Please wait...");
    }

    // 1. Check User Balance
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.gold < amount) {
        return interaction.editReply(`❌ Insufficient funds! You have **${user?.gold || 0} Gold**.`);
    }

    try {
        // 2. Place Bet (Atomic)
        await prisma.$transaction(async (tx) => {
            // Deduct Gold
            await tx.user.update({
                where: { id: userId },
                data: { gold: { decrement: amount } }
            });

            // Create Prediction
            await tx.prediction.create({
                data: {
                    userId,
                    channelId: interaction.channelId, // Now strictly supported
                    direction,
                    amount,
                    startPrice: currentPrice,
                    status: 'PENDING'
                }
            });
        });

        const endTime = new Date(Date.now() + 5 * 60 * 1000);
        const embed = new EmbedBuilder()
            .setTitle(`🎰 Prediction Placed: ${direction}`)
            .setColor(direction === 'UP' ? 0x00FF00 : 0xFF0000)
            .setDescription(
                `**Amount:** ${amount} Gold\n` +
                `**Start Price:** $${currentPrice.toLocaleString()}\n` +
                `**End Time:** <t:${Math.floor(endTime.getTime() / 1000)}:R>\n\n` +
                `*If BTC is ${direction === 'UP' ? 'higher' : 'lower'} in 5 mins, you win 2x!*`
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (e) {
        console.error(e);
        await interaction.editReply("❌ Failed to place bet. (Database Error)");
    }
}
