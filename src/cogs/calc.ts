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

        if (entry !== null && sl !== null) {
            const risk = Math.abs(entry - sl);
            if (risk === 0) {
                await interaction.followUp('Entry price and Stop Loss price cannot be the same.');
                return;
            }
            const position_size = (saldo * 0.01) / risk; // Assuming 1% risk of saldo
            await interaction.followUp(`With a balance of ${saldo}, entry at ${entry} and stop loss at ${sl}, your position size is ${position_size.toFixed(2)} units.`);
        } else if (percent_to_sl !== null) {
            const riskAmount = saldo * (percent_to_sl / 100);
            // This calculation needs more context, like entry price, to be accurate for position size.
            // For now, it will just show the risk amount.
            await interaction.followUp(`With a balance of ${saldo} and risking ${percent_to_sl}% per trade, you are risking ${riskAmount.toFixed(2)}. (Position size calculation needs entry price).`);
        } else {
            await interaction.followUp('Please provide either entry and stop loss prices, or a percentage to stop loss.');
        }
    },
};