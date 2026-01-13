import { CommandInteraction, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('points')
        .setDescription('Check your points.'),
    async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        await interaction.deferReply();

        // Placeholder for points system
        const userPoints = 0; // Replace with actual points from a database or service

        await interaction.followUp(`You have ${userPoints} points.`);
    },
};