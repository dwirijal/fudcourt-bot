import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { AttachmentBuilder } from 'discord.js';

// --- Crypto Interfaces ---
export interface ChartState {
    symbol: string;
    timeframe: string;
    candles: {
        timestamp: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
    }[];
    indicators?: {
        rsi?: number[];
        ema50?: number[];
        ema200?: number[];
    };
    width?: number;
    height?: number;
}

export interface TokenCardState {
    name: string;
    symbol: string;
    price: string;
    liquidity: string;
    fdv: string;
    change24h: number;
    chain: string;
}

// --- RPG Interfaces ---
export interface BattleState {
    playerHP: number;
    maxPlayerHP: number;
    monsterHP: number;
    maxMonsterHP: number;
    playerName: string;
    monsterName: string;
}

// ============================================================================
// RPG RENDERER
// ============================================================================

export async function renderBattleScene(state: BattleState): Promise<AttachmentBuilder> {
    const width = 700;
    const height = 300;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Background (Discord Darker)
    ctx.fillStyle = '#23272A';
    ctx.fillRect(0, 0, width, height);

    // 2. Names
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.fillText("Warrior " + state.playerName, 50, 50);
    ctx.fillText("👹 " + state.monsterName, 400, 50);

    // 3. Health Bars
    drawHealthBar(ctx, 50, 80, state.playerHP, state.maxPlayerHP, '#00FF00'); // Green for Player
    drawHealthBar(ctx, 400, 80, state.monsterHP, state.maxMonsterHP, '#FF0000'); // Red for Monster

    // 4. Avatars (Simple Boxes for Demo)
    // Player
    ctx.fillStyle = '#3498db'; // Blue
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 10;
    ctx.fillRect(50, 140, 100, 100);
    ctx.shadowBlur = 0;

    // Monster (Goblin Greenish)
    ctx.fillStyle = '#AA5555'; // Reddish
    if (state.monsterName.includes("Goblin")) ctx.fillStyle = '#55AA55';

    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 10;
    ctx.fillRect(400, 140, 100, 100);
    ctx.shadowBlur = 0;

    // VS Text
    ctx.fillStyle = '#555555';
    ctx.font = 'bold 40px Arial';
    ctx.fillText("VS", 280, 200);

    const buffer = await canvas.encode('png');
    return new AttachmentBuilder(buffer, { name: 'battle.png' });
}

function drawHealthBar(ctx: any, x: number, y: number, current: number, max: number, color: string) {
    const barWidth = 250;
    const barHeight = 30;
    const radius = 5; // rounded corners if we wanted

    // Background (Grey)
    ctx.fillStyle = '#444444';
    ctx.fillRect(x, y, barWidth, barHeight);

    // Fill
    const percent = Math.max(0, Math.min(1, current / max));
    ctx.fillStyle = color;
    ctx.fillRect(x, y, barWidth * percent, barHeight);

    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, barWidth, barHeight);

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.fillText(`${current}/${max} HP`, x + 5, y + 20);
}

// ============================================================================
// CRYPTO RENDERER (Existing)
// ============================================================================

/**
 * Renders a crypto candlestick chart using @napi-rs/canvas
 */
export async function renderCandlestickChart(state: ChartState): Promise<AttachmentBuilder> {
    const width = state.width || 800;
    const height = state.height || 400;
    const padding = { top: 40, right: 60, bottom: 40, left: 10 };

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // 1. Background
    ctx.fillStyle = '#2C2F33';
    ctx.fillRect(0, 0, width, height);

    // 2. Title and Info
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.fillText(`${state.symbol} • ${state.timeframe}`, 20, 35);

    // Last Price
    const lastCandle = state.candles[state.candles.length - 1];
    const priceColor = lastCandle.close >= lastCandle.open ? '#00FF00' : '#FF0000';
    ctx.fillStyle = priceColor;
    ctx.fillText(`$${lastCandle.close.toFixed(2)}`, width - 150, 35);

    if (state.candles.length === 0) {
        return new AttachmentBuilder(await canvas.encode('png'), { name: 'chart.png' });
    }

    // 3. Calculate Scales
    const prices = state.candles;
    let minPrice = Math.min(...prices.map(c => c.low));
    let maxPrice = Math.max(...prices.map(c => c.high));
    const priceRange = maxPrice - minPrice;

    minPrice -= priceRange * 0.05;
    maxPrice += priceRange * 0.05;
    const effectiveRange = maxPrice - minPrice;

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const candleWidth = chartWidth / prices.length;
    const spacing = candleWidth * 0.2;
    const barWidth = candleWidth - spacing;

    const getY = (price: number) => {
        return padding.top + chartHeight - ((price - minPrice) / effectiveRange) * chartHeight;
    };

    // 4. Grid Lines & Axis
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1;
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
        const y = padding.top + (chartHeight * i) / steps;
        const priceLabel = maxPrice - (effectiveRange * i) / steps;

        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        ctx.fillStyle = '#aaaaaa';
        ctx.font = '12px Arial';
        ctx.fillText(priceLabel.toFixed(2), width - padding.right + 5, y + 4);
    }

    // 5. Draw Candles
    prices.forEach((candle, index) => {
        const x = padding.left + (index * candleWidth) + (spacing / 2);
        const openY = getY(candle.open);
        const closeY = getY(candle.close);
        const highY = getY(candle.high);
        const lowY = getY(candle.low);
        const isGreen = candle.close >= candle.open;
        ctx.fillStyle = isGreen ? '#00FF00' : '#FF0000';
        ctx.strokeStyle = isGreen ? '#00FF00' : '#FF0000';

        ctx.beginPath();
        ctx.moveTo(x + barWidth / 2, highY);
        ctx.lineTo(x + barWidth / 2, lowY);
        ctx.stroke();

        let bodyHeight = Math.abs(closeY - openY);
        if (bodyHeight < 1) bodyHeight = 1;
        ctx.fillRect(x, Math.min(openY, closeY), barWidth, bodyHeight);
    });

    const buffer = await canvas.encode('png');
    return new AttachmentBuilder(buffer, { name: 'chart.png' });
}

/**
 * Renders a nice information card for a DEX token
 */
export async function renderTokenCard(state: TokenCardState): Promise<AttachmentBuilder> {
    const width = 600;
    const height = 300;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Gradient Background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#2b5876');
    gradient.addColorStop(1, '#4e4376');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Card Container
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(20, 20, width - 40, height - 40);

    // Token Name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Arial';
    ctx.fillText(`${state.name} (${state.symbol})`, 40, 80);

    // Chain
    ctx.fillStyle = '#cccccc';
    ctx.font = '20px Arial';
    ctx.fillText(state.chain.toUpperCase(), 40, 110);

    // Price
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 50px Arial';
    ctx.fillText(state.price, 40, 200);

    // 24h Change Pill
    const isPositive = state.change24h >= 0;
    const pillColor = isPositive ? '#00cc00' : '#cc0000';
    ctx.fillStyle = pillColor;
    ctx.fillRect(350, 160, 180, 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 30px Arial';
    ctx.fillText(`${isPositive ? '+' : ''}${state.change24h.toFixed(2)}%`, 370, 195);

    // Metrics (Liquidity & FDV)
    ctx.font = '18px Arial';
    ctx.fillStyle = '#dddddd';
    ctx.fillText(`Liq: ${state.liquidity}`, 40, 250);
    ctx.fillText(`FDV: ${state.fdv}`, 250, 250);

    const buffer = await canvas.encode('png');
    return new AttachmentBuilder(buffer, { name: 'token-card.png' });
}
