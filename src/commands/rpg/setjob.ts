import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { prisma } from '../../db';

export const data = new SlashCommandBuilder()
    .setName('setjob')
    .setDescription('Choose your character class (Warrior, Mage, Rogue)')
    .addStringOption(option =>
        option.setName('class')
            .setDescription('The class you want to be')
            .setRequired(true)
            .addChoices(
                { name: 'Warrior (Tank/Heal)', value: 'Warrior' },
                { name: 'Mage (DPS/Crit)', value: 'Mage' },
                { name: 'Rogue (Dodge/Speed)', value: 'Rogue' },
                { name: 'Paladin (Tank/Stun)', value: 'Paladin' },
                { name: 'Ranger (Multi-Hit)', value: 'Ranger' }
            ));

export async function execute(interaction: any) {
    await interaction.deferReply();
    const userId = interaction.user.id;
    const chosenJob = interaction.options.getString('class');

    let user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
        user = await prisma.user.create({ data: { id: userId } });
    }

    if (user.job !== 'Novice') {
        await interaction.editReply(`❌ You are already a **${user.job}**! You cannot change classes yet.`);
        return;
    }

    await prisma.user.update({
        where: { id: userId },
        data: { job: chosenJob }
    });

    const embed = new EmbedBuilder()
        .setTitle(`🎓 Class Change Successful!`)
        .setDescription(`You are now a **${chosenJob}**!`)
        .setColor(0x00FF00);

    if (chosenJob === 'Warrior') {
        embed.addFields({ name: 'Bonus', value: '🛡️ **Passive Heal**: Recover 5 HP every turn.' });
    } else if (chosenJob === 'Mage') {
        embed.addFields({ name: 'Bonus', value: '🔮 **Critical Magic**: 30% Chance to deal Double Damage.' });
    } else if (chosenJob === 'Rogue') {
        embed.addFields({ name: 'Bonus', value: '💨 **Evasion**: 25% Chance to dodge attacks completely.' });
    } else if (chosenJob === 'Paladin') {
        embed.addFields({ name: 'Bonus', value: '🛡️ **Holy Shield**: -15% Damage Taken.\n🔨 **Smite**: 10% Chance to Stun enemy.' });
    } else if (chosenJob === 'Ranger') {
        embed.addFields({ name: 'Bonus', value: '🏹 **Double Shot**: 20% Chance to attack twice.' });
    }

    await interaction.editReply({ embeds: [embed] });
}
