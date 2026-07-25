# Agent Workspace Configuration

This document provides context, architectural design, and operational guidelines for AI assistants working within the `trade_nb_members` project.

## Project Overview

`trade_nb_members` is a TypeScript-based cryptocurrency trading automation system. It analyzes market conditions across multiple exchanges (Binance for market data/sentiment analysis, BingX for market data and order execution), calculates dynamic leverage and position risk/reward, executes orders automatically on BingX, tracks live open positions, records historical trade statistics in an SQLite database, and presents a modern web interface for trade monitoring and management.

### Key Capabilities

- **Multi-Exchange Analysis:** Integrates with Binance Futures (K-lines, Long/Short ratio, Open Interest) and BingX Futures APIs/WebSockets.
- **Automated Order Execution:** Submits limit/market entry, stop-loss, and multi-tier take-profit (TP1–TP6) orders on BingX with custom order prefixing.
- **Risk & Sentiment Validation:** Evaluates risk-reward ratios, volume requirements, order blocks / FVGs, and market sentiment before trade entry.
- **Position & Order Lifecycle Monitoring:** Cron jobs and WebSocket listeners track order filling, stop-loss adjustments, TP executions, and position closure.
- **SQLite Database Persistence:** Manages trade logs, order execution details, notifications, monitored symbols, and position history.
- **Vue.js Frontend Dashboard:** Vue 3 + Vite + TailwindCSS 4 + Chart.js frontend for monitoring trades, viewing performance analytics, filtering notifications, and calculating take-profit levels.
- **RESTful API & WebSocket Broadcasting:** Express 5 server exposing endpoints for trade management and a WebSocket server broadcasting live updates to connected frontends.
- **Telegram Notifications:** Real-time alert dispatching via Telegram bot for trade entries, order updates, errors, and system status.

---

## Technical Stack & Architecture

### System Architecture

The project follows clean/hexagonal architecture principles:

```
src/
├── core/                           # Domain Layer (Business logic & entities)
│   ├── entities/                   # Core domain entities (Trade, etc.)
│   ├── interfaces/                 # Abstractions (IDataProvider, IExchangeService, ITradeDatabase, etc.)
│   └── services/                   # Domain services (LeverageCalculator, TradeValidator, SentimentService, VolumeAnalyzer, PnLCalculator, etc.)
├── infrastructure/                 # Infrastructure Layer (External integrations)
│   ├── binance/                    # Binance API & Futures market data providers
│   ├── bingx/                      # BingX REST client, Order Executor, Data Service, WebSocket client
│   ├── database/                   # SQLite TradeDatabase, FileTradeRepository, Position History service
│   └── telegram/                   # Telegram bot integration & NotificationService
├── application/                    # Application Layer (Orchestration & Use cases)
│   ├── jobs/                       # Cron jobs (TradeCronJob, PositionMonitorCronJob, PositionHistoryCronJob)
│   └── services/                   # TradeExecutor, OrderMonitor, OrderStatusChecker, TradeOrderProcessor, PositionMonitor, PositionHistory
├── api/                            # Presentation / API Layer
│   ├── controllers/                # Express controllers (bingx, notification, positionHistory, takeProfit, trade)
│   ├── routes/                     # Router definitions (/api/trades, /api/notifications, /api/position-history, /api/take-profit, /api/bingx)
│   └── index.ts                    # Express server setup & WebSocket server (with heartbeat ping/pong)
├── frontend/                       # Frontend Presentation Layer (Vue 3 + Vite)
│   ├── src/                        # Vue components, views (Dashboard, TradeList, Forms), router, types, services
│   └── index.html                  # Main SPA entrypoint
├── utils/                          # Common utilities, logger (Winston), OrderBlock/FVG detector, types
└── index.ts                        # Main application entrypoint (Trade Bot Composition Root)
```

---

## Environment Configuration

Configuration is managed via environment variables (loaded via `dotenv` from `.env`). Reference `.env.example` when setting up new environments.

| Variable                            | Description                                        | Default / Example                           |
| :---------------------------------- | :------------------------------------------------- | :------------------------------------------ |
| `BINGX_API_KEY`                     | BingX API Key (Required for trading bot)           | `your_api_key`                              |
| `BINGX_API_SECRET`                  | BingX API Secret (Required for trading bot)        | `your_api_secret`                           |
| `BINGX_ORDER_PREFIX_CODE`           | Prefix code for custom order IDs                   | `DEF`                                       |
| `BINGX_BASE_URL`                    | BingX REST API URL                                 | `https://open-api.bingx.com`                |
| `BINGX_WS_URL`                      | BingX WebSocket market URL                         | `wss://open-api-swap.bingx.com/swap-market` |
| `BINGX_MARGIN`                      | Default position margin in USDT                    | `500`                                       |
| `BINGX_LIMIT_ORDER_FEE`             | Limit order fee rate                               | `0.02`                                      |
| `BINGX_MARKET_ORDER_FEE`            | Market order fee rate                              | `0.05`                                      |
| `VOLUME_MARGIN_PERCENTAGE`          | Additional margin % for volume-confirmed setups    | `10`                                        |
| `SENTIMENT_MARGIN_PERCENTAGE`       | Additional margin % for sentiment-confirmed setups | `0`                                         |
| `MAX_LEVERAGE`                      | Maximum allowed leverage factor                    | `200`                                       |
| `LEVERAGE_SAFETY_FACTOR_PERCENT`    | Default leverage safety margin percentage          | `50`                                        |
| `LEVERAGE_SAFETY_FACTOR_PERCENT_1H` | Leverage safety margin for 1-hour timeframe        | `40`                                        |
| `LEVERAGE_SAFETY_FACTOR_PERCENT_15` | Leverage safety margin for 15-minute timeframe     | `60`                                        |
| `LEVERAGE_SAFETY_FACTOR_PERCENT_5`  | Leverage safety margin for 5-minute timeframe      | `70`                                        |
| `LOG_TO_CONSOLE`                    | Enable console output for Winston logger           | `false`                                     |
| `MODIFY_TP1`                        | Adjust TP1 for 1:1 risk-reward ratio if `true`     | `false`                                     |
| `VALIDATE_RISK_REWARD`              | Minimum risk-reward threshold ratio                | `1.0`                                       |
| `TELEGRAM_BOT_TOKEN`                | Telegram Bot token for notifications               | `your_bot_token`                            |
| `TELEGRAM_CHAT_ID`                  | Telegram Chat ID for notification target           | `your_chat_id`                              |

---

## Development & Operational Commands

### Running Services Locally

```bash
# Run tests
npm test

# Run the trading bot process alone
npm run dev

# Run the API server alone (HTTP on 3000 + WebSocket)
npm run api

# Run frontend in development mode (Vite on 5173)
npm run frontend:dev

# Run API + Frontend concurrently
npm run dev:web

# Run API + Frontend + Trading Bot concurrently
npm run dev:all

# Code quality guardrails & verification
npm run lint          # Run ESLint check for TS & Vue
npm run lint:fix      # Auto-fix fixable ESLint issues
npm run format:check  # Verify Prettier formatting
npm run type-check    # TypeScript compiler type check
npm run test:coverage # Run Jest unit tests with coverage reporting

# Build backend TypeScript code to dist/
npm run build

# Build frontend bundle
npm run frontend:build

# Build production frontend and start API in production mode
npm run build:all
```

---

## 🛡️ Code Quality & Automated Guardrails

- **ESLint & Prettier:** Standard `@typescript-eslint` and `plugin:vue/vue3-recommended` rules enforced across backend and frontend code in [.eslintrc.json](file:///home/tarpinha/Projects/trade_nb_members/.eslintrc.json) and [.prettierrc](file:///home/tarpinha/Projects/trade_nb_members/.prettierrc).
- **Git Pre-commit Hooks (Husky & lint-staged):** Automatically formats staged files (`eslint --fix` & `prettier --write`) and runs `npm test` before any commit is accepted locally.
- **GitHub Actions CI Workflow:** [.github/workflows/ci.yml](file:///home/tarpinha/Projects/trade_nb_members/.github/workflows/ci.yml) automatically runs on push and pull-requests to `main`, validating formatting, ESLint rules, TypeScript compilation (`tsc --noEmit`), and Jest test coverage thresholds.
- **Jest Coverage Thresholds:** Configured in [jest.config.js](file:///home/tarpinha/Projects/trade_nb_members/jest.config.js) to enforce code coverage minimums across domain and infrastructure services.

### Docker Operations

```bash
# Build and start all services (trade-api, trade-bot, trade-frontend) using Docker Compose
docker compose up -d --build

# View container logs
docker compose logs -f
```

---

## Database Management

- **Database Engine:** SQLite (stored at `db/trades.db`).
- **Main Tables:**
  - `trades`: Stores active and historical trade specifications (entry, stop, TPs, status, margin settings, sentiment).
  - `order_details`: Tracks BingX order execution statuses, filled quantities, average prices, PnL, and fees.
  - `trade_logs`: Records raw order payload responses and execution timestamps.
  - `trade_notifications`: Stores incoming trade setup signals and validation results.
  - `monitored_symbols`: Tracks active and inactive trading symbols.
  - `position_history`: Stores closed trade performance statistics.
- Table schemas and migrations are automatically validated and initialized on startup inside [TradeDatabase.ts](file:///home/tarpinha/Projects/trade_nb_members/src/infrastructure/database/TradeDatabase.ts).

---

## API & WebSocket Specification

- **Base REST URL:** `http://localhost:3000/api`
- **Endpoints:**
  - `/api/trades`: List, add, retrieve, update, delete trades.
  - `/api/notifications`: Retrieve trade notifications, trigger market trade executions.
  - `/api/position-history`: Historical position analytics, risk stats, symbol lists, and setup descriptions.
  - `/api/takeprofit`: Calculate take-profit levels for trade setups.
  - `/api/bingx/contracts`: Fetch available contract specifications from BingX.
  - `/api/alert`: Serve notification alert audio file.
- **WebSocket Endpoint:** `ws://localhost:3000`
  - Broadcasts JSON-formatted live notification events to connected frontend clients.
  - Features an automated 30-second ping/pong heartbeat mechanism for dead connection pruning.

---

## Development Guidelines for AI Assistants

- **Language:** All code, comments, log output, and documentation MUST be written in **English**.
- **Documentation Policy:** Do NOT create `docs` or `documentation` folders. Maintain documentation strictly in `.md` files at the root directory or relevant subdirectories.
- **Verification Rule:** Always run tests (`npm test`) to verify changes before marking any coding task complete.
- **Commit Rules:**
  - Keep commit messages concise and descriptive.
  - Group logically related changes into a single commit.
  - Proceed with commits directly without asking for message confirmation.
  - **No AI Co-Author:** NEVER include AI co-author trailers or references in commits or pull requests.
