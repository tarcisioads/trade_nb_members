import { BingXApiClient } from './BingXApiClient';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import * as path from 'path';
import crypto from 'crypto';
import * as dotenv from 'dotenv';
import { KlineData, AllowedInterval } from '../../utils/types';
import { normalizeSymbolBingX } from '../../utils/bingxUtils';
import { logger } from '../../utils/logger';

// Load environment variables
dotenv.config();


interface CacheKey {
  symbol: string;
  interval: AllowedInterval;
  hour: number;
  day: number;
  month: number;
  year: number;
  minute: number; // For 5m and 15m intervals
}

import { IDataProvider } from '../../core/interfaces/IDataProvider';

export class BingXDataService implements IDataProvider {
  public getName(): string {
    return 'bingx';
  }
  private readonly apiClient: BingXApiClient;
  private db: any;

  constructor() {
    // Initialize without any config since we're using environment variables
    this.apiClient = new BingXApiClient();
  }

  public static async create(): Promise<BingXDataService> {
    const instance = new BingXDataService();
    await instance.ensureDatabaseInitialized();
    return instance;
  }


  private async ensureDatabaseInitialized() {
    if (this.db) return;
    const dbPath = path.join(process.cwd(), 'db/bingx_cache.db');
    this.db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    await this.db.exec(`
            CREATE TABLE IF NOT EXISTS kline_cache (
                symbol TEXT,
                interval TEXT,
                hour INTEGER,
                day INTEGER,
                month INTEGER,
                year INTEGER,
                minute INTEGER,
                data TEXT,
                timestamp INTEGER,
                PRIMARY KEY (symbol, interval, hour, day, month, year, minute)
            )
        `);
  }

  private getCurrentTimeComponents(interval: AllowedInterval): CacheKey {
    const now = new Date();
    const minute = now.getMinutes();

    // Calculate the appropriate minute block based on interval
    let minuteBlock = 0;
    if (interval === '5m') {
      minuteBlock = Math.floor(minute / 5) * 5;
    } else if (interval === '15m') {
      minuteBlock = Math.floor(minute / 15) * 15;
    }

    return {
      symbol: '', // This will be set when calling getCachedData
      interval,
      hour: now.getHours(),
      day: now.getDate(),
      month: now.getMonth() + 1, // getMonth() returns 0-11
      year: now.getFullYear(),
      minute: interval === '1h' ? 0 : minuteBlock
    };
  }

  // Função utilitária para retry com delay exponencial
  private async withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 200): Promise<T> {
    let lastError;
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        if (error && error.code === 'SQLITE_BUSY') {
          lastError = error;
          if (i < retries - 1) {
            await new Promise(res => setTimeout(res, delayMs * Math.pow(2, i)));
            continue;
          }
        }
        throw error;
      }
    }
    throw lastError;
  }

  private async getCachedData(symbol: string, timeComponents: CacheKey): Promise<KlineData[] | null> {
    await this.ensureDatabaseInitialized();
    const result = await this.withRetry(() => this.db.get(
      'SELECT data FROM kline_cache WHERE symbol = ? AND interval = ? AND hour = ? AND day = ? AND month = ? AND year = ? AND minute = ?',
      [symbol, timeComponents.interval, timeComponents.hour, timeComponents.day, timeComponents.month, timeComponents.year, timeComponents.minute]
    ));

    if (result && typeof (result as { data?: string }).data === 'string') {
      return JSON.parse((result as { data: string }).data);
    }
    return null;
  }

  private async cacheData(symbol: string, timeComponents: CacheKey, data: KlineData[]): Promise<void> {
    await this.ensureDatabaseInitialized();
    await this.withRetry(() => this.db.run(
      'INSERT OR REPLACE INTO kline_cache (symbol, interval, hour, day, month, year, minute, data, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [symbol, timeComponents.interval, timeComponents.hour, timeComponents.day, timeComponents.month, timeComponents.year, timeComponents.minute, JSON.stringify(data), Date.now()]
    ));
  }

  private parseKlineData(kline: any): KlineData {
    return {
      openTime: kline.time,
      open: kline.open,
      high: kline.high,
      low: kline.low,
      close: kline.close,
      volume: kline.volume,
      closeTime: kline.time,
      quoteAssetVolume: "0",
      numberOfTrades: 0,
      takerBuyBaseAssetVolume: "0",
      takerBuyQuoteAssetVolume: "0"

    };
  }

  public async getKlineData(symbol: string, interval: AllowedInterval = '1h', limit: number = 56, noCache: boolean = false): Promise<KlineData[]> {
    await this.ensureDatabaseInitialized();
    const normalizedSymbol = normalizeSymbolBingX(symbol);
    const timeComponents = this.getCurrentTimeComponents(interval);

    // Check cache first, unless noCache é true
    if (!noCache) {
      const cachedData = await this.getCachedData(normalizedSymbol, timeComponents);
      if (cachedData) {
        logger.info(`Returning cached data for ${normalizedSymbol} (${interval}) at ${timeComponents.hour}:${timeComponents.minute.toString().padStart(2, '0')} on ${timeComponents.day}/${timeComponents.month}/${timeComponents.year}`);
        return cachedData.slice(0, limit);
      }
    }

    try {
      const path = '/openApi/swap/v3/quote/klines';
      const params = {
        symbol: normalizedSymbol,
        interval: interval,
        limit: limit, // More data points for smaller intervals
        timestamp: Date.now().toString()
      };

      const response = await this.apiClient.get<{ data: any[] }>(path, params);
      const klineData = response.data.map(this.parseKlineData);

      // Cache the data
      if (!noCache) {
        await this.cacheData(normalizedSymbol, timeComponents, klineData);
      }

      logger.info(`Fetched and cached new data for ${normalizedSymbol} (${interval}) at ${timeComponents.hour}:${timeComponents.minute.toString().padStart(2, '0')} on ${timeComponents.day}/${timeComponents.month}/${timeComponents.year}`);
      return klineData.slice(0, limit);
    } catch (error) {
      logger.error(`Error fetching data for ${normalizedSymbol} (${interval}):`, error);
      throw error;
    }
  }

  public async getSymbolPrice(symbol: string): Promise<number> {
    const normalizedSymbol = normalizeSymbolBingX(symbol);
    try {
      const path = '/openApi/swap/v2/quote/ticker';
      const params = {
        symbol: normalizedSymbol,
        timestamp: Date.now().toString()
      };

      const response = await this.apiClient.get<{ data: { lastPrice: string } }>(path, params);
      return parseFloat(response.data.lastPrice);
    } catch (error) {
      logger.error(`Error fetching price for ${normalizedSymbol}:`, error);
      throw error;
    }
  }

  public async getSymbolInfo(symbol: string): Promise<{
    maxLeverage: number;
    minLeverage: number;
    maxPositionValue: number;
    minPositionValue: number;
  }> {
    const normalizedSymbol = normalizeSymbolBingX(symbol);
    try {
      const path = '/openApi/swap/v2/quote/contract';
      const params = {
        symbol: normalizedSymbol,
        timestamp: Date.now().toString()
      };

      const response = await this.apiClient.get<{
        data: {
          maxLeverage: number;
          minLeverage: number;
          maxPositionValue: number;
          minPositionValue: number;
        }
      }>(path, params);

      return response.data;
    } catch (error) {
      logger.error(`Error fetching symbol info for ${normalizedSymbol}:`, error);
      throw error;
    }
  }
} 
