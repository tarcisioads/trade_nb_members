import axios from 'axios';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import * as path from 'path';
import { KlineData, AllowedInterval } from '../../utils/types';
import { logger } from '../../utils/logger';


interface CacheKey {
  symbol: string;
  interval: AllowedInterval;
  hour: number;
  day: number;
  month: number;
  year: number;
  minutes: number; // Will store the minute group (0, 15, 30, 45 for 15m; 0, 5, 10, 15, etc for 5m)
}

import { IDataProvider } from '../../core/interfaces/IDataProvider';

export class BinanceDataService implements IDataProvider {
  public getName(): string {
    return 'binance';
  }
  private readonly baseUrl: string = 'https://api.binance.com/api/v3';
  private db: any;

  constructor() {
  }

  public static async create(): Promise<BinanceDataService> {
    const instance = new BinanceDataService();
    await instance.initializeDatabase(); // <-- Chama e espera a inicialização
    return instance;
  }


  private async initializeDatabase() {
    const dbPath = path.join(process.cwd(), 'db/binance_cache.db');
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
                minutes INTEGER,
                data TEXT,
                timestamp INTEGER,
                PRIMARY KEY (symbol, interval, hour, day, month, year, minutes)
            )
        `);
  }

  private getCurrentTimeComponents(interval: AllowedInterval): CacheKey {
    const now = new Date();
    const hour = now.getHours();
    const minutes = now.getMinutes();

    let minuteGroup = 0;
    if (interval === '15m') {
      minuteGroup = Math.floor(minutes / 15) * 15;
    } else if (interval === '5m') {
      minuteGroup = Math.floor(minutes / 5) * 5;
    }

    return {
      symbol: '', // This will be set when calling getCachedData
      interval,
      hour,
      day: now.getDate(),
      month: now.getMonth() + 1, // getMonth() returns 0-11
      year: now.getFullYear(),
      minutes: minuteGroup
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
    const query = timeComponents.interval === '1h'
      ? 'SELECT data FROM kline_cache WHERE symbol = ? AND interval = ? AND hour = ? AND day = ? AND month = ? AND year = ? AND minutes = 0'
      : 'SELECT data FROM kline_cache WHERE symbol = ? AND interval = ? AND hour = ? AND day = ? AND month = ? AND year = ? AND minutes = ?';

    const params = timeComponents.interval === '1h'
      ? [symbol, timeComponents.interval, timeComponents.hour, timeComponents.day, timeComponents.month, timeComponents.year]
      : [symbol, timeComponents.interval, timeComponents.hour, timeComponents.day, timeComponents.month, timeComponents.year, timeComponents.minutes];

    const result = await this.withRetry(() => this.db.get(query, params));

    if (result && typeof (result as { data?: string }).data === 'string') {
      return JSON.parse((result as { data: string }).data);
    }
    return null;
  }

  private async cacheData(symbol: string, timeComponents: CacheKey, data: KlineData[]): Promise<void> {
    const query = `
            INSERT OR REPLACE INTO kline_cache 
            (symbol, interval, hour, day, month, year, minutes, data, timestamp) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

    await this.withRetry(() => this.db.run(query, [
      symbol,
      timeComponents.interval,
      timeComponents.hour,
      timeComponents.day,
      timeComponents.month,
      timeComponents.year,
      timeComponents.minutes,
      JSON.stringify(data),
      Date.now()
    ]));
  }

  private parseKlineData(kline: any[]): KlineData {
    return {
      openTime: kline[0],
      open: kline[1],
      high: kline[2],
      low: kline[3],
      close: kline[4],
      volume: kline[5],
      closeTime: kline[6],
      quoteAssetVolume: kline[7],
      numberOfTrades: kline[8],
      takerBuyBaseAssetVolume: kline[9],
      takerBuyQuoteAssetVolume: kline[10]
    };
  }

  public async getKlineData(symbol: string, interval: AllowedInterval = '1h', limit: number = 56, noCache: boolean = false): Promise<KlineData[]> {

    const timeComponents = this.getCurrentTimeComponents(interval);
    timeComponents.symbol = symbol;

    // Check cache first, unless noCache é true
    if (!noCache) {
      const cachedData = await this.getCachedData(symbol, timeComponents);
      if (cachedData) {
        logger.info(`Returning cached data for ${symbol} (${interval}) at ${timeComponents.hour}:${timeComponents.minutes} on ${timeComponents.day}/${timeComponents.month}/${timeComponents.year}`);
        return cachedData.slice(0, limit);
      }
    }

    try {
      const response = await axios.get(`${this.baseUrl}/klines`, {
        params: {
          symbol: symbol,
          interval: interval,
          limit: limit
        }
      });

      const klineData = response.data.map(this.parseKlineData);

      // Cache the data
      if (!noCache) {
        await this.cacheData(symbol, timeComponents, klineData);
      }

      logger.info(`Fetched and cached new data for ${symbol} (${interval}) at ${timeComponents.hour}:${timeComponents.minutes} on ${timeComponents.day}/${timeComponents.month}/${timeComponents.year}`);
      return klineData.slice(0, limit);
    } catch (error) {
      logger.error(`Error fetching data for ${symbol} (${interval}):`, error);
      throw error;
    }
  }
} 
