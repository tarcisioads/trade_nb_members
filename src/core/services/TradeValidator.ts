import { SentimentService } from './SentimentService';
import { TradeEntryAnalyzer } from './TradeEntryAnalyzer';
import { VolumeAnalyzer } from './VolumeAnalyzer';
import { Trade, SentimentResult, VolumeColor } from '../../utils/types';
import { isVolumeValid, isSentimentValid } from '../../utils/utils';


export class TradeValidator {
  private readonly tradeEntryAnalyzer: TradeEntryAnalyzer;
  private readonly volumeAnalyzer: VolumeAnalyzer;
  private readonly sentimentService: SentimentService;

  constructor(
    tradeEntryAnalyzer?: TradeEntryAnalyzer,
    volumeAnalyzer?: VolumeAnalyzer,
    sentimentService?: SentimentService
  ) {
    this.tradeEntryAnalyzer = tradeEntryAnalyzer || new TradeEntryAnalyzer();
    this.volumeAnalyzer = volumeAnalyzer || new VolumeAnalyzer();
    this.sentimentService = sentimentService || new SentimentService();
  }


  public async validateTrade(trade: Trade): Promise<{
    isValid: boolean;
    entryAnalysis: {
      canEnter: boolean;
      currentClose: number;
      hasClosePriceBeforeEntry: boolean;
      message: string;
      warning: boolean;
    };
    volumeAnalysis: {
      color: VolumeColor;
      stdBar: number;
      mean: number;
      std: number;
      currentVolume: number;
    };
    sentimentAnalysis: SentimentResult;
    message: string;
    warning: boolean;
    recentCloses: number[];
  }> {
    try {
      // Run both analyses in parallel
      const [entryAnalysis, volumeAnalysis, sentimentAnalysis] = await Promise.all([
        this.tradeEntryAnalyzer.analyzeEntry(trade),
        this.volumeAnalyzer.analyzeVolume(trade.symbol, trade.interval),
        this.sentimentService.getSentiment(trade.symbol, trade.interval || '1h', trade.type)
      ]);

      // Get recent closes from entry analysis
      const recentCloses = await this.tradeEntryAnalyzer.getRecentCloses(trade, 3);

      // Check if both conditions are met
      const isEntryValid = entryAnalysis.canEnter;
      let isVolValid = isVolumeValid(volumeAnalysis.color);
      let isSentValid = isSentimentValid(trade, sentimentAnalysis);

      // Handle volume validation based on volume_required
      if (!trade.volume_required) {
        // If volume_required is false, volume is optional
        isVolValid = true;
      }

      // Handle sentiment validation based on sentiment_required
      if (!trade.sentiment_required) {
        // If sentiment_required is false, sentiment is optional
        isSentValid = true;
      }


      // Determine if the trade is valid
      const isValid = isEntryValid && isVolValid && isSentValid;

      // Set warning flag - true if entry has warning or if entry is valid but volume is invalid
      const warning = entryAnalysis.warning || (isEntryValid && !isVolValid && trade.volume_required) || (isEntryValid && !isSentValid && (trade.sentiment_required || false));

      // Generate appropriate message
      let message = '';
      if ((!isValid) || (warning)) {
        if (!isEntryValid) {
          message = `Trade is invalid: ${entryAnalysis.message}`;
        }
        if (!isVolValid && trade.volume_required) {
          message = `${message != '' ? message + ' and ' : ''}Volume is not high enough (${volumeAnalysis.color})`;
        }
        if (!isSentValid && trade.sentiment_required) {
          message = `${message != '' ? message + ' and ' : ''}Sentiment is not good enough (${sentimentAnalysis.sentiment} - lsrTrend ${sentimentAnalysis.details.analysis.lsrTrend.score}[${sentimentAnalysis.details.longShortRatio.variation.vs1h}/${sentimentAnalysis.details.longShortRatio.variation.vs4h}/${sentimentAnalysis.details.longShortRatio.variation.vs24h}] - oiTrend ${sentimentAnalysis.details.analysis.oiTrend.score}[${sentimentAnalysis.details.openInterest.variation.vs1h}/${sentimentAnalysis.details.openInterest.variation.vs4h}/${sentimentAnalysis.details.openInterest.variation.vs24h}] - lsrSignal ${sentimentAnalysis.details.analysis.lsrSignal} - oiSignal ${sentimentAnalysis.details.analysis.oiSignal})`;
        }
      } else {
        let volumeStatus = '';
        if (trade.volume_required) {
          volumeStatus = `volume is high (${volumeAnalysis.color})`;
        } else {
          volumeStatus = `volume is optional (${volumeAnalysis.color})`;
        }
        if (trade.volume_adds_margin) {
          if (isVolumeValid(volumeAnalysis.color)) {
            volumeStatus += ' and will add margin';
          }
        }

        let sentimentStatus = '';
        if (trade.sentiment_required) {
          sentimentStatus = `sentiment is good (${sentimentAnalysis.sentiment} - lsrTrend ${sentimentAnalysis.details.analysis.lsrTrend.score.toFixed(4)}[${sentimentAnalysis.details.longShortRatio.variation.vs1h}/${sentimentAnalysis.details.longShortRatio.variation.vs4h}/${sentimentAnalysis.details.longShortRatio.variation.vs24h}] - oiTrend ${sentimentAnalysis.details.analysis.oiTrend.score}[${sentimentAnalysis.details.openInterest.variation.vs1h}/${sentimentAnalysis.details.openInterest.variation.vs4h}/${sentimentAnalysis.details.openInterest.variation.vs24h}] - lsrSignal ${sentimentAnalysis.details.analysis.lsrSignal} - oiSignal ${sentimentAnalysis.details.analysis.oiSignal})`;
        } else {
          sentimentStatus = `sentiment is optional (${sentimentAnalysis.sentiment} - lsrTrend ${sentimentAnalysis.details.analysis.lsrTrend.score.toFixed(4)}[${sentimentAnalysis.details.longShortRatio.variation.vs1h}/${sentimentAnalysis.details.longShortRatio.variation.vs4h}/${sentimentAnalysis.details.longShortRatio.variation.vs24h}] - oiTrend ${sentimentAnalysis.details.analysis.oiTrend.score}[${sentimentAnalysis.details.openInterest.variation.vs1h}/${sentimentAnalysis.details.openInterest.variation.vs4h}/${sentimentAnalysis.details.openInterest.variation.vs24h}] - lsrSignal ${sentimentAnalysis.details.analysis.lsrSignal} - oiSignal ${sentimentAnalysis.details.analysis.oiSignal})`;
        }
        if (trade.sentiment_adds_margin) {
          if (isSentimentValid(trade, sentimentAnalysis)) {
            sentimentStatus += ' and will add margin';
          }
        }

        message = `Trade is valid: Entry conditions met and ${volumeStatus}, ${sentimentStatus}`;
      }

      return {
        isValid,
        entryAnalysis,
        volumeAnalysis,
        sentimentAnalysis,
        message,
        warning,
        recentCloses
      };
    } catch (error: any) {
      console.error(`Error validating trade for ${trade.symbol}:`, error);

      const errorMsg = error?.message || '';
      const isMarketClosed = errorMsg.includes('is pause currently') ||
                             errorMsg.includes('109415') ||
                             errorMsg.includes('paused') ||
                             errorMsg.includes('closed');

      if (isMarketClosed) {
        return {
          isValid: false,
          entryAnalysis: {
            canEnter: false,
            currentClose: 0,
            hasClosePriceBeforeEntry: false,
            message: `Market is closed/paused: ${errorMsg}`,
            warning: false
          },
          volumeAnalysis: {
            color: VolumeColor.BLUE,
            stdBar: 0,
            mean: 0,
            std: 0,
            currentVolume: 0
          },
          sentimentAnalysis: {
            sentiment: 'Neutral',
            details: {
              side: trade.type,
              longShortRatio: { symbol: trade.symbol, currentRatio: null, variation: { vs1h: null, vs4h: null, vs24h: null }, timestamps: { current: null, h1: null, h4: null, d1: null } },
              openInterest: { symbol: trade.symbol, currentOpenInterestValue: null, variation: { vs1h: null, vs4h: null, vs24h: null }, timestamps: { current: null, h1: null, h4: null, d1: null } },
              analysis: {
                lsrTrend: { trend: 'Neutral', score: 0 },
                oiTrend: { trend: 'Neutral', score: 0 },
                lsrSignal: 'Neutral',
                oiSignal: 'Neutral'
              }
            }
          },
          message: `Trade is invalid: Market is closed/paused (${errorMsg})`,
          warning: false,
          recentCloses: []
        };
      }

      throw error;
    }
  }
}
