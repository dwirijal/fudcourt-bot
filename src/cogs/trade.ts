import { CommandInteraction, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('trade')
        .setDescription('Initiate a trade or open a ticker.')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('The trade action (e.g., "rekber", "open")')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('details')
                .setDescription('Additional details for the trade')
                .setRequired(false)),
    async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        await interaction.deferReply();

        const action = interaction.options.getString('action', true);
        const details = interaction.options.getString('details');

        // Placeholder for trade logic
        await interaction.followUp(`Trade action: "${action}", details: "${details || 'none'}" (functionality not yet implemented).`);
    },
};