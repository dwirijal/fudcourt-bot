import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '../../db';
import { pullGacha, getRarityColor } from '../../gacha';

export const data = new SlashCommandBuilder()
    .setName('gacha')
    .setDescription('Summon a weapon for 500 Gold!');

export async function execute(interaction: any) {
    await interaction.deferReply();
    const userId = interaction.user.id;
    const COST = 500;

    // 1. Get User
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        user = await prisma.user.create({ data: { id: userId } });
    }

    // 2. Check Funds
    if (user.gold < COST) {
        await interaction.editReply(`❌ You need **${COST} Gold** to summon! (Balance: ${user.gold})`);
        return;
    }

    // 3. Pull Gacha
    const item = pullGacha();

    // 4. Update Inventory (Relational)
    const existingItem = await prisma.inventoryItem.findFirst({
        where: { userId: userId, itemName: item.name }
    });

    let isNew = false;
    if (existingItem) {
        await prisma.inventoryItem.update({
            where: { id: existingItem.id },
            data: { quantity: { increment: 1 } }
        });
    } else {
        isNew = true;
        await prisma.inventoryItem.create({
            data: {
                userId: userId,
                itemName: item.name,
                rarity: item.rarity,
                damage: item.damage,
                quantity: 1
            }
        });
    }

    await prisma.user.update({
        where: { id: userId },
        data: { gold: { decrement: COST } }
    });

    // 5. Show Result
    const embed = new EmbedBuilder()
        .setTitle("🔮 Summon Result")
        .setDescription(`You obtained: **${item.name}**\n\n` +
            `Rarity: **${item.rarity}**\n` +
            `Damage: **+${item.damage}**`)
        .setColor(getRarityColor(item.rarity))
        .setFooter({ text: isNew ? "✨ NEW ITEM!" : "♻️ Duplicate (+1 Quantity)" });

    await interaction.editReply({ embeds: [embed] });
}

