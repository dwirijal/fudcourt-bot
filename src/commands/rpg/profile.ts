import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { prisma } from '../../db';
import { getXpCap, getMaxHp } from '../../utils/rpg';

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
        const avatar = await loadImage(avatarURL);

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
    // Since we don't store current HP in DB (it resets after battle usually, or we assume full),
    // let's show Max HP. Or if we tracked it, we'd use that.
    // For visual profile, Max HP is usually what matters for "Stats".
    ctx.fillText(`❤️ Max HP: ${maxHp}`, 400, startY);
    ctx.fillText(`📦 Inventory: ${player.inventory.length} Items`, 400, startY + 40);

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
