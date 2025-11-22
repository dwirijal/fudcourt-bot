import discord
from discord.ext import commands
from discord import app_commands
from utils.data_fetcher import fetch_cex_data
from utils.indicators import calculate_indicators, generate_setup, get_support_resistance
from utils.charting import generate_chart

class Analysis(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="coin", description="Get CEX market analysis for a coin")
    async def coin(self, interaction: discord.Interaction, symbol: str, timeframe: str = "4h"):
        await interaction.response.defer()
        
        try:
            # Normalize symbol (e.g., BTC -> BTC/USDT)
            if "/" not in symbol:
                symbol = f"{symbol.upper()}/USDT"
            else:
                symbol = symbol.upper()
                
            df = await fetch_cex_data(symbol, timeframe)
            
            if df.empty:
                await interaction.followup.send(f"No data found for {symbol}")
                return
                
            df = calculate_indicators(df)
            setup_text = generate_setup(df)
            supports, resistances = get_support_resistance(df)
            
            last_row = df.iloc[-1]
            price = last_row['close']
            
            # Calculate 24h change logic (simplified)
            lookback = 1
            if timeframe == '15m': lookback = 96
            elif timeframe == '1h': lookback = 24
            elif timeframe == '4h': lookback = 6
            elif timeframe == '1d': lookback = 1
            
            change_24h = 0
            if len(df) > lookback:
                prev_price = df.iloc[-lookback-1]['close']
                change_24h = ((price - prev_price) / prev_price) * 100
            
            # Generate Chart
            chart_buffer = generate_chart(df, symbol, timeframe)
            chart_file = discord.File(chart_buffer, filename="chart.png")
            
            embed = discord.Embed(title=f"Analysis for {symbol} ({timeframe})", color=0xff7400)
            embed.add_field(name="Price", value=f"${price:.4f}", inline=True)
            embed.add_field(name="24h Change", value=f"{change_24h:.2f}%", inline=True)
            embed.add_field(name="RSI (14)", value=f"{last_row['RSI']:.2f}", inline=True)
            
            # S/R Levels
            if supports:
                embed.add_field(name="Support", value="\n".join([f"${s:.4f}" for s in supports]), inline=True)
            if resistances:
                embed.add_field(name="Resistance", value="\n".join([f"${r:.4f}" for r in resistances]), inline=True)
                
            embed.add_field(name="Trade Setup", value=setup_text, inline=False)
            embed.set_image(url="attachment://chart.png")
            
            await interaction.followup.send(embed=embed, file=chart_file)
            
        except Exception as e:
            await interaction.followup.send(f"An error occurred: {str(e)}")

async def setup(bot):
    await bot.add_cog(Analysis(bot))
