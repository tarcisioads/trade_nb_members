import { BingXOrderExecutor } from '../../infrastructure/bingx/BingXOrderExecutor';
import { TradeDatabase } from '../../infrastructure/database/TradeDatabase';
import { ITradeDatabase } from '../../core/interfaces/ITradeDatabase';
import { PositionValidator } from '../../core/services/PositionValidator';
import { Trade, TradeExecutionResult } from '../../utils/types';

export class TradeExecutor {
  private readonly orderExecutor: BingXOrderExecutor;
  private readonly tradeDatabase: ITradeDatabase;
  private readonly positionValidator: PositionValidator;
  private readonly volumeMarginPercentage: number;
  private readonly sentimentMarginPercentage: number;

  constructor(tradeDatabase?: ITradeDatabase) {
    this.tradeDatabase = tradeDatabase || new TradeDatabase();
    this.orderExecutor = new BingXOrderExecutor(this.tradeDatabase); // Assuming BingXOrderExecutor will accept it
    this.positionValidator = new PositionValidator();
    this.volumeMarginPercentage = Number(process.env.VOLUME_MARGIN_PERCENTAGE) || 10;
    this.sentimentMarginPercentage = Number(process.env.SENTIMENT_MARGIN_PERCENTAGE || '0');
  }

  private async validateTrade(trade: Trade): Promise<{ isValid: boolean; message: string }> {
    // Validate that at least tp1 is set
    if (!trade.tp1) {
      return { isValid: false, message: 'At least tp1 must be set for a trade' };
    }

    // Validate take profit order for LONG trades
    if (trade.type === 'LONG') {
      const takeProfits = [trade.tp1, trade.tp2, trade.tp3, trade.tp4, trade.tp5, trade.tp6]
        .filter((tp): tp is number => tp !== null && tp > 0);

      // Check if take profits are in ascending order
      for (let i = 1; i < takeProfits.length; i++) {
        if (takeProfits[i] <= takeProfits[i - 1]) {
          return {
            isValid: false,
            message: `Take profit ${i + 1} must be greater than take profit ${i} for LONG trades`
          };
        }
      }

      // Check if all take profits are above entry
      if (takeProfits.some(tp => tp <= trade.entry)) {
        return {
          isValid: false,
          message: 'All take profits must be above entry price for LONG trades'
        };
      }

      // Check if stop is below entry
      if (trade.stop >= trade.entry) {
        return {
          isValid: false,
          message: 'Stop loss must be below entry price for LONG trades'
        };
      }
    }

    // Validate take profit order for SHORT trades
    if (trade.type === 'SHORT') {
      const takeProfits = [trade.tp1, trade.tp2, trade.tp3, trade.tp4, trade.tp5, trade.tp6]
        .filter((tp): tp is number => tp !== null && tp > 0);

      // Check if take profits are in descending order
      for (let i = 1; i < takeProfits.length; i++) {
        if (takeProfits[i] >= takeProfits[i - 1]) {
          return {
            isValid: false,
            message: `Take profit ${i + 1} must be less than take profit ${i} for SHORT trades`
          };
        }
      }
      console.log(takeProfits)
      // Check if all take profits are below entry
      if (takeProfits.some(tp => tp >= trade.entry)) {
        return {
          isValid: false,
          message: 'All take profits must be below entry price for SHORT trades'
        };
      }

      // Check if stop is above entry
      if (trade.stop <= trade.entry) {
        return {
          isValid: false,
          message: 'Stop loss must be above entry price for SHORT trades'
        };
      }
    }

    return { isValid: true, message: 'Trade validation successful' };
  }

  public async executeTrade(trade: Trade): Promise<TradeExecutionResult> {
    try {
      // Validate trade before execution
      const validation = await this.validateTrade(trade);
      if (!validation.isValid) {
        return {
          success: false,
          message: validation.message
        };
      }

      // Execute the trade using BingXOrderExecutor
      const executionResult = await this.orderExecutor.executeTrade(trade);

      // Calculate volume margin if applicable
      let volumeMarginInfo = undefined;
      if (trade.volume_adds_margin) {
        const baseMargin = executionResult.quantity * trade.entry;
        const marginAddition = (baseMargin * this.volumeMarginPercentage) / 100;
        volumeMarginInfo = {
          percentage: this.volumeMarginPercentage,
          baseMargin,
          totalMargin: baseMargin + marginAddition
        };
        console.log(`Volume Margin Added: ${this.volumeMarginPercentage}%`);
        console.log(`Base Margin: ${baseMargin.toFixed(2)}`);
        console.log(`Total Margin: ${(baseMargin + marginAddition).toFixed(2)}`);
      }
      // Calculate sentiment margin if applicable
      let sentimentMarginInfo = undefined;
      if (trade.sentiment_adds_margin) {
        const baseMargin = executionResult.quantity * trade.entry;
        const marginAddition = (baseMargin * this.sentimentMarginPercentage) / 100;
        sentimentMarginInfo = {
          percentage: this.sentimentMarginPercentage,
          baseMargin,
          totalMargin: baseMargin + marginAddition
        };
        console.log(`Sentiment Margin Added: ${this.sentimentMarginPercentage}%`);
        console.log(`Base Margin: ${baseMargin.toFixed(2)}`);
        console.log(`Total Margin: ${(baseMargin + marginAddition).toFixed(2)}`);
      }


      return {
        success: true,
        message: 'Trade executed successfully',
        data: {
          ...executionResult,
          volumeMarginAdded: volumeMarginInfo,
          sentimentMarginAdded: sentimentMarginInfo
        }
      };
    } catch (error) {
      console.error('Error executing trade:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred during trade execution'
      };
    }
  }

  /**
   * Cancels an order
   * @param pair The trading pair
   * @param orderId The ID of the order to cancel
   * @returns Promise<boolean> True if order was cancelled successfully
   */
  public async cancelOrder(pair: string, orderId: string): Promise<boolean> {
    try {
      await this.orderExecutor.cancelOrder(pair, orderId);
      return true;
    } catch (error) {
      console.error('Error cancelling order:', error);
      return false;
    }
  }
} 
