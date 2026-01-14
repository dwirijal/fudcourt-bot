import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { prisma } from '../../db';
import { marketState } from '../../services/market_oracle';

export const data = new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Buy consumable items for your adventure');

export async function execute(interaction: any) {
    const userId = interaction.user.id;

    // --- DYNAMIC PRICING ---
    let basePotionPrice = 50;
    let baseElixirPrice = 150;

    let marketMsg = "";
    if (marketState.status === 'BEAR') {
        basePotionPrice *= 2; // Inflation
        baseElixirPrice *= 1.5;
        marketMsg = "\n📈 **BEAR MARKET INFLATION:** Prices have skyrocketed!";
    } else if (marketState.status === 'BULL') {
        basePotionPrice = Math.floor(basePotionPrice * 0.8); // 20% Discount
        baseElixirPrice = Math.floor(baseElixirPrice * 0.8);
        marketMsg = "\n🏷️ **BULL MARKET SALE:** Everything is 20% off!";
    }

    // UI Buttons
    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('buy_potion')
                .setLabel(`🧪 Health Potion (${basePotionPrice}g)`)
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('buy_elixir')
                .setLabel(`⚡ Energy Elixir (${baseElixirPrice}g)`)
                .setStyle(ButtonStyle.Primary)
        );

    // Initial Reply
    const msg = await interaction.reply({
        content: `**🏪 Fudcourt General Store**${marketMsg}\n` +
                 `Current Stock:\n` +
                 `• **Health Potion** (Restores HP)\n` +
                 `• **Energy Elixir** (Restores Energy/Stamina)`,
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
             await prisma.user.create({ data: { id: userId } });
             await i.reply({ content: "Profile created. Try buying again.", ephemeral: true });
             return;
        }

        let cost = 0;
        let itemName = "";

        if (i.customId === 'buy_potion') {
            cost = basePotionPrice;
            itemName = "Health Potion";
        } else if (i.customId === 'buy_elixir') {
            cost = baseElixirPrice;
            itemName = "Energy Elixir";
        }

        // Check Gold
        if (player.gold < cost) {
            await i.reply({ content: `❌ You need **${cost} Gold**! You have ${player.gold}.`, ephemeral: true });
            return;
        }

        try {
            await prisma.$transaction(async (tx) => {
                // 1. Deduct Gold
                await tx.user.update({
                    where: { id: userId },
                    data: { gold: { decrement: cost } }
                });

                // 2. Add to Inventory
                if (i.customId === 'buy_potion') {
                    await tx.user.update({
                        where: { id: userId },
                        data: { potions: { increment: 1 } }
                    });
                } else {
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
        const disabledRow = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder().setCustomId('buy_potion').setLabel('Shop Closed').setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('buy_elixir').setLabel('Shop Closed').setStyle(ButtonStyle.Secondary).setDisabled(true)
            );
        interaction.editReply({ components: [disabledRow] }).catch(() => {});
    });
}
