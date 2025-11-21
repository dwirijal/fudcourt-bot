# 🌐 Crypto Trading Bot Web Dashboard

A real-time web dashboard for monitoring and managing your crypto trading bot with live charts, signal tracking, and performance metrics.

## ✨ Features

### 📊 **Real-Time Monitoring**
- **Live Price Ticker**: WebSocket-powered price updates
- **Signal Broadcasting**: Instant notifications for new trading signals
- **Connection Status**: Real-time API and service health monitoring

### 📈 **Advanced Charting**
- **Candlestick Charts**: Professional trading charts using LightweightCharts
- **Technical Indicators**: RSI, MACD, Bollinger Bands visualization
- **Multi-Timeframe**: Support for 1m to 1M chart intervals
- **Signal Overlays**: Entry/Exit levels with SL/TP lines

### 🎯 **Signal Management**
- **Signal History**: Complete log of all generated signals
- **Confidence Scores**: Visual representation of signal strength
- **Risk/Reward Ratios**: Automatic R:R calculations
- **Real-Time Updates**: Instant signal broadcasts

### 📊 **Performance Analytics**
- **P&L Tracking**: Daily profit and loss visualization
- **Win Rate Metrics**: Success rate statistics
- **Symbol Performance**: Individual symbol analytics
- **Signal Distribution**: BUY/SELL/NEUTRAL breakdown

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Running crypto trading bot
- Web browser (Chrome, Firefox, Safari)

### Installation

1. **Navigate to dashboard directory**:
```bash
cd python_discordbot/web_dashboard
```

2. **Install additional dependencies**:
```bash
pip install fastapi uvicorn jinja2 python-multipart
```

3. **Run the dashboard**:
```bash
python app.py
```

4. **Access the dashboard**:
```
http://localhost:8000
```

### Authentication
The dashboard uses HTTP Basic Authentication. You'll be prompted for:
- **Username**: Any username (demo mode)
- **Password**: Any password (demo mode)

*Note: In production, implement proper authentication with tokens or OAuth*

## 🏗️ Architecture

### Project Structure
```
web_dashboard/
├── app.py                 # FastAPI application
├── templates/
│   └── dashboard.html     # Main dashboard template
├── static/
│   ├── css/
│   │   └── dashboard.css  # Dashboard styles
│   └── js/
│       └── dashboard.js   # Frontend JavaScript
├── api/                   # API endpoints (future)
└── README.md             # This file
```

### Technology Stack
- **Backend**: FastAPI (Python)
- **Frontend**: Bootstrap 5 + Vanilla JavaScript
- **Charts**: LightweightCharts + Chart.js
- **Real-Time**: WebSocket
- **Authentication**: HTTP Basic (demo)

## 📡 API Endpoints

### Public Endpoints

#### `GET /`
Main dashboard page (requires authentication)

#### `GET /api/health`
Check service health status
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T12:00:00",
  "services": {
    "binance": "connected",
    "cache": "connected",
    "signal_engine": "active"
  }
}
```

### Protected Endpoints (Authentication Required)

#### `GET /signals`
Get recent trading signals
```json
{
  "signals": [
    {
      "symbol": "BTC/USDT",
      "type": "BUY",
      "confidence": 85,
      "entry_price": 45000,
      "stop_loss": 44000,
      "take_profit": 47000,
      "timestamp": "2024-01-20T12:00:00",
      "reasons": ["RSI Oversold", "MACD Bullish"]
    }
  ]
}
```

#### `GET /market/{symbol}`
Get market data for a specific symbol
```json
{
  "symbol": "BTC",
  "chart_data": {
    "15m": [
      {
        "timestamp": 1642694400000,
        "open": 45000,
        "high": 45500,
        "low": 44500,
        "close": 45250,
        "volume": 1000
      }
    ]
  },
  "signal": {
    "type": "BUY",
    "confidence": 85,
    "entry_price": 45250,
    "stop_loss": 44000,
    "take_profit": 47000,
    "risk_reward_ratio": 2.0
  }
}
```

#### `GET /performance`
Get bot performance metrics
```json
{
  "total_signals": 156,
  "win_rate": 68.5,
  "total_pnl": 12.5,
  "current_positions": 5,
  "daily_pnl": [...],
  "signal_distribution": {...},
  "symbol_performance": [...]
}
```

### WebSocket Endpoint

#### `WS /ws`
Real-time data streaming
- Price updates every 2 seconds
- New signal broadcasts
- Connection status updates

## 🎮 Dashboard Sections

### 1. **Overview**
- Key metrics cards
- Live price ticker
- Connection status
- Quick stats

### 2. **Signals**
- Signal history table
- Real-time updates
- Signal details
- Filtering options

### 3. **Charts**
- Interactive candlestick charts
- Technical indicator overlays
- Signal lines (Entry/SL/TP)
- Volume profiles

### 4. **Performance**
- P&L charts
- Win rate metrics
- Symbol-wise performance
- Distribution charts

## 🔧 Configuration

### Environment Variables
Add these to your `.env` file:
```env
# Dashboard Configuration
DASHBOARD_HOST=0.0.0.0
DASHBOARD_PORT=8000
DASHBOARD_DEBUG=false

# Security
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=your_secure_password

# CORS (if needed)
DASHBOARD_CORS_ORIGINS=["http://localhost:3000"]
```

### Customization

#### Adding New Chart Types
```javascript
function initCustomChart() {
    const ctx = document.getElementById('customChart');
    charts.custom = new Chart(ctx, {
        type: 'line',
        data: { ... },
        options: { ... }
    });
}
```

#### Adding New API Endpoints
```python
@app.get("/api/custom")
async def custom_endpoint(username: str = Depends(get_current_user)):
    return {"data": "custom_data"}
```

## 🔒 Security

### Current Implementation
- HTTP Basic Authentication (demo mode)
- CORS middleware
- Input validation

### Production Recommendations
1. **JWT/OAuth2**: Replace basic auth
2. **HTTPS**: Enable SSL/TLS
3. **Rate Limiting**: API request throttling
4. **CORS**: Restrict to allowed origins
5. **CSRF**: Enable CSRF protection

## 📊 Performance Optimization

### Frontend
- Lazy loading of charts
- WebSocket connection pooling
- Efficient DOM updates
- Chart data caching

### Backend
- Async request handling
- Redis caching for frequent data
- Connection pooling for databases
- Response compression

## 🚀 Deployment

### Docker Deployment
```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 🐛 Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if port 8000 is open
   - Verify firewall settings
   - Check browser console for errors

2. **Charts Not Loading**
   - Ensure CDN links are accessible
   - Check browser console for JavaScript errors
   - Verify data format from API

3. **Authentication Issues**
   - Clear browser cache
   - Check credentials
   - Verify .env configuration

### Debug Mode
Run with debug logging:
```bash
uvicorn app:app --reload --log-level debug
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📝 Future Enhancements

### Planned Features
- [ ] Mobile-responsive design
- [ ] Dark mode toggle
- [ ] Alert notifications
- [ ] Portfolio tracking
- [ ] Advanced backtesting
- [ ] Strategy comparison
- [ ] Export data to CSV
- [ ] Multi-language support

### API Enhancements
- [ ] GraphQL support
- [ ] API versioning
- [ ] Rate limiting per user
- [ ] Response caching headers

## 📞 Support

- Discord: [Support Server]
- Issues: [GitHub Issues]
- Documentation: [Wiki]

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.

---

**Built with ❤️ for the crypto community**