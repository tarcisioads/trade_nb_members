import { IDataProvider } from '../interfaces/IDataProvider';
import { BinanceDataService } from '../../infrastructure/binance/BinanceDataService';
import { BingXDataService } from '../../infrastructure/bingx/BingXDataService';
import { BinanceFuturesDataService } from '../../infrastructure/binance/BinanceFuturesDataService';
import { KlineData, AllowedInterval } from '../../utils/types';
import { logger } from '../../utils/logger';

export class DataServiceManager {
  private klineProviders: IDataProvider[];
  private volumeProviders: IDataProvider[];

  constructor(klineProviders: IDataProvider[] = [], volumeProviders: IDataProvider[] = []) {
    if (klineProviders.length === 0) {
      const bingX = new BingXDataService();
      const binanceFutures = new BinanceFuturesDataService();
      const binanceSpot = new BinanceDataService();
      // Default order for kline: BingX -> Futures -> Spot
      this.klineProviders = [bingX, binanceFutures, binanceSpot];
    } else {
      this.klineProviders = klineProviders;
    }

    if (volumeProviders.length === 0) {
       // Re-instantiate or reuse? Ideally reuse if they are the same type, but new instances is safer for now to avoid complexity without dependency injection container.
       // Actually, let's reuse if we created them above, but logic is split.
       // To keep it simple and safe given the context:
       const bingX = new BingXDataService();
       const binanceFutures = new BinanceFuturesDataService();
       const binanceSpot = new BinanceDataService();
       // Default order for volume: Futures -> BingX -> Spot
       this.volumeProviders = [binanceFutures, bingX, binanceSpot];
    } else {
      this.volumeProviders = volumeProviders;
    }
  }

  public static async create(): Promise<DataServiceManager> {
    const bingX = await BingXDataService.create();
    const binanceFutures = await BinanceFuturesDataService.create();
    const binanceSpot = await BinanceDataService.create();

    // Default order for kline: BingX -> Futures -> Spot
    // Default order for volume: Futures -> BingX -> Spot
    return new DataServiceManager(
      [bingX, binanceFutures, binanceSpot],
      [binanceFutures, bingX, binanceSpot]
    );
  }

  public async getKlineData(symbol: string, interval: AllowedInterval = '1h', limit: number = 56, noCache: boolean = false): Promise<{ data: KlineData[]; source: string }> {
    return this.executeWithFailover(this.klineProviders, symbol, interval, limit, noCache);
  }

  public async getKlineDataVolume(symbol: string, interval: AllowedInterval = '1h', limit: number = 56, noCache: boolean = false): Promise<{ data: KlineData[]; source: string }> {
    return this.executeWithFailover(this.volumeProviders, symbol, interval, limit, noCache);
  }

  public async getKlineDataWithRetry(symbol: string, interval: AllowedInterval = '1h', maxRetries: number = 3): Promise<{ data: KlineData[]; source: string }> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.getKlineData(symbol, interval);
      } catch (error: any) {
        lastError = new Error(error.message);
        logger.info(`Attempt ${attempt}/${maxRetries} failed. Retrying...`);
        // Wait for 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw lastError || new Error(`Failed to fetch data after ${maxRetries} attempts`);
  }

  private async executeWithFailover(
    providers: IDataProvider[],
    symbol: string,
    interval: AllowedInterval,
    limit: number,
    noCache: boolean
  ): Promise<{ data: KlineData[]; source: string }> {
    const errors: any[] = [];

    for (const provider of providers) {
      const providerName = provider.getName();
      try {
        logger.info(`Attempting to fetch data from ${providerName} for ${symbol} with interval ${interval}...`);

        const data = await provider.getKlineData(symbol, interval, limit, noCache);

        // Post-processing logic preserved from original
        const sortedData = [...data].sort((a, b) => b.closeTime - a.closeTime);
        const dataToCheck = [...sortedData].slice(1);

        logger.info(`Successfully fetched data from ${providerName}`);

        // Map simple provider names to specific source strings used by consumers if needed
        // Original sources: 'binance_futures', 'bingx', 'binance'
        // Assuming provider.getName() returns these exact strings.
        return { data: dataToCheck, source: providerName };

      } catch (error: any) {
        logger.error(`Failed to fetch data from ${providerName}: ${error.message}`);
        errors.push({ provider: providerName, error });
      }
    }

    logger.error(`Failed to fetch data from all services for ${symbol}`);
    errors.forEach(e => logger.error(`${e.provider} error:`, e.error));
    throw new Error(`Failed to fetch data for ${symbol} from all services`);
  }
}
