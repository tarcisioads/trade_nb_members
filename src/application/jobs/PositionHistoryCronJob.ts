import * as cron from 'node-cron';
import { PositionHistory } from '../services/PositionHistory';
import { TradeDatabase } from '../../infrastructure/database/TradeDatabase';
import { ITradeDatabase } from '../../core/interfaces/ITradeDatabase';

export class PositionHistoryCronJob {
  private positionHistory: PositionHistory;
  private tradeDatabase: ITradeDatabase;
  private isRunning: boolean = false;
  private isUpdating: boolean = false;
  private highPrioritySymbols: string[] = [];
  private normalPrioritySymbols: string[] = [];

  constructor(
    positionHistory?: PositionHistory,
    tradeDatabase?: ITradeDatabase
  ) {
    this.positionHistory = positionHistory || new PositionHistory();
    this.tradeDatabase = tradeDatabase || new TradeDatabase();
  }

  private async loadSymbolsFromDatabase(): Promise<void> {
    try {
      // 1. Sync new symbols to monitored_symbols table
      await this.tradeDatabase.syncMonitoredSymbols();

      // 2. Load open trade symbols (High Priority)
      this.highPrioritySymbols = await this.tradeDatabase.getOpenTradesSymbols();

      // 3. Load other active symbols (Normal Priority)
      const allActiveSymbols = await this.tradeDatabase.getActiveSymbols();
      this.normalPrioritySymbols = allActiveSymbols.filter(s => !this.highPrioritySymbols.includes(s));

      console.log(`[${new Date().toLocaleString()}] Loaded symbols:`);
      console.log(` - High Priority (Open Trades): ${this.highPrioritySymbols.length}`);
      console.log(` - Normal Priority (Other Active): ${this.normalPrioritySymbols.length}`);
    } catch (error) {
      console.error(`[${new Date().toLocaleString()}] Error loading symbols from database:`, error);
    }
  }

  private async updateHighPriorityPositions(): Promise<void> {
    if (this.isUpdating) {
      console.log(`\n[${new Date().toLocaleString()}] Skipping high priority update as another update is in progress...`);
      return;
    }
    this.isUpdating = true;
    try {
      console.log(`\n[${new Date().toLocaleString()}] Starting HIGH PRIORITY position history update...`);
      await this.loadSymbolsFromDatabase();

      if (this.highPrioritySymbols.length > 0) {
        await this.positionHistory.createOrUpdateCache(this.highPrioritySymbols);
      } else {
        console.log('No high priority symbols to update.');
      }
      console.log(`[${new Date().toLocaleString()}] High priority update completed.`);
    } catch (error) {
      console.error(`[${new Date().toLocaleString()}] Error in high priority update:`, error);
    } finally {
      this.isUpdating = false;
    }
  }

  private async updateNormalPriorityPositions(): Promise<void> {
    if (this.isUpdating) {
      console.log(`\n[${new Date().toLocaleString()}] Skipping normal priority update as another update is in progress...`);
      return;
    }
    this.isUpdating = true;
    try {
      console.log(`\n[${new Date().toLocaleString()}] Starting NORMAL PRIORITY position history update...`);
      await this.loadSymbolsFromDatabase();

      if (this.normalPrioritySymbols.length > 0) {
        await this.positionHistory.createOrUpdateCache(this.normalPrioritySymbols);
      } else {
        console.log('No normal priority symbols to update.');
      }
      console.log(`[${new Date().toLocaleString()}] Normal priority update completed.`);
    } catch (error) {
      console.error(`[${new Date().toLocaleString()}] Error in normal priority update:`, error);
    } finally {
      this.isUpdating = false;
    }
  }

  private initialUpdateTimeout: NodeJS.Timeout | null = null;
  private highPriorityCronTask: cron.ScheduledTask | null = null;
  private normalPriorityCronTask: cron.ScheduledTask | null = null;

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('PositionHistoryCronJob is already running');
      return;
    }

    // Initial execution
    this.initialUpdateTimeout = setTimeout(async () => {
      console.log(`\n[${new Date().toLocaleString()}] Running initial update for all active symbols...`);
      try {
        await this.updateHighPriorityPositions();
        await this.updateNormalPriorityPositions();
      } catch (error) {
        console.error('Error during initial update:', error);
      }
      this.initialUpdateTimeout = null;
    }, 1000);

    // Schedule HIGH priority run every 30 minutes
    this.highPriorityCronTask = cron.schedule('*/30 * * * *', async () => {
      await this.updateHighPriorityPositions();
    });

    // Schedule NORMAL priority run every 12 hours
    this.normalPriorityCronTask = cron.schedule('0 */12 * * *', async () => {
      await this.updateNormalPriorityPositions();
    });

    this.isRunning = true;
    console.log('PositionHistoryCronJob started.');
    console.log(' - High Priority: every 30 mins');
    console.log(' - Normal Priority: every 12 hours');
  }

  public stop(): void {
    if (!this.isRunning) return;

    if (this.initialUpdateTimeout) clearTimeout(this.initialUpdateTimeout);
    if (this.highPriorityCronTask) this.highPriorityCronTask.stop();
    if (this.normalPriorityCronTask) this.normalPriorityCronTask.stop();

    this.isRunning = false;
    console.log('PositionHistoryCronJob stopped');
  }

  public getSymbols(): string[] {
    return [...this.highPrioritySymbols, ...this.normalPrioritySymbols];
  }

  /**
   * Manually trigger a full position history update
   */
  public async manualUpdate(): Promise<void> {
    console.log(`\n[${new Date().toLocaleString()}] Manual full position history update triggered...`);
    await this.updateHighPriorityPositions();
    await this.updateNormalPriorityPositions();
  }

  /**
   * Reload symbols from database manually
   */
  public async reloadSymbols(): Promise<void> {
    console.log(`\n[${new Date().toLocaleString()}] Manually reloading symbols from database...`);
    await this.loadSymbolsFromDatabase();
  }
} 
