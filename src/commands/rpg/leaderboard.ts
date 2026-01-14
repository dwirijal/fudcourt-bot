import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '../../db';

export const data = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the server rankings')
    .addStringOption(option =>
        option.setName('category')
            .setDescription('Ranking Category')
            .setRequired(true)
            .addChoices(
                { name: 'Level (Top Grinders)', value: 'xp' },
                { name: 'Rich List (Top Gold)', value: 'gold' }
            ));

export async function execute(interaction: any) {
    await interaction.deferReply();
    const category = interaction.options.getString('category');

    // Fetch Top 10
    // Note: We sort by 'level' if category is 'xp', because higher level = higher xp typically,
    // or just sort by xp descending. The code requested uses 'orderBy: { [category]: desc }'.
    // Since 'xp' is a field in User, this works directly.

    // For Level leaderboard, we usually want Level DESC, then XP DESC.
    // But simplistic approach requested:
    const orderBy = category === 'xp' ? [{ level: 'desc' }, { xp: 'desc' }] : { gold: 'desc' };

    const topPlayers = await prisma.user.findMany({
        take: 10,
        orderBy: orderBy as any // Cast because dynamic orderBy can be tricky with types
    });

    if (topPlayers.length === 0) {
        await interaction.editReply("No player data found.");
        return;
    }

    const leaderboardString = topPlayers.map((p, index) => {
        let rank = `${index + 1}.`;
        if (index === 0) rank = "🥇";
        if (index === 1) rank = "🥈";
        if (index === 2) rank = "🥉";

        const val = category === 'xp'
            ? `Lvl ${p.level} (${p.xp} XP)`
            : `${p.gold.toLocaleString()} Gold`;

        return `${rank} **${p.username || 'Unknown Warrior'}** — ${val}`;
    }).join('\n');

    const embed = new EmbedBuilder()
        .setTitle(category === 'xp' ? '🏆 Hall of Fame (Level)' : '💰 Fudcourt Rich List')
        .setDescription(leaderboardString)
        .setColor(0xFFD700)
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/3113/3113025.png')
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}
