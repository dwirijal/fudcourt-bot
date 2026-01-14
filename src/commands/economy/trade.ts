
import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { prisma } from '../../db';

// Simple in-memory session
interface TradeOffer {
    gold: number;
    items: { name: string, quantity: number }[];
    locked: boolean;
    confirmed: boolean;
}

interface TradeSession {
    user1Id: string; // The Trigger
    user2Id: string; // The Target
    user1Offer: TradeOffer;
    user2Offer: TradeOffer;
    channelId: string;
    messageId?: string;
}

const activeTrades = new Map<string, TradeSession>();

export const data = new SlashCommandBuilder()
    .setName('trade')
    .setDescription('Trade gold and items with another player')
    .addUserOption(option =>
        option.setName('target')
            .setDescription('The player to trade with')
            .setRequired(true));

export async function execute(interaction: any) {
    const user1 = interaction.user;
    const user2 = interaction.options.getUser('target');

    if (interaction.channelId !== '1460782848570298495') {
        return interaction.reply({ content: "❌ This command can only be used in the **Market Channel**!", ephemeral: true });
    }

    if (user1.id === user2.id) {
        return interaction.reply({ content: "❌ You cannot trade with yourself!", ephemeral: true });
    }
    if (user2.bot) {
        return interaction.reply({ content: "❌ You cannot trade with bots!", ephemeral: true });
    }
    if (activeTrades.has(user1.id) || activeTrades.has(user2.id)) {
        return interaction.reply({ content: "❌ One of you is already in a trade!", ephemeral: true });
    }

    // Initialize Session
    const session: TradeSession = {
        user1Id: user1.id,
        user2Id: user2.id,
        user1Offer: { gold: 0, items: [], locked: false, confirmed: false },
        user2Offer: { gold: 0, items: [], locked: false, confirmed: false },
        channelId: interaction.channelId
    };

    activeTrades.set(user1.id, session);
    activeTrades.set(user2.id, session); // Map both IDs to same session

    const renderEmbed = () => {
        const embed = new EmbedBuilder()
            .setTitle(`🤝 Trade: ${user1.username} ⇄ ${user2.username}`)
            .setColor(0xFFA500)
            .addFields(
                {
                    name: `${user1.username} Offers ${session.user1Offer.locked ? '🔒' : ''}`,
                    value: `Gold: ${session.user1Offer.gold}\nItems: ${session.user1Offer.items.map(i => `${i.quantity}x ${i.name}`).join(', ') || 'None'}`,
                    inline: true
                },
                {
                    name: `${user2.username} Offers ${session.user2Offer.locked ? '🔒' : ''}`,
                    value: `Gold: ${session.user2Offer.gold}\nItems: ${session.user2Offer.items.map(i => `${i.quantity}x ${i.name}`).join(', ') || 'None'}`,
                    inline: true
                }
            );
        return embed;
    };

    const getControls = (userId: string) => {
        const isUser1 = userId === user1.id;
        const myOffer = isUser1 ? session.user1Offer : session.user2Offer;

        if (myOffer.locked) {
            return new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder().setCustomId('confirm').setLabel('✅ Confirm Trade').setStyle(ButtonStyle.Success).setDisabled(myOffer.confirmed),
                new ButtonBuilder().setCustomId('unlock').setLabel('🔓 Unlock').setStyle(ButtonStyle.Secondary).setDisabled(myOffer.confirmed),
                new ButtonBuilder().setCustomId('cancel').setLabel('❌ Cancel').setStyle(ButtonStyle.Danger)
            );
        }

        return new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder().setCustomId('add_gold').setLabel('💰 Add Gold').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('add_item').setLabel('🗡️ Add Item').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('lock').setLabel('🔒 Lock Offer').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('cancel').setLabel('❌ Cancel').setStyle(ButtonStyle.Danger)
        );
    };

    const msg = await interaction.reply({
        content: `<@${user2.id}>! ${user1.username} wants to trade with you.`,
        embeds: [renderEmbed()],
        components: [getControls(user1.id)] // Initially show controls? Logic is tricky for 2 users
    });
    session.messageId = msg.id;

    // We can't show different components to different users easily in one message unless using ephemeral followups, 
    // but the trade panel usually is public. 
    // Solution: Show generic buttons "Edit Offer" which opens a Modal or ephemeral menu?
    // Simplified: Just showing one set of buttons is confusing. 
    // Better: Text below says "Use buttons to manage YOUR offer."

    // Let's rely on interaction filter to handle who clicked what.

    const collector = msg.createMessageComponentCollector({
        time: 300000 // 5 mins
    });

    collector.on('collect', async (i: any) => {
        if (![user1.id, user2.id].includes(i.user.id)) {
            return i.reply({ content: "Not your trade!", ephemeral: true });
        }

        const isUser1 = i.user.id === user1.id;
        const myOffer = isUser1 ? session.user1Offer : session.user2Offer;
        const otherOffer = isUser1 ? session.user2Offer : session.user1Offer;

        if (i.customId === 'cancel') {
            activeTrades.delete(user1.id);
            activeTrades.delete(user2.id);
            collector.stop();
            await i.update({ content: "❌ Trade Cancelled.", components: [], embeds: [] });
            return;
        }

        if (i.customId === 'unlock') {
            myOffer.locked = false;
            myOffer.confirmed = false;
            otherOffer.confirmed = false; // Reset other confirmation too for safety
            await i.update({ embeds: [renderEmbed()], components: [getControls(user1.id)] }); // Just refresh
            // Problem: Updating components creates a race condition for "who sees what"?
            // We can't send different components. We must send ONE row. 
            // If we use Modals, we can trigger them from "Add Gold".
            return;
        }

        if (i.customId === 'lock') {
            myOffer.locked = true;
            await i.update({ embeds: [renderEmbed()] });
        }

        if (i.customId === 'confirm') {
            myOffer.confirmed = true;
            await i.update({ embeds: [renderEmbed()] });

            if (session.user1Offer.confirmed && session.user2Offer.confirmed) {
                // EXECUTE TRADE
                await executeTrade(session, i);
                activeTrades.delete(user1.id);
                activeTrades.delete(user2.id);
                collector.stop();
            }
            return;
        }

        if (i.customId === 'add_gold') {
            const modal = new ModalBuilder().setCustomId('gold_modal').setTitle('Add Gold');
            modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder().setCustomId('amount').setLabel('Amount').setStyle(TextInputStyle.Short)
            ));
            await i.showModal(modal);

            try {
                const submit = await i.awaitModalSubmit({ time: 60000, filter: (s: any) => s.user.id === i.user.id });
                const amount = parseInt(submit.fields.getTextInputValue('amount'));

                if (isNaN(amount) || amount <= 0) {
                    await submit.reply({ content: "❌ Invalid amount.", ephemeral: true });
                    return;
                }

                // Update Session
                myOffer.gold += amount;

                if (myOffer.locked) {
                    myOffer.locked = false;
                    myOffer.confirmed = false;
                    otherOffer.confirmed = false;
                }

                await submit.update({ embeds: [renderEmbed()], components: [getControls(user1.id)] });
            } catch (e) {
                // Time out
            }
        }

        if (i.customId === 'add_item') {
            const modal = new ModalBuilder().setCustomId('item_modal').setTitle('Add Item');
            modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(
                new TextInputBuilder().setCustomId('item_name').setLabel('Item Name').setStyle(TextInputStyle.Short),
                new TextInputBuilder().setCustomId('quantity').setLabel('Quantity').setStyle(TextInputStyle.Short).setValue('1')
            ));
            await i.showModal(modal);

            try {
                const submit = await i.awaitModalSubmit({ time: 60000, filter: (s: any) => s.user.id === i.user.id });
                const name = submit.fields.getTextInputValue('item_name');
                const qty = parseInt(submit.fields.getTextInputValue('quantity')) || 1;

                if (qty <= 0) {
                    await submit.reply({ content: "❌ Invalid quantity.", ephemeral: true });
                    return;
                }

                // Check Inventory
                const userItem = await prisma.inventoryItem.findFirst({
                    where: { userId: i.user.id, itemName: name }
                });

                if (!userItem || userItem.quantity < qty) {
                    await submit.reply({ content: `❌ You don't have **${qty}x ${name}**!`, ephemeral: true });
                    return;
                }

                // Add to Offer
                const existing = myOffer.items.find((x: any) => x.name === name);
                if (existing) existing.quantity += qty;
                else myOffer.items.push({ name, quantity: qty });

                if (myOffer.locked) {
                    myOffer.locked = false;
                    myOffer.confirmed = false;
                    otherOffer.confirmed = false;
                }

                await submit.update({ embeds: [renderEmbed()], components: [getControls(user1.id)] });
            } catch (e) {
                // Time out
            }
        }
    });

    // Handle Modals via global or separate collector? 
    // Slash commands usually need interaction.awaitModalSubmit or a webhook listener.
    // Within `execute`, `interaction` is the scope. 
    // But `showModal` is on `i` (button interaction).
    // We need a way to catch the modal submission.
    // Best way: Use `i.awaitModalSubmit` locally within the button handler? 
    // No, `showModal` returns void. We need to attach a listener.

    // We can use the SAME collector if we set filter properly? No, message collector finds buttons.
    // Use `interaction.client.on('interactionCreate')`? Too messy.
    // We can use `i.awaitModalSubmit`?

    // Actually, `i.awaitModalSubmit` IS the standard way.
    // BUT we are inside `collector.on('collect')`. `await` blocks the collector loop? 
    // No, it handles that specific interaction chain.
}

async function executeTrade(session: TradeSession, i: any) {
    try {
        await prisma.$transaction(async (tx) => {
            // Verify and Transfer User 1 -> User 2
            await processTransfer(tx, session.user1Id, session.user2Id, session.user1Offer);
            // Verify and Transfer User 2 -> User 1
            await processTransfer(tx, session.user2Id, session.user1Id, session.user2Offer);
        });
        await i.followUp(`✅ **Trade Complete!**`);
    } catch (e: any) {
        await i.followUp(`❌ Trade Failed: ${e.message}`);
    }
}

async function processTransfer(tx: any, fromId: string, toId: string, offer: TradeOffer) {
    if (offer.gold > 0) {
        const sender = await tx.user.findUnique({ where: { id: fromId } });
        if (!sender || sender.gold < offer.gold) throw new Error(`<@${fromId}> needs more gold!`);

        await tx.user.update({ where: { id: fromId }, data: { gold: { decrement: offer.gold } } });
        await tx.user.update({ where: { id: toId }, data: { gold: { increment: offer.gold } } });
    }

    for (const item of offer.items) {
        const senderItem = await tx.inventoryItem.findFirst({
            where: { userId: fromId, itemName: item.name }
        });

        if (!senderItem || senderItem.quantity < item.quantity) {
            throw new Error(`<@${fromId}> does not have ${item.quantity}x ${item.name}!`);
        }

        // Decrement Sender
        if (senderItem.quantity === item.quantity) {
            await tx.inventoryItem.delete({ where: { id: senderItem.id } });
        } else {
            await tx.inventoryItem.update({
                where: { id: senderItem.id },
                data: { quantity: { decrement: item.quantity } }
            });
        }

        // Increment Receiver
        const receiverItem = await tx.inventoryItem.findFirst({
            where: { userId: toId, itemName: item.name }
        });

        if (receiverItem) {
            await tx.inventoryItem.update({
                where: { id: receiverItem.id },
                data: { quantity: { increment: item.quantity } }
            });
        } else {
            await tx.inventoryItem.create({
                data: {
                    userId: toId,
                    itemName: item.name,
                    rarity: senderItem.rarity,
                    damage: senderItem.damage,
                    quantity: item.quantity
                }
            });
        }
    }
}
