# Antigravity Bot - Cryptocurrency Trading Discord Bot

A powerful Discord bot that provides comprehensive cryptocurrency market analysis for both centralized (CEX) and decentralized (DEX) exchanges with advanced technical indicators and chart generation.

## 🚀 Features

- **CEX Analysis**: Real-time market data from Binance with technical indicators
- **DEX Analysis**: Token analysis from DEXScreener with liquidity metrics
- **Technical Indicators**: RSI, MACD, EMA, Bollinger Bands, Fibonacci levels
- **Chart Generation**: Interactive candlestick charts with mplfinance
- **Smart Caching**: Intelligent SQLite database caching for optimal performance
- **Pattern Recognition**: Automated candlestick pattern detection
- **Support/Resistance**: Dynamic level calculation using statistical analysis

## 📋 Commands

### Slash Commands

- `/coin <symbol> [timeframe]` - Get CEX market analysis
  - Symbol: Trading pair (e.g., BTC, BTC/USDT)
  - Timeframe: 15m, 1h, 4h, 1d, 1w (default: 4h)

- `/dex <query>` - Get DEX token analysis
  - Query: Token symbol or contract address

### Example Usage
```
/coin BTC 1h
/coin ETH/USDT 4h
/dex PEPE
/dex 0x1234567890abcdef1234567890abcdef12345678
```

## 🛠️ Installation

### Prerequisites
- Python 3.8+
- Discord Bot Token
- (Optional) Binance API keys for enhanced rate limits

### Quick Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/discordbot.git
   cd discordbot
   ```

2. **Set up virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Discord token and API keys
   ```

5. **Run the bot**
   ```bash
   python main.py
   ```

### Docker Setup

```bash
docker-compose up -d
```

## ⚙️ Configuration

### Required Environment Variables

- `DISCORD_TOKEN`: Your Discord bot token (required)

### Optional Environment Variables

- `BINANCE_API_KEY`: Binance API key (for higher rate limits)
- `BINANCE_SECRET_KEY`: Binance secret key
- `DATABASE_URL`: Custom database URL
- `DEFAULT_TIMEFRAME`: Default chart timeframe (default: 4h)
- `BOT_PREFIX`: Bot command prefix (default: !)

### Discord Bot Setup

1. Create a Discord application at [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a bot user and enable **Message Content Intent** and **Server Members Intent**
3. Generate and copy your bot token
4. Invite the bot to your server with proper permissions

## 📊 Technical Analysis

The bot provides comprehensive technical analysis including:

- **Indicators**: RSI, MACD, EMA (50, 200), Bollinger Bands
- **Patterns**: Doji, Hammer, Engulfing patterns
- **Support/Resistance**: Dynamic level calculation using scipy
- **Trend Analysis**: Moving average crossovers and price momentum
- **Risk Metrics**: Volatility and price range analysis

## 🗂️ Project Structure

```
discordbot/
├── main.py                 # Bot entry point
├── cogs/                   # Discord command modules
│   ├── analysis.py        # CEX market analysis
│   └── onchain.py         # DEX token analysis
├── utils/                  # Utility modules
│   ├── data_fetcher.py    # API data fetching and caching
│   ├── indicators.py      # Technical indicator calculations
│   └── charting.py        # Chart generation
├── database/               # Database layer
│   ├── models.py          # SQLAlchemy models
│   └── db.py              # Database operations
├── requirements.txt        # Python dependencies
├── Dockerfile             # Docker configuration
├── docker-compose.yml     # Docker Compose setup
├── .env.example           # Environment variables template
└── README.md              # This file
```

## 🐳 Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Manual Docker Build

```bash
# Build image
docker build -t antigravity-bot .

# Run container
docker run -d --name antigravity-bot \
  --env-file .env \
  -v $(pwd)/database:/app/database \
  antigravity-bot
```

## 🔧 Dependencies

- `discord.py`: Discord bot framework
- `ccxt`: Cryptocurrency exchange API library
- `pandas`: Data analysis and manipulation
- `pandas_ta`: Technical analysis library
- `scipy`: Scientific computing for advanced analytics
- `mplfinance`: Financial charting
- `sqlalchemy`: Database ORM
- `aiosqlite`: Async SQLite support
- `aiohttp`: Async HTTP client
- `python-dotenv`: Environment variable management

## 🚨 Security Notes

- **Never commit your .env file to version control**
- **Keep your Discord token secure and regenerate if compromised**
- **Use environment-specific configurations for production**
- **Regularly update dependencies for security patches**

## 📈 Performance Features

- **Smart Caching**: Intelligent SQLite caching reduces API calls by 90%+
- **Rate Limiting**: Respects all API rate limits
- **Async Processing**: High-performance async/await architecture
- **Batch Operations**: Efficient data processing and storage

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter issues or have questions:

1. Check the [Issues](https://github.com/yourusername/discordbot/issues) page
2. Create a new issue with detailed information
3. Join our [Discord server](https://discord.gg/your-server) for community support

## 🙏 Acknowledgments

- [ccxt](https://github.com/ccxt/ccxt) for cryptocurrency exchange APIs
- [pandas-ta](https://github.com/twopirllc/pandas-ta) for technical analysis
- [discord.py](https://github.com/Rapptz/discord.py) for Discord bot framework
- [DEXScreener](https://dexscreener.com/) for DEX data API

---

**⚠️ Disclaimer**: This bot is for informational purposes only. Trading cryptocurrencies involves significant risk. Always do your own research before making trading decisions.