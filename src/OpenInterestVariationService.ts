import {
  BinanceFuturesOpenInterestService,
  OpenInterest,
} from './BinanceFuturesOpenInterestService';
import { AllowedInterval, OpenInterestVariationResult } from './utils/types';



/**
 * Calculates the percentage variation of the Open Interest value over different time frames.
 */
export class OpenInterestVariationService {

  constructor() {
  }

  /**
   * Calculates the percentage variation between two numbers.
   * @param current - The current value.
   * @param past - The past value.
   * @returns The percentage variation, or null if the past value is zero.
   */
  private calculateVariation(current: number, past: number): number | null {
    if (past === 0) {
      return null; // Avoid division by zero
    }
    return +(((current - past) / past) * 100).toFixed(4);
  }

  /**
   * Fetches Open Interest data and calculates its variation over 1h, 4h, and 24h.
   * @param symbol - The trading symbol to analyze (e.g., 'BTCUSDT').
   * @returns An object containing the current open interest value and its variations.
   */
  public async getVariation(symbol: string, interval: AllowedInterval): Promise<OpenInterestVariationResult> {
    const openInterestService = await BinanceFuturesOpenInterestService.create();
    // Fetch the last 25 hours of data to get points for current, 1h, 4h, and 24h ago.
    const hourlyData = await openInterestService.getOpenInterestHistory(
      symbol,
      interval || '1h',
      25
    );

    const getValue = (data: OpenInterest) => data ? parseFloat(data.sumOpenInterestValue) : null;

    // [0] is the current (incomplete) hour
    // [1] is the last completed hour (1h ago)
    // [4] is the hour from 4 hours ago
    // [24] is the hour from 24 hours ago
    const currentValue = getValue(hourlyData?.[0]);
    const h1Value = getValue(hourlyData?.[1]);
    const h4Value = getValue(hourlyData?.[4]);
    const d24Value = getValue(hourlyData?.[24]);

    const result: OpenInterestVariationResult = {
      symbol: symbol,
      currentOpenInterestValue: currentValue,
      variation: {
        vs1h: (currentValue && h1Value) ? this.calculateVariation(currentValue, h1Value) : null,
        vs4h: (currentValue && h4Value) ? this.calculateVariation(currentValue, h4Value) : null,
        vs24h: (currentValue && d24Value) ? this.calculateVariation(currentValue, d24Value) : null,
      },
      timestamps: {
        current: hourlyData?.[0]?.timestamp || null,
        h1: hourlyData?.[1]?.timestamp || null,
        h4: hourlyData?.[4]?.timestamp || null,
        d1: hourlyData?.[24]?.timestamp || null,
      }
    };

    return result;
  }
}
