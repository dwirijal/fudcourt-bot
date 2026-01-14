import { prisma } from '../db';

async function migrate() {
    console.log("🧪 Starting Potion Migration...");

    const users = await prisma.user.findMany({
        where: { potions: { gt: 0 } }
    });

    console.log(`Found ${users.length} users with legacy potions.`);

    for (const user of users) {
        await prisma.$transaction(async (tx) => {
            // 1. Add to Inventory
            // Stack if somehow exists already (unlikely but safe)
            const existing = await tx.inventoryItem.findFirst({
                where: { userId: user.id, itemName: 'Health Potion' }
            });

            if (existing) {
                await tx.inventoryItem.update({
                    where: { id: existing.id },
                    data: { quantity: { increment: user.potions } }
                });
            } else {
                await tx.inventoryItem.create({
                    data: {
                        userId: user.id,
                        itemName: 'Health Potion',
                        rarity: 'Common',
                        damage: 0, // Potions don't do damage
                        quantity: user.potions
                    }
                });
            }

            // 2. Clear Legacy Column
            await tx.user.update({
                where: { id: user.id },
                data: { potions: 0 }
            });
        });
        console.log(`✅ Migrated ${user.potions} potions for ${user.username || user.id}`);
    }

    console.log("Done.");
}

migrate()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
