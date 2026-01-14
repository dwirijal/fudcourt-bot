import { SlashCommandBuilder } from 'discord.js';
import { prisma } from '../../db';
import { differenceInMinutes } from 'date-fns';

export const data = new SlashCommandBuilder()
    .setName('work')
    .setDescription('Do some work to earn gold (1 hour cooldown)');

export async function execute(interaction: any) {
    await interaction.deferReply();
    const userId = interaction.user.id;

    try {
        let user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            user = await prisma.user.create({ data: { id: userId } });
        }

        const now = new Date();
        const lastWork = user.lastWork;

        if (lastWork) {
            const minsDiff = differenceInMinutes(now, lastWork);
            if (minsDiff < 60) {
                const minsLeft = 60 - minsDiff;
                await interaction.editReply(`⏳ You are too tired to work! Rest for **${minsLeft} minutes**.`);
                return;
            }
        }

        const reward = Math.floor(Math.random() * 50) + 10; // 10-60 gold
        const jobs = [
            "cleaned the goblin stables",
            "fixed a broken sword",
            "brewed some potions",
            "guarded the village gate"
        ];
        const job = jobs[Math.floor(Math.random() * jobs.length)];

        await prisma.user.update({
            where: { id: userId },
            data: {
                gold: { increment: reward },
                lastWork: now
            }
        });

        await interaction.editReply(`🔨 You **${job}** and earned **${reward} Gold**.`);

    } catch (error: any) {
        console.error(error);
        await interaction.editReply('Error working.');
    }
}
