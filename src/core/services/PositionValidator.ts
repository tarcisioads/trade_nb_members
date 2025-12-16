import { BingXApiClient } from '../../infrastructure/bingx/BingXApiClient';
import { normalizeSymbolBingX } from '../../utils/bingxUtils';
import { Position, BingXPositionResponse } from '../../utils/types';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export class PositionValidator {
    private readonly apiClient: BingXApiClient;

    constructor() {
        this.apiClient = new BingXApiClient();
    }

    public async getPositions(symbol: string): Promise<Position[]> {
        const normalizedSymbol = symbol === 'ALL' ? '' : normalizeSymbolBingX(symbol);
        const path = '/openApi/swap/v2/user/positions';
        const params: Record<string, string> = {};

        if (normalizedSymbol) {
            params.symbol = normalizedSymbol;
        }

        try {
            const response = await this.apiClient.get<BingXPositionResponse>(path, params);
            if (response.code !== 0) {
                throw new Error(`API returned non-zero code: ${response.code}, message: ${response.msg}`);
            }
            return response.data || [];
        } catch (error) {
            throw new Error('Error fetching positions: ' + (error instanceof Error ? error.message : error));
        }
    }

    public async hasOpenPosition(symbol: string, type: 'LONG' | 'SHORT'): Promise<{
        hasPosition: boolean;
        position?: Position;
        message: string;
    }> {
        try {
            const normalizedSymbol = normalizeSymbolBingX(symbol);
            const positions = await this.getPositions(normalizedSymbol);

            // Find position for the given symbol and type
            const position = positions.find(p =>
                normalizeSymbolBingX(p.symbol) === normalizedSymbol &&
                p.positionSide === type &&
                parseFloat(p.positionAmt) !== 0
            );

            if (position) {
                return {
                    hasPosition: true,
                    position,
                    message: `Found open ${type} position for ${normalizedSymbol} with amount ${position.positionAmt}`
                };
            }

            return {
                hasPosition: false,
                message: `No open ${type} position found for ${normalizedSymbol}`
            };
        } catch (error) {
            console.error(`Error checking position for ${symbol}:`, error);
            throw error;
        }
    }

    public async getPositionDetails(symbol: string, type: 'LONG' | 'SHORT'): Promise<{
        hasPosition: boolean;
        position?: Position;
        message: string;
        details?: {
            entryPrice: number;
            markPrice: number;
            unrealizedPnL: number;
            liquidationPrice: number;
            leverage: number;
            positionAmount: number;
        };
    }> {
        try {
            const normalizedSymbol = normalizeSymbolBingX(symbol);
            const { hasPosition, position, message } = await this.hasOpenPosition(normalizedSymbol, type);

            if (!hasPosition || !position) {
                return { hasPosition: false, message };
            }

            return {
                hasPosition: true,
                position,
                message,
                details: {
                    entryPrice: parseFloat(position.avgPrice),
                    markPrice: parseFloat(position.markPrice),
                    unrealizedPnL: parseFloat(position.unRealizedProfit),
                    liquidationPrice: parseFloat(position.liquidationPrice),
                    leverage: parseFloat(position.leverage),
                    positionAmount: parseFloat(position.positionAmt)
                }
            };
        } catch (error) {
            console.error(`Error getting position details for ${symbol}:`, error);
            throw error;
        }
    }
} 