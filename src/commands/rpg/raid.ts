import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '../../db';
import { gachaPool } from '../../gacha';

export const data = new SlashCommandBuilder()
    .setName('raid')
    .setDescription('Attack the Global Raid Boss!')
    .addSubcommand(sub =>
        sub.setName('attack')
            .setDescription('Deal damage to the boss'))
    .addSubcommand(sub =>
        sub.setName('status')
            .setDescription('Check boss HP'));

export async function execute(interaction: any) {
    await interaction.deferReply();
    if (interaction.channelId !== '1460782832686334186') {
        await interaction.editReply("❌ This command can only be used in the **Boss Channel**!");
        return;
    }
    const sub = interaction.options.getSubcommand();

    // 1. Get or Create Boss
    let boss = await prisma.raidBoss.findUnique({ where: { id: 1 } });
    if (!boss) {
        boss = await prisma.raidBoss.create({ data: { id: 1 } });
    }

    if (sub === 'status') {
        const percent = Math.floor((boss.hp / boss.maxHp) * 100);
        const bar = "🟥".repeat(Math.floor(percent / 10)) + "⬜".repeat(10 - Math.floor(percent / 10));

        const embed = new EmbedBuilder()
            .setTitle(`👹 RAID BOSS: ${boss.name} (Lvl ${boss.level})`)
            .setDescription(`**HP:** ${boss.hp} / ${boss.maxHp} (${percent}%)\n${bar}`)
            .setColor(0x8B0000)
            .setFooter({ text: "Use /raid attack to fight!" });

        await interaction.editReply({ embeds: [embed] });
        return;
    }

    if (sub === 'attack') {
        const userId = interaction.user.id;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            await interaction.editReply("You need a profile first! Use `/daily` or `/battle`.");
            return;
        }

        // Calculate Dmg
        const currentWeapon = user.equippedWeapon || "Wooden Stick";
        const weaponData = gachaPool.find(w => w.name === currentWeapon) || { damage: 2 };

        // Raid Damage uses a simplified RNG
        const dmg = Math.floor(Math.random() * 10) + weaponData.damage;

        // Apply Damage
        let newHp = boss.hp - dmg;
        let msg = `⚔️ You hit the **${boss.name}** for **${dmg}** damage!`;
        let embedColor = 0xFFA500; // Orange

        // Boss Death Logic
        if (newHp <= 0) {
            newHp = 0;
            // Respawn Stronger
            const nextLevel = boss.level + 1;
            const nextMaxHp = Math.floor(boss.maxHp * 1.5);

            await prisma.raidBoss.update({
                where: { id: 1 },
                data: {
                    hp: nextMaxHp,
                    maxHp: nextMaxHp,
                    level: nextLevel
                }
            });

            const reward = 1000 * boss.level;
            msg += `\n\n💀 **BOSS DEFEATED!**\nIt respawns as **Lvl ${nextLevel}**!\n💰 You looted **${reward} Gold** bonus.`;
            embedColor = 0x00FF00; // Green

            // Give reward
            await prisma.user.update({
                where: { id: userId },
                data: { gold: { increment: reward } }
            });

        } else {
            // Just update HP
            await prisma.raidBoss.update({
                where: { id: 1 },
                data: { hp: newHp }
            });

            // Small Gold Reward for hit
            const goldEarned = Math.floor(dmg / 2);
            await prisma.user.update({
                where: { id: userId },
                data: { gold: { increment: goldEarned } }
            });
            msg += `\n💰 You earned **${goldEarned} Gold**.`;
        }

        const embed = new EmbedBuilder()
            .setTitle("⚔️ RAID ATTACK")
            .setDescription(msg)
            .setColor(embedColor)
            .setFooter({ text: `Boss HP: ${newHp > 0 ? newHp : boss.maxHp}` }); // If dead, shows new HP via reload but here logic is simplified

        await interaction.editReply({ embeds: [embed] });
    }
}
