import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { prisma } from '../../db';
import { renderBattleScene, BattleState } from '../../utils/CanvasUtils';
import { getMonster } from '../../utils/monsters';
import { gachaPool } from '../../gacha';

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
    let monsterStunned = false;

    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000,
        filter: (i: any) => i.user.id === userId
    });

    collector.on('collect', async (i: any) => {
        // Optimization: Rely on local 'user' state logic instead of re-fetching DB every click.
        // user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return;

        let log = "";

        // --- MONSTER TURN ---
        if (battleState.monsterHP > 0) {
            if (monsterStunned) {
                log += `\n💫 **STUNNED!** The ${monsterData.name} couldn't move!`;
                monsterStunned = false;
            } else {
                // Dynamic Damage from Monster Data
                let dmg = Math.floor(Math.random() * (monsterData.damageMax - monsterData.damageMin + 1)) + monsterData.damageMin;

                // CLASS PASSIVE: ROGUE DODGE (25%)
                if (user.job === 'Rogue' && Math.random() < 0.25) {
                    dmg = 0;
                    log += `\n💨 **DODGED!** You avoided the ${monsterData.name}'s attack!`;
                }

                // CLASS PASSIVE: WARRIOR SHIELD (Flat -3 Dmg)
                if (user.job === 'Warrior' && dmg > 0) {
                    dmg = Math.max(1, dmg - 3);
                }

                // CLASS PASSIVE: PALADIN SHIELD (-15% Dmg)
                if (user.job === 'Paladin' && dmg > 0) {
                    dmg = Math.floor(dmg * 0.85);
                }

                battleState.playerHP -= dmg;
                if (dmg > 0) log += `\nThe ${monsterData.name} hit you for **${dmg}**!`;

                // CLASS PASSIVE: WARRIOR HEAL (+5 HP/Turn)
                if (user.job === 'Warrior') {
                    const healAmt = 5;
                    battleState.playerHP = Math.min(battleState.maxPlayerHP, battleState.playerHP + healAmt);
                    log += ` (🛡️ +${healAmt} HP)`;
                }
            }
        } // End Monster Turn Check

        // --- PLAYER TURN ---
        if (i.customId === 'attack') {
            const currentWeapon = user.equippedWeapon || "Wooden Stick";
            const weaponData = gachaPool.find(w => w.name === currentWeapon) || { damage: 2, rarity: 'Common' };
            const weaponDmg = weaponData.damage;

            // Base Damage 10-20 + Weapon Damage
            let rng = Math.floor(Math.random() * 20) + 10;

            // CLASS PASSIVE: MAGE CRIT (30% Chance -> 2x Base Dmg)
            if (user.job === 'Mage' && Math.random() < 0.3) {
                rng *= 2;
                log = `🔮 **CRITICAL HIT!** You hit with **${currentWeapon}** for **${rng + weaponDmg}** damage!`;
            } else {
                log = `You hit with **${currentWeapon}** for **${rng + weaponDmg}** damage!`;
            }

            // CLASS PASSIVE: PALADIN SMITE (10% Stun)
            if (user.job === 'Paladin' && Math.random() < 0.10) {
                monsterStunned = true;
                log += `\n🔨 **SMITE!** You stunned the enemy!`;
            }

            // CLASS PASSIVE: RANGER DOUBLE SHOT (20% Chance)
            if (user.job === 'Ranger' && Math.random() < 0.20) {
                const secondDmg = Math.floor(Math.random() * 20) + 10 + weaponDmg;
                battleState.monsterHP -= secondDmg;
                log += `\n🏹 **DOUBLE SHOT!** You hit again for **${secondDmg}**!`;
            }

            const totalDmg = rng + weaponDmg;
            battleState.monsterHP -= totalDmg;
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

    collector.on('end', async (_: any, reason: string) => {
        if (reason === 'time') {
            await interaction.editReply({
                content: "⏳ Battle timed out.",
                components: []
            });
        }
    });
}
