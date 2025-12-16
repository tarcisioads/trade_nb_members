import { TradeDatabase } from '../../infrastructure/database/TradeDatabase';
import { ITradeDatabase } from '../../core/interfaces/ITradeDatabase';
import { OrderStatusChecker } from './OrderStatusChecker';
import { BingXOrderExecutor } from '../../infrastructure/bingx/BingXOrderExecutor';
import { MonitoredPosition } from '../../utils/types';
import { normalizeSymbolBingX } from '../../utils/bingxUtils';
import * as dotenv from 'dotenv';
import { BingXDataService } from '../../infrastructure/bingx/BingXDataService';
import { PnLCalculator } from '../../core/services/PnLCalculator';
import { IOrderExecutor } from '../../core/interfaces/IOrderExecutor';
import { StopLossUpdater } from './StopLossUpdater';
import { NotificationService } from '../../infrastructure/telegram/NotificationService';
import { INotificationService } from '../../core/interfaces/INotificationService';
import { PositionValidator } from '../../core/services/PositionValidator';


// Load environment variables
dotenv.config();

interface TradeRecord {
  id: number;
  symbol: string;
  type: 'LONG' | 'SHORT';
  entry: number;
  stop: number;
  tp1: number | null;
  tp2: number | null;
  tp3: number | null;
  tp4: number | null;
  tp5: number | null;
  tp6: number | null;
  entryOrderId: string;
  stopOrderId: string;
  tp1OrderId: string | null;
  tp2OrderId: string | null;
  tp3OrderId: string | null;
  tp4OrderId: string | null;
  tp5OrderId: string | null;
  tp6OrderId: string | null;
  trailingStopOrderId: string | null;
  quantity: number;
  leverage: number;
  status: 'OPEN' | 'CLOSED';
  volume_adds_margin: boolean;
  setup_description: string | null;
  volume_required: boolean;
}

export class TradeOrderProcessor {
  private readonly tradeDatabase: ITradeDatabase;
  private readonly orderStatusChecker: OrderStatusChecker;
  private readonly orderExecutor: IOrderExecutor;
  private readonly limitOrderFee: number;
  private readonly marketOrderFee: number;
  private readonly dataService: BingXDataService;
  private notificationService: INotificationService;
  private readonly stopLossUpdater: StopLossUpdater;
  private readonly positionValidator: PositionValidator;

  constructor(
    tradeDatabase?: ITradeDatabase,
    orderStatusChecker?: OrderStatusChecker,
    orderExecutor?: IOrderExecutor,
    dataService?: BingXDataService,
    notificationService?: INotificationService,
    positionValidator?: PositionValidator
  ) {
    this.tradeDatabase = tradeDatabase || new TradeDatabase();
    this.orderStatusChecker = orderStatusChecker || new OrderStatusChecker();
    this.orderExecutor = orderExecutor || new BingXOrderExecutor(this.tradeDatabase);
    this.dataService = dataService || new BingXDataService();
    this.notificationService = notificationService || new NotificationService();
    this.positionValidator = positionValidator || new PositionValidator();
    this.stopLossUpdater = new StopLossUpdater(this.orderExecutor, this.notificationService);
    this.limitOrderFee = parseFloat(process.env.BINGX_LIMIT_ORDER_FEE || '0.0002');
    this.marketOrderFee = parseFloat(process.env.BINGX_MARKET_ORDER_FEE || '0.0005');
  }

  private getPositionKey(symbol: string, positionSide: 'LONG' | 'SHORT'): string {
    const normalizedSymbol = normalizeSymbolBingX(symbol);
    return `${normalizedSymbol}_${positionSide}`;
  }

  public async processTrades(monitoredPositions: Map<string, MonitoredPosition>): Promise<void> {
    // Get all open trades from the database
    const openTrades = await this.tradeDatabase.getOpenTrades();
    console.log(`Found ${openTrades.length} open trades to process`);

    for (const trade of openTrades) {
      try {
        const positionKey = this.getPositionKey(trade.symbol, trade.type);
        let monitoredPosition = null;
        if (monitoredPositions.size !== 0) {
          // Check if trade has a monitored position using both symbol and positionSide
          monitoredPosition = monitoredPositions.get(positionKey);
          if (!monitoredPosition) {

            // Add 1 second delay before checking position
            await new Promise(resolve => setTimeout(resolve, 500));

            try {
              // Check for existing position
              const { hasPosition: hasPositionRevalidate, message } = await this.positionValidator.hasOpenPosition(trade.symbol, trade.type);
              if ((!hasPositionRevalidate) && (!message.toLowerCase().includes('error'))) {
                console.log(`No monitored position found for trade ${trade.id} (${trade.symbol} ${trade.type}), cancelling orders and closing trade`);
                await this.cancelAndCloseTrade(trade);
              }
            } catch (error) {
              console.error('Error cancelling orphaned orders:', error);
              throw error;
            }


          }
        }

        const tp1IsFilled = await this.processTrade(trade);
        // Se TP1 foi preenchido, monitora e atualiza stop loss
        if (tp1IsFilled === true && monitoredPositions.size !== 0) {
          if (monitoredPosition) {
            // Add 1 second delay before checking position
            await new Promise(resolve => setTimeout(resolve, 500));

            try {
              // Check for existing position
              const { hasPosition: hasPositionRevalidate, message } = await this.positionValidator.hasOpenPosition(trade.symbol, trade.type);
              if ((hasPositionRevalidate) && (!message.toLowerCase().includes('error'))) {
                const currentPrice = await this.dataService.getSymbolPrice(trade.symbol);
                const entryPrice = monitoredPosition.entryPrice ?? parseFloat(monitoredPosition.position.avgPrice);
                const currentStopPrice = monitoredPosition.stopLossOrder ? parseFloat(monitoredPosition.stopLossOrder.price) : undefined;
                const positionSide = monitoredPosition.position.positionSide;
                const risk = Math.abs(entryPrice - (currentStopPrice ?? entryPrice));
                const reward = Math.abs(currentPrice - entryPrice);

                const breakevenData = StopLossUpdater.calculateBreakeven(
                  entryPrice,
                  parseFloat(monitoredPosition.position.positionAmt),
                  positionSide,
                  this.marketOrderFee,
                  this.limitOrderFee
                );
                if (
                  typeof currentStopPrice !== 'undefined' &&
                  breakevenData !== null
                ) {
                  await this.stopLossUpdater.updateStopLossIfNeeded(
                    monitoredPosition,
                    currentPrice,
                    entryPrice,
                    currentStopPrice,
                    positionSide,
                    risk,
                    reward,
                    breakevenData
                  );
                }
              }
            } catch (error) {
              console.error('Error move stop to breakeven :', error);
              throw error;
            }

          }
        }
      } catch (error) {
        console.error(`Erro ao processar trade ${trade.id}:`, error);
        await this.notificationService.sendTradeNotification({
          symbol: trade.symbol,
          type: trade.type,
          entry: trade.entry,
          stop: trade.stop,
          takeProfits: {
            tp1: trade.tp1 ?? 0,
            tp2: trade.tp2,
            tp3: trade.tp3,
            tp4: trade.tp4,
            tp5: trade.tp5,
            tp6: trade.tp6
          },
          validation: {
            isValid: false,
            message: `Erro ao processar trade ${trade.id}: ${error instanceof Error ? error.message : String(error)}`,
            volumeAnalysis: {
              color: 'red',
              stdBar: 0,
              currentVolume: 0,
              mean: 0,
              std: 0
            },
            entryAnalysis: {
              currentClose: 0,
              canEnter: false,
              hasClosePriceBeforeEntry: false,
              message: 'Erro ao processar trade'
            }
          },
          analysisUrl: '',
          volume_required: trade.volume_required,
          volume_adds_margin: trade.volume_adds_margin,
          setup_description: trade.setup_description ?? 'Erro ao processar trade',
          interval: null,
          executionError: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        });
        continue;
      }
    }

  }

  private async cancelAndCloseTrade(trade: TradeRecord): Promise<void> {
    try {
      // Collect all active order IDs that need to be cancelled

      // const allOrderIds = [
      //   trade.entryOrderId,
      //   trade.stopOrderId,
      //   trade.tp1OrderId,
      //   trade.tp2OrderId,
      //   trade.tp3OrderId,
      //   trade.tp4OrderId,
      //   trade.tp5OrderId,
      //   trade.tp6OrderId,
      //   trade.trailingStopOrderId
      // ].filter(id => id !== null);
      //
      // const orderInfos = allOrderIds
      //   .filter((id): id is string => {
      //     if (id === null || id === 'pending') return false;
      //     // Check if id is a valid bigint with at least 16 digits
      //     try {
      //       const idStr = String(id);
      //       // Only digits, at least 16 digits
      //       if (/^\d{16,}$/.test(idStr)) {
      //         BigInt(idStr); // Will throw if not valid
      //         return true;
      //       }
      //     } catch {
      //       return false;
      //     }
      //     return false;
      //   })
      //   .map(orderId => ({ orderId, symbol: trade.symbol }));
      //
      // // Get status for all orders
      // const orderStatuses = await this.getOrderStatusesWithDelay(orderInfos, 1000);
      //
      // Cancel all active orders
      // for (const [orderId, status] of orderStatuses) {
      //   if (status && status.status === 'NEW') {
      //     console.log(`Cancelling order ${orderId} for trade ${trade.id}`);
      //     await this.orderExecutor.cancelOrder(trade.symbol, orderId);
      //   }
      // }

      // Mark trade as closed
      await this.tradeDatabase.updateTradeStatus(trade.id, 'CLOSED');
      console.log(`Trade ${trade.id} marked as CLOSED due to no monitored position`);
    } catch (error) {
      console.error(`Error cancelling and closing trade ${trade.id}:`, error);
      throw error;
    }
  }

  private async processTrade(trade: TradeRecord): Promise<boolean | void> {
    try {
      // Collect all order IDs that need to be checked
      const allOrderIds = [
        trade.entryOrderId,
        trade.stopOrderId,
        trade.tp1OrderId,
        trade.tp2OrderId,
        trade.tp3OrderId,
        trade.tp4OrderId,
        trade.tp5OrderId,
        trade.tp6OrderId,
        trade.trailingStopOrderId
      ];

      const orderInfos = allOrderIds
        .filter((id): id is string => {
          if (id === null || id === 'pending') return false;
          // Check if id is a valid bigint with at least 16 digits
          try {
            const idStr = String(id);
            // Only digits, at least 16 digits
            if (/^\d{16,}$/.test(idStr)) {
              BigInt(idStr); // Will throw if not valid
              return true;
            }
          } catch {
            return false;
          }
          return false;
        })
        .map(orderId => ({ orderId, symbol: trade.symbol }));

      // Get status for all orders
      const orderStatuses = await this.getOrderStatusesWithDelay(orderInfos, 1000);

      // Variável para guardar o valor de isFilled do TP1
      let tp1IsFilled: boolean | undefined = undefined;

      // Process each order status
      for (const [orderId, status] of orderStatuses) {
        if (!status) {
          console.warn(`No status found for order ${orderId}`);
          continue;
        }

        // Skip orders that are in NEW status
        if (status.status === 'NEW') {
          console.log(`Order ${orderId} has NEW status, skipping`);
          continue;
        }

        // Skip orders that already have details in the database
        const hasDetails = await this.tradeDatabase.hasOrderDetails(orderId);
        if (hasDetails) {
          console.log(`Order ${orderId} already has details in database, skipping`);
          continue;
        }

        // Get detailed status information
        let details
        try {
          details = await this.orderStatusChecker.getOrderStatusWithDetails(orderId, trade.symbol);
        } catch (error: any) {
          console.error(`Error fetching order status ${error}`);
          continue;
        }

        if (!details) continue;

        // Se for o primeiro takeprofit, guarda o valor de isFilled
        if (orderId === trade.tp1OrderId) {
          if (typeof details.isFilled !== 'undefined') {
            console.log(`Primeiro Take Profit (TP1) isFilled para o trade ${trade.id}:`, details.isFilled);
            tp1IsFilled = details.isFilled;
          }
        }

        // Calculate PnL, fee, and result
        let pnl = 0;
        let fee = 0;
        let feeType: 'LIMIT' | 'MAKER' | undefined;
        let result = 0;

        if (details.isFilled) {
          // Determine fee type based on order type
          feeType = status.type === 'LIMIT' ? 'LIMIT' : 'MAKER';
          const feeRate = feeType === 'LIMIT' ? this.limitOrderFee : this.marketOrderFee;

          // Calculate fee with leverage
          const orderValue = details.executionDetails.executedQuantity * details.executionDetails.averagePrice;
          fee = PnLCalculator.calculateFee(orderValue, trade.leverage, feeRate);

          // Calculate PnL for stop and take profit orders with leverage
          if (orderId === trade.stopOrderId ||
            orderId === trade.tp1OrderId ||
            orderId === trade.tp2OrderId ||
            orderId === trade.tp3OrderId ||
            orderId === trade.tp4OrderId ||
            orderId === trade.tp5OrderId ||
            orderId === trade.tp6OrderId) {

            const entryPrice = trade.entry;
            const exitPrice = details.executionDetails.averagePrice;
            const quantity = details.executionDetails.executedQuantity;
            const leverage = trade.leverage;

            pnl = PnLCalculator.calculatePnL(trade.type, entryPrice, exitPrice, quantity, leverage);

            // Calculate final result (PnL - fee)
            result = PnLCalculator.calculateResult(pnl, fee);

            // Log additional information for take profit orders
            if (orderId !== trade.stopOrderId) {
              const tpNumber = [
                trade.tp1OrderId,
                trade.tp2OrderId,
                trade.tp3OrderId,
                trade.tp4OrderId,
                trade.tp5OrderId,
                trade.tp6OrderId
              ].indexOf(orderId) + 1;

              console.log(`Take Profit ${tpNumber} executed:`);
              console.log(`- Target Price: ${trade[`tp${tpNumber}` as keyof TradeRecord]}`);
              console.log(`- Executed Price: ${exitPrice}`);
              console.log(`- Quantity: ${quantity}`);
              console.log(`- PnL: ${pnl.toFixed(2)}`);
              console.log(`- Fee: ${fee.toFixed(2)}`);
              console.log(`- Result: ${result.toFixed(2)}`);
            }
          }
        }

        // Save order details to database
        await this.tradeDatabase.saveOrderDetails(trade.id, orderId, {
          status: details.status.status,
          executedQuantity: details.executionDetails.executedQuantity,
          averagePrice: details.executionDetails.averagePrice,
          createTime: details.executionDetails.createTime,
          updateTime: details.executionDetails.updateTime,
          isFilled: details.isFilled,
          isCanceled: details.isCanceled,
          isOpen: details.isOpen,
          pnl,
          fee,
          feeType,
          result
        });

        // Only mark trade as CLOSED if the order is stop or trailingStop
        if (orderId === trade.stopOrderId || orderId === trade.trailingStopOrderId) {
          await this.tradeDatabase.updateTradeStatus(trade.id, 'CLOSED');
          console.log(`Trade ${trade.id} marked as CLOSED - ${orderId} is ${details.status.status}`);
          if (pnl !== 0) {
            console.log(`PnL: ${pnl.toFixed(2)}, Fee: ${fee.toFixed(2)}, Result: ${result.toFixed(2)}`);
            console.log(`Leverage used: ${trade.leverage}x`);
            if (trade.volume_adds_margin) {
              console.log(`Volume Margin was enabled for this trade`);
            }
            if (trade.setup_description) {
              console.log(`Setup Description: ${trade.setup_description}`);
            }
          }
        } else {
          console.log(`Trade ${trade.id} remains open - ${orderId} is ${details.status.status}`);
        }
      }
      return tp1IsFilled;
    } catch (error) {
      console.error(`Error processing trade ${trade.id}:`, error);
      throw error
    }
  }

  private async getOrderStatusesWithDelay(orderInfos: { orderId: string, symbol: string }[], delayMs: number = 1000): Promise<Map<string, any>> {
    const statuses = new Map<string, any>();
    for (const { orderId, symbol } of orderInfos) {
      try {
        const status = await this.orderStatusChecker.getOrderStatus(orderId, symbol);
        statuses.set(orderId, status);
      } catch (error) {
        console.error(`Error fetching status for order ${orderId}:`, error);
      }
      // Delay entre as consultas
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    return statuses;
  }
} 
