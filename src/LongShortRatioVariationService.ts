import {
  BinanceFuturesLongShortRatioService,
  GlobalLongShortRatio,
} from './BinanceFuturesLongShortRatioService';
import { AllowedInterval, RatioVariationResult } from './utils/types';

/**
 * Calculates the percentage variation of the Global Long/Short ratio over different time frames.
 */
export class LongShortRatioVariationService {
  private readonly ratioService: BinanceFuturesLongShortRatioService;

  constructor() {
    this.ratioService = new BinanceFuturesLongShortRatioService();
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
    return ((current - past) / past) * 100;
  }

  /**
   * Fetches Global Long/Short ratio data and calculates its variation over 1h, 4h, and 24h.
   * @param symbol - The trading symbol to analyze (e.g., 'BTCUSDT').
   * @returns An object containing the current ratio and its variations.
   */
  public async getRatioVariation(symbol: string, interval: AllowedInterval): Promise<RatioVariationResult> {
    // Fetch the last 25 hours of data to get points for current, 1h, 4h, and 24h ago.
    const hourlyData = await this.ratioService.getGlobalLongShortAccountRatio(symbol, interval || '1h', 25);

    const getRatio = (data: GlobalLongShortRatio) => data ? parseFloat(data.longShortRatio) : null;

    // [0] is the current (incomplete) hour
    // [1] is the last completed hour (1h ago)
    // [4] is the hour from 4 hours ago
    // [24] is the hour from 24 hours ago
    const currentRatio = getRatio(hourlyData?.[0]);
    const h1Ratio = getRatio(hourlyData?.[1]);
    const h4Ratio = getRatio(hourlyData?.[4]);
    const d24Ratio = getRatio(hourlyData?.[24]);

    const result: RatioVariationResult = {
      symbol: symbol,
      currentRatio: currentRatio,
      variation: {
        vs1h: (currentRatio && h1Ratio) ? this.calculateVariation(currentRatio, h1Ratio) : null,
        vs4h: (currentRatio && h4Ratio) ? this.calculateVariation(currentRatio, h4Ratio) : null,
        vs24h: (currentRatio && d24Ratio) ? this.calculateVariation(currentRatio, d24Ratio) : null,
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
