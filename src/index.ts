import * as dotenv from 'dotenv';
import { TradeCronJob } from './application/jobs/TradeCronJob';
import { PositionMonitorCronJob } from './application/jobs/PositionMonitorCronJob';
import { PositionHistoryCronJob } from './application/jobs/PositionHistoryCronJob';
import { FileTradeRepository } from './infrastructure/database/FileTradeRepository';
import { TradeDatabase } from './infrastructure/database/TradeDatabase';
import { TelegramService } from './infrastructure/telegram/TelegramService';
import { NotificationService } from './infrastructure/telegram/NotificationService';
import { TradeValidator } from './core/services/TradeValidator';
import { TradeExecutor } from './application/services/TradeExecutor';
import { PositionValidator } from './core/services/PositionValidator';
import { OrderMonitor } from './application/services/OrderMonitor';
import { BingXOrderExecutor } from './infrastructure/bingx/BingXOrderExecutor';
import { BingXDataService } from './infrastructure/bingx/BingXDataService';
import { OrderStatusChecker } from './application/services/OrderStatusChecker';
import { TradeOrderProcessor } from './application/services/TradeOrderProcessor';
import { PositionMonitor } from './application/services/PositionMonitor';
import { PositionHistory } from './application/services/PositionHistory';

// Load environment variables
dotenv.config();

// Check if BingX API credentials are set
if (!process.env.BINGX_API_KEY || !process.env.BINGX_API_SECRET) {
    console.error('Error: BINGX_API_KEY and BINGX_API_SECRET must be set in .env file');
    process.exit(1);
}

// --- Composition Root ---

// 1. Infrastructure & Core Services
const tradeRepository = new FileTradeRepository();
const tradeDatabase = new TradeDatabase();
const telegramService = TelegramService.getInstance();
const notificationService = new NotificationService(undefined, tradeDatabase, telegramService);
const bingXDataService = new BingXDataService();
const bingXOrderExecutor = new BingXOrderExecutor(tradeDatabase);

// 2. Domain Services
const tradeValidator = new TradeValidator();
const positionValidator = new PositionValidator();

// 3. Application Services
const tradeExecutor = new TradeExecutor(tradeDatabase);
const orderMonitor = new OrderMonitor();
const orderStatusChecker = new OrderStatusChecker();

const tradeOrderProcessor = new TradeOrderProcessor(
    tradeDatabase,
    orderStatusChecker,
    bingXOrderExecutor,
    bingXDataService,
    notificationService,
    positionValidator
);

const positionMonitor = new PositionMonitor(
    undefined, // onPriceUpdate callback (handled inside PositionMonitorCronJob if needed, or passed here)
    positionValidator,
    tradeDatabase,
    orderMonitor,
    bingXOrderExecutor,
    notificationService
);

const positionHistory = new PositionHistory(); // Needs refactoring to accept dependencies if we want full DI, but for now it instantiates them internally or we can update it.

// 4. Jobs
const tradeCronJob = new TradeCronJob(
    tradeRepository,
    tradeValidator,
    notificationService,
    tradeExecutor
);

const positionMonitorCronJob = new PositionMonitorCronJob(
    positionMonitor,
    tradeOrderProcessor
);

const positionHistoryCronJob = new PositionHistoryCronJob(
    positionHistory,
    tradeDatabase
);

// Start the application
console.log('Starting Trade Automation System...');

// Start Cron Jobs
tradeCronJob.start();
positionMonitorCronJob.start();
positionHistoryCronJob.start();

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('Stopping Trade Automation System...');
    tradeCronJob.stop();
    positionMonitorCronJob.stop();
    positionHistoryCronJob.stop();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Stopping Trade Automation System...');
    tradeCronJob.stop();
    positionMonitorCronJob.stop();
    positionHistoryCronJob.stop();
    process.exit(0);
});