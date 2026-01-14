
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '../../db';
import ccxt from 'ccxt';

export const data = new SlashCommandBuilder()
    .setName('bet')
    .setDescription('Bet on crypto price movement (Prediction Market)')
    .addStringOption(option =>
        option.setName('symbol')
            .setDescription('Coin Symbol (e.g. BTC, ETH)')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('direction')
            .setDescription('Predict UP or DOWN in 1 minute')
            .setRequired(true)
            .addChoices(
                { name: '🟢 UP (Call)', value: 'up' },
                { name: '🔴 DOWN (Put)', value: 'down' }
            ))
    .addIntegerOption(option =>
        option.setName('amount')
            .setDescription('Gold Amount to Bet')
            .setRequired(true)
            .setMinValue(10));

export async function execute(interaction: any) {
    await interaction.deferReply();

    if (interaction.channelId !== '1460782943940120667') {
        await interaction.editReply("❌ This command can only be used in the **Bet/Prediction Channel**!");
        return;
    }

    const userId = interaction.user.id;
    const rawSymbol = interaction.options.getString('symbol').toUpperCase();
    const direction = interaction.options.getString('direction');
    const amount = interaction.options.getInteger('amount');
    const symbol = rawSymbol.includes('/') ? rawSymbol : `${rawSymbol}/USDT`;

    // 1. Check Funds
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.gold < amount) {
        await interaction.editReply(`❌ You need **${amount} Gold**! Balance: ${user?.gold || 0}`);
        return;
    }

    // 2. Get Start Price
    const exchange = new ccxt.binance();
    let startPrice = 0;
    try {
        const ticker = await exchange.fetchTicker(symbol);
        if (!ticker || !ticker.last) throw new Error("Invalid Symbol");
        startPrice = ticker.last;
    } catch (e) {
        await interaction.editReply(`❌ Could not fetch price for **${symbol}**. Is it valid?`);
        return;
    }

    // 3. Deduct Gold (Escrow)
    await prisma.user.update({
        where: { id: userId },
        data: { gold: { decrement: amount } }
    });

    const embed = new EmbedBuilder()
        .setTitle(`🎲 PREDICTION: ${symbol}`)
        .setDescription(`**${interaction.user.username}** bets **${amount}g** that **${symbol}** will go **${direction.toUpperCase()}**!`)
        .addFields(
            { name: 'Start Price', value: `$${startPrice}`, inline: true },
            { name: 'Time', value: '1 Minute', inline: true },
            { name: 'Potential Win', value: `${amount * 2}g`, inline: true }
        )
        .setColor(direction === 'up' ? 0x00FF00 : 0xFF0000)
        .setFooter({ text: "Checking result in 60 seconds..." });

    await interaction.editReply({ embeds: [embed] });

    // 4. Wait 60s
    setTimeout(async () => {
        try {
            const endTicker = await exchange.fetchTicker(symbol);
            if (!endTicker || !endTicker.last) throw new Error("Fetch failed");
            const endPrice = endTicker.last;

            let won = false;
            if (direction === 'up' && endPrice > startPrice) won = true;
            if (direction === 'down' && endPrice < startPrice) won = true;

            const resultEmbed = new EmbedBuilder()
                .setTimestamp();

            if (won) {
                const payout = amount * 2;
                await prisma.user.update({
                    where: { id: userId },
                    data: { gold: { increment: payout } }
                });
                resultEmbed.setTitle("✅ YOU WON!")
                    .setColor(0x00FF00)
                    .setDescription(`**${symbol}** went ${direction.toUpperCase()} to **$${endPrice}**!\nYou won **${payout} Gold**!`);
            } else {
                resultEmbed.setTitle("❌ YOU LOST")
                    .setColor(0xFF0000)
                    .setDescription(`**${symbol}** moved to **$${endPrice}**.\nStart: $${startPrice}`);
            }

            await interaction.followUp({ content: `<@${userId}> Result:`, embeds: [resultEmbed] });

        } catch (e: any) {
            // Refund on error
            await prisma.user.update({
                where: { id: userId },
                data: { gold: { increment: amount } }
            });
            await interaction.followUp(`⚠️ Error checking price: ${e.message}. Gold refunded.`);
        }
    }, 60000); // 60s
}
