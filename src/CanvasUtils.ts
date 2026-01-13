
import { createCanvas } from '@napi-rs/canvas';
import { AttachmentBuilder } from 'discord.js';

// Define the state of the battle for rendering
interface BattleState {
    playerHP: number;
    maxPlayerHP: number;
    monsterHP: number;
    maxMonsterHP: number;
    playerName: string;
}

export async function renderBattleScene(state: BattleState): Promise<AttachmentBuilder> {
    const width = 700;
    const height = 300;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Draw Background
    ctx.fillStyle = '#2C2F33'; // Discord Dark Mode Color
    ctx.fillRect(0, 0, width, height);

    // 2. Draw Text (Player vs Monster)
    ctx.fillStyle = '#ffffff';
    ctx.font = '30px Arial'; // Ensure you have fonts installed or use generic
    ctx.fillText(state.playerName, 50, 50);
    ctx.fillText("Goblin King", 450, 50);

    // 3. Draw Player HP Bar (Left)
    drawHealthBar(ctx, 50, 80, state.playerHP, state.maxPlayerHP, '#00FF00');

    // 4. Draw Monster HP Bar (Right)
    drawHealthBar(ctx, 450, 80, state.monsterHP, state.maxMonsterHP, '#FF0000');

    // 5. Draw "Avatars" (Simple rectangles for this demo)
    // Player
    ctx.fillStyle = '#3498db';
    ctx.fillRect(50, 130, 100, 100);
    
    // Monster
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(450, 130, 100, 100);

    const buffer = await canvas.encode('png');
    return new AttachmentBuilder(buffer, { name: 'battle-scene.png' });
}

// Helper to draw clean HP bars
function drawHealthBar(ctx: any, x: number, y: number, current: number, max: number, color: string) {
    const barWidth = 200;
    const barHeight = 30;
    
    // Background (Grey)
    ctx.fillStyle = '#555555';
    ctx.fillRect(x, y, barWidth, barHeight);

    // Health (Color)
    const healthPercent = Math.max(0, current / max);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
    
    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);
}
