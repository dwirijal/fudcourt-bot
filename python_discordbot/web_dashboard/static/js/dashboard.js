// Dashboard JavaScript
let ws = null;
let charts = {};
let currentSymbol = 'BTC/USDT';
let currentTimeframe = '15m';

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize WebSocket connection
    initWebSocket();

    // Load initial data
    await loadPerformanceData();
    await loadSignals();

    // Setup event listeners
    setupEventListeners();

    // Initialize charts
    initCharts();

    // Start auto-refresh
    setInterval(refreshData, 30000); // Refresh every 30 seconds
});

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.currentTarget.dataset.section;
            showSection(section);

            // Update active nav
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            e.currentTarget.classList.add('active');
        });
    });

    // Symbol selector
    document.getElementById('symbolSelector').addEventListener('change', async (e) => {
        currentSymbol = e.target.value;
        await loadMarketData(currentSymbol);
    });

    // Timeframe selector
    document.getElementById('timeframeSelector').addEventListener('change', async (e) => {
        currentTimeframe = e.target.value;
        await loadMarketData(currentSymbol);
    });
}

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });

    // Show selected section
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.style.display = 'block';
        selectedSection.classList.add('fade-in');
    }
}

async function initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        console.log('WebSocket connected');
        updateConnectionStatus(true);
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        updateConnectionStatus(false);
        // Attempt to reconnect after 5 seconds
        setTimeout(initWebSocket, 5000);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        updateConnectionStatus(false);
    };
}

function handleWebSocketMessage(data) {
    if (data.type === 'price_update') {
        updatePriceTicker(data.data);
    } else if (data.type === 'new_signal') {
        addNewSignal(data.data);
        // Show notification
        showNotification(data.data);
    }
}

function updateConnectionStatus(connected) {
    const status = document.getElementById('connectionStatus');
    if (connected) {
        status.className = 'badge bg-success';
        status.innerHTML = '<i class="fas fa-circle"></i> Connected';
    } else {
        status.className = 'badge bg-danger connection-status-disconnected';
        status.innerHTML = '<i class="fas fa-circle"></i> Disconnected';
    }
}

function updatePriceTicker(data) {
    const ticker = document.getElementById('priceTicker');
    ticker.innerHTML = '';

    Object.entries(data).forEach(([symbol, info]) => {
        const priceItem = document.createElement('div');
        priceItem.className = 'price-item';

        const changeClass = info.change >= 0 ? 'price-change-positive' : 'price-change-negative';
        const changeIcon = info.change >= 0 ? '↑' : '↓';

        priceItem.innerHTML = `
            <strong>${symbol}</strong><br>
            <span class="${changeClass}">
                $${info.price.toFixed(2)} ${changeIcon} ${Math.abs(info.change).toFixed(2)}%
            </span>
        `;

        ticker.appendChild(priceItem);
    });
}

async function loadSignals() {
    try {
        const response = await fetch('/signals');
        const data = await response.json();

        const tbody = document.querySelector('#signalsTable tbody');
        tbody.innerHTML = '';

        data.signals.forEach(signal => {
            const row = createSignalRow(signal);
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading signals:', error);
    }
}

function createSignalRow(signal) {
    const row = document.createElement('tr');
    const signalClass = signal.type === 'BUY' ? 'signal-badge-buy' :
                       signal.type === 'SELL' ? 'signal-badge-sell' : 'signal-badge-neutral';

    row.innerHTML = `
        <td><strong>${signal.symbol}</strong></td>
        <td><span class="badge ${signalClass}">${signal.type}</span></td>
        <td>
            <div class="progress" style="height: 20px;">
                <div class="progress-bar" role="progressbar" style="width: ${signal.confidence}%">
                    ${signal.confidence}%
                </div>
            </div>
        </td>
        <td>$${signal.entry_price.toLocaleString()}</td>
        <td>$${signal.stop_loss.toLocaleString()}</td>
        <td>$${signal.take_profit.toLocaleString()}</td>
        <td>${signal.risk_reward_ratio.toFixed(2)}</td>
        <td>${new Date(signal.timestamp).toLocaleTimeString()}</td>
    `;

    return row;
}

async function loadMarketData(symbol) {
    try {
        const response = await fetch(`/market/${symbol}`);
        const data = await response.json();

        // Update trading chart
        updateTradingChart(data.chart_data, data.signal);

        // Update indicators chart
        updateIndicatorsChart(data.signal);

    } catch (error) {
        console.error('Error loading market data:', error);
    }
}

async function loadPerformanceData() {
    try {
        const response = await fetch('/performance');
        const data = await response.json();

        // Update overview metrics
        document.getElementById('totalSignals').textContent = data.total_signals || '-';
        document.getElementById('winRate').textContent = `${data.win_rate || 0}%`;
        document.getElementById('totalPnL').textContent = `${data.total_pnl > 0 ? '+' : ''}${data.total_pnl || 0}%`;
        document.getElementById('activePositions').textContent = data.current_positions || '-';

        // Update P&L chart
        updatePnLChart(data.daily_pnl);

        // Update signal distribution
        updateSignalDistributionChart(data.signal_distribution);

        // Update performance table
        updatePerformanceTable(data.symbol_performance);

    } catch (error) {
        console.error('Error loading performance data:', error);
    }
}

function initCharts() {
    // Initialize empty charts
    initTradingChart();
    initIndicatorsChart();
    initPnLChart();
    initSignalDistributionChart();
}

// Trading Chart using LightweightCharts
function initTradingChart() {
    const chartElement = document.getElementById('tradingChart');
    if (!chartElement) return;

    charts.trading = LightweightCharts.createChart(chartElement, {
        width: chartElement.clientWidth,
        height: 500,
        layout: {
            backgroundColor: '#ffffff',
            textColor: '#333',
        },
        grid: {
            vertLines: {
                color: 'rgba(197, 203, 206, 0.5)',
            },
            horzLines: {
                color: 'rgba(197, 203, 206, 0.5)',
            },
        },
        crosshair: {
            mode: 1,
        },
        timeScale: {
            borderColor: 'rgba(197, 203, 206, 1)',
        },
        rightPriceScale: {
            borderColor: 'rgba(197, 203, 206, 1)',
        },
    });

    // Add candlestick series
    charts.candlestick = charts.trading.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderDownColor: '#ef5350',
        borderUpColor: '#26a69a',
        wickDownColor: '#ef5350',
        wickUpColor: '#26a69a',
    });

    // Add volume series
    charts.volume = charts.trading.addHistogramSeries({
        color: 'rgba(76, 175, 80, 0.5)',
        priceFormat: {
            type: 'volume',
        },
        priceScaleId: 'volume',
        scaleMargins: {
            top: 0.8,
            bottom: 0,
        },
    });
}

function updateTradingChart(chartData, signal) {
    if (!charts.candlestick || !chartData[currentTimeframe]) return;

    const data = chartData[currentTimeframe];

    // Update candlestick data
    charts.candlestick.setData(data);

    // Update volume data
    const volumeData = data.map(item => ({
        time: item.timestamp,
        value: item.volume,
        color: item.close >= item.open ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)',
    }));
    charts.volume.setData(volumeData);

    // Add signal lines
    if (signal && signal.entry_price > 0) {
        // Remove existing lines
        if (charts.entryLine) charts.trading.removeSeries(charts.entryLine);
        if (charts.slLine) charts.trading.removeSeries(charts.slLine);
        if (charts.tpLine) charts.trading.removeSeries(charts.tpLine);

        // Add new lines
        charts.entryLine = charts.trading.addLineSeries({
            color: '#2196f3',
            lineWidth: 2,
            title: 'Entry',
        });
        charts.entryLine.priceLine().applyOptions({
            price: signal.entry_price,
            color: '#2196f3',
            lineWidth: 2,
            lineStyle: 2,
        });

        charts.slLine = charts.trading.addLineSeries({
            color: '#f44336',
            lineWidth: 1,
            title: 'SL',
        });
        charts.slLine.priceLine().applyOptions({
            price: signal.stop_loss,
            color: '#f44336',
            lineWidth: 1,
            lineStyle: 2,
        });

        charts.tpLine = charts.trading.addLineSeries({
            color: '#4caf50',
            lineWidth: 1,
            title: 'TP',
        });
        charts.tpLine.priceLine().applyOptions({
            price: signal.take_profit,
            color: '#4caf50',
            lineWidth: 1,
            lineStyle: 2,
        });
    }

    // Fit content
    charts.trading.timeScale().fitContent();
}

// Indicators Chart (RSI, MACD)
function initIndicatorsChart() {
    const ctx = document.getElementById('indicatorsChart');
    if (!ctx) return;

    charts.indicators = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'RSI',
                data: [],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
            }, {
                label: 'MACD',
                data: [],
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function updateIndicatorsChart(signal) {
    if (!charts.indicators) return;

    // Update with mock data for demo
    const labels = Array.from({length: 20}, (_, i) => i);
    const rsiData = Array.from({length: 20}, () => Math.random() * 100);
    const macdData = Array.from({length: 20}, () => (Math.random() - 0.5) * 2);

    charts.indicators.data.labels = labels;
    charts.indicators.data.datasets[0].data = rsiData;
    charts.indicators.data.datasets[1].data = macdData;
    charts.indicators.update();
}

// P&L Chart
function initPnLChart() {
    const ctx = document.getElementById('pnlChart');
    if (!ctx) return;

    charts.pnl = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Daily P&L (%)',
                data: [],
                backgroundColor: [],
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function updatePnLChart(dailyPnl) {
    if (!charts.pnl || !dailyPnl) return;

    const labels = dailyPnl.map(d => d.date);
    const data = dailyPnl.map(d => d.pnl);
    const colors = data.map(d => d >= 0 ? 'rgba(75, 192, 192, 0.5)' : 'rgba(255, 99, 132, 0.5)');

    charts.pnl.data.labels = labels;
    charts.pnl.data.datasets[0].data = data;
    charts.pnl.data.datasets[0].backgroundColor = colors;
    charts.pnl.update();
}

// Signal Distribution Chart
function initSignalDistributionChart() {
    const ctx = document.getElementById('signalDistributionChart');
    if (!ctx) return;

    charts.signalDist = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['BUY', 'SELL', 'NEUTRAL'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(201, 203, 207, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

function updateSignalDistributionChart(distribution) {
    if (!charts.signalDist || !distribution) return;

    charts.signalDist.data.datasets[0].data = [
        distribution.BUY || 0,
        distribution.SELL || 0,
        distribution.NEUTRAL || 0
    ];
    charts.signalDist.update();
}

// Update Performance Table
function updatePerformanceTable(symbolPerformance) {
    const tbody = document.querySelector('#performanceTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    symbolPerformance.forEach(perf => {
        const row = document.createElement('tr');
        const pnlClass = perf.pnl >= 0 ? 'text-success' : 'text-danger';

        row.innerHTML = `
            <td><strong>${perf.symbol}</strong></td>
            <td class="${pnlClass}">${perf.pnl > 0 ? '+' : ''}${perf.pnl}%</td>
            <td>${perf.signals}</td>
            <td>65%</td>
        `;
        tbody.appendChild(row);
    });
}

// Utility Functions
async function refreshData() {
    await loadPerformanceData();
    await loadSignals();
    if (currentSymbol) {
        await loadMarketData(currentSymbol);
    }
}

function switchChartType(type) {
    // Implementation for switching chart types
    console.log('Switching to chart type:', type);
}

function showNotification(signal) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'alert alert-info alert-dismissible fade show position-fixed';
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';

    const signalClass = signal.type === 'BUY' ? 'success' : 'danger';
    notification.innerHTML = `
        <h5 class="alert-heading">
            <i class="fas fa-bell"></i> New Signal: ${signal.type}
        </h5>
        <p>
            <strong>${signal.symbol}</strong><br>
            Entry: $${signal.entry_price}<br>
            Confidence: ${signal.confidence}%
        </p>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(notification);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}