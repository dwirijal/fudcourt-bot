import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { prisma } from '../../db';

export const data = new SlashCommandBuilder()
    .setName('duel')
    .setDescription('Challenge another player to a 1v1 duel (Bet Gold)')
    .addUserOption(opt => opt.setName('enemy').setDescription('The player to challenge').setRequired(true))
    .addIntegerOption(opt => opt.setName('bet').setDescription('Amount of Gold to bet').setRequired(true));

export async function execute(interaction: any) {
    const challenger = interaction.user;
    const enemy = interaction.options.getUser('enemy');
    const bet = interaction.options.getInteger('bet');

    // Basic Validations
    if (challenger.id === enemy.id) return interaction.reply({ content: "You cannot duel yourself!", ephemeral: true });
    if (enemy.bot) return interaction.reply({ content: "You cannot duel a bot!", ephemeral: true });
    if (bet <= 0) return interaction.reply({ content: "Bet must be greater than 0!", ephemeral: true });

    // 1. Check Balances
    const p1 = await prisma.user.findUnique({ where: { id: challenger.id } });
    const p2 = await prisma.user.findUnique({ where: { id: enemy.id } });

    if (!p1 || p1.gold < bet) {
        return interaction.reply({ content: `❌ You don't have enough Gold! (Balance: ${p1?.gold || 0})`, ephemeral: true });
    }
    // Note: We can check enemy balance, but strictly speaking, we can just check it when they accept.
    // But it's polite to check now to avoid spamming poor people.
    if (!p2 || p2.gold < bet) {
        return interaction.reply({ content: `❌ **${enemy.username}** doesn't have enough Gold to match your bet.`, ephemeral: true });
    }

    // 2. Send Challenge
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('accept').setLabel('⚔️ ACCEPT DUEL').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('decline').setLabel('Decline').setStyle(ButtonStyle.Secondary)
    );

    const msg = await interaction.reply({
        content: `🔥 **DUEL ALERT!**\n${challenger} challenges ${enemy} for **${bet} Gold**!\n${enemy}, do you accept?`,
        components: [row],
        fetchReply: true
    });

    const collector = msg.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 30000
    });

    collector.on('collect', async (i: any) => {
        // Only Enemy can decide
        if (i.user.id !== enemy.id) {
            return i.reply({ content: "This challenge is not for you!", ephemeral: true });
        }

        if (i.customId === 'decline') {
            await msg.edit({ content: `🏳️ **${enemy.username}** declined the duel.`, components: [] });
            return;
        }

        if (i.customId === 'accept') {
            // 3. PROCESS DUEL
            // Re-check balances immediately before processing
            // Use transaction to ensure consistency
            try {
                await prisma.$transaction(async (tx) => {
                    const p1Now = await tx.user.findUnique({ where: { id: challenger.id } });
                    const p2Now = await tx.user.findUnique({ where: { id: enemy.id } });

                    if (!p1Now || p1Now.gold < bet) throw new Error("Challenger insufficient funds");
                    if (!p2Now || p2Now.gold < bet) throw new Error("Enemy insufficient funds");

                    // RNG Logic (50/50 for now)
                    // Future improvement: Add logic for Stats/Weapon
                    const p1Win = Math.random() > 0.5;
                    const winnerId = p1Win ? challenger.id : enemy.id;
                    const loserId = p1Win ? enemy.id : challenger.id;
                    const winnerName = p1Win ? challenger.username : enemy.username;
                    const loserName = p1Win ? enemy.username : challenger.username;

                    // Transfer Gold
                    await tx.user.update({ where: { id: winnerId }, data: { gold: { increment: bet } } });
                    await tx.user.update({ where: { id: loserId }, data: { gold: { decrement: bet } } });

                    await msg.edit({
                        content: `💀 **DUEL FINISHED!**\n\n👑 **Winner:** ${winnerName} (+${bet} Gold)\n🥀 **Loser:** ${loserName} (-${bet} Gold)`,
                        components: []
                    });
                });
            } catch (error: any) {
                await i.reply({ content: `❌ Duel failed: ${error.message}`, ephemeral: true });
            }
        }
    });

    collector.on('end', (_: any, reason: string) => {
        if (reason === 'time') {
            msg.edit({ content: "⏳ Duel offer expired.", components: [] }).catch(() => {});
        }
    });
}
