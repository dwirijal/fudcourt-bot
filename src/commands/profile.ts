import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const data = new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Check your RPG profile, gold, and inventory.');

export async function execute(interaction: any) {
    await interaction.deferReply();
    const userId = interaction.user.id;

    try {
        // Fetch or Create User
        let user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            user = await prisma.user.create({
                data: { id: userId }
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`👤 ${interaction.user.username}'s Profile`)
            .setColor(0x0099FF)
            .addFields(
                { name: '💰 Gold', value: `${user.gold}`, inline: true },
                { name: '🧪 Potions', value: `${user.potions}`, inline: true },
                { name: '⚔️ Weapon', value: user.hasSword ? "Iron Sword (+15 Dmg)" : "Wooden Stick", inline: true }
            )
            .setFooter({ text: "Use /shop to buy more items!" });

        await interaction.editReply({ embeds: [embed] });

    } catch (error: any) {
        console.error(error);
        await interaction.editReply(`Error fetching profile: ${error.message}`);
    }
}
