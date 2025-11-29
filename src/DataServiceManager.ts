import { BinanceDataService } from './BinanceDataService';
import { BingXDataService } from './BingXDataService';
import { BinanceFuturesDataService } from './BinanceFuturesDataService';
import { KlineData, AllowedInterval } from './utils/types';
import { logger } from './utils/logger';

export class DataServiceManager {

  constructor() {
  }

  public async getKlineData(symbol: string, interval: AllowedInterval = '1h', limit: number = 56, noCache: boolean = false): Promise<{ data: KlineData[]; source: 'binance_futures' | 'bingx' | 'binance' }> {
    // Try BingX next
    try {
      logger.info(`Attempting to fetch data from BingX for ${symbol} with interval ${interval}...`);
      const bingxService = await BingXDataService.create()
      const bingxData = await bingxService.getKlineData(symbol, interval, limit, noCache);
      const sortedData = [...bingxData].sort((a, b) => b.closeTime - a.closeTime);
      const dataToCheck = [...sortedData].slice(1)

      logger.info('Successfully fetched data from BingX');
      return { data: dataToCheck, source: 'bingx' };
    } catch (bingxError: any) {
      logger.error(`Failed to fetch data from BingX: ${bingxError.message}`);

      // Try Binance Futures first
      try {
        logger.info(`Attempting to fetch data from Binance Futures for ${symbol} with interval ${interval}...`);
        const binanceFuturesService = await BinanceFuturesDataService.create()
        const futuresData = await binanceFuturesService.getKlineData(symbol, interval, limit, noCache);
        const sortedData = [...futuresData].sort((a, b) => b.closeTime - a.closeTime);
        const dataToCheck = [...sortedData].slice(1)
        logger.info('Successfully fetched data from Binance Futures');
        return { data: dataToCheck, source: 'binance_futures' };


      } catch (futuresError: any) {
        logger.error(`Failed to fetch data from Binance Futures: ${futuresError.message}`);

        // Finally try Binance Spot
        try {
          logger.info(`Attempting to fetch data from Binance Spot for ${symbol} with interval ${interval}...`);
          const binanceService = await BinanceDataService.create()
          const binanceData = await binanceService.getKlineData(symbol, interval, limit, noCache);
          const sortedData = [...binanceData].sort((a, b) => b.closeTime - a.closeTime);
          const dataToCheck = [...sortedData].slice(1)
          logger.info('Successfully fetched data from Binance Spot');
          return { data: dataToCheck, source: 'binance' };
        } catch (binanceError: any) {
          logger.error(`Failed to fetch data from all services for ${symbol}`);
          logger.error('Binance Futures error:', futuresError);
          logger.error('BingX error:', bingxError);
          logger.error('Binance Spot error:', binanceError);
          throw new Error(`Failed to fetch data for ${symbol} from all services`);
        }
      }
    }
  }

  public async getKlineDataVolume(symbol: string, interval: AllowedInterval = '1h', limit: number = 56, noCache: boolean = false): Promise<{ data: KlineData[]; source: 'binance_futures' | 'bingx' | 'binance' }> {
    // Try Binance Futures first
    try {
      logger.info(`Attempting to fetch data from Binance Futures for ${symbol} with interval ${interval}...`);
      const binanceFuturesService = await BinanceFuturesDataService.create()
      const futuresData = await binanceFuturesService.getKlineData(symbol, interval, limit, noCache);
      const sortedData = [...futuresData].sort((a, b) => b.closeTime - a.closeTime);
      const dataToCheck = [...sortedData].slice(1)
      logger.info('Successfully fetched data from Binance Futures');
      return { data: dataToCheck, source: 'binance_futures' };


    } catch (futuresError: any) {
      // Try BingX next
      logger.error(`Failed to fetch data from Binance Futures: ${futuresError.message}`);

      try {
        logger.info(`Attempting to fetch data from BingX for ${symbol} with interval ${interval}...`);
        const bingxService = await BingXDataService.create()
        const bingxData = await bingxService.getKlineData(symbol, interval, limit, noCache);
        const sortedData = [...bingxData].sort((a, b) => b.closeTime - a.closeTime);
        const dataToCheck = [...sortedData].slice(1)

        logger.info('Successfully fetched data from BingX');
        return { data: dataToCheck, source: 'bingx' };

      } catch (bingxError: any) {
        logger.error(`Failed to fetch data from BingX: ${bingxError.message}`);

        // Finally try Binance Spot
        try {
          logger.info(`Attempting to fetch data from Binance Spot for ${symbol} with interval ${interval}...`);
          const binanceService = await BinanceDataService.create()
          const binanceData = await binanceService.getKlineData(symbol, interval, limit, noCache);
          const sortedData = [...binanceData].sort((a, b) => b.closeTime - a.closeTime);
          const dataToCheck = [...sortedData].slice(1)
          logger.info('Successfully fetched data from Binance Spot');
          return { data: dataToCheck, source: 'binance' };
        } catch (binanceError: any) {
          logger.error(`Failed to fetch data from all services for ${symbol}`);
          logger.error('Binance Futures error:', futuresError);
          logger.error('BingX error:', bingxError);
          logger.error('Binance Spot error:', binanceError);
          throw new Error(`Failed to fetch data for ${symbol} from all services`);
        }
      }
    }
  }



  public async getKlineDataWithRetry(symbol: string, interval: AllowedInterval = '1h', maxRetries: number = 3): Promise<{ data: KlineData[]; source: 'binance_futures' | 'bingx' | 'binance' }> {
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
} 
