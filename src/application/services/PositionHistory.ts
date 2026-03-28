import { BingXApiClient } from '../../infrastructure/bingx/BingXApiClient';
import { DatabasePositionHistoryService } from '../../infrastructure/database/DatabasePositionHistoryService';
import { TradeDatabase } from '../../infrastructure/database/TradeDatabase';
import { normalizeSymbolBingX } from '../../utils/bingxUtils';
import { PositionHistory as PositionHistoryType, BingXPositionHistoryResponse } from '../../utils/types';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface PositionHistoryParams {
    symbol: string;
    startTs?: number;
    endTs?: number;
    pageIndex?: number;
    pageSize?: number;
    useCache?: boolean;
}

export class PositionHistory {
    private readonly apiClient: BingXApiClient;
    private readonly dbService: DatabasePositionHistoryService;
    private readonly tradeDb: TradeDatabase;

    constructor() {
        this.apiClient = new BingXApiClient();
        this.dbService = new DatabasePositionHistoryService();
        this.tradeDb = new TradeDatabase();
    }


    /**
     * Helper function to get the effective close time, using updateTime as fallback
     */
    private getEffectiveCloseTime(position: PositionHistoryType): number {
        return position.closeTime || position.updateTime;
    }

    public async getPositionHistory(params: PositionHistoryParams): Promise<PositionHistoryType[]> {
        console.log('=== getPositionHistory START ===');
        console.log('Input parameters:', JSON.stringify(params, null, 2));

        const { useCache = true, ...requestParams } = params;
        console.log('useCache:', useCache);

        // Set default values for startTs and endTs if not provided
        const now = Date.now();
        const twoMonthsAgo = now - (2 * 30 * 24 * 60 * 60 * 1000); // 2 months in milliseconds

        const apiParams: Record<string, string | number> = {
            symbol: normalizeSymbolBingX(requestParams.symbol),
            startTs: requestParams.startTs || twoMonthsAgo,
            endTs: requestParams.endTs || now
        };

        if (requestParams.pageIndex) apiParams.pageIndex = requestParams.pageIndex;
        if (requestParams.pageSize) apiParams.pageSize = requestParams.pageSize;

        console.log('API parameters:', JSON.stringify(apiParams, null, 2));
        console.log('Time range:', {
            start: new Date(apiParams.startTs as number).toISOString(),
            end: new Date(apiParams.endTs as number).toISOString()
        });

        let allPositions: PositionHistoryType[] = [];
        let maxCloseTimeFromCache = 0;
        let cachedData: PositionHistoryType[] = [];

        // First, try to get from cache if enabled
        if (useCache) {
            console.log('Attempting to read from cache...');
            try {
                cachedData = await this.dbService.getPositionHistory(
                    requestParams.symbol,
                    apiParams.startTs as number,
                    apiParams.endTs as number,
                    requestParams.pageIndex,
                    requestParams.pageSize
                );

                console.log(`Cache query completed. Found ${cachedData.length} records in cache`);

                if (cachedData.length > 0) {
                    allPositions = cachedData;
                    // Find the maximum closeTime from cache, using updateTime as fallback
                    maxCloseTimeFromCache = Math.max(...cachedData.map(pos => this.getEffectiveCloseTime(pos)));
                    console.log(`Using ${cachedData.length} positions from cache, max closeTime: ${new Date(maxCloseTimeFromCache).toISOString()}`);
                } else {
                    console.log('No cached data found for the specified parameters');
                }
            } catch (error) {
                console.warn('Error reading from cache:', error);
            }
        } else {
            console.log('Cache disabled, will fetch all data from API');
        }

        // Determine the start timestamp for API queries
        const queryStartTs = maxCloseTimeFromCache > 0 
            ? maxCloseTimeFromCache + 1 
            : apiParams.startTs as number;
        const queryEndTs = apiParams.endTs as number;

        console.log(`Fetching data from API starting at ${new Date(queryStartTs).toISOString()}`);

        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        let currentStart = queryStartTs;
        const path = '/openApi/swap/v1/trade/positionHistory';

        while (currentStart <= queryEndTs) {
            let currentEnd = currentStart + SEVEN_DAYS_MS - 1;
            if (currentEnd > queryEndTs) {
                currentEnd = queryEndTs;
            }

            const chunkApiParams: Record<string, string | number> = {
                symbol: normalizeSymbolBingX(requestParams.symbol),
                startTs: currentStart,
                endTs: currentEnd
            };

            if (requestParams.pageIndex) chunkApiParams.pageIndex = requestParams.pageIndex;
            if (requestParams.pageSize) chunkApiParams.pageSize = requestParams.pageSize;

            console.log(`Making API call chunk: ${new Date(currentStart).toISOString()} to ${new Date(currentEnd).toISOString()}`);

            try {
                const response = await this.apiClient.get<BingXPositionHistoryResponse>(path, chunkApiParams);

                if (response.code === 109425) {
                    console.warn(`Symbol ${requestParams.symbol} not found on BingX. Marking as INVALID.`);
                    await this.tradeDb.upsertMonitoredSymbol(requestParams.symbol, 'INVALID');
                    break;
                }

                if (response.code !== 0 || !response.data || !response.data.positionHistory) {
                    console.warn(`API returned non-zero code for chunk: ${response.code}, message: ${response.msg}`);
                } else if (response.data.positionHistory.length > 0) {
                    const newPositions = response.data.positionHistory;
                    console.log(`Found ${newPositions.length} positions from API chunk`);

                    // Save new data to cache
                    console.log('Saving chunk data to cache...');
                    try {
                        await this.dbService.savePositionHistory(newPositions);
                        console.log('Successfully saved chunk data to cache');
                    } catch (error) {
                        console.warn('Error saving chunk data to cache:', error);
                    }

                    // Combine with existing data
                    allPositions = [...allPositions, ...newPositions];
                } else {
                    console.log('No data found in this chunk');
                }
            } catch (error) {
                console.error('Error fetching position history chunk from API:', error);
                // Depending on the error, we could break or continue.
                // For safety, we continue to the next chunk unless it's a critical block.
            }

            currentStart = currentEnd + 1;

            // Small delay between chunk requests to avoid rate limits
            if (currentStart <= queryEndTs) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }

        console.log(`=== getPositionHistory END (success) - Returning ${allPositions.length} positions ===`);
        return allPositions;
    }

    public async getPositionHistoryByTimeRange(
        symbol: string,
        startTime: Date,
        endTime: Date,
        pageIndex: number = 1,
        pageSize: number = 100
    ): Promise<PositionHistoryType[]> {
        const params: PositionHistoryParams = {
            symbol,
            startTs: startTime.getTime(),
            endTs: endTime.getTime(),
            pageIndex,
            pageSize
        };

        return this.getPositionHistory(params);
    }

    public async getPositionHistoryBySymbol(
        symbol: string,
        pageIndex: number = 1,
        pageSize: number = 100
    ): Promise<PositionHistoryType[]> {
        const params: PositionHistoryParams = {
            symbol,
            pageIndex,
            pageSize
        };

        return this.getPositionHistory(params);
    }

    public async clearCache(): Promise<void> {
        await this.dbService.clearCache();
    }

    /**
     * Creates or updates the cache for a list of symbols
     * @param symbols Array of symbols to update in cache
     * @returns Promise that resolves when all symbols are processed
     */
    public async createOrUpdateCache(symbols: string[]): Promise<void> {
        console.log(`Starting cache update for ${symbols.length} symbols...`);

        const BATCH_SIZE = 3;
        for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
            const batch = symbols.slice(i, i + BATCH_SIZE);
            console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.join(', ')}`);

            await Promise.allSettled(batch.map(async (symbol) => {
                try {
                    console.log(`Updating cache for symbol: ${symbol}`);

                    // Get the latest position from cache to determine startTs
                    const cachedData = await this.dbService.getPositionHistory(
                        symbol,
                        undefined, // startTs
                        undefined, // endTs
                        1,        // pageIndex
                        1         // pageSize - we only need the latest record
                    );

                    let startTs: number | undefined;
                    if (cachedData.length > 0) {
                        // Sort by closeTime in descending order and get the most recent, using updateTime as fallback
                        const latestPosition = cachedData.sort((a, b) => this.getEffectiveCloseTime(b) - this.getEffectiveCloseTime(a))[0];
                        startTs = this.getEffectiveCloseTime(latestPosition);
                        console.log(`Using startTs from latest cached position for ${symbol}: ${new Date(startTs).toISOString()}`);
                    } else {
                        console.log(`No cached data found for ${symbol}, will fetch from beginning`);
                    }

                    // Using getPositionHistory with the determined startTs
                    await this.getPositionHistory({
                        symbol,
                        startTs,
                        useCache: true
                    });
                    console.log(`Successfully updated cache for symbol: ${symbol}`);
                } catch (error) {
                    console.error(`Error updating cache for symbol ${symbol}:`, error);
                }
            }));

            // Add small delay between batches (except for the last batch)
            if (i + BATCH_SIZE < symbols.length) {
                const delay = 1000; 
                console.log(`Waiting ${delay}ms before processing next batch...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        console.log('Cache update completed');
    }
} 