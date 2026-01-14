import { Client, EmbedBuilder } from 'discord.js';
import { prisma } from '../db';
import { marketState } from './market_oracle';

export function startPredictionService(client: Client) {
    console.log('[Prediction] Starting Prediction Service (1m interval)...');

    // Check every minute
    setInterval(async () => {
        await resolvePredictions(client);
    }, 60 * 1000);
}

async function resolvePredictions(client: Client) {
    try {
        const currentPrice = marketState.btcPrice;
        if (currentPrice === 0) return; // Oracle not ready

        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

        // Find Pending bets older than 5 minutes
        // Logic: bet.startTime <= fiveMinutesAgo
        // We use 'startTime' as the reference.
        const pendingBets = await prisma.prediction.findMany({
            where: {
                status: 'PENDING',
                startTime: {
                    lte: fiveMinutesAgo
                }
            },
            include: { user: true }
        });

        if (pendingBets.length === 0) return;

        console.log(`[Prediction] Resolving ${pendingBets.length} bets... (BTC: $${currentPrice})`);

        for (const bet of pendingBets) {
            let isWin = false;
            if (bet.direction === 'UP' && currentPrice > bet.startPrice) isWin = true;
            if (bet.direction === 'DOWN' && currentPrice < bet.startPrice) isWin = true;

            let resultStatus = isWin ? 'WIN' : 'LOSS';
            let winnings = 0;

            if (isWin) {
                winnings = bet.amount * 2;
                // Update User Balance
                await prisma.user.update({
                    where: { id: bet.userId },
                    data: { gold: { increment: winnings } }
                });
            }

            // Update Bet Status
            await prisma.prediction.update({
                where: { id: bet.id },
                data: {
                    status: resultStatus,
                    resolvedAt: now
                }
            });

            // Notify User (Use Channel if available, fallback to DM)
            // Note: Schema has 'channelId' but previous file didn't include it in write.
            // I will assume channelId might be missing or added.
            // Let's use user.send fallback.

            try {
                const user = await client.users.fetch(bet.userId);
                if (user) {
                    const embed = new EmbedBuilder()
                        .setTitle(isWin ? "🎉 PREDICTION WON!" : "💀 PREDICTION LOST")
                        .setColor(isWin ? 0x00FF00 : 0xFF0000)
                        .setDescription(
                            `**Direction:** ${bet.direction}\n` +
                            `**Start Price:** $${bet.startPrice.toLocaleString()}\n` +
                            `**End Price:** $${currentPrice.toLocaleString()}\n\n` +
                            (isWin ? `You won **${winnings} Gold**!` : `You lost **${bet.amount} Gold**.`)
                        )
                        .setTimestamp();

                    await user.send({ embeds: [embed] }).catch(() => {
                        console.log(`[Prediction] Could not DM user ${bet.userId}`);
                    });
                }
            } catch (e) {
                console.error(`[Prediction] Notification error: ${e}`);
            }
        }

    } catch (e) {
        console.error("[Prediction] Error resolving bets:", e);
    }
}
