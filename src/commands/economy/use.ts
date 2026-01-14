import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '../../db';

export const data = new SlashCommandBuilder()
    .setName('use')
    .setDescription('Use an item from your inventory')
    .addStringOption(option =>
        option.setName('item')
            .setDescription('The name of the item to use')
            .setRequired(true));

export async function execute(interaction: any) {
    await interaction.deferReply();
    const userId = interaction.user.id;
    const itemName = interaction.options.getString('item');

    // 1. Check Ownership
    const inventoryItem = await prisma.inventoryItem.findFirst({
        where: { userId: userId, itemName: itemName }
    });

    if (!inventoryItem || inventoryItem.quantity < 1) {
        return interaction.editReply(`❌ You don't have **${itemName}**!`);
    }

    // --- RUGPULL SCROLL LOGIC ---
    if (itemName.toLowerCase() === 'rugpull scroll') {
        // Logic:
        // 1. Find a random VICTIM (not self, gold > 0)
        // 2. 50% Fail -> Lose 10% own gold
        // 3. 50% Success -> Steal 10% victim gold (Max 5000)

        // Consume Item
        await prisma.$transaction(async (tx) => {
            // Decrement Item
            if (inventoryItem.quantity === 1) {
                await tx.inventoryItem.delete({ where: { id: inventoryItem.id } });
            } else {
                await tx.inventoryItem.update({
                    where: { id: inventoryItem.id },
                    data: { quantity: { decrement: 1 } }
                });
            }

            // Determine Fate
            const isSuccess = Math.random() > 0.5;

            if (!isSuccess) {
                // FAIL: LOSE OWN GOLD
                const user = await tx.user.findUnique({ where: { id: userId } });
                if (user) {
                    const loss = Math.floor(user.gold * 0.10);
                    await tx.user.update({
                        where: { id: userId },
                        data: { gold: { decrement: loss } }
                    });

                    const embed = new EmbedBuilder()
                        .setTitle("📜 Rugpull Backfired!")
                        .setDescription(`You tried to rugpull someone, but the SEC caught you!\n📉 **You lost ${loss} Gold** (10% Fine).`)
                        .setColor(0xFF0000);

                    await interaction.editReply({ embeds: [embed] });
                }
            } else {
                // SUCCESS: STEAL
                // Find explicit victim or random? "Random player"
                // Prisma doesn't have native "RANDOM()" easily across DBs, but for SQLite:
                const count = await tx.user.count({
                    where: {
                        gold: { gt: 100 },
                        id: { not: userId }
                    }
                });

                if (count === 0) {
                    await interaction.editReply("📜 You checked the market, but everyone is broke. Scroll wasted.");
                    return;
                }

                const skip = Math.floor(Math.random() * count);
                const victim = await tx.user.findFirst({
                    where: { gold: { gt: 100 }, id: { not: userId } },
                    skip: skip
                });

                if (!victim) {
                    await interaction.editReply("📜 Rugpull failed (Glitch in the matrix).");
                    return;
                }

                const stealAmount = Math.floor(victim.gold * 0.10);
                // Cap at 5000 or something to prevent rage quits?
                const finalSteal = Math.min(stealAmount, 5000);

                // Execute Steal
                await tx.user.update({ where: { id: victim.id }, data: { gold: { decrement: finalSteal } } });
                await tx.user.update({ where: { id: userId }, data: { gold: { increment: finalSteal } } });

                const embed = new EmbedBuilder()
                    .setTitle("📜 Rugpull Successful!")
                    .setDescription(`You rugpulled **${victim.username || 'Unknown'}**!\n💰 **Stolen: ${finalSteal} Gold**`)
                    .setColor(0x00FF00);

                await interaction.editReply({ embeds: [embed] });
            }
        });
        return;
    }

    // --- STEROID POTION (Usually used in Battle, but can use here for display?) ---
    if (itemName.toLowerCase() === 'steroid potion') {
        return interaction.editReply("💉 This item can only be used in **Battle**! Click the 'Use Item' button there.");
    }

    return interaction.editReply(`❓ You used **${itemName}**. Nothing happened.`);
}
