import * as cron from 'node-cron';
import * as fs from 'fs';
import * as path from 'path';
import { TradeValidator } from './TradeValidator';
import { DataServiceManager } from './DataServiceManager';
import { NotificationService } from './NotificationService';
import { TradeExecutor } from './TradeExecutor';
import { Trade, AllowedInterval } from './utils/types';




export class TradeCronJob {
  private readonly dataPath: string;
  private readonly tradeValidator: TradeValidator;
  private readonly dataServiceManager: DataServiceManager;
  private readonly notificationService: NotificationService;
  private readonly tradeExecutor: TradeExecutor;

  constructor() {
    this.dataPath = path.join(__dirname, '../data/trades.json');
    this.tradeValidator = new TradeValidator();
    this.dataServiceManager = new DataServiceManager();
    this.notificationService = new NotificationService();
    this.tradeExecutor = new TradeExecutor();
  }

  private readTrades(interval?: string): Trade[] {
    try {
      const data = fs.readFileSync(this.dataPath, 'utf8');
      const trades: Trade[] = JSON.parse(data);

      if (interval) {
        return trades.filter(trade => trade.interval === interval);
      }

      return trades;
    } catch (error) {
      console.error('Error reading trades file:', error);
      return [];
    }
  }

  private async processAndDisplayTrades(trades: Trade[]): Promise<void> {
    console.log('\n=== Trades at', new Date().toLocaleString(), '===');

    let validCount = 0;
    for (const trade of trades) {
      let validationResult = null;
      try {
        // Delay de 1/2 segundos entre cada trade
        if (validCount > 0 || trades.indexOf(trade) > 0) {
          await new Promise(res => setTimeout(res, 500));
        }

        // Validate the trade
        validationResult = await this.tradeValidator.validateTrade(trade);

        console.log(`\nTrade #${trades.indexOf(trade) + 1}:`);
        console.log(`symbol: ${trade.symbol}`);
        console.log(`Position: ${trade.type}`);
        console.log(`Interval: ${trade.interval}`);
        console.log(`Entry: ${trade.entry}`);
        console.log(`Stop: ${trade.stop}`);
        console.log(`Take Profits: ${[trade.tp1, trade.tp2, trade.tp3, trade.tp4, trade.tp5, trade.tp6]
          .filter(tp => tp !== null)
          .join(', ')}`);
        console.log('\nValidation Results:');
        console.log(`Validation: ${validationResult.isValid}`);
        console.log(`Message: ${validationResult.message}`);
        console.log(`Volume Analysis: ${validationResult.volumeAnalysis.color} (StdBar: ${validationResult.volumeAnalysis.stdBar.toFixed(2)})`);
        console.log(`Current Close: ${validationResult.entryAnalysis.currentClose}`);
        console.log(`Recent Closes: ${validationResult.recentCloses}`);

        if (validationResult.warning) {
          console.log(`⚠️ WARNING: Trade has warning status - Entry conditions met but invalidated by other factors`);
        }
        console.log('----------------------------------------');

        // Send notification for trades with warning status
        if (validationResult.warning) {
          await this.notificationService.sendTradeNotification({
            symbol: trade.symbol,
            type: trade.type,
            entry: trade.entry,
            stop: trade.stop,
            takeProfits: {
              tp1: trade.tp1,
              tp2: trade.tp2,
              tp3: trade.tp3,
              tp4: trade.tp4,
              tp5: trade.tp5,
              tp6: trade.tp6
            },
            validation: validationResult,
            analysisUrl: trade.url_analysis || '',
            isWarning: true,
            volume_adds_margin: trade.volume_adds_margin,
            setup_description: trade.setup_description,
            volume_required: trade.volume_required,
            interval: trade.interval
          });
        }

        if (validationResult.isValid) {
          validCount++;


          // Check if BingX API credentials are available
          const bingxApiKey = process.env.BINGX_API_KEY;
          const bingxApiSecret = process.env.BINGX_API_SECRET;

          if (!bingxApiKey || !bingxApiSecret) {
            console.log('\nTrade Execution Skipped:');
            console.log('BingX API credentials not configured. Please set bingx_api_key and bingx_api_secret environment variables.');
            console.log('----------------------------------------');

            // Send notification about skipped execution
            await this.notificationService.sendTradeNotification({
              symbol: trade.symbol,
              type: trade.type,
              entry: trade.entry,
              stop: trade.stop,
              takeProfits: {
                tp1: trade.tp1,
                tp2: trade.tp2,
                tp3: trade.tp3,
                tp4: trade.tp4,
                tp5: trade.tp5,
                tp6: trade.tp6
              },
              validation: validationResult,
              analysisUrl: trade.url_analysis || '',
              executionError: 'BingX API credentials not configured',
              volume_adds_margin: trade.volume_adds_margin,
              setup_description: trade.setup_description,
              volume_required: trade.volume_required,
              interval: trade.interval
            });
            continue;
          }

          // Execute the trade using TradeExecutor
          const executionResult = await this.tradeExecutor.executeTrade({
            symbol: trade.symbol,
            type: trade.type,
            entry: trade.entry,
            stop: trade.stop,
            tp1: trade.tp1,
            tp2: trade.tp2,
            tp3: trade.tp3,
            tp4: trade.tp4,
            tp5: trade.tp5,
            tp6: trade.tp6,
            volume_adds_margin: trade.volume_adds_margin,
            setup_description: trade.setup_description,
            volume_required: trade.volume_required,
            modify_tp1: process.env.MODIFY_TP1 === 'true',
            interval: trade.interval
          });

          if (executionResult.success) {
            console.log('\nTrade Execution Results:');
            console.log(`Status: ${executionResult.message}`);
            console.log(`Leverage: ${executionResult.data?.leverage.optimalLeverage}x`);
            console.log(`Quantity: ${executionResult.data?.quantity}`);

            // Volume margin info is now handled by TradeExecutor
            if (executionResult.data?.volumeMarginAdded) {
              console.log(`Volume Margin Added: ${executionResult.data.volumeMarginAdded.percentage}%`);
              console.log(`Base Margin: ${executionResult.data.volumeMarginAdded.baseMargin.toFixed(2)}`);
              console.log(`Total Margin: ${executionResult.data.volumeMarginAdded.totalMargin.toFixed(2)}`);
            }

            console.log('----------------------------------------');

            // Send notification for valid trade
            await this.notificationService.sendTradeNotification({
              symbol: trade.symbol,
              type: trade.type,
              entry: trade.entry,
              stop: trade.stop,
              takeProfits: {
                tp1: trade.tp1,
                tp2: trade.tp2,
                tp3: trade.tp3,
                tp4: trade.tp4,
                tp5: trade.tp5,
                tp6: trade.tp6
              },
              validation: validationResult,
              analysisUrl: trade.url_analysis || '',
              volume_adds_margin: trade.volume_adds_margin,
              setup_description: trade.setup_description,
              volume_required: trade.volume_required,
              executionResult: executionResult.success && executionResult.data ? {
                leverage: executionResult.data.leverage.optimalLeverage,
                quantity: executionResult.data.quantity,
                entryOrderId: executionResult.data.entryOrder.data.order.orderId,
                stopOrderId: executionResult.data.stopOrder.data.order.orderId,
                volumeMarginAdded: executionResult.data.volumeMarginAdded
              } : undefined,
              executionError: !executionResult.success ? executionResult.message : undefined,
              interval: trade.interval
            });
          } else {
            throw new Error(`Failed to execute trade:${executionResult.message}`);
          }
        }
      } catch (error: any) {
        console.error(`\n❌ Error processing trade #${trades.indexOf(trade) + 1} (${trade.symbol}):`, error);
        console.log('----------------------------------------');
        let msg = error?.message || '';
        let maxPosMatch = msg.match(/Found open*/);
        if (!maxPosMatch) {
          // Send notification about the error
          try {
            await this.notificationService.sendTradeNotification({
              symbol: trade.symbol,
              type: trade.type,
              entry: trade.entry,
              stop: trade.stop,
              takeProfits: {
                tp1: trade.tp1,
                tp2: trade.tp2,
                tp3: trade.tp3,
                tp4: trade.tp4,
                tp5: trade.tp5,
                tp6: trade.tp6
              },
              validation: validationResult ? validationResult : {
                isValid: false,
                message: 'Error during processing',
                volumeAnalysis: {
                  color: 'UNKNOWN',
                  stdBar: 0,
                  currentVolume: 0,
                  mean: 0,
                  std: 0
                },
                entryAnalysis: {
                  currentClose: 0,
                  canEnter: false,
                  hasClosePriceBeforeEntry: false,
                  message: 'Error during processing'
                }
              },
              analysisUrl: trade.url_analysis || '',
              executionError: error instanceof Error ? error.message : 'Unknown error occurred',
              volume_adds_margin: trade.volume_adds_margin,
              setup_description: trade.setup_description,
              volume_required: trade.volume_required,
              interval: trade.interval
            });
          } catch (notificationError) {
            console.error('Failed to send error notification:', notificationError);
          }
        }

      }
    }

    if (validCount === 0) {
      console.log('No valid trades at this time.');
    }

    console.log('\n================================\n');
  }

  public execute(): void {
    // Initial execution after 30 seconds
    setTimeout(async () => {
      console.log('Executing initial trade check after 30 seconds...');
      try {
        const trades5 = this.readTrades('5m'); // Default to 5m interval for initial check
        await this.processAndDisplayTrades(trades5);

        const trades15 = this.readTrades('15m'); // Default to 15m interval for initial check
        await this.processAndDisplayTrades(trades15);

        const trades = this.readTrades('1h'); // Default to 1h interval for initial check
        await this.processAndDisplayTrades(trades);
      } catch (error) {
        console.error('Error trade initial cron :', error);
      }

    }, 30000);

    // Schedule the job to run at minute 1 of every hour
    cron.schedule('1 * * * *', async () => {
      try {
        const trades = this.readTrades('1h'); // Hourly interval
        await this.processAndDisplayTrades(trades);
      } catch (error) {
        console.error('Error trade cron 1 hour:', error);
      }
    });

    // Schedule the job to run at 30 seconds past every 15 minutes (00, 15, 30, 45)
    cron.schedule('30 */15 * * * *', async () => {
      console.log('Executing 15-minute interval trade check...');
      try {
        const trades = this.readTrades('15m'); // 15-minute interval
        await this.processAndDisplayTrades(trades);
      } catch (error) {
        console.error('Error trade cron 15 minutes:', error);
      }
    });

    // Schedule the job to run at 30 seconds past every 5 minutes
    cron.schedule('15 */5 * * * *', async () => {
      console.log('Executing 5-minute interval trade check...');
      try {
        const trades = this.readTrades('5m'); // 5-minute interval
        await this.processAndDisplayTrades(trades);
      } catch (error) {
        console.error('Error trade cron 5 minutes:', error);
      }
    });

    console.log('Trade cron job started. Initial execution in 30 seconds, then will run at minute 1 of every hour, at 30 seconds past every 15 minutes, and at 30 seconds past every 5 minutes.');
  }
} 
