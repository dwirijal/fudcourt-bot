import { SlashCommandBuilder } from 'discord.js';
import { prisma } from '../../db';

export const data = new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily salary (Every 24 Hours)');

export async function execute(interaction: any) {
    const userId = interaction.user.id;

    // Ensure User Exists
    const player = await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
            id: userId,
            username: interaction.user.username,
            gold: 100
        }
    });

    // 1. Check Cooldown (24 Hours)
    const now = new Date();
    if (player.lastDaily) {
        const lastDaily = new Date(player.lastDaily);
        const diff = now.getTime() - lastDaily.getTime();
        const oneDay = 24 * 60 * 60 * 1000;

        if (diff < oneDay) {
            const timeLeft = oneDay - diff;
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            return interaction.reply(`⏳ You've already worked today! Come back in **${hours}h ${minutes}m**.`);
        }
    }

    // 2. Reward Logic
    // Random 100 - 300 Gold
    const reward = Math.floor(Math.random() * 201) + 100; // (0-200) + 100

    // Streak Logic (Simple increment, reset if > 48h)
    let streak = player.dailyStreak;
    if (player.lastDaily) {
        const diffHours = (now.getTime() - new Date(player.lastDaily).getTime()) / (1000 * 60 * 60);
        if (diffHours < 48) {
            streak++;
        } else {
            streak = 1;
        }
    } else {
        streak = 1;
    }

    // 3. Update DB
    await prisma.user.update({
        where: { id: userId },
        data: {
            gold: { increment: reward },
            lastDaily: now,
            dailyStreak: streak
        }
    });

    return interaction.reply(`💰 **Payday!** You received **${reward} Gold**.\nTotal Gold: ${player.gold + reward}\n🔥 Streak: ${streak}`);
}
