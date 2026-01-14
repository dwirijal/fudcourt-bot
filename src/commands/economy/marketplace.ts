import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '../../db';

export const data = new SlashCommandBuilder()
    .setName('marketplace')
    .setDescription('Global Player Marketplace')
    .addSubcommand(sub =>
        sub.setName('list').setDescription('Sell an item')
           .addStringOption(o => o.setName('item').setDescription('Item Name').setRequired(true))
           .addIntegerOption(o => o.setName('price').setDescription('Price in Gold').setRequired(true)))
    .addSubcommand(sub =>
        sub.setName('view').setDescription('View items for sale'))
    .addSubcommand(sub =>
        sub.setName('buy').setDescription('Buy an item by Listing ID')
            .addIntegerOption(o => o.setName('id').setDescription('Listing ID').setRequired(true)));

export async function execute(interaction: any) {
    const subcommand = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    // --- LIST ITEM ---
    if (subcommand === 'list') {
        const item = interaction.options.getString('item');
        const price = interaction.options.getInteger('price');

        if (price <= 0) return interaction.reply({ content: "Price must be greater than 0.", ephemeral: true });

        const inventoryItem = await prisma.inventoryItem.findFirst({
            where: { userId: userId, itemName: item }
        });

        if (!inventoryItem || inventoryItem.quantity < 1) {
            return interaction.reply({ content: "❌ You don't have this item!", ephemeral: true });
        }

        try {
            await prisma.$transaction(async (tx) => {
                // Remove from Inventory
                if (inventoryItem.quantity === 1) {
                    await tx.inventoryItem.delete({ where: { id: inventoryItem.id } });
                } else {
                    await tx.inventoryItem.update({
                        where: { id: inventoryItem.id },
                        data: { quantity: { decrement: 1 } }
                    });
                }

                // Create Listing
                await tx.marketListing.create({
                    data: {
                        sellerId: userId,
                        itemName: item,
                        price: price
                    }
                });
            });

            return interaction.reply(`✅ Listed **${item}** for **${price} Gold**!`);
        } catch (e) {
            console.error(e);
            return interaction.reply({ content: "❌ Failed to list item.", ephemeral: true });
        }
    }

    // --- VIEW MARKET ---
    if (subcommand === 'view') {
        const listings = await prisma.marketListing.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: { seller: true }
        });

        if (listings.length === 0) return interaction.reply("The marketplace is empty.");

        const embed = new EmbedBuilder()
            .setTitle("⚖️ Fudcourt Auction House")
            .setColor(0x2ecc71);

        const listText = listings.map((l) =>
            `**ID: ${l.id}** | **${l.itemName}** — 💰 ${l.price} Gold\n└ Seller: ${l.seller.username || 'Unknown'}`
        ).join('\n\n');

        embed.setDescription(listText + "\n\n*Use `/marketplace buy id:[ID]` to purchase.*");

        return interaction.reply({ embeds: [embed] });
    }

    // --- BUY ITEM ---
    if (subcommand === 'buy') {
        const listingId = interaction.options.getInteger('id');

        // Check Listing
        const listing = await prisma.marketListing.findUnique({
            where: { id: listingId },
            include: { seller: true }
        });

        if (!listing) return interaction.reply({ content: "❌ Listing not found.", ephemeral: true });
        if (listing.sellerId === userId) return interaction.reply({ content: "❌ You cannot buy your own item!", ephemeral: true });

        // Check Buyer Balance
        const buyer = await prisma.user.findUnique({ where: { id: userId } });
        if (!buyer || buyer.gold < listing.price) {
            return interaction.reply({ content: `❌ You need **${listing.price} Gold**! (Balance: ${buyer?.gold || 0})`, ephemeral: true });
        }

        try {
            await prisma.$transaction(async (tx) => {
                // 1. Delete Listing (Prevent double buy)
                await tx.marketListing.delete({ where: { id: listingId } });

                // 2. Transfer Gold
                await tx.user.update({
                    where: { id: userId },
                    data: { gold: { decrement: listing.price } }
                });
                await tx.user.update({
                    where: { id: listing.sellerId },
                    data: { gold: { increment: listing.price } }
                });

                // 3. Give Item to Buyer
                const existingItem = await tx.inventoryItem.findFirst({
                    where: { userId: userId, itemName: listing.itemName }
                });

                if (existingItem) {
                    await tx.inventoryItem.update({
                        where: { id: existingItem.id },
                        data: { quantity: { increment: 1 } }
                    });
                } else {
                    await tx.inventoryItem.create({
                        data: {
                            userId: userId,
                            itemName: listing.itemName,
                            rarity: "Common", // Default, ideally we store rarity in listing too, but keeping simple
                            damage: 0,
                            quantity: 1
                        }
                    });
                }
            });

            return interaction.reply(`✅ You bought **${listing.itemName}** from **${listing.seller.username}** for ${listing.price} Gold!`);

        } catch (e) {
            console.error(e);
            return interaction.reply({ content: "❌ Transaction failed. Item might have been sold.", ephemeral: true });
        }
    }
}
