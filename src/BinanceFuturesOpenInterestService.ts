import axios from 'axios';
import { logger } from './utils/logger';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import * as path from 'path';
import { AllowedInterval } from './utils/types';

const BASE_URL = 'https://fapi.binance.com';

export interface OpenInterestParams {
  symbol: string;
  period: AllowedInterval;
  limit?: number;
  startTime?: number;
  endTime?: number;
}

export interface OpenInterest {
  symbol: string;
  sumOpenInterest: string;
  sumOpenInterestValue: string;
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

export class BinanceFuturesOpenInterestService {
  private readonly baseUrl: string = BASE_URL;
  private db: any;
  private readonly dataType: string = 'open_interest_hist';

  constructor() {
  }

  public static async create(): Promise<BinanceFuturesOpenInterestService> {
    const instance = new BinanceFuturesOpenInterestService();
    await instance.initializeDatabase(); // <-- Chama e espera a inicialização
    return instance;
  }


  private async initializeDatabase() {
    const dbPath = path.join(__dirname, '../db/binance_futures_oi_cache.db');
    this.db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    await this.db.exec(`
        CREATE TABLE IF NOT EXISTS futures_open_interest_cache (
            data_type TEXT,
            symbol TEXT,
            interval TEXT,
            hour INTEGER,
            minutes INTEGER,
            day INTEGER,
            month INTEGER,
            year INTEGER,
            data TEXT,
            timestamp INTEGER,
            PRIMARY KEY (data_type, symbol, interval, hour, minutes, day, month, year)
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

  private async getCachedData(symbol: string, timeComponents: Omit<CacheKey, 'symbol'>): Promise<OpenInterest[] | null> {
    const result = await this.withRetry(() =>
      this.db.get(
        'SELECT data FROM futures_open_interest_cache WHERE data_type = ? AND symbol = ? AND interval = ? AND hour = ? AND minutes = ? AND day = ? AND month = ? AND year = ?',
        [this.dataType, symbol, timeComponents.interval, timeComponents.hour, timeComponents.minutes, timeComponents.day, timeComponents.month, timeComponents.year]
      )
    );

    if (result && typeof (result as { data?: string }).data === 'string') {
      return JSON.parse((result as { data: string }).data);
    }
    return null;
  }

  private async cacheData(symbol: string, timeComponents: Omit<CacheKey, 'symbol'>, data: OpenInterest[]): Promise<void> {
    await this.withRetry(() =>
      this.db.run(
        'INSERT OR REPLACE INTO futures_open_interest_cache (data_type, symbol, interval, hour, minutes, day, month, year, data, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [this.dataType, symbol, timeComponents.interval, timeComponents.hour, timeComponents.minutes, timeComponents.day, timeComponents.month, timeComponents.year, JSON.stringify(data), Date.now()]
      )
    );
  }

  private async fetchData(symbol: string, period: AllowedInterval, limit: number): Promise<OpenInterest[]> {
    const url = `${this.baseUrl}/futures/data/openInterestHist`;
    const params: OpenInterestParams = { symbol, period, limit };
    try {
      const response = await axios.get<OpenInterest[]>(url, { params });
      return response.data;
    } catch (error) {
      logger.error(`Error fetching data from ${url}:`, error);
      throw error;
    }
  }

  public async getOpenInterestHistory(symbol: string, period: AllowedInterval, limit: number = 30, noCache: boolean = false): Promise<OpenInterest[]> {
    const timeComponents = this.getCurrentTimeComponents(period);

    if (!noCache) {
      const cachedData = await this.getCachedData(symbol, timeComponents);
      if (cachedData) {
        console.info(`Returning cached open interest data for ${symbol} (${period})`);
        return cachedData.slice(0, limit || 500);
      }
    }

    const fetchedData = await this.fetchData(symbol, period, limit);

    if (!noCache) {
      await this.cacheData(symbol, timeComponents, fetchedData);
    }

    logger.info(`Fetched and cached new open interest data for ${symbol} (${period})`);
    return fetchedData.slice(0, limit || 500);
  }
}
