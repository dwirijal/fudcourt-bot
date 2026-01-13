
import { CommandInteraction, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play music from YouTube.')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('The YouTube URL or search query')
                .setRequired(true)),
    async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        await interaction.deferReply();

        const query = interaction.options.getString('query', true);

        await interaction.followUp(`Playing ${query} (functionality not yet implemented).`);
    },
};
