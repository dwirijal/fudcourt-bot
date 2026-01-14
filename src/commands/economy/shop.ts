import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { prisma } from '../../db';

export const data = new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Buy consumable items for your adventure');

export async function execute(interaction: any) {
    // If not in deferReply yet, we can't defer inside try/catch block if we want to reply normally.
    // However, the provided snippet uses reply then collector.
    // Usually interactive commands shouldn't use ephemeral if they want a persistent shop message.
    // The snippet used interaction.reply directly.

    const userId = interaction.user.id;

    // UI Buttons
    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('buy_potion')
                .setLabel('🧪 Health Potion (50g)')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('buy_elixir')
                .setLabel('⚡ Energy Elixir (150g)')
                .setStyle(ButtonStyle.Primary)
        );

    // Initial Reply
    const msg = await interaction.reply({
        content: `**🏪 Fudcourt General Store**\n` +
                 `Current Stock:\n` +
                 `• **Health Potion** (Restores HP) - 50 Gold\n` +
                 `• **Energy Elixir** (Restores Energy/Stamina) - 150 Gold`,
        components: [row],
        fetchReply: true
    });

    // Collector Logic
    const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000
    });

    collector.on('collect', async (i: any) => {
        if (i.user.id !== userId) {
            await i.reply({ content: "Please open your own shop!", ephemeral: true });
            return;
        }

        const player = await prisma.user.findUnique({ where: { id: userId } });
        if (!player) {
             // Create if not exists (safety net)
             await prisma.user.create({ data: { id: userId } });
             await i.reply({ content: "Profile created. Try buying again.", ephemeral: true });
             return;
        }

        let cost = 0;
        let itemName = "";

        if (i.customId === 'buy_potion') {
            cost = 50;
            itemName = "Health Potion";
        } else if (i.customId === 'buy_elixir') {
            cost = 150;
            itemName = "Energy Elixir";
        }

        // Check Gold
        if (player.gold < cost) {
            await i.reply({ content: `❌ You need **${cost} Gold**! You have ${player.gold}.`, ephemeral: true });
            return;
        }

        try {
            // Atomic Transaction
            await prisma.$transaction(async (tx) => {
                // 1. Deduct Gold
                await tx.user.update({
                    where: { id: userId },
                    data: { gold: { decrement: cost } }
                });

                // 2. Add to Inventory
                // Special handling for Potions if they are a specific column in User table vs InventoryItem
                // In Schema: 'potions' is an Int column on User.
                // But user wants generic InventoryItem logic potentially for 'Elixir' or other items.
                // Let's support both. If it's Potion, update User.potions. Else InventoryItem.

                if (i.customId === 'buy_potion') {
                    await tx.user.update({
                        where: { id: userId },
                        data: { potions: { increment: 1 } }
                    });
                } else {
                    // Inventory Item Logic
                    const existingItem = await tx.inventoryItem.findFirst({
                        where: { userId: userId, itemName: itemName }
                    });

                    if (existingItem) {
                        await tx.inventoryItem.update({
                            where: { id: existingItem.id },
                            data: { quantity: { increment: 1 } }
                        });
                    } else {
                        await tx.inventoryItem.create({
                            data: {
                                userId: userId,
                                itemName: itemName,
                                rarity: "Common",
                                damage: 0,
                                quantity: 1
                            }
                        });
                    }
                }
            });

            await i.reply({ content: `✅ You bought **${itemName}** for ${cost} Gold!`, ephemeral: true });

        } catch (error) {
            console.error(error);
            await i.reply({ content: "❌ Transaction failed.", ephemeral: true });
        }
    });

    collector.on('end', () => {
        // Disable buttons after timeout
        const disabledRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder().setCustomId('buy_potion').setLabel('Shop Closed').setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('buy_elixir').setLabel('Shop Closed').setStyle(ButtonStyle.Secondary).setDisabled(true)
            );
        interaction.editReply({ components: [disabledRow] }).catch(() => {});
    });
}
