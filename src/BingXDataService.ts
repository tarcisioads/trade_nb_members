import { BingXApiClient } from './services/BingXApiClient';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import * as path from 'path';
import crypto from 'crypto';
import * as dotenv from 'dotenv';
import { KlineData, AllowedInterval } from './utils/types';
import { normalizeSymbolBingX } from './utils/bingxUtils';

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

export class BingXDataService {
    private readonly apiClient: BingXApiClient;
    private db: any;
    private readonly validIntervals: AllowedInterval[] = ['5m', '15m', '1h'];

    constructor() {
        // Initialize without any config since we're using environment variables
        this.apiClient = new BingXApiClient();
        this.initializeDatabase();
    }

    private async initializeDatabase() {
        const dbPath = path.join(__dirname, '../db/bingx_cache.db');
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

    private validateInterval(interval: AllowedInterval): AllowedInterval {
        if (!this.validIntervals.includes(interval as AllowedInterval)) {
            throw new Error(`Invalid interval. Must be one of: ${this.validIntervals.join(', ')}`);
        }
        return interval as AllowedInterval;
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

    private async getCachedData(symbol: string, timeComponents: CacheKey): Promise<KlineData[] | null> {
        const result = await this.db.get(
            'SELECT data FROM kline_cache WHERE symbol = ? AND interval = ? AND hour = ? AND day = ? AND month = ? AND year = ? AND minute = ?',
            [symbol, timeComponents.interval, timeComponents.hour, timeComponents.day, timeComponents.month, timeComponents.year, timeComponents.minute]
        );

        if (result) {
            return JSON.parse(result.data);
        }
        return null;
    }

    private async cacheData(symbol: string, timeComponents: CacheKey, data: KlineData[]): Promise<void> {
        await this.db.run(
            'INSERT OR REPLACE INTO kline_cache (symbol, interval, hour, day, month, year, minute, data, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [symbol, timeComponents.interval, timeComponents.hour, timeComponents.day, timeComponents.month, timeComponents.year, timeComponents.minute, JSON.stringify(data), Date.now()]
        );
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

    public async getKlineData(symbol: string, interval: AllowedInterval = '1h'): Promise<KlineData[]> {
        const normalizedSymbol = normalizeSymbolBingX(symbol);
        const validatedInterval = this.validateInterval(interval);
        const timeComponents = this.getCurrentTimeComponents(validatedInterval);
        
        // Check cache first
        const cachedData = await this.getCachedData(normalizedSymbol, timeComponents);
        if (cachedData) {
            console.log(`Returning cached data for ${normalizedSymbol} (${validatedInterval}) at ${timeComponents.hour}:${timeComponents.minute.toString().padStart(2, '0')} on ${timeComponents.day}/${timeComponents.month}/${timeComponents.year}`);
            return cachedData;
        }

        try {
            const path = '/openApi/swap/v3/quote/klines';
            const params = {
                symbol: normalizedSymbol,
                interval: validatedInterval,
                limit: validatedInterval === '1h' ? 56 : 100, // More data points for smaller intervals
                timestamp: Date.now().toString()
            };

            const response = await this.apiClient.get<{ data: any[] }>(path, params);
            const klineData = response.data.map(this.parseKlineData);
            
            // Cache the data
            await this.cacheData(normalizedSymbol, timeComponents, klineData);
            
            console.log(`Fetched and cached new data for ${normalizedSymbol} (${validatedInterval}) at ${timeComponents.hour}:${timeComponents.minute.toString().padStart(2, '0')} on ${timeComponents.day}/${timeComponents.month}/${timeComponents.year}`);
            return klineData;
        } catch (error) {
            console.error(`Error fetching data for ${normalizedSymbol} (${validatedInterval}):`, error);
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
            console.error(`Error fetching price for ${normalizedSymbol}:`, error);
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

            const response = await this.apiClient.get<{ data: {
                maxLeverage: number;
                minLeverage: number;
                maxPositionValue: number;
                minPositionValue: number;
            } }>(path, params);

            return response.data;
        } catch (error) {
            console.error(`Error fetching symbol info for ${normalizedSymbol}:`, error);
            throw error;
        }
    }
} 