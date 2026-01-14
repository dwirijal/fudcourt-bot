# Fudcourt Bot (TypeScript Edition)

A high-performance, "lightspeed" Discord bot for the Fudcourt server, built with pure TypeScript, Prisma (SQLite), and Discord.js.

## 🚀 Features

### 📈 Crypto Analysis
- **CEX Market Data**: Real-time analysis for Binance pairs (e.g., `/coin BTC 1h`).
- **DEX Analysis**: Token scanning via DEXScreener (e.g., `/dex PEPE`).
- **Smart Caching**: Optimized SQLite database caching (Memory -> DB -> API) to minimize API calls and latency.
- **Interactive Charts**: High-speed chart generation using `@napi-rs/canvas`.

### ⚔️ RPG & Economy
- **Economy System**: Earn gold via `/daily`, `/work`, and `/shop`.
- **Gacha System**: Summon weapons and items with `/gacha`.
- **Battle System**: Fight monsters, level up, and earn rewards with `/battle`.
- **Inventory**: Manage your equipment and items.

## 🛠️ Tech Stack
- **Language**: TypeScript
- **Framework**: Discord.js v14
- **Database**: SQLite with Prisma ORM
- **Charting**: @napi-rs/canvas (High-performance Skia binding)
- **Data Fetching**: CCXT (Crypto) & Axios

## ⚡ Optimizations
- **Singleton Database Connection**: Prevents connection exhaustion.
- **Batch Processing**: Market data is inserted in batches to reduce I/O overhead.
- **Intelligent Caching**: Prioritizes local DB data, filling gaps only when necessary.

## 📋 Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd fudcourt-bot-ts
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   Create a `.env` file based on `.env.example`:
   ```env
   DISCORD_TOKEN=your_token_here
   DATABASE_URL="file:./dev.db"
   ```

4. **Initialize Database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Deploy Commands**
   ```bash
   npm run deploy
   ```

6. **Run the Bot**
   ```bash
   npm run dev  # Development
   npm start    # Production
   ```

## 📜 Commands List

- `/coin <symbol> [timeframe]` - View crypto charts.
- `/dex <query>` - Search DEX tokens.
- `/daily` - Claim daily gold.
- `/work` - Work for gold.
- `/gacha` - Summon items (500 Gold).
- `/battle` - Fight monsters.
- `/profile` - View your stats and inventory.

## 🤝 Contributing
Clean code and performance are priorities. Ensure all database operations are optimized (use `prisma.createMany`, unique constraints, etc.) and avoid blocking the event loop.

---
**Fudcourt Bot** - Built for Speed.
