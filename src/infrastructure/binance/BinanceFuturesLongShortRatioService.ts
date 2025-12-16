import axios from 'axios';
import { logger } from '../../utils/logger';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import * as path from 'path';
import { AllowedInterval } from '../../utils/types';

const BASE_URL = 'https://fapi.binance.com';


/**
 * Parameters for the Long/Short Ratio endpoint.
 * @property {RatioPeriod} period - The chart period.
 * @property {number} [limit] - Result limit. Default 30, Max 500.
 * @property {number} [startTime] - Start timestamp.
 * @property {number} [endTime] - End timestamp.
 */
export interface RatioParams {
  symbol: string;
  period: AllowedInterval;
  limit?: number;
  startTime?: number;
  endTime?: number;
}

/**
 * Interface for the response from the Global Long/Short Ratio endpoint.
 */
export interface GlobalLongShortRatio {
  symbol: string;
  longShortRatio: string;
  longAccount: string;
  shortAccount: string;
  timestamp: number;
}

interface CacheKey {
  symbol: string;
  interval: AllowedInterval;
  hour: number;
  minutes: number;
  day: number;
  month: number;
  year: number;
}



/**
 * Provides a method to fetch Global Long/Short Ratio data from the Binance Futures API, with caching.
 */
export class BinanceFuturesLongShortRatioService {
  private readonly baseUrl: string = BASE_URL;
  private db: any;
  private readonly ratioType: string = 'global_account_ratio';

  constructor() {
  }

  public static async create(): Promise<BinanceFuturesLongShortRatioService> {
    const instance = new BinanceFuturesLongShortRatioService();
    await instance.initializeDatabase(); // <-- Chama e espera a inicialização
    return instance;
  }


  private async initializeDatabase() {
    const dbPath = path.join(__dirname, '../db/binance_futures_lsr_cache.db');
    this.db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // The table schema is kept the same for simplicity, to avoid migration issues.
    // The ratio_type will be hardcoded.
    await this.db.exec(`
        CREATE TABLE IF NOT EXISTS futures_ratio_cache (
            ratio_type TEXT,
            symbol TEXT,
            period TEXT,
            hour INTEGER,
            minutes INTEGER,
            day INTEGER,
            month INTEGER,
            year INTEGER,
            data TEXT,
            timestamp INTEGER,
            PRIMARY KEY (ratio_type, symbol, period, hour, minutes, day, month, year)
        )
    `);
  }

  private getCurrentTimeComponents(interval: AllowedInterval): CacheKey {
    const now = new Date();
    const minutes = now.getMinutes();

    let cacheMinutes = 0;
    if (interval === '5m') {
      cacheMinutes = Math.floor(minutes / 5) * 5;
    } else if (interval === '15m') {
      cacheMinutes = Math.floor(minutes / 15) * 15;
    }
    // For 1h interval, minutes will remain 0

    return {
      symbol: '', // This will be set when calling getCachedData
      interval,
      hour: now.getHours(),
      minutes: cacheMinutes,
      day: now.getDate(),
      month: now.getMonth() + 1, // getMonth() returns 0-11
      year: now.getFullYear()
    };
  }

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

  private async getCachedData(symbol: string, timeComponents: Omit<CacheKey, 'symbol'>): Promise<GlobalLongShortRatio[] | null> {
    const result = await this.withRetry(() =>
      this.db.get(
        'SELECT data FROM futures_ratio_cache WHERE ratio_type = ? AND symbol = ? AND period = ? AND hour = ? AND minutes = ? AND day = ? AND month = ? AND year = ?',
        [this.ratioType, symbol, timeComponents.interval, timeComponents.hour, timeComponents.minutes, timeComponents.day, timeComponents.month, timeComponents.year]
      )
    );

    if (result && typeof (result as { data?: string }).data === 'string') {
      return JSON.parse((result as { data: string }).data);
    }
    return null;
  }

  private async cacheData(symbol: string, timeComponents: Omit<CacheKey, 'symbol'>, data: GlobalLongShortRatio[]): Promise<void> {
    await this.withRetry(() =>
      this.db.run(
        'INSERT OR REPLACE INTO futures_ratio_cache (ratio_type, symbol, period, hour, minutes, day, month, year, data, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [this.ratioType, symbol, timeComponents.interval, timeComponents.hour, timeComponents.minutes, timeComponents.day, timeComponents.month, timeComponents.year, JSON.stringify(data), Date.now()]
      )
    );
  }

  private async fetchData(symbol: string, interval: AllowedInterval = '1h', limit: number = 56): Promise<GlobalLongShortRatio[]> {
    let params: RatioParams = {
      symbol: symbol,
      period: interval,
      limit: limit
    }

    const url = `${this.baseUrl}/futures/data/globalLongShortAccountRatio`;
    try {
      const response = await axios.get<GlobalLongShortRatio[]>(url, { params });
      return response.data;
    } catch (error) {
      logger.error(`Error fetching data from ${url}:`, error);
      throw error;
    }
  }

  /**
   * Fetches the Global Long/Short Ratio (Accounts).
   * @param params - Request parameters, including symbol and period.
   * @param noCache - If true, bypasses the cache.
   * @returns A promise that resolves to an array of ratio data.
   */
  public async getGlobalLongShortAccountRatio(symbol: string, interval: AllowedInterval = '1h', limit: number = 56, noCache: boolean = false): Promise<GlobalLongShortRatio[]> {
    const timeComponents = this.getCurrentTimeComponents(interval);
    console.log(`${symbol} ${interval} ${limit} ${noCache}`)

    if (!noCache) {
      const cachedData = await this.getCachedData(symbol, timeComponents);
      if (cachedData) {
        console.info(`Returning cached ratio data for ${symbol} (${interval}) - ${this.ratioType}`);
        return cachedData.slice(0, limit || 500);
      }
    }

    const fetchedData = await this.fetchData(symbol, interval, limit);

    if (!noCache) {
      await this.cacheData(symbol, timeComponents, fetchedData);
    }

    logger.info(`Fetched and cached new ratio data for ${symbol} (${interval}) - ${this.ratioType}`);
    return fetchedData.slice(0, limit || 500);
  }
}
