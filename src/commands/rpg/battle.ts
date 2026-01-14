import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import { prisma } from '../../db';
import { renderBattleScene, BattleState } from '../../utils/CanvasUtils';
import { getMonster } from '../../utils/monsters';
import { gachaPool } from '../../config/gacha';
import { marketOracle } from '../../services/market_oracle';
import { checkAchievements } from '../../utils/achievements';

export const data = new SlashCommandBuilder()
    .setName('battle')
    .setDescription('Fight a monster to earn gold and XP!');

export async function execute(interaction: any) {
    await interaction.deferReply();
    const userId = interaction.user.id;

    const marketState = marketOracle.getState();

    // 1. Load User Data
    // 1. Load User Data
    let user = await prisma.user.findUnique({
        where: { id: userId },
        include: { inventory: true } // Need inventory for Steroids
    });
    if (!user) {
        user = await prisma.user.create({ data: { id: userId }, include: { inventory: true } });
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
    // 5. Create Buttons
    const getButtons = (disabled = false, usedSteroid = false) => {
        const potionItem = user?.inventory.find(i => i.itemName === 'Health Potion');
        const potionCount = potionItem ? potionItem.quantity : 0;

        const row = new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('attack')
                    .setLabel('⚔️ Attack')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(disabled),
                new ButtonBuilder()
                    .setCustomId('heal')
                    .setLabel(`🧪 Heal (${potionCount})`)
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(disabled)
            );

        // Check for Steroid Potion
        const hasSteroid = user?.inventory.find(i => i.itemName === 'Steroid Potion' && i.quantity > 0);

        if (hasSteroid && !usedSteroid) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('steroid')
                    .setLabel('💉 Use Steroid')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(disabled)
            );
        }

        row.addComponents(
            new ButtonBuilder()
                .setCustomId('run')
                .setLabel('🏃 Run')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(disabled)
        );

        return row;
    };

    // Market Modifier Announcement
    let marketMsg = "";
    if (marketState.status === 'BULL') marketMsg = "\n🚀 **BULL MARKET:** Player Damage Boosted!";
    if (marketState.status === 'BEAR') marketMsg = "\n🩸 **BEAR MARKET:** Monster Damage Boosted!";

    const message = await interaction.editReply({
        content: `**Found a wild ${battleState.monsterName}!** (Lvl ${user.level} Challenge)${marketMsg}`,
        files: [attachment],
        components: [getButtons()]
    });

    // 6. Game Loop
    // 6. Game Loop
    let monsterStunned = false;
    let steroidBuff = false;

    const collector = message.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000,
        filter: (i: any) => i.user.id === userId
    });

    collector.on('collect', async (i: any) => {
        // Optimization: Rely on local 'user' state logic instead of re-fetching DB every click.
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

                // MARKET MODIFIER (Monster)
                if (marketState.status === 'BEAR') {
                    dmg = Math.floor(dmg * 1.5); // 50% Buff
                }

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
        // --- PLAYER TURN ---
        if (i.customId === 'steroid') {
            // Consume Steroid
            const steroidItem = user.inventory.find(i => i.itemName === 'Steroid Potion');
            if (steroidItem && steroidItem.quantity > 0) {
                await prisma.$transaction(async (tx) => {
                    if (steroidItem.quantity === 1) {
                        await tx.inventoryItem.delete({ where: { id: steroidItem.id } });
                    } else {
                        await tx.inventoryItem.update({ where: { id: steroidItem.id }, data: { quantity: { decrement: 1 } } });
                    }
                });
                // Update Local State
                steroidItem.quantity--;
                steroidBuff = true;
                log = "💉 **STEROID INJECTED!** You feel a surge of power (2x Damage)!";
            } else {
                log = "❌ You don't have any Steroids!";
            }
        }
        else if (i.customId === 'attack') {
            const currentWeapon = user.equippedWeapon || "Wooden Stick";
            let weaponDmg = 2; // Default

            // Special Crypto Weapons
            if (currentWeapon === "Ether Blade") {
                // Scaling: 1% of ETH Price
                weaponDmg = Math.floor(marketState.ethPrice / 100);
                log = `🔹 **Ether Blade** resonates with the network! (${weaponDmg} Dmg)`;
            }
            else if (currentWeapon === "Doge Hammer") {
                // Meme Logic
                weaponDmg = marketState.dogePrice > 0.2 ? 100 : 5;
                if (weaponDmg === 100) log = `🐕 **DOGE PUMP!** The hammer strikes with MOON power!`;
                else log = `🐕 **Doge Dump...** The hammer feels light.`;
            }
            else {
                // Standard Weapons
                const weaponData = gachaPool.find(w => w.name === currentWeapon);
                if (weaponData) weaponDmg = weaponData.damage;
            }

            // Base Damage 10-20 + Weapon Damage
            let rng = Math.floor(Math.random() * 20) + 10;

            // MARKET MODIFIER (Player)
            if (marketState.status === 'BULL') {
                rng = Math.floor(rng * 1.2); // 20% Buff to base damage
                log += " 🚀(Bull Buff)";
            } else if (marketState.status === 'BEAR') {
                rng = Math.floor(rng * 0.8); // 20% Nerf
                log += " 🩸(Bear Nerf)";
            }

            // CLASS PASSIVE: MAGE CRIT (30% Chance -> 2x Base Dmg)
            if (user.job === 'Mage' && Math.random() < 0.3) {
                rng *= 2;
                log += `\n🔮 **CRITICAL HIT!**`;
            }

            // CLASS PASSIVE: PALADIN SMITE (10% Stun)
            if (user.job === 'Paladin' && Math.random() < 0.10) {
                monsterStunned = true;
                log += `\n🔨 **SMITE!** You stunned the enemy!`;
            }

            // CLASS PASSIVE: RANGER DOUBLE SHOT (20% Chance)
            let extraShot = 0;
            if (user.job === 'Ranger' && Math.random() < 0.20) {
                extraShot = Math.floor(Math.random() * 20) + 10 + weaponDmg;
                log += `\n🏹 **DOUBLE SHOT!** (+${extraShot})`;
            }

            let totalDmg = rng + weaponDmg + extraShot;

            // STEROID EFFECT
            if (steroidBuff) {
                totalDmg *= 2;
                log += `\n💉 **RAGE!** Damage doubled to **${totalDmg}**!`;

                // Recoil (30%)
                if (Math.random() < 0.3) {
                    const recoil = Math.floor(user.level * 2);
                    battleState.playerHP -= recoil;
                    log += `\n💀 **OVERDOSE!** You took ${recoil} recoil damage.`;
                }
            }

            battleState.monsterHP -= totalDmg;

            // Format Log if not special
            if (!log.includes("Ether") && !log.includes("Doge")) {
                log = `You hit with **${currentWeapon}** for **${totalDmg}** damage!` + log;
            } else {
                log += `\nTotal Damage: **${totalDmg}**`;
            }
        }
        else if (i.customId === 'heal') {
            const potionItem = user.inventory.find(i => i.itemName === 'Health Potion');

            if (potionItem && potionItem.quantity > 0) {
                await prisma.$transaction(async (tx) => {
                    if (potionItem.quantity === 1) {
                        await tx.inventoryItem.delete({ where: { id: potionItem.id } });
                    } else {
                        await tx.inventoryItem.update({ where: { id: potionItem.id }, data: { quantity: { decrement: 1 } } });
                    }
                });
                // Update Local State
                potionItem.quantity--;

                const heal = 40;
                battleState.playerHP = Math.min(battleState.maxPlayerHP, battleState.playerHP + heal);
                log = `🧪 Gulp! +${heal} HP. (${potionItem.quantity} remaining)`;
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

            // Market Modifiers
            if (marketState.status === 'BULL') {
                xpReward = Math.floor(xpReward * 1.1);
                goldReward = Math.floor(goldReward * 1.1);
            }

            let newLevel = user.level;
            let levelUpText = "";

            const xpNeeded = user.level * 100;
            let currentXp = user.xp + xpReward;

            if (currentXp >= xpNeeded) {
                newLevel += 1;
                currentXp -= xpNeeded;
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

            // Update Stats (Battles Won)
            await prisma.userStats.upsert({
                where: { userId },
                update: { battlesWon: { increment: 1 } },
                create: { userId, battlesWon: 1 }
            });

            // Check Achievements
            const newBadges = await checkAchievements(userId);
            let badgeText = "";
            if (newBadges) {
                badgeText = `\n🏅 **ACHIEVEMENT UNLOCKED:** ${newBadges.join(', ')}`;
            }

            const finalImage = await renderBattleScene({ ...battleState, monsterHP: 0 });

            await i.update({
                content: `🏆 **VICTORY!**\nYou defeated the **${monsterData.name}**!\n` +
                    `Rewards: **${goldReward} Gold** | **${xpReward} XP**` +
                    levelUpText + badgeText,
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
            components: [getButtons(false, steroidBuff)]
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
