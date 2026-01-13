import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '../db';


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
            if (user.hasSword) {
                await interaction.editReply("❌ You already have a sword!");
                return;
            }
            if (user.gold < cost) {
                await interaction.editReply(`❌ You need **${cost} gold**! You have ${user.gold}.`);
                return;
            }

            await prisma.user.update({
                where: { id: userId },
                data: {
                    gold: { decrement: cost },
                    hasSword: true
                }
            });
            await interaction.editReply(`✅ You bought an **Iron Sword**! (-${cost}g)`);
        }
    }
}
