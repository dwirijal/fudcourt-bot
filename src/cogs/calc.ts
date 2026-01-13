
import { CommandInteraction, SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('calc')
        .setDescription('Calculate position size.')
        .addNumberOption(option =>
            option.setName('saldo')
                .setDescription('Your balance')
                .setRequired(true))
        .addNumberOption(option =>
            option.setName('entry')
                .setDescription('The entry price')
                .setRequired(false))
        .addNumberOption(option =>
            option.setName('sl')
                .setDescription('The stop loss price')
                .setRequired(false))
        .addNumberOption(option =>
            option.setName('percent_to_sl')
                .setDescription('The percentage to stop loss')
                .setRequired(false)),
    async execute(interaction: CommandInteraction) {
        if (!interaction.isChatInputCommand()) return;

        await interaction.deferReply();

        const saldo = interaction.options.getNumber('saldo', true);
        const entry = interaction.options.getNumber('entry');
        const sl = interaction.options.getNumber('sl');
        const percent_to_sl = interaction.options.getNumber('percent_to_sl');

        if (entry && sl) {
            const risk = entry - sl;
            const position_size = (saldo * 0.01) / risk;
            await interaction.followUp(`With a balance of ${saldo}, entry at ${entry} and stop loss at ${sl}, your position size is ${position_size.toFixed(2)}`);
        } else if (percent_to_sl) {
            const risk = saldo * (percent_to_sl / 100);
            const position_size = (saldo * 0.01) / (risk / saldo);
            await interaction.followUp(`With a balance of ${saldo} and a ${percent_to_sl}% stop loss, your position size is ${position_size.toFixed(2)}`);
        } else {
            await interaction.followUp('Please provide either entry and sl, or percent_to_sl');
        }
    },
};
