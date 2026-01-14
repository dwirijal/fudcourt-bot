import axios from 'axios';
import { Client, ChannelType, GuildChannel } from 'discord.js';

// Config
const OWLRACLE_API_KEY = process.env.OWLRACLE_API_KEY || '708db314934b41259387ec2f040adec8';
const CHAINS = [
    {
        name: "Ethereum",
        slug: "eth",
        channelId: "1443004178283892877"
    },
    {
        name: "Base",
        slug: "base",
        channelId: "1443008164600741929"
    },
    {
        name: "BNB Chain",
        slug: "bsc",
        channelId: "1443008263980322867"
    }
];

export async function updateGasPrices(client: Client) {
    console.log('[GasService] Updating gas prices...');

    for (const chain of CHAINS) {
        try {
            const url = `https://api.owlracle.info/v4/${chain.slug}/gas?apikey=${OWLRACLE_API_KEY}`;
            const response = await axios.get(url);

            if (!response.data || !response.data.speeds) {
                console.warn(`[GasService] No data for ${chain.name}`);
                continue;
            }

            const speeds = response.data.speeds;
            const fastSpeed = speeds[2] || speeds[1];

            const fastGasVal = parseFloat(fastSpeed.maxFeePerGas || fastSpeed.gasPrice || 0);

            const fmtGwei = (val: number) => val < 1 ? val.toFixed(4) : val.toFixed(0);

            let channelEmoji = "🟢";
            if (fastGasVal > 50) channelEmoji = "🔴";
            else if (fastGasVal > 10) channelEmoji = "🔵";

            const newName = `${channelEmoji} ${chain.name}: ${fmtGwei(fastGasVal)} Gwei`;

            const channel = await client.channels.fetch(chain.channelId);

            // Check if channel exists and is manageable
            // 'setName' exists on GuildChannels (Text, Voice, etc)
            if (channel && !channel.isDMBased()) {
                 // Cast to GuildChannel to access setName
                 const guildChannel = channel as GuildChannel;
                 if (guildChannel.name !== newName) {
                     await guildChannel.setName(newName);
                     console.log(`[GasService] Updated ${chain.name} -> ${newName}`);
                 }
            } else {
                console.warn(`[GasService] Channel ${chain.channelId} not found or invalid.`);
            }

        } catch (e) {
            console.error(`[GasService] Error updating ${chain.name}:`, e);
        }
    }
}
