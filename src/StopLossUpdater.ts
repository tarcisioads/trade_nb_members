import { BingXOrderExecutor } from './BingXOrderExecutor';
import { NotificationService } from './NotificationService';
import { MonitoredPosition, BingXOrderResponse } from './utils/types';

export class StopLossUpdater {
  private orderExecutor: BingXOrderExecutor;
  private notificationService: NotificationService;

  constructor(orderExecutor: BingXOrderExecutor, notificationService: NotificationService) {
    this.orderExecutor = orderExecutor;
    this.notificationService = notificationService;
  }

  public static calculateBreakeven(
    entryPrice: number,
    positionAmt: number,
    positionSide: 'LONG' | 'SHORT',
    marketOrderFee: number,
    limitOrderFee: number
  ): { breakevenWithFees: number, totalFeeAmount: number, positionValue: number } | null {
    if (typeof entryPrice === 'undefined') {
      return null;
    }
    const absPositionAmt = Math.abs(positionAmt);
    const positionValue = absPositionAmt * entryPrice;

    const entryFeeAmount = positionValue * (marketOrderFee / 100);
    const exitFeeAmount = positionValue * (limitOrderFee / 100);
    const totalFeeAmount = entryFeeAmount + exitFeeAmount;

    const feePriceImpact = totalFeeAmount / absPositionAmt;

    const breakevenWithFees = positionSide === 'LONG'
      ? entryPrice + feePriceImpact
      : entryPrice - feePriceImpact;

    return { breakevenWithFees, totalFeeAmount, positionValue };
  }

  public async updateStopLossIfNeeded(
    position: MonitoredPosition,
    currentPrice: number,
    entryPrice: number,
    currentStopPrice: number,
    positionSide: 'LONG' | 'SHORT',
    risk: number,
    reward: number,
    breakevenData: { breakevenWithFees: number, totalFeeAmount: number, positionValue: number }
  ): Promise<BingXOrderResponse | null> {
    const { breakevenWithFees, totalFeeAmount, positionValue } = breakevenData;

    const isCurrentPriceBetter = positionSide === 'LONG'
      ? currentPrice > breakevenWithFees
      : currentPrice < breakevenWithFees;

    const shouldUpdate = isCurrentPriceBetter && (positionSide === 'LONG'
      ? currentStopPrice < breakevenWithFees
      : currentStopPrice > breakevenWithFees);

    if (shouldUpdate) {
      if (position.stopLossOrder) {
        position.stopLossOrder.stopPrice = breakevenWithFees.toString();
      }
      try {
        const response = await this.orderExecutor.cancelReplaceOrder(
          position.symbol,
          positionSide === 'LONG' ? 'SELL' : 'BUY',
          positionSide,
          'STOP',
          breakevenWithFees,
          breakevenWithFees,
          parseFloat(position.position.positionAmt),
          position.tradeId,
          position.stopLossOrder!.orderId
        );

        // Check if the response code indicates an error
        if (response.code !== 0) {
          throw new Error(`API Error: ${response.msg} (code: ${response.code})`);
        }

        position.stopLossOrder = {
          ...position.stopLossOrder!,
          stopPrice: breakevenWithFees.toString()
        };

        await this.notificationService.sendTradeNotification({
          symbol: position.symbol,
          type: positionSide,
          entry: entryPrice,
          stop: breakevenWithFees,
          takeProfits: {
            tp1: 0,
            tp2: null,
            tp3: null,
            tp4: null,
            tp5: null,
            tp6: null
          },
          validation: {
            isValid: true,
            message: `Stop loss moved to breakeven + fees (${((totalFeeAmount / positionValue) * 100).toFixed(4)}% of position value)`,
            volumeAnalysis: {
              color: 'green',
              stdBar: 0,
              currentVolume: 0,
              mean: 0,
              std: 0
            },
            entryAnalysis: {
              currentClose: currentPrice,
              canEnter: false,
              hasClosePriceBeforeEntry: true,
              message: 'Stop loss moved to breakeven'
            }
          },
          analysisUrl: '',
          volume_required: false,
          volume_adds_margin: false,
          setup_description: `Stop loss moved to breakeven for ${position.symbol} ${positionSide} position. Fees: ${((totalFeeAmount / positionValue) * 100).toFixed(4)}% of position value (${totalFeeAmount.toFixed(8)}). Risk/Reward: ${(reward / risk).toFixed(2)}:1`,
          interval: '1h'
        });

        return response
      } catch (error) {
        console.error(`Error updating stop loss for ${position.symbol} ${positionSide}:`, error);
        await this.notificationService.sendTradeNotification({
          symbol: position.symbol,
          type: positionSide,
          entry: entryPrice,
          stop: breakevenWithFees,
          takeProfits: {
            tp1: 0,
            tp2: null,
            tp3: null,
            tp4: null,
            tp5: null,
            tp6: null
          },
          validation: {
            isValid: false,
            message: `❌ Failed updating stop loss for ${position.symbol} ${positionSide}`,
            volumeAnalysis: {
              color: 'red',
              stdBar: 0,
              currentVolume: 0,
              mean: 0,
              std: 0
            },
            entryAnalysis: {
              currentClose: currentPrice,
              canEnter: false,
              hasClosePriceBeforeEntry: true,
              message: '❌ Failed updating stop loss'
            }
          },
          analysisUrl: '',
          volume_required: false,
          volume_adds_margin: false,
          setup_description: `❌ Failed updating stop loss for ${position.symbol} ${positionSide}: ${error}`,
          interval: '1h'
        });
        return null
      }
    }
    return null
  }
} 
