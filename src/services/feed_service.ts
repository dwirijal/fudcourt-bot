
import Parser from 'rss-parser';
import axios from 'axios';
import { prisma } from '../db';
import { EmbedBuilder } from 'discord.js';

const parser = new Parser();

// Config (Should be in env, but using hardcoded as requested/provided)
const JOB_FEED_URL = 'https://cryptojobslist.com/jobs.rss';
const JOB_WEBHOOK_URL = process.env.JOB_WEBHOOK_URL || 'https://discord.com/api/webhooks/1362760371336646766/Kqzn6cVYoJgPBukkru0TVjx9CyX3AoM_ZxHfZNDgAYJnupm6MqRyT7h6Rf-EE_dioTRX';

const NEWS_FEED_URL = 'https://id.beincrypto.com/feed/';
const NEWS_WEBHOOK_URL = process.env.NEWS_WEBHOOK_URL || 'https://discord.com/api/webhooks/1386456648306135040/Sg43K3GW15lybCll2UjKr6y1fD2IfG13BwPDLMAkhVmDAxIb7Hg2yazBjWsX8RQeY2VU';

export async function checkFeeds() {
    console.log('[FeedService] Checking feeds...');
    await Promise.all([
        processJobFeed(),
        processNewsFeed()
    ]);
}

async function processJobFeed() {
    try {
        const feed = await parser.parseURL(JOB_FEED_URL);
        // Process latest 5 items to avoid flood on startup/reconnect
        const items = feed.items.slice(0, 5).reverse();

        for (const item of items) {
            if (!item.link) continue;

            // 1. Deduplication
            const exists = await prisma.feedHistory.findUnique({
                where: {
                    feedType_uniqueId: {
                        feedType: 'JOB',
                        uniqueId: item.link
                    }
                }
            });

            if (exists) continue;

            // 2. Formatting Logic (Ported from n8n)
            const contentHtml = item.content || '';
            const contentSnippet = item.contentSnippet || '';
            const creator = item.creator || 'Unknown Company';

            // Extract Image
            const imageUrl = contentHtml.match(/<img[^>]+src=['"]([^'"]+)['"]/)?.[1] || '';

            // Extract Tags
            const tagsRaw = (contentHtml.match(/Tags:(.*?)<\/p>/s)?.[1] || '')
                .match(/<a[^>]*>(.*?)<\/a>/g)
                ?.map(t => t.replace(/<[^>]+>/g, '').trim()) || [];

            const cleanTag = (t: string) => {
                let cleaned = t.replace(/(\s*Jobs?)+$/i, '').trim();
                const words = cleaned.split(' ');
                if (words.length === 2 && words[0].toLowerCase() === words[1].toLowerCase()) {
                    return words[0];
                }
                return cleaned;
            };

            const validTags = tagsRaw
                .map(cleanTag)
                .filter(t => t && !['Remote', 'Full-time', 'Cryptocurrency', 'Unknown'].includes(t));

            const bestTag = validTags[0] || 'Crypto';

            // Extract Location & Type
            const locationMatch = contentSnippet.match(/Location:\s*(.*?)\s*-\s*\[(.*?)\]/);
            const location = locationMatch?.[1]?.trim() || 'Remote';
            const jobType = locationMatch?.[2]?.split(',')?.[0]?.trim() || 'Full-time';

            // Experience Level
            let experienceLevel = contentSnippet.match(/Experience Level:\s*(.*?)(\n|$)/)?.[1]?.trim() || 'N/A';
            const simpleExp = experienceLevel.match(/(\d+\+?\s*years?)/i)?.[1];

            // Smart Comment
            let comment = "Yuk cek detailnya dan apply sekarang! 🚀";
            if (experienceLevel === 'N/A' || !simpleExp) {
                comment = `💡 **Quick Tip:** Kesempatan bagus buat anak **${bestTag}**! Posisi ini sepertinya **terbuka untuk semua level pengalaman**. Gas apply!`;
                experienceLevel = "All Levels (Open)";
            } else if (bestTag && simpleExp) {
                comment = `💡 **Quick Tip:** Segera daftar kalau kamu suka **${bestTag}** dan punya pengalaman sekitar **${simpleExp}**!`;
            }

            // 3. Send Webhook
            const embed = new EmbedBuilder()
                .setTitle(item.title || 'New Job Opportunity')
                .setURL(item.link)
                .setDescription(`**🏢 Company:** ${creator}\n**📍 Location:** ${location}\n**💼 Type:** ${jobType}\n**📊 Level:** ${experienceLevel}\n\n> ${comment}`)
                .setColor('#3B60E4')
                .setAuthor({ name: 'CryptoJobList via FudCourt', iconURL: 'https://i.ibb.co.com/BHgRPVpF/Gemini-Generated-Image-s4btgls4btgls4bt.png' })
                .setTimestamp();

            if (imageUrl) embed.setImage(imageUrl);

            await axios.post(JOB_WEBHOOK_URL, {
                username: "Gibran Pencari Kerja",
                avatar_url: "https://i.ibb.co.com/BHgRPVpF/Gemini-Generated-Image-s4btgls4btgls4bt.png",
                embeds: [embed.toJSON()]
            });

            // 4. Mark as Seen
            await prisma.feedHistory.create({
                data: {
                    feedType: 'JOB',
                    uniqueId: item.link
                }
            });

            console.log(`[JobFeed] Posted: ${item.title}`);
        }

    } catch (e) {
        console.error('[JobFeed] Error:', e);
    }
}

async function processNewsFeed() {
    try {
        const feed = await parser.parseURL(NEWS_FEED_URL);
        const items = feed.items.slice(0, 5).reverse();

        for (const item of items) {
            if (!item.link) continue;

            const exists = await prisma.feedHistory.findUnique({
                where: {
                    feedType_uniqueId: {
                        feedType: 'NEWS',
                        uniqueId: item.link
                    }
                }
            });

            if (exists) continue;

            // Logic
            const author = item.creator || 'Editor';
            // Extract Image from content:encoded or standard content
            const content = item['content:encoded'] || item.content || '';
            const imgUrl = content.match(/src="([^"]+)"/)?.[1] || "https://cryptologos.cc/logos/bitcoin-btc-logo.png";

            // Clean Snippet
            let cleanDesc = (item.contentSnippet || item.content || '')
                .replace(/<[^>]*>?/gm, '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .slice(0, 480);

            const embed = new EmbedBuilder()
                .setTitle(item.title || 'News Update')
                .setURL(item.link)
                .setDescription(`${cleanDesc}...\n\n[baca selengkapnya...](${item.link})`)
                .setColor('#0077FF')
                .setAuthor({ name: `${author} via fud court`, iconURL: 'https://i.ibb.co.com/jPmrMTHZ/Untitled-Project-2.jpg' })
                .setThumbnail('https://media.tenor.com/uVlb6cfdi5MAAAAi/utya.gif')
                .setImage(imgUrl)
                .setTimestamp();

            await axios.post(NEWS_WEBHOOK_URL, {
                username: "News Update",
                avatar_url: "https://i.ibb.co.com/jPmrMTHZ/Untitled-Project-2.jpg",
                embeds: [embed.toJSON()]
            });

            await prisma.feedHistory.create({
                data: {
                    feedType: 'NEWS',
                    uniqueId: item.link
                }
            });
             console.log(`[NewsFeed] Posted: ${item.title}`);
        }

    } catch (e) {
        console.error('[NewsFeed] Error:', e);
    }
}
