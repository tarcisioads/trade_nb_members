# Trade NB Members

A TypeScript-based trading automation system that integrates with multiple cryptocurrency exchanges (Binance and BingX) to analyze and execute trades(BingX only) based on various market conditions and strategies.

## Features

- Multi-exchange support analyze (Binance and BingX) 
- Automated trade analysis and execution
- Volume analysis and position validation
- Real-time order status monitoring
- Real-time position monitoring with price updates
- Automated stop-loss management
- Leverage calculation and management
- Console-based chart visualization
- SQLite database for trade history and data persistence
- Cron job scheduling for automated tasks
- Modern web interface for trade management
- RESTful API endpoints for trade operations
- Real-time trade notifications
- Trade history visualization
- Responsive UI with modern CSS

## Prerequisites

- Node.js (v14 or higher)
- npm or pnpm package manager
- TypeScript
- SQLite3

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd trade_nb_members
```

2. Install dependencies:
```bash
npm install
# or
pnpm install
```

3. Create a `.env` file in the root directory with your API credentials:
```env
BINGX_API_KEY=your_bingx_api_key
BINGX_API_SECRET=your_bingx_api_secret
```

## Project Structure

```
├── src/
│   ├── api/            # API endpoints and controllers
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── services/
│   ├── frontend/       # Vue.js frontend application
│   │   ├── src/
│   │   │   ├── assets/
│   │   │   │   └── styles/  # CSS styles
│   │   │   ├── components/
│   │   │   ├── router/
│   │   │   └── views/
│   │   └── index.html
│   ├── utils/          # Utility functions
│   ├── BingXDataService.ts
│   ├── BinanceDataService.ts
│   ├── ConsoleChartService.ts
│   ├── DataServiceManager.ts
│   ├── LeverageCalculator.ts
│   ├── NotificationService.ts
│   ├── OrderMonitor.ts
│   ├── OrderStatusChecker.ts
│   ├── PositionMonitor.ts
│   ├── PositionMonitorCronJob.ts
│   ├── PositionValidator.ts
│   ├── TradeCronJob.ts
│   ├── TradeDatabase.ts
│   ├── TradeEntryAnalyzer.ts
│   ├── TradeOrderProcessor.ts
│   ├── TradeValidator.ts
│   ├── VolumeAnalyzer.ts
│   └── index.ts
├── tests/              # Test files
├── db/                 # Database files
├── data/              # Data storage
├── vite.config.ts     # Vite configuration
└── package.json
```

## Usage

1. Development mode:
```bash
npm run dev:all
# or
pnpm dev:all
```

2. Build the project: 
```bash
npm run build:all
# or
pnpm build:all
```

3. Run tests:
```bash
npm test
# or
pnpm test
```

## Main Components

- **Data Services**: Integration with Binance and BingX exchanges
- **Trade Analysis**: Volume analysis, position validation, and entry point analysis
- **Order Processing**: Automated order execution and status monitoring (BingX only)
- **Position Monitoring**: Real-time position tracking with price updates and stop-loss management
- **Database**: SQLite-based storage for trade history and market data
- **Scheduling**: Cron jobs for automated trading tasks

## Position Monitoring System

The system includes a comprehensive position monitoring solution that provides:

- Real-time position tracking with price updates
- Automated stop-loss order management
- Periodic position status updates via cron job
- WebSocket-based price monitoring
- Detailed position logging and status reporting

To use the position monitoring system:

```typescript
The monitor will automatically:
- Track all open positions
- Update prices in real-time
- Manage stop-loss orders
- Log position status every minute
```

## Trade Entry Validation Rules

The system implements a comprehensive set of validation rules to ensure safe and profitable trade entries. A trade is only considered valid when it passes all applicable validation checks.

### Entry Price Validation

1. **Entry Condition**
   - For LONG positions:
     - Current candle's close price must be above entry price
     - Current candle's low price must be below or equal to entry price
   - For SHORT positions:
     - Current candle's close price must be below entry price
     - Current candle's high price must be above or equal to entry price

2. **Price History Check**
   - For LONG positions:
     - Must have at least one previous candle with close price below entry price
     - Cannot have any previous candle meeting entry conditions
   - For SHORT positions:
     - Must have at least one previous candle with close price above entry price
     - Cannot have any previous candle meeting entry conditions

3. **Candle Wick Analysis**
   - For LONG positions:
     - Upper wick must not exceed 80% of total candle height
   - For SHORT positions:
     - Lower wick must not exceed 80% of total candle height

4. **Risk-Reward Validation**
   - Distance to TP1 must be at least 90% of distance to stop loss
   - Formula: `|entry - tp1| / |entry - stop| >= 0.9`

### Volume Analysis

The system analyzes trading volume using standard deviation bars (stdBar) to categorize volume levels:

1. **Volume Categories**
   - RED: stdBar > 4.0 (Extremely high volume)
   - ORANGE: 2.5 < stdBar ≤ 4.0 (Very high volume)
   - YELLOW: 1.0 < stdBar ≤ 2.5 (High volume)
   - WHITE: -0.5 < stdBar ≤ 1.0 (Normal volume)
   - BLUE: stdBar ≤ -0.5 (Low volume)

2. **Volume Validation**
   - Trade is valid if volume is YELLOW, ORANGE, or RED
   - Volume validation can be bypassed by setting `volume: false` in trade parameters
   - Volume analysis is based on the last 5 candles

### Trade Execution Requirements

A trade is only executed when:
1. All entry price validations pass
2. Volume validation passes (unless bypassed)
3. No existing position is open for the same symbol and direction
4. Risk-reward ratio meets minimum requirements
5. Candle wick analysis passes


## Testing

The project uses Jest for testing. Run the test suite with:
```bash
npm test
```

## License

ISC

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

- Never commit your API keys or secrets
- Always use environment variables for sensitive data
- Keep your dependencies up to date
- Review and validate all trade operations before execution 

## Web Interface

The system now includes a modern web interface built with Vue.js and modern CSS, providing an intuitive way to manage trades and monitor positions.

### Features

- **Trade Management**
  - Create and submit new trades
  - View and manage existing positions
  - Real-time trade notifications
  - Trade history visualization

- **User Interface**
  - Responsive design with modern CSS
  - Clean and intuitive interface
  - Real-time updates
  - Interactive trade forms
  - Position monitoring dashboard

### Running the Frontend

1. Development mode:
```bash
pnpm dev
```

2. Build for production:
```bash
pnpm build
```

## API Endpoints

The system provides RESTful API endpoints for trade operations and monitoring:

### Trade Management

- `POST /api/trades` - Create a new trade
- `GET /api/trades` - List all trades
- `GET /api/trades/:id` - Get trade details
- `PUT /api/trades/:id` - Update trade status
- `DELETE /api/trades/:id` - Cancel a trade

## Notification System

The system includes a comprehensive notification service that provides real-time updates about trade events:

- Trade entry and exit notifications
- Stop-loss triggers
- Position updates
- System alerts
- Custom notification preferences

Notifications are delivered through the web interface and can be configured based on user preferences. 
