import { SlashCommandBuilder } from 'discord.js';
import { prisma } from '../../db';
import { differenceInHours } from 'date-fns';

export const data = new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily gold reward!');

export async function execute(interaction: any) {
    await interaction.deferReply();
    const userId = interaction.user.id;

    if (interaction.channelId !== '1460783138237321317') {
        await interaction.editReply("❌ This command can only be used in the **Town Hall**!");
        return;
    }

    try {
        let user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            user = await prisma.user.create({ data: { id: userId } });
        }

        const now = new Date();
        const lastDaily = user.lastDaily;
        let streak = user.dailyStreak;

        if (lastDaily) {
            const hoursDiff = differenceInHours(now, lastDaily);
            if (hoursDiff < 24) {
                const hoursLeft = 24 - hoursDiff;
                const nextReward = 100 * Math.min(5, Math.floor((streak + 1) / 5) + 1); // rough estimate logic for display
                await interaction.editReply(`⏳ You have already claimed your daily reward! Come back in **${hoursLeft} hours**.\nCurrent Streak: 🔥 **${streak}**`);
                return;
            }

            // Streak Logic: If hoursDiff is between 24 and 48, increment streak. Else reset.
            if (hoursDiff < 48) {
                streak += 1;
            } else {
                streak = 1; // Reset
            }
        } else {
            streak = 1;
        }

        // Multiplier: 10% per streak day, max 200% (streak 20)
        // Or simpler: Flat bonus? Let's use Multiplier.
        // Base = 100. Streak 1 = 100. Streak 5 = 150. Streak 10 = 200.
        const baseReward = 100;
        const multiplier = 1 + (Math.min(streak, 10) * 0.1);
        const reward = Math.floor(baseReward * multiplier);

        await prisma.user.update({
            where: { id: userId },
            data: {
                gold: { increment: reward },
                lastDaily: now,
                dailyStreak: streak
            }
        });

        await interaction.editReply(`💰 **Daily Reward Claimed!**\n` +
            `Streak: 🔥 **${streak}**\n` +
            `Reward: **${reward} Gold** ${multiplier > 1 ? `(x${multiplier.toFixed(1)} Bonus)` : ""}`
        );

    } catch (error: any) {
        console.error(error);
        await interaction.editReply('Error claiming daily reward.');
    }
}
