import { SentimentService } from './SentimentService';
import { TradeEntryAnalyzer } from './TradeEntryAnalyzer';
import { VolumeAnalyzer } from './VolumeAnalyzer';
import { Trade, SentimentResult, VolumeColor } from './utils/types';
import { isVolumeValid, isSentimentValid } from './utils/utils';


export class TradeValidator {
  private readonly tradeEntryAnalyzer: TradeEntryAnalyzer;
  private readonly volumeAnalyzer: VolumeAnalyzer;
  private readonly sentimentService: SentimentService;

  constructor() {
    this.tradeEntryAnalyzer = new TradeEntryAnalyzer();
    this.volumeAnalyzer = new VolumeAnalyzer();
    this.sentimentService = new SentimentService();
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
        this.tradeEntryAnalyzer.analyzeEntry(
          trade
        ),
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
    } catch (error) {
      console.error(`Error validating trade for ${trade.symbol}:`, error);
      throw error;
    }
  }
}
