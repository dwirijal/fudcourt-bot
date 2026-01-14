import { Client, GatewayIntentBits, Collection, Interaction, ChannelType } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Extend Client to support commands collection
class BotClient extends Client {
    commands: Collection<string, any> = new Collection();
}

const client = new BotClient({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// Load commands
// Load commands from subfolders
const foldersPath = path.join(__dirname, 'commands');
// Ensure commands directory exists
if (!fs.existsSync(foldersPath)) {
    fs.mkdirSync(foldersPath);
}

const commandFolders = fs.readdirSync(foldersPath).filter(folder => fs.lstatSync(path.join(foldersPath, folder)).isDirectory());

(async () => {
    for (const folder of commandFolders) {
        const commandsPath = path.join(foldersPath, folder);
        const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts') || file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(commandsPath, file);
            const command = await import(filePath);
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
            } else {
                console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
            }
        }
    }
})();

client.once('ready', () => {
    console.log(`🚀 Bot is ready! Logged in as ${client.user?.tag}`);
});

client.on('channelCreate', async (channel) => {
    // Target Server Listener
    if (channel.type === ChannelType.GuildCategory) {
        // We need to cast or check if 'guild' exists on channel (it does for GuildCategory)
        if ('guild' in channel && channel.guild.id === '1460782724582342728') {
            console.log(`[EVENT] 📂 Custom Category Caught: "${channel.name}" in Server ${channel.guild.name}`);
        }
    }
});

client.on('interactionCreate', async (interaction: Interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = (interaction.client as BotClient).commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
