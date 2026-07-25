# Trade NB Members

A TypeScript-based cryptocurrency trading automation system that integrates with Binance (market data & sentiment analysis) and BingX (market data, position tracking, and automated order execution). Includes a RESTful Express API server, WebSocket live event broadcaster, SQLite database persistence, background cron job monitoring, Telegram notification bot, and a Vue 3 + Vite + TailwindCSS 4 dashboard.

---

## 🚀 Quick Start with Docker (Recommended)

The easiest way to run the full application (API, Trading Bot, and Frontend) is using **Docker** and **Docker Compose**.

### 1. Clone the repository
```bash
git clone https://github.com/your-repo/trade_nb_members.git
cd trade_nb_members
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your API credentials:
```bash
cp .env.example .env
```

Edit `.env` with your parameters:
```env
BINGX_API_KEY=your_bingx_api_key
BINGX_API_SECRET=your_bingx_api_secret
BINGX_ORDER_PREFIX_CODE=DEF
BINGX_MARGIN=500
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_CHAT_ID=your_telegram_chat_id
```

### 3. Launch with Docker Compose
```bash
# Build and start all services in detached mode
docker compose up -d --build

# View container logs
docker compose logs -f
```

This starts three container services:
- **`trade-api`**: Express 5 REST API & WebSocket server running on port `3000`.
- **`trade-bot`**: Background trading bot process running cron jobs and order execution.
- **`trade-frontend`**: Nginx web server serving the Vue 3 dashboard on port `5173` (proxies `/api` requests to `trade-api`).

To stop all containers:
```bash
docker compose down
```

---

## 🛠 Local Development Setup

If you prefer to run services locally without Docker:

### Prerequisites
- **Node.js**: v20 or higher
- **Package Manager**: `npm` or `pnpm`
- **Database**: SQLite3 (automatically initialized at `db/trades.db`)

### Installation & Execution
```bash
# Install dependencies
npm install

# Run unit and integration test suite
npm test

# Run API + Frontend + Trading Bot concurrently
npm run dev:all

# Or run specific components individually:
npm run api          # Starts API server on port 3000
npm run frontend:dev # Starts Vite frontend dev server on port 5173
npm run dev          # Starts Trading Bot background process
```

### Production Build
```bash
# Build frontend and compile TypeScript backend
npm run build:all
```

---

## 📁 Project Architecture

The repository is structured following clean/hexagonal architecture principles:

```
trade_nb_members/
├── src/
│   ├── core/                  # Domain layer: entities, interfaces, validation & analysis services
│   │   ├── entities/          # Core domain models (Trade)
│   │   ├── interfaces/        # Interface abstractions (IDataProvider, IExchangeService, etc.)
│   │   └── services/          # Domain services (LeverageCalculator, TradeValidator, VolumeAnalyzer, etc.)
│   ├── infrastructure/        # External integrations layer
│   │   ├── binance/           # Binance Futures API & market metrics providers
│   │   ├── bingx/             # BingX REST client, Order Executor, WebSocket client
│   │   ├── database/          # SQLite TradeDatabase schema & persistence repos
│   │   └── telegram/          # Telegram bot notification integration
│   ├── application/           # Application layer: orchestration, jobs & monitors
│   │   ├── jobs/              # Cron jobs (TradeCronJob, PositionMonitorCronJob, PositionHistoryCronJob)
│   │   └── services/          # Order execution, position monitors & history processors
│   ├── api/                   # Presentation/API layer
│   │   ├── controllers/       # Express HTTP controllers
│   │   ├── routes/            # Express routes (/api/trades, /api/notifications, etc.)
│   │   └── index.ts           # Express server setup & WebSocket broadcaster
│   ├── frontend/              # Frontend presentation layer (Vue 3 + Vite + TailwindCSS 4 + Chart.js)
│   │   ├── src/               # Views (Dashboard, TradeList, Forms), components, router, services
│   │   └── index.html         # Main SPA entrypoint
│   └── index.ts               # Main Trading Bot Composition Root
├── tests/                     # Jest test suites
├── db/                        # SQLite database storage (trades.db)
├── data/                      # Data storage & alert media assets
├── Dockerfile                 # Multi-stage Docker build file
├── docker-compose.yml         # Multi-container orchestration specification
└── package.json               # Node.js dependencies and operational scripts
```

---

## ⚡ Key Features

- **Multi-Exchange Data Integration:** Combines Binance Futures sentiment/metrics (Long/Short ratio, Open Interest) with BingX market data.
- **Automated Execution on BingX:** Submits limit/market entry, stop-loss, and multi-tier take-profit orders (TP1 to TP6).
- **Dynamic Risk & Leverage Management:** Dynamic leverage calculation based on timeframes and safety margins.
- **Real-Time Position & Order Lifecycle Tracking:** Cron jobs and WebSockets monitor order fills, trailing stop adjustments, and position closures.
- **Telegram Alert Dispatcher:** Real-time notifications for setup entries, order execution status, errors, and system status updates.
- **Modern Web Dashboard:** Vue 3 dashboard displaying active positions, performance statistics, monthly analytics, setup distribution charts, and take-profit calculators.

---

## ⚙️ Environment Variables Reference

| Variable | Purpose | Default |
| :--- | :--- | :--- |
| `BINGX_API_KEY` | BingX API Key (Required for trading) | - |
| `BINGX_API_SECRET` | BingX API Secret (Required for trading) | - |
| `BINGX_ORDER_PREFIX_CODE` | Order ID prefix string | `DEF` |
| `BINGX_BASE_URL` | BingX REST API Endpoint | `https://open-api.bingx.com` |
| `BINGX_WS_URL` | BingX WebSocket Market Endpoint | `wss://open-api-swap.bingx.com/swap-market` |
| `BINGX_MARGIN` | Default position margin in USDT | `500` |
| `BINGX_LIMIT_ORDER_FEE` | Fee percentage for limit orders | `0.02` |
| `BINGX_MARKET_ORDER_FEE` | Fee percentage for market orders | `0.05` |
| `VOLUME_MARGIN_PERCENTAGE` | Additional margin % for volume setups | `10` |
| `SENTIMENT_MARGIN_PERCENTAGE` | Additional margin % for sentiment setups | `0` |
| `MAX_LEVERAGE` | Maximum allowable leverage limit | `200` |
| `LEVERAGE_SAFETY_FACTOR_PERCENT` | Default leverage safety margin % | `50` |
| `MODIFY_TP1` | Adjust TP1 to 1:1 risk-reward ratio | `false` |
| `VALIDATE_RISK_REWARD` | Minimum acceptable risk-reward ratio | `1.0` |
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token for notification alerts | - |
| `TELEGRAM_CHAT_ID` | Telegram Chat ID target | - |

---

## 📡 REST API & WebSocket Endpoints

### REST API (`http://localhost:3000/api`)
- `GET /api/trades` - List all recorded trades
- `POST /api/trades` - Add a new trade setup
- `GET /api/trades/:id` - Fetch details for a specific trade
- `PUT /api/trades/:id` - Update trade status or parameters
- `DELETE /api/trades/:id` - Remove a trade entry
- `GET /api/notifications` - Retrieve trade notification logs
- `POST /api/trade/market` - Trigger market order execution from a notification
- `GET /api/position-history` - Historical position analytics and risk metrics
- `POST /api/takeprofit` - Compute take-profit target prices
- `GET /api/bingx/contracts` - Fetch BingX contract specifications

### WebSocket (`ws://localhost:3000`)
- Broadcasts real-time JSON trade notifications and position updates to connected web clients with automated 30-second heartbeat ping/pong pruning.

---

## 🧪 Testing

Run the comprehensive unit and integration test suite:
```bash
npm test
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
