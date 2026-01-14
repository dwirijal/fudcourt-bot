import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { prisma } from '../../db';

export const data = new SlashCommandBuilder()
    .setName('blackmarket')
    .setDescription('??? (Secret Shop)');

export async function execute(interaction: any) {
    const userId = interaction.user.id;

    // Secret shop logic: Only accessible at night? Or random chance?
    // For now, let's make it always accessible but risky.

    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('buy_steroid')
                .setLabel('💉 Steroid Potion (1000g)')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId('buy_rugpull')
                .setLabel('📜 Rugpull Scroll (5000g)')
                .setStyle(ButtonStyle.Secondary)
        );

    const msg = await interaction.reply({
        content: `🕵️‍♂️ **Psst... Welcome to the Black Market.**\n` +
            `Items here are illegal and risky. No refunds.\n` +
            `• **Steroid Potion**: Double damage next battle, but you might lose HP.\n` +
            `• **Rugpull Scroll**: Steal 10% gold from a random player (50% chance to fail and lose your own gold).`,
        components: [row],
        ephemeral: true,
        fetchReply: true
    });

    const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000
    });

    collector.on('collect', async (i: any) => {
        // ... (Implementation of Black Market items would go here)
        // For scope of this task (No AI replacement), just a placeholder for the mechanism is enough
        // as the user asked for "2 big features" (Auction & Achievement) and listed Black Market as 3rd.
        // But let's implement basic purchase.

        const player = await prisma.user.findUnique({ where: { id: userId } });
        if (!player) return;

        if (i.customId === 'buy_steroid') {
            const cost = 1000;
            if (player.gold < cost) return i.reply({ content: "Get out, you're poor.", ephemeral: true });

            await prisma.$transaction(async (tx) => {
                await tx.user.update({
                    where: { id: userId },
                    data: { gold: { decrement: cost } }
                });

                // Stack Item
                const existing = await tx.inventoryItem.findFirst({
                    where: { userId, itemName: "Steroid Potion" }
                });

                if (existing) {
                    await tx.inventoryItem.update({
                        where: { id: existing.id },
                        data: { quantity: { increment: 1 } }
                    });
                } else {
                    await tx.inventoryItem.create({
                        data: { userId, itemName: "Steroid Potion", rarity: "Illegal", damage: 0, quantity: 1 }
                    });
                }
            });
            await i.reply({ content: "You bought the stuff. Don't tell anyone.", ephemeral: true });
        }
        else if (i.customId === 'buy_rugpull') {
            const cost = 5000;
            if (player.gold < cost) return i.reply({ content: "Get out, you're poor.", ephemeral: true });

            await prisma.$transaction(async (tx) => {
                await tx.user.update({
                    where: { id: userId },
                    data: { gold: { decrement: cost } }
                });

                // Stack Item
                const existing = await tx.inventoryItem.findFirst({
                    where: { userId, itemName: "Rugpull Scroll" }
                });

                if (existing) {
                    await tx.inventoryItem.update({
                        where: { id: existing.id },
                        data: { quantity: { increment: 1 } }
                    });
                } else {
                    await tx.inventoryItem.create({
                        data: { userId, itemName: "Rugpull Scroll", rarity: "Illegal", damage: 0, quantity: 1 }
                    });
                }
            });
            await i.reply({ content: "Heh. Good luck using this.", ephemeral: true });
        }
    });
}
