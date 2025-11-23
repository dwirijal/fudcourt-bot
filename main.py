import discord
from discord.ext import commands
import os
import asyncio
import sys
from dotenv import load_dotenv
from database.db import init_db

# Fix for Windows async DNS resolution issue
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

load_dotenv()

TOKEN = os.getenv('DISCORD_TOKEN')

class AntigravityBot(commands.Bot):
    def __init__(self):
        intents = discord.Intents.default()
        super().__init__(command_prefix='!', intents=intents)

    async def setup_hook(self):
        # Initialize DB
        print("Initializing database...")
        await init_db()
        
        # Load Cogs
        print("Loading cogs...")
        await self.load_extension('cogs.analysis')
        await self.load_extension('cogs.onchain')
        
        # Sync commands
        print("Syncing commands...")
        await self.tree.sync()
        print("Commands synced")

    async def on_ready(self):
        print(f'Logged in as {self.user} (ID: {self.user.id})')
        print('------')

async def main():
    bot = AntigravityBot()
    async with bot:
        await bot.start(TOKEN)

if __name__ == '__main__':
    if not TOKEN or TOKEN == "your_token_here":
        print("Error: DISCORD_TOKEN not found or set to default in .env")
        print("Please update .env with your actual Discord Token.")
    else:
        try:
            asyncio.run(main())
        except KeyboardInterrupt:
            # Handle Ctrl+C gracefully
            pass
