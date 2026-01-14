import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '../../db';


export const data = new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Buy items for battle')
    .addSubcommand(sub =>
        sub.setName('list')
            .setDescription('List available items'))
    .addSubcommand(sub =>
        sub.setName('buy')
            .setDescription('Buy an item')
            .addStringOption(option =>
                option.setName('item')
                    .setDescription('Item to buy (potion, sword)')
                    .setRequired(true)
                    .addChoices(
                        { name: '🧪 Potion (50g)', value: 'potion' },
                        { name: '⚔️ Iron Sword (200g)', value: 'sword' }
                    )));

export async function execute(interaction: any) {
    await interaction.deferReply();
    if (interaction.channelId !== '1460782848570298495') {
        await interaction.editReply("❌ This command can only be used in the **Market Channel**!");
        return;
    }
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    // Ensure User Exists
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        user = await prisma.user.create({ data: { id: userId } });
    }

    if (sub === 'list') {
        const embed = new EmbedBuilder()
            .setTitle("🛒 Goblin Trader")
            .setDescription("Welcome! What are ya buyin'?")
            .setColor(0xFFA500)
            .addFields(
                { name: '🧪 Potion (50g)', value: 'Restores 40 HP in battle.' },
                { name: '⚔️ Iron Sword (200g)', value: 'Deals +15 bonus damage.' }
            )
            .setFooter({ text: `Your Gold: ${user.gold}` });

        await interaction.editReply({ embeds: [embed] });
        return;
    }

    if (sub === 'buy') {
        const item = interaction.options.getString('item');

        if (item === 'potion') {
            const cost = 50;
            if (user.gold < cost) {
                await interaction.editReply(`❌ You need **${cost} gold**! You have ${user.gold}.`);
                return;
            }

            await prisma.user.update({
                where: { id: userId },
                data: {
                    gold: { decrement: cost },
                    potions: { increment: 1 }
                }
            });
            await interaction.editReply(`✅ You bought a **Potion**! (-${cost}g)`);
        }
        else if (item === 'sword') {
            const cost = 200;
            // Removed 'hasSword' check as it doesn't exist in new schema.
            // In new schema, equippedWeapon is string.
            if (user.equippedWeapon === 'Iron Sword') {
                 await interaction.editReply("❌ You already have this sword equipped!");
                 return;
            }

            if (user.gold < cost) {
                await interaction.editReply(`❌ You need **${cost} gold**! You have ${user.gold}.`);
                return;
            }

            // In new system, we probably add to inventory? But for now, let's just equip it to match behavior.
            // Or add to Inventory table.
            // Let's add to Inventory AND equip it.

            await prisma.user.update({
                where: { id: userId },
                data: {
                    gold: { decrement: cost },
                    equippedWeapon: "Iron Sword"
                }
            });

            // Also add to inventory logic if needed, but for 'shop' legacy compatibility I'll stick to just updating user state
            // actually, let's sync with schema.

            await prisma.inventoryItem.create({
                data: {
                    userId: userId,
                    itemName: "Iron Sword",
                    rarity: "Common",
                    damage: 15
                }
            });

            await interaction.editReply(`✅ You bought and equipped an **Iron Sword**! (-${cost}g)`);
        }
    }
}
