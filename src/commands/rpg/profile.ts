import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { prisma } from '../../db';
import { getXpCap, getMaxHp } from '../../utils/rpg';
import { getCachedAvatar } from '../../utils/avatarCache';

export const data = new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Check your RPG profile and identity card')
    .addUserOption(option =>
        option.setName('user').setDescription('View another user\'s profile (Optional)'));

export async function execute(interaction: any) {
    await interaction.deferReply();

    // 1. Determine Target User
    const targetUser = interaction.options.getUser('user') || interaction.user;

    // 2. Fetch/Create Data
    const player = await prisma.user.upsert({
        where: { id: targetUser.id },
        update: {},
        create: {
            id: targetUser.id,
            username: targetUser.username,
            gold: 100,
            job: 'Novice'
        },
        include: { inventory: true }
    });

    // 3. Setup Canvas
    const canvas = createCanvas(800, 350);
    const ctx = canvas.getContext('2d');

    // --- BACKGROUND ---
    const classColors: { [key: string]: string } = {
        'Novice': '#95a5a6',
        'Warrior': '#e74c3c',
        'Mage': '#8e44ad',
        'Rogue': '#2ecc71',
        'Ranger': '#f1c40f',
        'Paladin': '#f39c12'
    };
    const bgColor = classColors[player.job] || '#34495e';

    // Dark BG
    ctx.fillStyle = '#161a25';
    ctx.fillRect(0, 0, 800, 350);

    // Class Color Accent
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 15, 350);

    // --- AVATAR ---
    try {
        const avatarURL = targetUser.displayAvatarURL({ extension: 'png', size: 256 });
        const avatar = await getCachedAvatar(avatarURL);

        ctx.save();
        ctx.beginPath();
        ctx.arc(100, 100, 60, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 40, 40, 120, 120);
        ctx.restore();

        // Border
        ctx.strokeStyle = bgColor;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(100, 100, 60, 0, Math.PI * 2, true);
        ctx.stroke();
    } catch (e) {
        console.error("Failed to load avatar", e);
        // Fallback circle
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.arc(100, 100, 60, 0, Math.PI * 2, true);
        ctx.fill();
    }

    // --- TEXT STATS ---
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Arial';
    ctx.fillText(player.username || targetUser.username, 180, 80);

    ctx.font = '25px Arial';
    ctx.fillStyle = bgColor;
    ctx.fillText(`${player.job} | Level ${player.level}`, 180, 115);

    // Stat Grid
    ctx.fillStyle = '#bdc3c7';
    ctx.font = '22px Arial';

    const startY = 180;
    const maxHp = getMaxHp(player.level);

    ctx.fillText(`⚔️ Weapon: ${player.equippedWeapon}`, 50, startY);
    ctx.fillText(`💰 Gold: ${player.gold.toLocaleString()}`, 50, startY + 40);
    ctx.fillText(`❤️ Max HP: ${maxHp}`, 400, startY);
    ctx.fillText(`📦 Inventory: ${player.inventory.length} Items`, 400, startY + 40);

    // --- BADGES ---
    if (player.badges) {
        const badges = player.badges.split(',').filter(b => b);
        badges.forEach((badge, index) => {
            const bx = 180 + (index * 35); // Start after name area
            const by = 250;

            ctx.beginPath();
            ctx.arc(bx, by, 12, 0, Math.PI * 2);

            if (badge === 'SULTAN') ctx.fillStyle = '#ffd700'; // Gold
            else if (badge === 'VETERAN') ctx.fillStyle = '#ff0000'; // Red
            else if (badge === 'WARLORD') ctx.fillStyle = '#9b59b6'; // Purple
            else ctx.fillStyle = '#95a5a6'; // Grey default

            ctx.fill();

            // Simple symbol
            ctx.fillStyle = '#000';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(badge[0], bx, by + 4);
            ctx.textAlign = 'left'; // Reset
        });
    }

    // --- XP BAR ---
    const xpNeeded = getXpCap(player.level);
    const xpPercent = Math.min(1, player.xp / xpNeeded);

    // Bar Background
    ctx.fillStyle = '#3a4050';
    ctx.fillRect(50, 300, 700, 30);

    // XP Fill
    ctx.fillStyle = bgColor;
    ctx.fillRect(50, 300, 700 * xpPercent, 30);

    // XP Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${player.xp} / ${xpNeeded} XP`, 400, 322);

    // --- RENDER ---
    const buffer = await canvas.encode('png');
    const attachment = new AttachmentBuilder(buffer, { name: 'profile.png' });

    await interaction.editReply({ files: [attachment] });
}
