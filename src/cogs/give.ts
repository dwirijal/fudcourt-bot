import { CommandInteraction, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('give')
        .setDescription('Give points to a member.')
        .addUserOption(option =>
            option.setName('member')
                .setDescription('The member to give points to')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('points')
                .setDescription('The amount of points to give')
                .setRequired(true)),
    async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        await interaction.deferReply();

        const member = interaction.options.getUser('member', true);
        const points = interaction.options.getInteger('points', true);

        // Placeholder for points giving logic
        // - Check if the user has enough points
        // - Update the points of both users in the database

        await interaction.followUp(`You gave ${points} points to ${member.username} (functionality not yet implemented).`);
    },
};