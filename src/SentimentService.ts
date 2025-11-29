import { LongShortRatioVariationService } from './LongShortRatioVariationService';
import { OpenInterestVariationService } from './OpenInterestVariationService';
import { Sentiment, Trend, TradeType, Signal, TrendAnalysis, SentimentResult, AllowedInterval } from './utils/types';

/**
 * Analyzes long/short ratio and open interest variations to determine market sentiment.
 */
export class SentimentService {
  private readonly lsRatioService: LongShortRatioVariationService;
  private readonly oiService: OpenInterestVariationService;

  constructor() {
    this.lsRatioService = new LongShortRatioVariationService();
    this.oiService = new OpenInterestVariationService();
  }

  private _determineTrend(variation: { vs1h: number | null, vs4h: number | null, vs24h: number | null }): TrendAnalysis {
    const { vs1h, vs4h, vs24h } = variation;

    if (vs1h === null || vs4h === null || vs24h === null) {
      return { trend: 'Neutral', score: 0 };
    }

    const score = (vs1h * 3) + (vs4h * 2) + (vs24h * 1);
    const TREND_SCORE_THRESHOLD = 2;

    let trend: Trend = 'Neutral';
    if (score > TREND_SCORE_THRESHOLD) {
      trend = 'Up';
    } else if (score < -TREND_SCORE_THRESHOLD) {
      trend = 'Down';
    }

    return { trend, score };
  }

  public async getSentiment(symbol: string, interval: AllowedInterval, side: TradeType): Promise<SentimentResult> {
    let lsRatioData: any = null;
    try {
      lsRatioData = await this.lsRatioService.getRatioVariation(symbol, interval);
    } catch (error) {
      console.error(`Error fetching Long/Short ratio variation for ${symbol}:`, error);
    }

    let oiData: any = null;
    try {
      oiData = await this.oiService.getVariation(symbol, interval);
    } catch (error) {
      console.error(`Error fetching Open Interest variation for ${symbol}:`, error);
    }

    const nullVariation = { vs1h: null, vs4h: null, vs24h: null };
    const nullTimestamps = { current: null, h1: null, h4: null, d1: null };

    if (!lsRatioData && !oiData) {
      return {
        sentiment: 'Neutral',
        details: {
          side,
          longShortRatio: { symbol, currentRatio: null, variation: nullVariation, timestamps: nullTimestamps },
          openInterest: { symbol, currentOpenInterestValue: null, variation: nullVariation, timestamps: nullTimestamps },
          analysis: {
            lsrTrend: { trend: 'Neutral', score: 0 },
            oiTrend: { trend: 'Neutral', score: 0 },
            lsrSignal: 'Neutral',
            oiSignal: 'Neutral'
          }
        }
      };
    }

    const lsrTrend: TrendAnalysis = lsRatioData ? this._determineTrend(lsRatioData.variation) : { trend: 'Neutral', score: 0 };
    const oiTrend: TrendAnalysis = oiData ? this._determineTrend(oiData.variation) : { trend: 'Neutral', score: 0 };

    // Determine Long/Short Ratio Signal (Contrarian)
    let lsrSignal: Signal = 'Neutral';
    if (lsrTrend.trend === 'Down') {
      lsrSignal = 'Bullish'; // Retail is giving up on longs, which is bullish.
    } else if (lsrTrend.trend === 'Up') {
      lsrSignal = 'Bearish'; // Retail is piling into longs, which is bearish.
    }

    // Determine Open Interest Signal (Confirmation, contextualized by side)  
    let oiSignal: Signal = 'Neutral';
    if (oiTrend.trend === 'Up') {
      oiSignal = side === 'LONG' ? 'Bullish' : 'Bearish';
    }

    // Determine final sentiment based on signal alignment
    let sentiment: Sentiment = 'Neutral';
    if (lsrSignal !== 'Neutral' && oiSignal !== 'Neutral') {
      if (lsrSignal === oiSignal) {
        sentiment = lsrSignal; // Signals align
      }
    } else if (lsrSignal !== 'Neutral') {
      sentiment = lsrSignal; // Only LSR signal is available
    } else if (oiSignal !== 'Neutral') {
      sentiment = oiSignal; // Only OI signal is available
    }

    return {
      sentiment,
      details: {
        side,
        longShortRatio: lsRatioData || { symbol, currentRatio: null, variation: nullVariation, timestamps: nullTimestamps },
        openInterest: oiData || { symbol, currentOpenInterestValue: null, variation: nullVariation, timestamps: nullTimestamps },
        analysis: {
          lsrTrend,
          oiTrend,
          lsrSignal,
          oiSignal
        }
      }
    };
  }
}
