export interface GachaItem {
    name: string;
    rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
    damage: number;
    chance: number;
}

export const gachaPool: GachaItem[] = [
    // COMMON (60% Total)
    { name: "Rusty Knife", rarity: "Common", damage: 5, chance: 30 },
    { name: "Old Hammer", rarity: "Common", damage: 7, chance: 30 },

    // RARE (30% Total)
    { name: "Iron Sword", rarity: "Rare", damage: 15, chance: 15 },
    { name: "Steel Axe", rarity: "Rare", damage: 18, chance: 15 },

    // EPIC (9% Total)
    { name: "Platinum Spear", rarity: "Epic", damage: 25, chance: 5 },
    { name: "Diamond Sword", rarity: "Epic", damage: 30, chance: 4 },

    // LEGENDARY (1% Total)
    { name: "🔥 Dragon Slayer", rarity: "Legendary", damage: 50, chance: 1 }
];

export function pullGacha(): GachaItem {
    const rand = Math.random() * 100;
    let cumulative = 0;

    for (const item of gachaPool) {
        cumulative += item.chance;
        if (rand <= cumulative) {
            return item;
        }
    }
    return gachaPool[0];
}

export function getRarityColor(rarity: string): number {
    switch (rarity) {
        case 'Common': return 0x808080; // Grey
        case 'Rare': return 0x3498db;   // Blue
        case 'Epic': return 0x9b59b6;   // Purple
        case 'Legendary': return 0xf1c40f; // Gold
        default: return 0xffffff;
    }
}
