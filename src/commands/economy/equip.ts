import { SlashCommandBuilder } from 'discord.js';
import { prisma } from '../../db';

export const data = new SlashCommandBuilder()
    .setName('equip')
    .setDescription('Equip a weapon from your inventory')
    .addStringOption(option =>
        option.setName('weapon')
            .setDescription('Name of the weapon')
            .setRequired(true));

export async function execute(interaction: any) {
    await interaction.deferReply();
    const userId = interaction.user.id;
    const weaponName = interaction.options.getString('weapon');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        await interaction.editReply("User not found.");
        return;
    }

    // Check if user owns the weapon (Case Insensitive)
    // We can't do case-insensitive search easily in SQLite Prisma without raw query, 
    // so let's fetch all items and find match in JS (safer for small inventory)
    const inventory = await prisma.inventoryItem.findMany({
        where: { userId: userId }
    });

    const foundItem = inventory.find(i => i.itemName.toLowerCase() === weaponName.toLowerCase());

    if (foundItem) {
        await prisma.user.update({
            where: { id: userId },
            data: { equippedWeapon: foundItem.itemName }
        });
        await interaction.editReply(`⚔️ You equipped **${foundItem.itemName}**!`);
    } else {
        await interaction.editReply(`❌ You don't own "**${weaponName}**". Check your \`/profile\`.`);
    }
}
