import { CommandInteraction, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Open your shop as a seller.'),
    async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        await interaction.deferReply();

        // Placeholder for shop logic
        await interaction.followUp('This command is not yet implemented.');
    },
};