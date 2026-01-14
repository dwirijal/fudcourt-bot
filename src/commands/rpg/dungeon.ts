
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder } from 'discord.js';
import { prisma } from '../../db';
import { renderBattleScene, BattleState } from '../../utils/CanvasUtils';
import { getMonster } from '../../utils/monsters';
import { gachaPool } from '../../gacha';

export const data = new SlashCommandBuilder()
    .setName('dungeon')
    .setDescription('Enter the dungeon! Survive waves of monsters for massive loot.');

export async function execute(interaction: any) {
    await interaction.deferReply();
    const userId = interaction.user.id;

    // Channel Lock
    if (interaction.channelId !== '1460782792807026921') {
        await interaction.editReply("❌ This command can only be used in the **Dungeon Channel**!");
        return;
    }

    // 1. Load User
    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        user = await prisma.user.create({ data: { id: userId } });
    }

    // 2. Dungeon State
    let currentWave = 1;
    let accumulatedGold = 0;
    let accumulatedXP = 0;
    let playerHP = 100 + (user.level * 10);
    const maxPlayerHP = playerHP;

    // Helper to Start a Wave
    const startWave = async (wave: number) => {
        // Monster Scales with Player Level + Wave Difficulty
        const scale = Math.floor(wave / 2);
        const monsterData = getMonster(user.level + scale);

        // Slightly buff monster HP for dungeon feel
        const monsterHP = Math.floor(monsterData.hp * 1.2);

        const battleState: BattleState = {
            playerHP: playerHP,
            maxPlayerHP: maxPlayerHP,
            monsterHP: monsterHP,
            maxMonsterHP: monsterHP,
            playerName: interaction.user.username,
            monsterName: `Wave ${wave}: ${monsterData.name}`
        };

        const attachment = await renderBattleScene(battleState);

        const getBattleButtons = (disabled = false) => new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder().setCustomId('atk').setLabel('⚔️ Attack').setStyle(ButtonStyle.Danger).setDisabled(disabled),
                new ButtonBuilder().setCustomId('heal').setLabel(`🧪 Heal (${user.potions})`).setStyle(ButtonStyle.Success).setDisabled(disabled),
                new ButtonBuilder().setCustomId('flee').setLabel('🏃 Flee (Lose Loot)').setStyle(ButtonStyle.Secondary).setDisabled(disabled)
            );

        await interaction.editReply({
            content: `**Dungeon Wave ${wave}/10** started!`,
            files: [attachment],
            components: [getBattleButtons()]
        });

        const collector = interaction.channel.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 60000,
            filter: (i: any) => i.user.id === userId && i.message.interaction.id === interaction.id
        });

        collector.on('collect', async (i: any) => {
            if (i.message.id !== (await interaction.fetchReply()).id) return; // Ignore old clicks

            let log = "";
            let monsterStunned = false;

            // --- MONSTER TURN (Attacks First) ---
            if (battleState.monsterHP > 0) {
                if (monsterStunned) {
                    log += `\n💫 **STUNNED!** The enemy couldn't move!`;
                    monsterStunned = false;
                } else {
                    let dmg = Math.floor(Math.random() * (monsterData.damageMax - monsterData.damageMin + 1)) + monsterData.damageMin;

                    // Passives
                    if (user.job === 'Rogue' && Math.random() < 0.25) {
                        dmg = 0;
                        log += `\n💨 **DODGED!**`;
                    }
                    if (user.job === 'Warrior' && dmg > 0) dmg = Math.max(1, dmg - 3);
                    if (user.job === 'Paladin' && dmg > 0) dmg = Math.floor(dmg * 0.85);

                    battleState.playerHP -= dmg;
                    playerHP = battleState.playerHP; // Update global state
                    if (dmg > 0) log += `\nThe monster hit you for **${dmg}**!`;

                    // Regen
                    if (user.job === 'Warrior') {
                        battleState.playerHP = Math.min(battleState.maxPlayerHP, battleState.playerHP + 5);
                        playerHP = battleState.playerHP;
                        log += ` (🛡️ +5 HP)`;
                    }
                }
            }

            // --- PLAYER TURN ---
            if (i.customId === 'atk') {
                const currentWeapon = user.equippedWeapon || "Wooden Stick";
                const weaponData = gachaPool.find(w => w.name === currentWeapon) || { damage: 2, rarity: 'Common' };
                let rng = Math.floor(Math.random() * 20) + 10;
                let weaponDmg = weaponData.damage;

                // Passives
                if (user.job === 'Mage' && Math.random() < 0.3) {
                    rng *= 2;
                    log = `🔮 **CRITICAL!** Hit for **${rng + weaponDmg}**!`;
                } else {
                    log = `You hit for **${rng + weaponDmg}**!`;
                }

                if (user.job === 'Paladin' && Math.random() < 0.1) {
                    monsterStunned = true;
                    log += ` 💫 SMITE!`;
                }

                let totalDmg = rng + weaponDmg;

                if (user.job === 'Ranger' && Math.random() < 0.2) {
                    const second = Math.floor(Math.random() * 20) + 10 + weaponDmg;
                    totalDmg += second;
                    log += ` 🏹 Double Shot (+${second})!`;
                }

                battleState.monsterHP -= totalDmg;
            } else if (i.customId === 'heal') {
                if (user.potions > 0) {
                    user.potions--;
                    // Sync DB later or just decrement global ref? best to sync later to avoid spam
                    battleState.playerHP = Math.min(battleState.maxPlayerHP, battleState.playerHP + 40);
                    playerHP = battleState.playerHP;
                    log = `🧪 Healed 40 HP.`;
                } else {
                    await i.reply({ content: "No potions!", ephemeral: true });
                    return;
                }
            } else if (i.customId === 'flee') {
                await i.update({ content: "🏃 You fled the dungeon in shame! (No Loot)", components: [], files: [] });
                collector.stop('flee');
                return;
            }

            // --- CHECKS ---
            if (battleState.playerHP <= 0) {
                const deadImg = await renderBattleScene({ ...battleState, playerHP: 0 });
                await i.update({ content: "💀 **You died in the dungeon!** All loot lost.", files: [deadImg], components: [] });
                collector.stop('dead');
                return;
            }

            if (battleState.monsterHP <= 0) {
                const winImg = await renderBattleScene({ ...battleState, monsterHP: 0 });
                accumulatedGold += monsterData.goldReward;
                accumulatedXP += monsterData.xpReward;

                // End of Wave Logic
                collector.stop('wave_clear');

                if (wave === 10) {
                    // VICTORY
                    await prisma.user.update({
                        where: { id: userId },
                        data: {
                            gold: { increment: accumulatedGold },
                            xp: { increment: accumulatedXP },
                            potions: user.potions // Update potions used
                        }
                    });
                    await i.update({
                        content: `🏆 **DUNGEON CLEARED!**\nStart: Wave 1 -> End: Wave 10\nRewards: **${accumulatedGold} Gold** | **${accumulatedXP} XP**`,
                        files: [winImg],
                        components: []
                    });
                    return;
                }

                // Checkpoint
                const checkoutRow = new ActionRowBuilder<ButtonBuilder>()
                    .addComponents(
                        new ButtonBuilder().setCustomId('next').setLabel('Next Wave').setStyle(ButtonStyle.Primary),
                        new ButtonBuilder().setCustomId('leave').setLabel(`Leave with ${accumulatedGold}g`).setStyle(ButtonStyle.Success)
                    );

                await i.update({
                    content: `**Wave ${wave} Cleared!**\nCurrent Loot: **${accumulatedGold} Gold** | **${accumulatedXP} XP**\nHP: ${playerHP}/${maxPlayerHP}`,
                    files: [winImg],
                    components: [checkoutRow]
                });

                // Wait for Next/Leave decision
                const filter = (btn: any) => btn.user.id === userId && (btn.customId === 'next' || btn.customId === 'leave');
                try {
                    const response = await interaction.channel.awaitMessageComponent({ filter, time: 30000 });
                    if (response.customId === 'leave') {
                        await prisma.user.update({
                            where: { id: userId },
                            data: {
                                gold: { increment: accumulatedGold },
                                xp: { increment: accumulatedXP },
                                potions: user.potions
                            }
                        });
                        await response.update({ content: `✅ **Escaped the dungeon!**\nClaimed: ${accumulatedGold} Gold, ${accumulatedXP} XP.`, components: [], files: [] });
                    } else {
                        await response.deferUpdate();
                        startWave(wave + 1); // RECURSION
                    }
                } catch (e) {
                    await interaction.followUp("⏳ Time expired. You left automatically.");
                }
                return;
            }

            // Next Turn
            const nextImg = await renderBattleScene(battleState);
            await i.update({ content: log, files: [nextImg], components: [getBattleButtons()] });
        });
    };

    // Start!
    startWave(1);
}
