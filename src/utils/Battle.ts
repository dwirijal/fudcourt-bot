import { User, InventoryItem } from '@prisma/client';
import { BattleState } from './CanvasUtils';
import { MarketState } from '../services/market_oracle';
import { gachaPool } from '../config/gacha';
import { PrismaClient } from '@prisma/client';

type UserWithInventory = User & { inventory: InventoryItem[] };

export class Battle {
    private battleState: BattleState;
    private user: UserWithInventory;
    private marketState: MarketState;
    private gachaPool: any[];
    private monsterStunned = false;
    private steroidBuff = false;
    private prisma: PrismaClient;

    constructor(user: UserWithInventory, monsterName: string, monsterHp: number, playerMaxHP: number, marketState: MarketState, prisma: PrismaClient) {
        this.user = user;
        this.marketState = marketState;
        this.gachaPool = gachaPool;
        this.prisma = prisma;
        this.battleState = {
            playerHP: playerMaxHP,
            maxPlayerHP: playerMaxHP,
            monsterHP: monsterHp,
            maxMonsterHP: monsterHp,
            playerName: user.username || 'Player',
            monsterName: monsterName,
        };
    }

    public getState(): BattleState {
        return this.battleState;
    }

    public async handlePlayerTurn(action: string): Promise<string> {
        let log = "";
        if (action === 'attack') {
            const currentWeapon = this.user.equippedWeapon || "Wooden Stick";
            let weaponDmg = 2; // Default

            // Special Crypto Weapons
            if (currentWeapon === "Ether Blade") {
                // Scaling: 1% of ETH Price
                weaponDmg = Math.floor(this.marketState.ethPrice / 100);
                log = `🔹 **Ether Blade** resonates with the network! (${weaponDmg} Dmg)`;
            }
            else if (currentWeapon === "Doge Hammer") {
                // Meme Logic
                weaponDmg = this.marketState.dogePrice > 0.2 ? 100 : 5;
                if (weaponDmg === 100) log = `🐕 **DOGE PUMP!** The hammer strikes with MOON power!`;
                else log = `🐕 **Doge Dump...** The hammer feels light.`;
            }
            else {
                // Standard Weapons
                const weaponData = this.gachaPool.find(w => w.name === currentWeapon);
                if (weaponData) weaponDmg = weaponData.damage;
            }

            // Base Damage 10-20 + Weapon Damage
            let rng = Math.floor(Math.random() * 20) + 10;

            // MARKET MODIFIER (Player)
            if (this.marketState.status === 'BULL') {
                rng = Math.floor(rng * 1.2); // 20% Buff to base damage
                log += " 🚀(Bull Buff)";
            } else if (this.marketState.status === 'BEAR') {
                rng = Math.floor(rng * 0.8); // 20% Nerf
                log += " 🩸(Bear Nerf)";
            }

            // CLASS PASSIVE: MAGE CRIT (30% Chance -> 2x Base Dmg)
            if (this.user.job === 'Mage' && Math.random() < 0.3) {
                rng *= 2;
                log += `\n🔮 **CRITICAL HIT!**`;
            }

            // CLASS PASSIVE: PALADIN SMITE (10% Stun)
            if (this.user.job === 'Paladin' && Math.random() < 0.10) {
                this.monsterStunned = true;
                log += `\n🔨 **SMITE!** You stunned the enemy!`;
            }

            // CLASS PASSIVE: RANGER DOUBLE SHOT (20% Chance)
            let extraShot = 0;
            if (this.user.job === 'Ranger' && Math.random() < 0.20) {
                extraShot = Math.floor(Math.random() * 20) + 10 + weaponDmg;
                log += `\n🏹 **DOUBLE SHOT!** (+${extraShot})`;
            }

            let totalDmg = rng + weaponDmg + extraShot;

            // STEROID EFFECT
            if (this.steroidBuff) {
                totalDmg *= 2;
                log += `\n💉 **RAGE!** Damage doubled to **${totalDmg}**!`;

                // Recoil (30%)
                if (Math.random() < 0.3) {
                    const recoil = Math.floor(this.user.level * 2);
                    this.battleState.playerHP -= recoil;
                    log += `\n💀 **OVERDOSE!** You took ${recoil} recoil damage.`;
                }
            }

            this.battleState.monsterHP -= totalDmg;

            // Format Log if not special
            if (!log.includes("Ether") && !log.includes("Doge")) {
                log = `You hit with **${currentWeapon}** for **${totalDmg}** damage!` + log;
            } else {
                log += `\nTotal Damage: **${totalDmg}**`;
            }
        } else if (action === 'heal') {
            const potionItem = this.user.inventory.find(i => i.itemName === 'Health Potion');

            if (potionItem && potionItem.quantity > 0) {
                await this.prisma.$transaction(async (tx) => {
                    if (potionItem.quantity === 1) {
                        await tx.inventoryItem.delete({ where: { id: potionItem.id } });
                    } else {
                        await tx.inventoryItem.update({ where: { id: potionItem.id }, data: { quantity: { decrement: 1 } } });
                    }
                });
                // Update Local State
                potionItem.quantity--;

                const heal = 40;
                this.battleState.playerHP = Math.min(this.battleState.maxPlayerHP, this.battleState.playerHP + heal);
                log = `🧪 Gulp! +${heal} HP. (${potionItem.quantity} remaining)`;
            } else {
                log = "❌ You have no potions!";
            }
        } else if (action === 'steroid') {
            const steroidItem = this.user.inventory.find(i => i.itemName === 'Steroid Potion');
            if (steroidItem && steroidItem.quantity > 0) {
                await this.prisma.$transaction(async (tx) => {
                    if (steroidItem.quantity === 1) {
                        await tx.inventoryItem.delete({ where: { id: steroidItem.id } });
                    } else {
                        await tx.inventoryItem.update({ where: { id: steroidItem.id }, data: { quantity: { decrement: 1 } } });
                    }
                });
                // Update Local State
                steroidItem.quantity--;
                this.steroidBuff = true;
                log = "💉 **STEROID INJECTED!** You feel a surge of power (2x Damage)!";
            } else {
                log = "❌ You don't have any Steroids!";
            }
        }
        return log;
    }
}
