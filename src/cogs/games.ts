
import { CommandInteraction, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('games')
        .setDescription('Play a game.')
        .addStringOption(option =>
            option.setName('gamename')
                .setDescription('The name of the game to play')
                .setRequired(true)),
    async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        await interaction.deferReply();

        const gamename = interaction.options.getString('gamename', true);

        await interaction.followUp(`Playing ${gamename} (functionality not yet implemented).`);
    },
};
