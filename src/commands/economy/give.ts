import { SlashCommandBuilder } from 'discord.js';
import { prisma } from '../../db';

export const data = new SlashCommandBuilder()
    .setName('give')
    .setDescription('Transfer gold to another player')
    .addUserOption(option =>
        option.setName('target')
            .setDescription('User to give gold to')
            .setRequired(true))
    .addIntegerOption(option =>
        option.setName('amount')
            .setDescription('Amount of gold')
            .setRequired(true)
            .setMinValue(1));

export async function execute(interaction: any) {
    await interaction.deferReply();
    const senderId = interaction.user.id;
    const targetUser = interaction.options.getUser('target');
    const amount = interaction.options.getInteger('amount');
    const targetId = targetUser.id;

    if (senderId === targetId) {
        await interaction.editReply("❌ You cannot give gold to yourself!");
        return;
    }

    try {
        const sender = await prisma.user.findUnique({ where: { id: senderId } });

        if (!sender || sender.gold < amount) {
            await interaction.editReply(`❌ You don't have enough gold! (Balance: ${sender?.gold || 0})`);
            return;
        }

        // Transaction
        await prisma.$transaction([
            prisma.user.update({
                where: { id: senderId },
                data: { gold: { decrement: amount } }
            }),
            prisma.user.upsert({
                where: { id: targetId },
                update: { gold: { increment: amount } },
                create: { id: targetId, gold: amount }
            })
        ]);

        await interaction.editReply(`💸 You gave **${amount} Gold** to ${targetUser.username}!`);

    } catch (error: any) {
        console.error(error);
        await interaction.editReply('Error transferring gold.');
    }
}
