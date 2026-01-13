import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '../db';


export const data = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('See the top 10 strongest warriors!');

export async function execute(interaction: any) {
    await interaction.deferReply();

    try {
        const topUsers = await prisma.user.findMany({
            take: 10,
            orderBy: [
                { level: 'desc' },
                { xp: 'desc' },
            ]
        });

        if (topUsers.length === 0) {
            await interaction.editReply("No warriors have started their journey yet!");
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle("🏆 Hall of Fame")
            .setDescription("Top 10 Warriors by Level")
            .setColor(0xFFD700) // Gold color
            .setTimestamp();

        let description = "";

        for (let i = 0; i < topUsers.length; i++) {
            const user = topUsers[i];

            // Try to resolve username from cache or API
            // Note: In large bots, fetching every user might be slow. 
            // We'll use <@id> mention format which Discord resolves automatically on client side.

            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
            const bold = i < 3 ? "**" : "";

            description += `${medal} ${bold}<@${user.id}>${bold}\n`;
            description += `   Level ${user.level} • ${user.xp} XP • ${user.gold} Gold\n\n`;
        }

        embed.setDescription(description);

        await interaction.editReply({ embeds: [embed] });

    } catch (error: any) {
        console.error(error);
        await interaction.editReply(`Error fetching leaderboard: ${error.message}`);
    }
}
