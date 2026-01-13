import { Client, IntentsBitField, Events, Collection } from 'discord.js';
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


dotenv.config();

const prisma = new PrismaClient();

const TOKEN = process.env.DISCORD_TOKEN;

class AntigravityBot extends Client {
    commands: Collection<string, any>;

    constructor() {
        super({
            intents: [
                IntentsBitField.Flags.Guilds,
                IntentsBitField.Flags.GuildMessages,
                IntentsBitField.Flags.MessageContent,
            ],
        });

        this.commands = new Collection();
        this.once(Events.ClientReady, this.onReady);
        this.on(Events.InteractionCreate, this.onInteractionCreate);
    }

    async onReady() {
        console.log(`Logged in as ${this.user?.tag}!`);
        await this.loadCogs();
    }

    async loadCogs() {
        console.log('Loading cogs...');
        const cogsPath = path.join(__dirname, 'cogs');
        const commandFiles = fs.readdirSync(cogsPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(cogsPath, file);
            const command = await import('file:///' + filePath);
            if (command.default) {
                this.commands.set(command.default.data.name, command.default);
            }
        }
    }

    async onInteractionCreate(interaction: any) {
        if (!interaction.isCommand()) return;

        const command = this.commands.get(interaction.commandName);

        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }

    async startBot() {
        try {
            await prisma.$connect();
            console.log('Database connected.');
            await this.login(TOKEN);
        } catch (error) {
            console.error('Error starting bot:', error);
            await prisma.$disconnect();
        }
    }
}

async function main() {
    if (!TOKEN || TOKEN === 'your_token_here') {
        console.error('Error: DISCORD_TOKEN not found or set to default in .env');
        console.error('Please update .env with your actual Discord Token.');
        return;
    }

    const bot = new AntigravityBot();
    await bot.startBot();
}

main().catch(console.error);