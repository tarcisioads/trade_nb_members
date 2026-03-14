import * as cron from 'node-cron';
import { PositionMonitor } from '../services/PositionMonitor';
import { TradeOrderProcessor } from '../services/TradeOrderProcessor';

export class PositionMonitorCronJob {
  private positionMonitor: PositionMonitor;
  private tradeOrderProcessor: TradeOrderProcessor;
  private isRunning: boolean = false;
  private isUpdating: boolean = false;

  constructor(
    positionMonitor?: PositionMonitor,
    tradeOrderProcessor?: TradeOrderProcessor
  ) {
    // Create PositionMonitor with a callback to log price updates
    this.positionMonitor = positionMonitor || new PositionMonitor((position) => {
    });
    this.tradeOrderProcessor = tradeOrderProcessor || new TradeOrderProcessor();
  }

  private async logMonitoredPositions(): Promise<void> {
    const positions = this.positionMonitor.getMonitoredPositions();
    if (positions.length > 0) {
      console.log('\nCurrent monitored positions:');
      positions.forEach(pos => {
        console.log(`- ${pos.symbol} ${pos.positionSide}`);
        console.log(`  Entry: ${pos.entryPrice}`);
        console.log(`  Current Price: ${pos.lastPrice}`);
        if (pos.stopLossOrder) {
          console.log(`  Stop Loss: ${pos.stopLossOrder.stopPrice}`);
        }
        console.log('---');
      });
    } else {
      console.log('No positions currently being monitored');
    }
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      console.log('PositionMonitorCronJob is already running');
      return;
    }
    // Initial execution after 30 seconds
    setTimeout(async () => {
      if (this.isUpdating) {
        console.log(`\n[${new Date().toLocaleString()}] Skipping initial position update as another update is in progress...`);
        return;
      }
      this.isUpdating = true;
      console.log(`\n[${new Date().toLocaleString()}] Running position update...`);

      try {
        await this.positionMonitor.updatePositions();
        const monitoredPositions = this.positionMonitor.getMonitoredPositionsMap();
        await this.tradeOrderProcessor.processTrades(monitoredPositions);

        // Log current monitored positions
        await this.logMonitoredPositions()
      } catch (error) {
        console.error('Error updating positions:', error);
      } finally {
        this.isUpdating = false;
      }
    }, 10000);



    // Schedule the job to run every minute
    cron.schedule('* * * * *', async () => {
      if (this.isUpdating) {
        console.log(`\n[${new Date().toLocaleString()}] Skipping scheduled position update as another update is in progress...`);
        return;
      }
      this.isUpdating = true;
      try {
        console.log(`\n[${new Date().toLocaleString()}] Running position update...`);
        await this.positionMonitor.updatePositions();
        const monitoredPositions = this.positionMonitor.getMonitoredPositionsMap();
        await this.tradeOrderProcessor.processTrades(monitoredPositions);

        // Log current monitored positions
        await this.logMonitoredPositions();
      } catch (error) {
        console.error('Error updating positions:', error);
      } finally {
        this.isUpdating = false;
      }
    });

    this.isRunning = true;
    console.log('PositionMonitorCronJob started. Will run every minute.');
  }

  public stop(): void {
    if (!this.isRunning) {
      console.log('PositionMonitorCronJob is not running');
      return;
    }

    // Disconnect all websockets
    this.positionMonitor.disconnect();
    this.isRunning = false;
    console.log('PositionMonitorCronJob stopped');
  }
} 
