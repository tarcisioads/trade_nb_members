import { BingXApiClient } from './BingXApiClient';
import { LeverageCalculator } from '../../core/services/LeverageCalculator';
import { PositionValidator } from '../../core/services/PositionValidator';
import { TradeDatabase } from '../database/TradeDatabase';
import { ITradeDatabase } from '../../core/interfaces/ITradeDatabase';
import { normalizeSymbolBingX, getPairPrice } from '../../utils/bingxUtils';
import { Trade, BingXOrderResponse, TradeRecord, SentimentResult, VolumeColor, AnalyzeVolumeResult } from '../../utils/types';
import { isVolumeValid, isSentimentValid } from '../../utils/utils';
import * as dotenv from 'dotenv';
import { VolumeAnalyzer } from '../../core/services/VolumeAnalyzer';
import { SentimentService } from '../../core/services/SentimentService';

// Load environment variables
dotenv.config();

import { IOrderExecutor } from '../../core/interfaces/IOrderExecutor';

export class BingXOrderExecutor implements IOrderExecutor {
  private readonly apiClient: BingXApiClient;
  private readonly leverageCalculator: LeverageCalculator;
  private readonly positionValidator: PositionValidator;
  private readonly tradeDatabase: ITradeDatabase;
  private readonly margin: number;
  private readonly volumeMarginPercentage: number;
  private readonly sentimentMarginPercentage: number;
  private readonly activation_fator_below: number;
  private readonly activation_fator_above: number;

  constructor(tradeDatabase?: ITradeDatabase) {
    // Initialize API client
    this.apiClient = new BingXApiClient();
    this.margin = parseFloat(process.env.BINGX_MARGIN || '500');
    this.volumeMarginPercentage = parseFloat(process.env.VOLUME_MARGIN_PERCENTAGE || '0');
    this.sentimentMarginPercentage = parseFloat(process.env.SENTIMENT_MARGIN_PERCENTAGE || '0');

    this.leverageCalculator = new LeverageCalculator();
    this.positionValidator = new PositionValidator();
    this.tradeDatabase = tradeDatabase || new TradeDatabase();
    this.activation_fator_below = parseFloat(process.env.ACTIVATION_FACTOR_BELOW || '1');
    this.activation_fator_above = parseFloat(process.env.ACTIVATION_FACTOR_ABOVE || '1')
  }


  private async calculatePositionQuantity(pair: string, leverage: number, trade: Trade, volumeAnalysis: AnalyzeVolumeResult, sentimentResult: SentimentResult): Promise<number> {
    try {
      const normalizedPair = normalizeSymbolBingX(pair);
      // Get current price
      let currentPrice: number | null = null;
      for (let i = 0; i < 5; i++) {
        currentPrice = await getPairPrice(normalizedPair, this.apiClient);
        if (currentPrice !== null && currentPrice !== undefined) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 30000));
      }

      if (currentPrice === null || currentPrice === undefined) {
        throw new Error('Failed to get pair price after 5 attempts');
      }

      // Calculate base margin
      let totalMargin = this.margin;



      // Add volume-based margin if trade has volume_adds_margin
      if (trade.volume_adds_margin) {
        if (isVolumeValid(volumeAnalysis.color)) {
          const additionalMargin = this.margin * (this.volumeMarginPercentage / 100);
          totalMargin += additionalMargin;
        }
      }

      // Add sentiment-based margin if trade has sentiment_adds_margin
      if (trade.sentiment_adds_margin) {
        if (isSentimentValid(trade, sentimentResult)) {
          const additionalMargin = this.margin * (this.sentimentMarginPercentage / 100);
          totalMargin += additionalMargin;
        }
      }



      const positionValue = totalMargin * leverage;

      // Calculate quantity based on position value and current price
      const quantity = positionValue / currentPrice;


      // Round to 4 decimal places
      return Math.floor(quantity * 10000) / 10000;
    } catch (error) {
      console.error('Error calculating position quantity:', error);
      throw error;
    }
  }

  public async placeOrder(
    pair: string,
    side: 'BUY' | 'SELL',
    positionSide: 'LONG' | 'SHORT',
    type: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_MARKET' | 'TRIGGER_LIMIT',
    price: number,
    stopPrice: number,
    quantity: number,
    tradeId?: number,
    reduceOnly?: boolean,
    positionId?: string
  ): Promise<BingXOrderResponse> {
    const normalizedPair = normalizeSymbolBingX(pair);
    const path = '/openApi/swap/v2/trade/order';
    const timestamp = Date.now().toString();
    const params: any = {
      symbol: normalizedPair,
      side: side,
      positionSide: positionSide,
      type: type,
      price: price.toString(),
      stopPrice: stopPrice.toString(),
      quantity: quantity.toString(),
      clientOrderId: `NBMEMBERS_${tradeId ? tradeId : '0'}_${timestamp}`
    };

    if (positionId) {
      params.positionId = positionId;
    }


    if (reduceOnly) {
      params.reduceOnly = reduceOnly;
    }

    if (type === 'STOP') {
      const priceNum = parseFloat(price.toString());
      if (positionSide === 'SHORT') {
        // For SHORT positions, activation price should be slightly below the target price
        params.stopPrice = (priceNum * this.activation_fator_below).toString();
      } else {
        // For LONG positions, activation price should be slightly above the target price
        params.stopPrice = (priceNum * this.activation_fator_above).toString();
      }
    }


    // Add activationPrice for TRIGGER_LIMIT orders
    if ((type === 'TRIGGER_LIMIT') || (type === 'LIMIT')) {
      const priceNum = parseFloat(price.toString());
      if (positionSide === 'LONG') {
        // For LONG positions, activation price should be slightly below the target price
        params.stopPrice = (priceNum * this.activation_fator_below).toString();
        params.activationPrice = (priceNum * this.activation_fator_below).toString();
      } else {
        // For SHORT positions, activation price should be slightly above the target price
        params.stopPrice = (priceNum * this.activation_fator_above).toString();
        params.activationPrice = (priceNum * this.activation_fator_above).toString();
      }
    }

    try {
      const response = await this.apiClient.post<BingXOrderResponse>(path, params);

      // Check if the response indicates an error
      if (response && typeof response === 'object' && 'code' in response && response.code !== 0) {
        throw new Error(`API Error: ${response.msg} (code: ${response.code} params: ${JSON.stringify(params)})`);
      }

      // Save log if tradeId is provided
      if (tradeId) {
        await this.tradeDatabase.saveTradeLog(
          tradeId,
          normalizedPair,
          side,
          positionSide,
          type,
          price || null,
          stopPrice || null,
          quantity,
          response
        );
      }

      return response;
    } catch (error) {
      console.error('Error placing order:', error);

      params.stopPrice = stopPrice.toString();

      // Add activationPrice for TRIGGER_LIMIT orders
      if ((type === 'TRIGGER_LIMIT') || (type === 'LIMIT')) {
        params.activationPrice = price.toString();
      }

      try {

        const response = await this.apiClient.post<BingXOrderResponse>(path, params);

        // Check if the response indicates an error
        if (response && typeof response === 'object' && 'code' in response && response.code !== 0) {
          throw new Error(`API Error: ${response.msg} (code: ${response.code} params: ${JSON.stringify(params)})`);
        }

        return response;
      } catch (error) {

        throw error;

      }
    }
  }

  private async placeTrailingStopOrder(
    pair: string,
    side: 'BUY' | 'SELL',
    positionSide: 'LONG' | 'SHORT',
    quantity: number,
    price: number,
    activationPrice: number,
    tradeId?: number,
    positionId?: string
  ): Promise<BingXOrderResponse> {
    const normalizedPair = normalizeSymbolBingX(pair);
    const path = '/openApi/swap/v2/trade/order';
    const timestamp = Date.now().toString();

    const params: any = {
      symbol: normalizedPair,
      side: side,
      positionSide: positionSide,
      type: 'TRAILING_STOP_MARKET',
      quantity: quantity.toString(),
      price: price.toString(),
      activationPrice: activationPrice.toString(),
      clientOrderId: `NBMEMBERS_${tradeId}_${timestamp}`,
      positionId: positionId
    };

    try {
      const response = await this.apiClient.post<BingXOrderResponse>(path, params);

      // Check if the response indicates an error
      if (response && typeof response === 'object' && 'code' in response && response.code !== 0) {
        if (response.code === 110418) {
          // Extract max trailing distance from error message
          const maxTrailingDistanceMatch = response.msg.match(/maximum trailing distance of ([\d.]+)/);
          if (!maxTrailingDistanceMatch) {
            throw new Error('Could not extract maximum trailing distance from error message');
          }

          const maxTrailingDistance = parseFloat(maxTrailingDistanceMatch[1]);
          console.log(`Extracted maximum trailing distance: ${maxTrailingDistance}`);

          // Adjust price to meet the maximum allowed distance
          let adjustedPrice: number;
          adjustedPrice = maxTrailingDistance * 0.95;

          console.log(`Adjusted trailing stop price from ${price} to ${adjustedPrice} to meet maximum trailing distance of ${maxTrailingDistance}`);

          params.price = adjustedPrice.toString();
          const retryResponse = await this.apiClient.post<BingXOrderResponse>(path, params);

          // Save log if tradeId is provided and retry was successful
          if (tradeId && retryResponse.code === 0) {
            await this.tradeDatabase.saveTradeLog(
              tradeId,
              normalizedPair,
              side,
              positionSide,
              'TRAILING_STOP_MARKET',
              adjustedPrice,
              activationPrice,
              quantity,
              retryResponse
            );
          } else {
            throw new Error(`API Error placeTrailingStopOrder: ${retryResponse.msg} (code: ${retryResponse.code})`);
          }

          return retryResponse;
        }
        throw new Error(`API Error placeTrailingStopOrder: ${response.msg} (code: ${response.code})`);
      }

      // Save log if tradeId is provided
      if (response && typeof response === 'object' && 'code' in response && response.code == 0 && tradeId) {
        await this.tradeDatabase.saveTradeLog(
          tradeId,
          normalizedPair,
          side,
          positionSide,
          'TRAILING_STOP_MARKET',
          price,
          activationPrice,
          quantity,
          response
        );
      }

      return response;
    } catch (error) {
      console.error('Error placing trailing stop order:', error);
      throw error;
    }
  }

  private async placeTakeProfitOrders(trade: Trade, quantity: number, tradeId: number, positionId?: string): Promise<BingXOrderResponse[]> {
    const tpOrders: BingXOrderResponse[] = [];
    const takeProfits = [
      { level: 1, price: trade.tp1 },
      { level: 2, price: trade.tp2 },
      { level: 3, price: trade.tp3 },
      { level: 4, price: trade.tp4 },
      { level: 5, price: trade.tp5 },
      { level: 6, price: trade.tp6 }
    ].filter(tp => tp.price !== null && tp.price > 0);

    if (takeProfits.length === 0) {
      // No take profits set, use trailing stop for entire position
      tpOrders.push(
        await this.placeTrailingStopOrder(
          trade.symbol,
          trade.type === 'LONG' ? 'SELL' : 'BUY',
          trade.type,
          quantity,
          trade.entry, // Use entry price as activation price
          trade.entry,
          tradeId,
          positionId
        )
      );
      return tpOrders;
    }

    // Calculate quantities based on number of take profits
    let remainingQuantity = quantity;
    const tpQuantities: number[] = [];

    if (takeProfits.length === 1) {
      // Single take profit: 90% of position
      tpQuantities.push(Math.floor(quantity * 0.9 * 10000) / 10000);
    } else if (takeProfits.length === 2) {
      // Two take profits: 50% and 40% of total position
      tpQuantities.push(Math.floor(quantity * 0.5 * 10000) / 10000);
      tpQuantities.push(Math.floor(quantity * 0.4 * 10000) / 10000);
    } else if (takeProfits.length === 3) {
      // Three take profits: 50%, 30%, and 10% of total position
      tpQuantities.push(Math.floor(quantity * 0.5 * 10000) / 10000);
      tpQuantities.push(Math.floor(quantity * 0.3 * 10000) / 10000);
      tpQuantities.push(Math.floor(quantity * 0.1 * 10000) / 10000);
    } else if (takeProfits.length === 4) {
      // Four take profits: 50%, 20%, 10%, and 10% of total position
      tpQuantities.push(Math.floor(quantity * 0.5 * 10000) / 10000);
      tpQuantities.push(Math.floor(quantity * 0.2 * 10000) / 10000);
      tpQuantities.push(Math.floor(quantity * 0.1 * 10000) / 10000);
      tpQuantities.push(Math.floor(quantity * 0.1 * 10000) / 10000);
    } else if (takeProfits.length === 5) {
      // Five take profits: 50%, 20%, 10%, 5%, and 5% of total position
      tpQuantities.push(Math.floor(quantity * 0.5 * 10000) / 10000);
      tpQuantities.push(Math.floor(quantity * 0.2 * 10000) / 10000);
      tpQuantities.push(Math.floor(quantity * 0.1 * 10000) / 10000);
      tpQuantities.push(Math.floor(quantity * 0.05 * 10000) / 10000);
      tpQuantities.push(Math.floor(quantity * 0.05 * 10000) / 10000);
    } else if (takeProfits.length === 6) {
      // Six take profits: 50%, 20%, 5%, 5%, 5%, and 5% of total position
      tpQuantities.push(Math.floor(quantity * 0.5 * 10000) / 10000);
      tpQuantities.push(Math.floor(quantity * 0.2 * 10000) / 10000);
      tpQuantities.push(Math.floor(quantity * 0.05 * 10000) / 10000);
      tpQuantities.push(Math.floor(quantity * 0.05 * 10000) / 10000);
      tpQuantities.push(Math.floor(quantity * 0.05 * 10000) / 10000);
      tpQuantities.push(Math.floor(quantity * 0.05 * 10000) / 10000);
    }

    // Calculate total of take profit quantities
    const totalTpQuantity = tpQuantities.reduce((sum, qty) => sum + qty, 0);
    // Calculate difference between total quantity and take profit quantities
    const quantityDifference = Math.abs(quantity - totalTpQuantity);

    // Place take profit orders
    for (let i = 0; i < takeProfits.length; i++) {
      const tp = takeProfits[i];
      const tpQuantity = tpQuantities[i];

      if (tpQuantity > 0) {
        tpOrders.push(
          await this.placeOrder(
            trade.symbol,
            trade.type === 'LONG' ? 'SELL' : 'BUY',
            trade.type,
            'TRIGGER_LIMIT',
            tp.price!,
            tp.price!,
            tpQuantity,
            tradeId,
            undefined,
            positionId
          )
        );
        remainingQuantity -= tpQuantity;
      }
    }

    // Add trailing stop for remaining quantity (including any difference from rounding)
    if (remainingQuantity > 0 || quantityDifference > 0) {
      const lastTp = takeProfits[takeProfits.length - 1];
      const trailingStopQuantity = remainingQuantity + quantityDifference;

      if (trailingStopQuantity > 0) {
        tpOrders.push(
          await this.placeTrailingStopOrder(
            trade.symbol,
            trade.type === 'LONG' ? 'SELL' : 'BUY',
            trade.type,
            trailingStopQuantity,
            trade.type === 'LONG' ? lastTp.price! - trade.entry : trade.entry - lastTp.price!,
            lastTp.price!, // Use last take profit as activation price
            tradeId,
            positionId
          )
        );
      }
    }

    return tpOrders;
  }

  public async executeTrade(trade: Trade): Promise<{
    entryOrder: BingXOrderResponse;
    stopOrder: BingXOrderResponse;
    tpOrders: BingXOrderResponse[];
    leverage: {
      optimalLeverage: number;
      theoreticalMaxLeverage: number;
      exchangeMaxLeverage: number;
      stopLossPercentage: number;
    };
    quantity: number;
    tradeRecord: TradeRecord;
  }> {
    try {
      // Validate that at least tp1 is set
      if (!trade.tp1) {
        throw new Error('At least tp1 must be set for a trade');
      }

      // Check for existing position
      const { hasPosition, message } = await this.positionValidator.hasOpenPosition(trade.symbol, trade.type);

      if (hasPosition) {
        throw new Error(`Cannot execute trade: ${message}`);
      }

      const normalizedPair = normalizeSymbolBingX(trade.symbol);

      // Get current price
      const currentPrice = await getPairPrice(normalizedPair, this.apiClient);

      // Validate stop price based on trade type and current price
      if (trade.type === 'LONG' && trade.stop > currentPrice) {
        throw new Error(`Invalid stop price for LONG position: stop (${trade.stop}) must be below current price (${currentPrice})`);
      }
      if (trade.type === 'SHORT' && trade.stop < currentPrice) {
        throw new Error(`Invalid stop price for SHORT position: stop (${trade.stop}) must be above current price (${currentPrice})`);
      }

      // Calculate and set optimal leverage
      const leverageInfo = await this.leverageCalculator.calculateOptimalLeverage(
        trade.symbol,
        currentPrice,
        trade.stop,
        trade.type,
        trade.interval || '1h'
      );

      console.log(`Calculated leverage info:`, leverageInfo);

      // Set leverage
      await this.leverageCalculator.setLeverage(
        trade.symbol,
        leverageInfo.optimalLeverage,
        trade.type
      );

      let volumeAnalyzer: VolumeAnalyzer = new VolumeAnalyzer();
      const volumeAnalysis = await volumeAnalyzer.analyzeVolume(trade.symbol, trade.interval || '1h')
      trade.volume = volumeAnalysis.color

      let sentimentService: SentimentService = new SentimentService();
      let sentimentResult: SentimentResult = await sentimentService.getSentiment(trade.symbol, trade.interval || '1h', trade.type);
      trade.sentiment = sentimentResult.sentiment
      trade.lsrtrend = sentimentResult.details.analysis.lsrTrend.trend
      trade.oitrend = sentimentResult.details.analysis.oiTrend.trend
      trade.lsrsignal = sentimentResult.details.analysis.lsrSignal
      trade.oisignal = sentimentResult.details.analysis.oiSignal


      // Calculate position quantity based on margin and leverage, passing the trade object
      let quantity = await this.calculatePositionQuantity(trade.symbol, leverageInfo.optimalLeverage, trade, volumeAnalysis, sentimentResult);
      console.log(`Calculated position quantity: ${quantity} based on margin ${this.margin} USDT and leverage ${leverageInfo.optimalLeverage}x`);

      // Save trade to database first to get the tradeId
      const tradeRecord = await this.tradeDatabase.saveTrade(
        trade,
        {
          entryOrder: { data: { order: { orderId: 'pending' } } } as BingXOrderResponse,
          stopOrder: { data: { order: { orderId: 'pending' } } } as BingXOrderResponse,
          tpOrders: []
        },
        quantity,
        leverageInfo.optimalLeverage
      );

      // Place entry order (MARKET)
      let entryOrder: BingXOrderResponse | null = null;
      try {
        entryOrder = await this.placeOrder(
          trade.symbol,
          trade.type === 'LONG' ? 'BUY' : 'SELL',
          trade.type,
          'MARKET',
          0, // No price for MARKET orders
          0,
          quantity,
          tradeRecord.id
        );
      } catch (error: any) {
        // Handle max position value error
        let msg = error?.message || '';
        let maxPosMatch = msg.match(/The maximum position value for this leverage is ([\d.]+) USDT/);
        if (!maxPosMatch) {
          throw error;
        }
        while (maxPosMatch) {
          const maxPositionValue = parseFloat(maxPosMatch[1]);
          let newLeverage = leverageInfo.optimalLeverage - 2;
          if (newLeverage <= 0) {
            newLeverage = 1
          }
          console.warn(`Adjusting leverage to ${newLeverage}x due to the max position value limit of ${maxPositionValue} USDT for this quantity (${quantity}).`);

          try {
            // Set the new leverage
            await this.leverageCalculator.setLeverage(trade.symbol, newLeverage, trade.type);
            // Update leverageInfo and tradeRecord
            leverageInfo.optimalLeverage = newLeverage;
            await this.tradeDatabase.updateLeverage(tradeRecord.id, newLeverage);
            // Calculate position quantity based on margin and leverage, passing the trade object
            quantity = await this.calculatePositionQuantity(trade.symbol, leverageInfo.optimalLeverage, trade, volumeAnalysis, sentimentResult);
            console.log(`Calculated position quantity: ${quantity} based on margin ${this.margin} USDT and leverage ${leverageInfo.optimalLeverage}x`);


            // Retry with the same quantity
            entryOrder = await this.placeOrder(
              trade.symbol,
              trade.type === 'LONG' ? 'BUY' : 'SELL',
              trade.type,
              'MARKET',
              0,
              0,
              quantity,
              tradeRecord.id
            );
            maxPosMatch = null; // Exit loop on success
          } catch (error: any) {
            msg = error?.message || '';
            maxPosMatch = msg.match(/The maximum position value for this leverage is ([\d.]+) USDT/);
            if ((!maxPosMatch) || (newLeverage == 1)) {
              throw error;
            }
            // Add delay before retrying
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }

      if (!entryOrder) {
        throw new Error('Failed to place entry order after multiple retries.');
      }

      // Add 1/2 second delay before checking position
      await new Promise(resolve => setTimeout(resolve, 500));

      const { hasPosition: hasPositionPost, position, message: messagePost } = await this.positionValidator.hasOpenPosition(trade.symbol, trade.type);

      if (!hasPositionPost) {
        throw new Error(`Cannot execute trade: ${messagePost}`);
      }
      if (parseFloat(position?.positionAmt || '0') !== 0) {
        quantity = parseFloat(position?.positionAmt || '0')
      }

      // Update trade record with positionId if available
      if (position) {
        await this.tradeDatabase.updatePositionId(tradeRecord.id, position.positionId);
      }

      // Place stop loss order (LIMIT)
      const stopOrder = await this.placeOrder(
        trade.symbol,
        trade.type === 'LONG' ? 'SELL' : 'BUY',
        trade.type,
        'STOP',
        trade.stop,
        trade.stop,
        quantity,
        tradeRecord.id,
        undefined,
        position?.positionId
      );

      // If modify_tp1 is true, adjust tp1 to create 1:1 risk-reward ratio
      if (trade.modify_tp1 && position) {
        const avgPrice = parseFloat(position.avgPrice)
        if (trade.type === 'LONG') {
          trade.tp1 = avgPrice + (avgPrice - trade.stop);
        } else {
          trade.tp1 = avgPrice - (trade.stop - avgPrice);
        }
        console.log(`Modified tp1 to ${trade.tp1} for 1:1 risk-reward ratio`);
      }


      // Place take profit orders based on the scenario
      const tpOrders = await this.placeTakeProfitOrders(trade, quantity, tradeRecord.id, position?.positionId);

      // Update trade record with actual order IDs
      await this.tradeDatabase.updateOrderIds(tradeRecord.id, {
        entryOrderId: entryOrder.data.order.orderId,
        stopOrderId: stopOrder.data.order.orderId,
        tp1OrderId: tpOrders[0]?.data.order.orderId || null,
        tp2OrderId: tpOrders[1]?.data.order.orderId || null,
        tp3OrderId: tpOrders[2]?.data.order.orderId || null,
        tp4OrderId: tpOrders[3]?.data.order.orderId || null,
        tp5OrderId: tpOrders[4]?.data.order.orderId || null,
        tp6OrderId: tpOrders[5]?.data.order.orderId || null,
        trailingStopOrderId: tpOrders[6]?.data.order.orderId || null
      });

      // Get updated trade record
      const updatedTradeRecord = await this.tradeDatabase.getTradeById(tradeRecord.id);

      return {
        entryOrder,
        stopOrder,
        tpOrders,
        leverage: leverageInfo,
        quantity,
        tradeRecord: updatedTradeRecord
      };
    } catch (error) {
      console.error('Error executing trade:', error);
      throw error;
    }
  }

  public async cancelOrder(pair: string, orderId: string): Promise<void> {
    const path = '/openApi/swap/v2/trade/order';
    const _orderId = BigInt(orderId)
    const params = {
      symbol: pair,
      orderId: _orderId
    };

    try {
      await this.apiClient.delete(path, params);
    } catch (error) {
      console.error('Error canceling order:', error);
      throw error;
    }
  }


  public async cancelReplaceOrder(
    pair: string,
    side: 'BUY' | 'SELL',
    positionSide: 'LONG' | 'SHORT',
    type: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_MARKET' | 'TRIGGER_LIMIT',
    price: number,
    stopPrice: number,
    quantity: number,
    tradeId?: number,
    orderId?: string
  ): Promise<BingXOrderResponse> {
    const normalizedPair = normalizeSymbolBingX(pair);
    const path = '/openApi/swap/v1/trade/cancelReplace';
    const params: any = {
      symbol: normalizedPair,
      side: side,
      positionSide: positionSide,
      type: type,
      price: price.toString(),
      stopPrice: stopPrice.toString(),
      quantity: quantity.toString()
    };

    if (type === 'STOP') {
      const priceNum = parseFloat(price.toString());
      if (positionSide === 'SHORT') {
        // For SHORT positions, activation price should be slightly below the target price
        params.stopPrice = (priceNum * this.activation_fator_below).toString();
      } else {
        // For LONG positions, activation price should be slightly above the target price
        params.stopPrice = (priceNum * this.activation_fator_above).toString();
      }
    }

    // Add activationPrice for TRIGGER_LIMIT orders
    if ((type === 'TRIGGER_LIMIT') || (type === 'LIMIT')) {
      const priceNum = parseFloat(price.toString());
      if (positionSide === 'LONG') {
        // For LONG positions, activation price should be slightly below the target price
        params.activationPrice = (priceNum * this.activation_fator_below).toString();
      } else {
        // For SHORT positions, activation price should be slightly above the target price
        params.activationPrice = (priceNum * this.activation_fator_above).toString();
      }
    }

    if (orderId) {
      params.cancelReplaceMode = "STOP_ON_FAILURE"
      params.cancelOrderId = BigInt(orderId)
    }

    try {
      const response = await this.apiClient.post<BingXOrderResponse>(path, params);

      // Save log if tradeId is provided
      if (tradeId) {
        await this.tradeDatabase.saveTradeLog(
          tradeId,
          normalizedPair,
          side,
          positionSide,
          type,
          price || null,
          stopPrice || null,
          quantity,
          response
        );
      }

      return response;
    } catch (error) {

      params.price = price.toString()
      params.stopPrice = stopPrice.toString()
      try {
        const response = await this.apiClient.post<BingXOrderResponse>(path, params);

        // Save log if tradeId is provided
        if (tradeId) {
          await this.tradeDatabase.saveTradeLog(
            tradeId,
            normalizedPair,
            side,
            positionSide,
            type,
            price || null,
            stopPrice || null,
            quantity,
            response
          );
        }

        return response;
      } catch (error) {
        console.error('Error placing order:', error);

        try {
          const response = await this.placeOrder(
            normalizedPair,
            side,
            positionSide,
            type,
            price,
            stopPrice,
            quantity,
            tradeId
          );

          // Save log if tradeId is provided
          if (tradeId) {
            await this.tradeDatabase.saveTradeLog(
              tradeId,
              normalizedPair,
              side,
              positionSide,
              type,
              price || null,
              stopPrice || null,
              quantity,
              response
            );
          }

          return response;
        } catch (error) {
          console.error('Error placing order:', error);
          throw error
        }

      }
    }
  }


} 
