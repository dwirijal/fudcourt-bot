import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from 'discord.js';
import { prisma } from '../../db';
import { gachaPool } from '../../gacha';

export const data = new SlashCommandBuilder()
    .setName('duel')
    .setDescription('Challenge another player to a duel for Gold!')
    .addUserOption(option =>
        option.setName('opponent')
            .setDescription('The user to challenge')
            .setRequired(true))
    .addIntegerOption(option =>
        option.setName('amount')
            .setDescription('Amount of gold to bet')
            .setRequired(true)
            .setMinValue(1));

export async function execute(interaction: any) {
    await interaction.deferReply();
    if (interaction.channelId !== '1460783138237321317') {
        await interaction.editReply("❌ This command can only be used in the **Town Hall**!");
        return;
    }
    const challenger = interaction.user;
    const opponent = interaction.options.getUser('opponent');
    const amount = interaction.options.getInteger('amount');

    if (challenger.id === opponent.id) {
        await interaction.editReply("❌ You cannot duel yourself!");
        return;
    }

    if (opponent.bot) {
        await interaction.editReply("❌ You cannot duel bots!");
        return;
    }

    // 1. Check Challenger Funds
    const challengerData = await prisma.user.findUnique({ where: { id: challenger.id } });
    if (!challengerData || challengerData.gold < amount) {
        await interaction.editReply(`❌ You don't have enough gold! (Balance: ${challengerData?.gold || 0})`);
        return;
    }

    // 2. Create Challenge UI
    const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('accept')
                .setLabel('⚔️ ACCEPT DUEL')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('decline')
                .setLabel('🏃 DECLINE')
                .setStyle(ButtonStyle.Secondary)
        );

    const embed = new EmbedBuilder()
        .setTitle("⚔️ PVP CHALLENGE")
        .setDescription(`${challenger.username} challenges ${opponent.username} to a duel!`)
        .addFields(
            { name: 'Bet Amount', value: `${amount} Gold`, inline: true },
            { name: 'Challenger Weapon', value: challengerData.equippedWeapon || "Wooden Stick", inline: true }
        )
        .setColor(0xFF0000);

    const message = await interaction.editReply({
        content: `<@${opponent.id}>, do you accept?`,
        embeds: [embed],
        components: [row]
    });

    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000 // 30 seconds
    });

    collector.on('collect', async (i: any) => {
        if (i.user.id !== opponent.id) {
            await i.reply({ content: "This challenge is not for you!", ephemeral: true });
            return;
        }

        if (i.customId === 'decline') {
            await i.update({ content: `🚫 ${opponent.username} declined the duel.`, components: [], embeds: [] });
            return;
        }

        if (i.customId === 'accept') {
            // 3. Check Opponent Funds
            const opponentData = await prisma.user.findUnique({ where: { id: opponent.id } });
            if (!opponentData) { // Should create if not exists, but for duel let's say "not registered"
                await prisma.user.create({ data: { id: opponent.id } });
            }

            // Re-fetch to be safe
            const p2 = await prisma.user.findUnique({ where: { id: opponent.id } });

            if (!p2 || p2.gold < amount) {
                await i.update({ content: `❌ ${opponent.username} doesn't have enough gold!`, components: [], embeds: [] });
                return;
            }

            // --- BATTLE LOGIC ---
            // Calculate Power: Base (10-20) + Weapon Damage
            const getPower = (equip: string) => {
                const weapon = gachaPool.find(w => w.name === equip) || { damage: 2 };
                const rng = Math.floor(Math.random() * 20) + 10;
                return rng + weapon.damage;
            };

            const p1Weapon = challengerData.equippedWeapon || "Wooden Stick";
            const p2Weapon = p2.equippedWeapon || "Wooden Stick";

            const p1Power = getPower(p1Weapon);
            const p2Power = getPower(p2Weapon);

            let resultMsg = "";
            let winnerId = "";
            let loserId = "";

            if (p1Power >= p2Power) {
                winnerId = challenger.id;
                loserId = opponent.id;
                resultMsg = `🏆 **${challenger.username} WON!**\n` +
                    `Damage: **${p1Power}** vs **${p2Power}**\n` +
                    `Weapon: ${p1Weapon}`;
            } else {
                winnerId = opponent.id;
                loserId = challenger.id;
                resultMsg = `🏆 **${opponent.username} WON!**\n` +
                    `Damage: **${p2Power}** vs **${p1Power}**\n` +
                    `Weapon: ${p2Weapon}`;
            }

            // 4. Transfer Gold
            await prisma.$transaction([
                prisma.user.update({
                    where: { id: winnerId },
                    data: { gold: { increment: amount } }
                }),
                prisma.user.update({
                    where: { id: loserId },
                    data: { gold: { decrement: amount } }
                })
            ]);

            await i.update({
                content: resultMsg + `\n\n💰 **${amount} Gold** transferred!`,
                components: [],
                embeds: []
            });
            collector.stop();
        }
    });

    collector.on('end', async (_: any, reason: string) => {
        if (reason === 'time') {
            await interaction.editReply({ content: "⏳ Duel challenge expired.", components: [], embeds: [] });
        }
    });
}
