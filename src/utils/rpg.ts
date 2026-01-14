
export function getXpCap(level: number): number {
    return level * 100;
}

export function getMaxHp(level: number): number {
    return 100 + (level * 10);
}
