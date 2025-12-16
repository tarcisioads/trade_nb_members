import { BingXApiClient } from '../infrastructure/bingx/BingXApiClient';

/**
 * Normalizes a trading symbol to BingX format
 * @param symbol The trading symbol to normalize
 * @returns The normalized symbol in BingX format (e.g., "BTC-USDT")
 */
export function normalizeSymbolBingX(symbol: string): string {
    const upperSymbol = symbol.toUpperCase();
    if (upperSymbol == 'ALL') {
        return upperSymbol;
    }
    if (!upperSymbol.endsWith('-USDT')) {
        return upperSymbol.replace('USDT', '') + '-USDT';
    }
    return upperSymbol;
}

/**
 * Gets the current price for a trading pair from BingX
 * @param pair The trading pair symbol
 * @param apiClient The BingX API client instance
 * @returns The current price as a number
 */
export async function getPairPrice(pair: string, apiClient: BingXApiClient): Promise<number> {
    try {
        const path = '/openApi/swap/v2/quote/ticker';
        const params = {
            symbol: pair
        };

        const response = await apiClient.get<{ data: { lastPrice: string } }>(path, params);
        return parseFloat(response.data.lastPrice);
    } catch (error) {
        console.error('Error fetching pair price:', error);
        throw error;
    }
} 