import { prisma } from '../db';

export async function checkAchievements(userId: string): Promise<string[] | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { stats: true }
    });

    if (!user) return null;

    let currentBadges = user.badges ? user.badges.split(',') : [];
    let newBadges: string[] = [];

    // Badge Logic

    // 1. SULTAN (1 Million Gold)
    if (user.gold >= 1000000 && !currentBadges.includes('SULTAN')) {
        newBadges.push('SULTAN');
    }

    // 2. VETERAN (Level 50)
    if (user.level >= 50 && !currentBadges.includes('VETERAN')) {
        newBadges.push('VETERAN');
    }

    // 3. WARLORD (100 Battles Won)
    if (user.stats && user.stats.battlesWon >= 100 && !currentBadges.includes('WARLORD')) {
        newBadges.push('WARLORD');
    }

    if (newBadges.length > 0) {
        const updatedList = [...currentBadges, ...newBadges].filter(b => b).join(',');
        await prisma.user.update({
            where: { id: userId },
            data: { badges: updatedList }
        });
        return newBadges;
    }

    return null;
}
