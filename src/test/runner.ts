import { execute as daily } from '../commands/economy/daily';
import { execute as coin } from '../commands/crypto/coin';
import { execute as battle } from '../commands/rpg/battle';
import { mockInteraction } from './mocks';
import { prisma } from '../db';

async function runTests() {
    console.log("🚀 Starting Internal Tests...\n");

    // 1. Test Daily Command (DB Check)
    console.log("--- Testing /daily ---");
    await daily(mockInteraction('daily'));

    // 2. Test Coin Command (API + Caching)
    console.log("\n--- Testing /coin (BTC) ---");
    await coin(mockInteraction('coin', { symbol: 'BTC', timeframe: '1h' }));

    // 3. Test Battle Command (Canvas + DB)
    console.log("\n--- Testing /battle ---");
    await battle(mockInteraction('battle'));

    console.log("\n✅ Tests Complete. Cleaning up...");
    await prisma.$disconnect();
}

runTests().catch(console.error);
