import { BingXApiClient } from '../../infrastructure/bingx/BingXApiClient';
import { DatabasePositionHistoryService } from '../../infrastructure/database/DatabasePositionHistoryService';
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

    constructor() {
        this.apiClient = new BingXApiClient();
        this.dbService = new DatabasePositionHistoryService();
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

        // If we have cached data, query API only for newer records
        if (maxCloseTimeFromCache > 0) {
            console.log('Fetching newer data from API (incremental update)...');
            const apiParamsForNewData: Record<string, string | number> = {
                symbol: normalizeSymbolBingX(requestParams.symbol),
                startTs: maxCloseTimeFromCache + 1, // Start from the next millisecond after the latest cached record
                endTs: apiParams.endTs
            };

            if (requestParams.pageIndex) apiParamsForNewData.pageIndex = requestParams.pageIndex;
            if (requestParams.pageSize) apiParamsForNewData.pageSize = requestParams.pageSize;

            console.log('API parameters for new data:', JSON.stringify(apiParamsForNewData, null, 2));

            try {
                const path = '/openApi/swap/v1/trade/positionHistory';
                console.log(`Making API call to: ${path}`);
                const response = await this.apiClient.get<BingXPositionHistoryResponse>(path, apiParamsForNewData);

                console.log('API response received:', {
                    code: response.code,
                    message: response.msg,
                    hasData: !!response.data,
                    positionCount: response.data?.positionHistory?.length || 0
                });

                if (response.code === 0 && response.data && response.data.positionHistory && response.data.positionHistory.length > 0) {
                    console.log(`Found ${response.data.positionHistory.length} new positions from API`);

                    // Save new data to cache
                    console.log('Saving new data to cache...');
                    try {
                        await this.dbService.savePositionHistory(response.data.positionHistory);
                        console.log('Successfully saved new data to cache');
                    } catch (error) {
                        console.warn('Error saving new data to cache:', error);
                    }

                    // Combine cached and new data
                    allPositions = [...allPositions, ...response.data.positionHistory];
                    console.log(`Combined total positions: ${allPositions.length} (${cachedData.length} from cache + ${response.data.positionHistory.length} from API)`);
                } else {
                    console.log('No new data found from API');
                }
            } catch (error) {
                console.error('Error fetching new position history from API:', error);
            }
        } else {
            // No cache data, fetch all data from API
            console.log('Fetching all data from API (no cache data available)...');
            const path = '/openApi/swap/v1/trade/positionHistory';
            console.log(`Making API call to: ${path}`);

            try {
                const response = await this.apiClient.get<BingXPositionHistoryResponse>(path, apiParams);
                console.log('API response received:', {
                    code: response.code,
                    message: response.msg,
                    hasData: !!response.data,
                    positionCount: response.data?.positionHistory?.length || 0
                });

                if (response.code !== 0 || !response.data || !response.data.positionHistory) {
                    console.warn(`API returned non-zero code: ${response.code}, message: ${response.msg}`);
                    console.log('=== getPositionHistory END (no data) ===');
                    return [];
                }

                const positions = response.data.positionHistory || [];
                console.log(`Retrieved ${positions.length} positions from API`);

                // Save to cache if we got data
                if (positions.length > 0) {
                    console.log('Saving data to cache...');
                    try {
                        await this.dbService.savePositionHistory(positions);
                        console.log('Successfully saved data to cache');
                    } catch (error) {
                        console.warn('Error saving to cache:', error);
                    }
                }

                allPositions = positions;
            } catch (error) {
                console.error('Error fetching position history:', error);
                console.log('=== getPositionHistory END (error) ===');
                return [];
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

        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
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
                    console.log(`Using startTs from latest cached position: ${new Date(startTs).toISOString()}`);
                } else {
                    console.log('No cached data found, will fetch from beginning');
                }

                // Using getPositionHistory with the determined startTs
                await this.getPositionHistory({
                    symbol,
                    startTs,
                    useCache: true
                });
                console.log(`Successfully updated cache for symbol: ${symbol}`);

                // Add random delay between symbols (1-3 seconds) except for the last symbol
                if (i < symbols.length - 1) {
                    const delay = Math.floor(Math.random() * 2000) + 1000; // Random delay between 1-3 seconds
                    console.log(`Waiting ${delay}ms before processing next symbol...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            } catch (error) {
                console.error(`Error updating cache for symbol ${symbol}:`, error);
                // Continue with next symbol even if one fails
            }
        }

        console.log('Cache update completed');
    }
} 