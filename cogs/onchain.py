import discord
from discord.ext import commands
from discord import app_commands
from utils.data_fetcher import fetch_dex_data
from datetime import datetime

class OnChain(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="dex", description="Get DEX analysis for a token")
    async def dex(self, interaction: discord.Interaction, query: str):
        await interaction.response.defer()
        
        try:
            pair_data = await fetch_dex_data(query)
            
            if not pair_data:
                await interaction.followup.send(f"No DEX data found for {query}")
                return
                
            base_token = pair_data.get('baseToken', {})
            quote_token = pair_data.get('quoteToken', {})
            price_usd = pair_data.get('priceUsd', 'N/A')
            liquidity = pair_data.get('liquidity', {}).get('usd', 0)
            fdv = pair_data.get('fdv', 0)
            pair_created_at = pair_data.get('pairCreatedAt', None)
            url = pair_data.get('url', '')
            chain_id = pair_data.get('chainId', 'unknown')
            
            embed = discord.Embed(title=f"{base_token.get('name', 'Unknown')} ({base_token.get('symbol', '')})", url=url, color=0xff7400)
            embed.add_field(name="Chain", value=chain_id.title(), inline=True)
            embed.add_field(name="Price", value=f"${price_usd}", inline=True)
            embed.add_field(name="Liquidity", value=f"${liquidity:,.0f}", inline=True)
            embed.add_field(name="FDV", value=f"${fdv:,.0f}", inline=True)
            
            if pair_created_at:
                created_dt = datetime.fromtimestamp(pair_created_at / 1000)
                embed.add_field(name="Pair Age", value=f"<t:{int(pair_created_at/1000)}:R>", inline=True)
            
            await interaction.followup.send(embed=embed)
            
        except Exception as e:
            await interaction.followup.send(f"An error occurred: {str(e)}")

async def setup(bot):
    await bot.add_cog(OnChain(bot))
