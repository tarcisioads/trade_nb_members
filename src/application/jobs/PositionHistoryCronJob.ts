import * as cron from 'node-cron';
import { PositionHistory } from '../services/PositionHistory';
import { TradeDatabase } from '../../infrastructure/database/TradeDatabase';
import { ITradeDatabase } from '../../core/interfaces/ITradeDatabase';

export class PositionHistoryCronJob {
  private positionHistory: PositionHistory;
  private tradeDatabase: ITradeDatabase;
  private isRunning: boolean = false;
  private symbols: string[] = [];

  constructor(
    positionHistory?: PositionHistory,
    tradeDatabase?: ITradeDatabase
  ) {
    this.positionHistory = positionHistory || new PositionHistory();
    this.tradeDatabase = tradeDatabase || new TradeDatabase();
  }

  private async loadSymbolsFromDatabase(): Promise<void> {
    try {
      this.symbols = await this.tradeDatabase.getDistinctSymbols();
      console.log(`[${new Date().toLocaleString()}] Loaded ${this.symbols.length} symbols from database: ${this.symbols.join(', ')}`);
    } catch (error) {
      console.error(`[${new Date().toLocaleString()}] Error loading symbols from database:`, error);
      // Fallback to default symbols if database fails
      this.symbols = ['ALL'];
    }
  }

  private async updatePositionHistory(): Promise<void> {
    try {
      console.log(`\n[${new Date().toLocaleString()}] Starting position history cache update...`);

      // Reload symbols from database before updating cache
      await this.loadSymbolsFromDatabase();

      // Update cache for all symbols from database
      await this.positionHistory.createOrUpdateCache(this.symbols);

      console.log(`[${new Date().toLocaleString()}] Position history cache update completed successfully`);
    } catch (error) {
      console.error(`[${new Date().toLocaleString()}] Error updating position history cache:`, error);
    }
  }

  private initialUpdateTimeout: NodeJS.Timeout | null = null;
  private cronTask: cron.ScheduledTask | null = null;

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('PositionHistoryCronJob is already running');
      return;
    }

    // Initial execution after 1 second
    this.initialUpdateTimeout = setTimeout(async () => {
      console.log(`\n[${new Date().toLocaleString()}] Running initial position history update...`);
      try {
        await this.updatePositionHistory();
      } catch (error) {
        console.error('Error updating positions history:', error);
      }
      this.initialUpdateTimeout = null;
    }, 1000);

    // Schedule the job to run every 30 minutes
    this.cronTask = cron.schedule('*/30 * * * *', async () => {
      try {
        await this.updatePositionHistory();
      } catch (error) {
        console.error('Error updating positions history:', error);
      }
    });

    this.isRunning = true;
    console.log('PositionHistoryCronJob started. Will run every 30 minutes.');
    console.log('Symbols will be dynamically loaded from database on each run.');
  }

  public stop(): void {
    if (!this.isRunning) {
      console.log('PositionHistoryCronJob is not running');
      return;
    }

    if (this.initialUpdateTimeout) {
      clearTimeout(this.initialUpdateTimeout);
      this.initialUpdateTimeout = null;
    }

    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
    }

    this.isRunning = false;
    console.log('PositionHistoryCronJob stopped');
  }

  /**
   * Get the current symbols being monitored (from database)
   * @returns Array of symbols
   */
  public getSymbols(): string[] {
    return [...this.symbols];
  }

  /**
   * Manually trigger a position history update
   */
  public async manualUpdate(): Promise<void> {
    console.log(`\n[${new Date().toLocaleString()}] Manual position history update triggered...`);
    await this.updatePositionHistory();
  }

  /**
   * Reload symbols from database manually
   */
  public async reloadSymbols(): Promise<void> {
    console.log(`\n[${new Date().toLocaleString()}] Manually reloading symbols from database...`);
    await this.loadSymbolsFromDatabase();
  }
} 
