import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '../../db';

export const data = new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Check your RPG profile, gold, and inventory.');

export async function execute(interaction: any) {
    await interaction.deferReply();
    if (interaction.channelId !== '1460783138237321317') {
        await interaction.editReply("❌ This command can only be used in the **Town Hall**!");
        return;
    }
    const userId = interaction.user.id;

    try {
        // Fetch or Create User
        let user = await prisma.user.findUnique({
            where: { id: userId },
            include: { inventory: true }
        });

        if (!user) {
            await prisma.user.create({ data: { id: userId } });
            // Re-fetch with relation
            user = await prisma.user.findUnique({
                where: { id: userId },
                include: { inventory: true }
            });
        }

        if (!user) return; // Should not happen

        const inventoryList = user.inventory.length > 0
            ? user.inventory.map(i => `${i.itemName} (x${i.quantity})`).join(', ')
            : "Empty";

        const equipped = user.equippedWeapon || "None";

        const embed = new EmbedBuilder()
            .setTitle(`${interaction.user.username}'s Profile`)
            .setColor(0x00AE86)
            .addFields(
                { name: '💰 Gold', value: `${user.gold}`, inline: true },
                { name: '🧪 Potions', value: `${user.potions}`, inline: true },
                { name: '⚔️ Equipped', value: `${equipped}`, inline: true },
                { name: '🛡️ Class', value: `${user.job}`, inline: true },
                { name: '🎒 Inventory', value: inventoryList },
                { name: '📊 Stats', value: `Level: ${user.level} | XP: ${user.xp} | Streak: ${user.dailyStreak}` }
            )
            .setThumbnail(interaction.user.displayAvatarURL());

        await interaction.editReply({ embeds: [embed] });

    } catch (error: any) {
        console.error(error);
        await interaction.editReply(`Error fetching profile: ${error.message}`);
    }
}
