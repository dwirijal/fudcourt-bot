import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { prisma } from '../db';
import { renderBattleScene, BattleState } from '../utils/CanvasUtils';
import { getMonster } from '../utils/monsters';

export const data = new SlashCommandBuilder()
    .setName('battle')
    .setDescription('Fight a monster to earn gold and XP!');

export async function execute(interaction: any) {
    await interaction.deferReply();
    const userId = interaction.user.id;

    // 1. Load User Data
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        user = await prisma.user.create({ data: { id: userId } });
    }

    // 2. Get Dynamic Monster
    const monsterData = getMonster(user.level);

    // 3. Initial State (Player scales with Level)
    const playerMaxHP = 100 + (user.level * 10);

    const battleState: BattleState = {
        playerHP: playerMaxHP,
        maxPlayerHP: playerMaxHP,
        monsterHP: monsterData.hp,
        maxMonsterHP: monsterData.hp,
        playerName: interaction.user.username,
        monsterName: monsterData.name
    };

    // 4. Render Initial Scene
    let attachment = await renderBattleScene(battleState);

    // 5. Create Buttons
    const getButtons = (disabled = false) => new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('attack')
                .setLabel('⚔️ Attack')
                .setStyle(ButtonStyle.Danger)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId('heal')
                .setLabel(`🧪 Heal (${user?.potions})`)
                .setStyle(ButtonStyle.Success)
                .setDisabled(disabled),
            new ButtonBuilder()
                .setCustomId('run')
                .setLabel('🏃 Run')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled)
        );

    const message = await interaction.editReply({
        content: `**Found a wild ${battleState.monsterName}!** (Lvl ${user.level} Challenge)`,
        files: [attachment],
        components: [getButtons()]
    });

    // 6. Game Loop
    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000,
        filter: (i: any) => i.user.id === userId
    });

    collector.on('collect', async (i: any) => {
        // Refresh User Data (potions, etc)
        user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return;

        let log = "";

        // --- PLAYER TURN ---
        if (i.customId === 'attack') {
            const swordBonus = user.hasSword ? 15 : 0;
            const dmg = Math.floor(Math.random() * 20) + 10 + swordBonus;
            battleState.monsterHP -= dmg;
            log = `You hit for **${dmg}** damage! ${user.hasSword ? "(Sword Bonus!)" : ""}`;
        }
        else if (i.customId === 'heal') {
            if (user.potions > 0) {
                await prisma.user.update({
                    where: { id: userId },
                    data: { potions: { decrement: 1 } }
                });
                user.potions -= 1; // Update Ref

                const heal = 40;
                battleState.playerHP = Math.min(battleState.maxPlayerHP, battleState.playerHP + heal);
                log = `🧪 Gulp! +${heal} HP. (${user.potions} remaining)`;
            } else {
                await i.reply({ content: "❌ You have no potions!", ephemeral: true });
                return;
            }
        }
        else if (i.customId === 'run') {
            await i.update({
                content: "🏃 You ran away safely!",
                components: [],
                files: []
            });
            collector.stop('run');
            return;
        }

        // --- MONSTER TURN ---
        if (battleState.monsterHP > 0) {
            // Dynamic Damage from Monster Data
            const dmg = Math.floor(Math.random() * (monsterData.damageMax - monsterData.damageMin + 1)) + monsterData.damageMin;
            battleState.playerHP -= dmg;
            log += `\nThe ${monsterData.name} hit you for **${dmg}**!`;
        }

        // --- CHECK WIN/LOSS ---
        if (battleState.monsterHP <= 0) {
            // Victory & Rewards
            let xpReward = monsterData.xpReward;
            let goldReward = monsterData.goldReward;
            let newLevel = user.level;
            let levelUpText = "";

            // Calculate Level Up
            // Formula: Next Level needs level * 100 XP
            // Wait, we need to accumulate XP.
            const xpNeeded = user.level * 100;
            let currentXp = user.xp + xpReward;

            if (currentXp >= xpNeeded) {
                newLevel += 1;
                currentXp -= xpNeeded; // Basic overflow logic
                levelUpText = `\n🎉 **LEVEL UP!** You are now **Level ${newLevel}**!`;
            }

            // Save to DB
            await prisma.user.update({
                where: { id: userId },
                data: {
                    gold: { increment: goldReward },
                    xp: currentXp,
                    level: newLevel
                }
            });

            const finalImage = await renderBattleScene({ ...battleState, monsterHP: 0 });

            await i.update({
                content: `🏆 **VICTORY!**\nYou defeated the **${monsterData.name}**!\n` +
                    `Expected Rewards: **${goldReward} Gold** | **${xpReward} XP**` +
                    levelUpText,
                files: [finalImage],
                components: []
            });
            collector.stop('win');
            return;
        }
        else if (battleState.playerHP <= 0) {
            // Defeat
            const finalImage = await renderBattleScene({ ...battleState, playerHP: 0 });

            await i.update({
                content: `💀 **DEFEAT...**\nThe ${monsterData.name} was too strong.`,
                files: [finalImage],
                components: []
            });
            collector.stop('loss');
            return;
        }

        // --- NEXT TURN ---
        const nextImage = await renderBattleScene(battleState);
        await i.update({
            content: log,
            files: [nextImage],
            components: [getButtons()]
        });
    });

    collector.on('end', async (_, reason) => {
        if (reason === 'time') {
            await interaction.editReply({
                content: "⏳ Battle timed out.",
                components: []
            });
        }
    });
}
