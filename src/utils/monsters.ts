export interface Monster {
    name: string;
    hp: number;
    damageMin: number;
    damageMax: number;
    xpReward: number;
    goldReward: number;
    imageColor: string;
}

export function getMonster(level: number): Monster {
    // Level 1-2: Goblin
    if (level <= 2) {
        return {
            name: "Goblin Scavenger",
            hp: 60,
            damageMin: 5,
            damageMax: 10,
            xpReward: 25,
            goldReward: 15,
            imageColor: '#32CD32' // Lime Green
        };
    }
    // Level 3-5: Orc
    else if (level <= 5) {
        return {
            name: "Orc Warrior",
            hp: 140,
            damageMin: 12,
            damageMax: 20,
            xpReward: 60,
            goldReward: 40,
            imageColor: '#8B0000' // Dark Red
        };
    }
    // Level 6+: Dragon
    else {
        return {
            name: "Red Dragon",
            hp: 350,
            damageMin: 25,
            damageMax: 45,
            xpReward: 150,
            goldReward: 100,
            imageColor: '#FF4500' // Orange Red
        };
    }
}
