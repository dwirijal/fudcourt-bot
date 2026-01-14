import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const commands = [];
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
                commands.push(command.data.toJSON());
            }
        }
    }

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN!);

    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // Use applicationCommands for global updates (might take 1h) or guildCommands for instant test
        // For now, let's use global validation if CLIENT_ID is available. 
        // We need CLIENT_ID.

        // Since we don't have CLIENT_ID in .env explicitly mentioned in previous steps (only TOKEN), 
        // we'll try to decode token or ask user. 
        // Actually, let's assume the user will put CLIENT_ID in .env or we fetch it from the client object (which we can't do easily here).
        // Let's use a placeholder or check env.

        const clientId = process.env.DISCORD_CLIENT_ID;
        if (!clientId) {
            console.error("DISCORD_CLIENT_ID is missing in .env");
            process.exit(1);
        }

        await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        console.log(`Successfully reloaded ${commands.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();
