
import { CommandInteraction, SlashCommandBuilder, EmbedBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Check the server ranking.'),
    async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        await interaction.deferReply();

        // Placeholder for fetching ranking data
        const rankingData = [
            { name: 'User1', points: 1200 },
            { name: 'User2', points: 1000 },
            { name: 'User3', points: 800 },
        ]; // Replace with actual ranking data

        const embed = new EmbedBuilder()
            .setTitle('Server Ranking')
            .setColor(0x00AE86)
            .setDescription(rankingData.map((user, index) => `${index + 1}. ${user.name}: ${user.points} points`).join('\n'));

        await interaction.followUp({ embeds: [embed] });
    },
};

