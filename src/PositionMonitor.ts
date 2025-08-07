import { PositionValidator } from './PositionValidator';
import { BingXWebSocket } from './BingXWebSocket';
import { TradeDatabase } from './TradeDatabase';
import { Position, MonitoredPosition, Order } from './utils/types';
import { OrderMonitor } from './OrderMonitor';
import { BingXOrderExecutor } from './BingXOrderExecutor';
import { normalizeSymbolBingX } from './utils/bingxUtils';
import { NotificationService } from './NotificationService';
import * as dotenv from 'dotenv';
import { StopLossUpdater } from './StopLossUpdater';

// Load environment variables
dotenv.config();

export class PositionMonitor {
  private positionValidator: PositionValidator;
  private tradeDatabase: TradeDatabase;
  private orderMonitor: OrderMonitor;
  private orderExecutor: BingXOrderExecutor;
  private notificationService: NotificationService;
  private monitoredPositions: Map<string, MonitoredPosition> = new Map();
  private onPriceUpdate?: (position: MonitoredPosition) => void;
  private readonly limitOrderFee: number;
  private readonly marketOrderFee: number;
  private stopLossUpdater?: StopLossUpdater; // Add this property

  constructor(onPriceUpdate?: (position: MonitoredPosition) => void) {
    this.positionValidator = new PositionValidator();
    this.tradeDatabase = new TradeDatabase();
    this.orderMonitor = new OrderMonitor();
    this.orderExecutor = new BingXOrderExecutor();
    this.notificationService = new NotificationService();
    this.onPriceUpdate = onPriceUpdate;
    this.limitOrderFee = parseFloat(process.env.BINGX_LIMIT_ORDER_FEE || '0.02');
    this.marketOrderFee = parseFloat(process.env.BINGX_MARKET_ORDER_FEE || '0.05');
  }

  private getPositionKey(symbol: string, positionSide: 'LONG' | 'SHORT'): string {
    const normalizedSymbol = normalizeSymbolBingX(symbol);
    return `${normalizedSymbol}_${positionSide}`;
  }

  private async matchPositionWithTrade(position: Position): Promise<number | undefined> {
    const normalizedSymbol = normalizeSymbolBingX(position.symbol);
    const trades = await this.tradeDatabase.getAllTrades();
    const matchingTrades = trades.filter(trade =>
      normalizeSymbolBingX(trade.symbol) === normalizedSymbol &&
      trade.type === position.positionSide
    );

    if (matchingTrades.length === 0) {
      return undefined;
    }

    // Return the trade with the maximum ID
    return Math.max(...matchingTrades.map(trade => trade.id));
  }

  public async checkStopLossBeforeLiquidation(
    position: Position,
    stopLossOrder: Order | undefined
  ): Promise<void> {
    if (!stopLossOrder || parseFloat(position.positionAmt) === 0) {
      return;
    }

    const stopPrice = parseFloat(stopLossOrder.price);
    const currentPrice = parseFloat(position.markPrice);
    const entryPrice = parseFloat(position.avgPrice);

    // Calculate liquidation price based on leverage and position side
    const liquidationPrice = parseFloat(position.liquidationPrice); // For SHORT positions

    const isBeforeLiquidation = position.positionSide === 'LONG'
      ? stopPrice < liquidationPrice
      : stopPrice > liquidationPrice;

    if (isBeforeLiquidation) {
      await this.notificationService.sendTradeNotification({
        symbol: position.symbol,
        type: position.positionSide,
        entry: entryPrice,
        stop: stopPrice,
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
          message: `Stop loss order (${stopPrice}) found before liquidation price (${liquidationPrice}) for ${position.symbol} ${position.positionSide}`,
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
            message: 'Stop loss before liquidation - DANGER'
          }
        },
        analysisUrl: '',
        volume_required: false,
        volume_adds_margin: false,
        setup_description: `⚠️ DANGER: Stop loss order (${stopPrice}) is before liquidation price (${liquidationPrice}) for ${position.symbol} ${position.positionSide} position. `,
        interval: null
      });
    }
  }

  private async createStopLossOrder(
    position: Position,
    initialStopPrice: number
  ): Promise<Order | undefined> {
    if (!initialStopPrice || parseFloat(position.positionAmt) === 0) {
      console.log('createStopLossOrder - Early return: no initialStopPrice or positionAmt is 0');
      return undefined;
    }

    try {
      console.log('createStopLossOrder - Calling placeOrder with params:', {
        symbol: position.symbol,
        side: position.positionSide === 'LONG' ? 'SELL' : 'BUY',
        positionSide: position.positionSide,
        type: 'STOP',
        price: initialStopPrice,
        stopPrice: initialStopPrice,
        quantity: parseFloat(position.positionAmt)
      });

      const newStopOrder = await this.orderExecutor.placeOrder(
        position.symbol,
        position.positionSide === 'LONG' ? 'SELL' : 'BUY',
        position.positionSide,
        'STOP',
        initialStopPrice,
        initialStopPrice,
        parseFloat(position.positionAmt),
        undefined, undefined, position.positionId
      );

      const stopLossOrder: Order = {
        orderId: newStopOrder.data.order.orderId,
        symbol: position.symbol,
        side: position.positionSide === 'LONG' ? 'SELL' : 'BUY',
        type: 'STOP',
        price: initialStopPrice.toString(),
        stopPrice: initialStopPrice.toString(),
        quantity: position.positionAmt,
        positionSide: position.positionSide,
        status: 'NEW',
        clientOrderId: newStopOrder.data.order.clientOrderId || '',
        createTime: Date.now(),
        updateTime: Date.now()
      };

      // Send notification about the new stop loss order
      await this.notificationService.sendTradeNotification({
        symbol: position.symbol,
        type: position.positionSide,
        entry: parseFloat(position.avgPrice),
        stop: initialStopPrice,
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
          message: `New stop loss order created for ${position.symbol} ${position.positionSide}`,
          volumeAnalysis: {
            color: 'green',
            stdBar: 0,
            currentVolume: 0,
            mean: 0,
            std: 0
          },
          entryAnalysis: {
            currentClose: parseFloat(position.markPrice),
            canEnter: false,
            hasClosePriceBeforeEntry: true,
            message: 'Stop loss order created'
          }
        },
        analysisUrl: '',
        volume_required: false,
        volume_adds_margin: false,
        setup_description: `✅ New stop loss order created for ${position.symbol} ${position.positionSide} position at ${initialStopPrice}. Entry: ${position.avgPrice}, Current Price: ${position.markPrice}`,
        interval: null
      });

      return stopLossOrder;
    } catch (error) {
      console.error(`Error creating stop loss order for ${position.symbol} ${position.positionSide}:`, error);

      // Send notification about the error
      await this.notificationService.sendTradeNotification({
        symbol: position.symbol,
        type: position.positionSide,
        entry: parseFloat(position.avgPrice),
        stop: initialStopPrice,
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
          message: `Failed to create stop loss order for ${position.symbol} ${position.positionSide}`,
          volumeAnalysis: {
            color: 'red',
            stdBar: 0,
            currentVolume: 0,
            mean: 0,
            std: 0
          },
          entryAnalysis: {
            currentClose: parseFloat(position.markPrice),
            canEnter: false,
            hasClosePriceBeforeEntry: true,
            message: 'Error creating stop loss'
          }
        },
        analysisUrl: '',
        volume_required: false,
        volume_adds_margin: false,
        setup_description: `❌ Failed to create stop loss order for ${position.symbol} ${position.positionSide} position at ${initialStopPrice}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        interval: null
      });

      return undefined;
    }
  }

  private async updateMonitoredPosition(position: Position): Promise<void> {
    const positionKey = this.getPositionKey(position.symbol, position.positionSide);
    const existingPosition = this.monitoredPositions.get(positionKey);

    // Update open orders to get latest stop loss orders
    await this.orderMonitor.updateOpenOrders();
    let stopLossOrder = this.orderMonitor.getStopMarketOrder(position.symbol, position.positionSide);

    // Get trade info to get leverage and initial stop price
    const tradeId = await this.matchPositionWithTrade(position);
    let leverage: number | undefined;
    leverage = parseFloat(position.leverage.toString());

    // Check for stop loss before liquidation
    if (stopLossOrder) {
      await this.checkStopLossBeforeLiquidation(position, stopLossOrder);
    }


    let initialStopPrice: number | undefined;
    if (tradeId) {
      const trade = await this.tradeDatabase.getTradeById(tradeId);
      initialStopPrice = trade?.stop; // Using the 'stop' field from TradeRecord
      // If no stop loss order exists but we have a trade stop price, create one
      if (!stopLossOrder && initialStopPrice) {
        stopLossOrder = await this.createStopLossOrder(position, initialStopPrice);
      }
    }

    if (existingPosition) {
      // Update existing position
      existingPosition.position = position;
      existingPosition.stopLossOrder = stopLossOrder;
      existingPosition.leverage = leverage;
      existingPosition.entryPrice = parseFloat(position.avgPrice);
      if (initialStopPrice) {
        existingPosition.initialStopPrice = initialStopPrice;
      } else if (stopLossOrder) {
        existingPosition.initialStopPrice = parseFloat(stopLossOrder.price);
      }
    }

    if (!existingPosition?.websocket) {
      // Create new monitored position
      const websocket = this.createWebSocket(position.symbol, position.positionSide);

      this.monitoredPositions.set(positionKey, {
        symbol: position.symbol,
        positionSide: position.positionSide,
        position,
        websocket,
        tradeId,
        lastPrice: undefined,
        stopLossOrder,
        initialStopPrice: initialStopPrice ? initialStopPrice : stopLossOrder ? parseFloat(stopLossOrder.price) : undefined,
        entryPrice: parseFloat(position.avgPrice),
        leverage
      });
    }
  }

  private async checkAndUpdateStopLoss(position: MonitoredPosition, currentPrice: number): Promise<void> {
    if (!position.initialStopPrice || !position.entryPrice || !position.stopLossOrder || !position.leverage) {
      return;
    }

    const entryPrice = position.entryPrice;
    const currentStopPrice = parseFloat(position.stopLossOrder.price);
    const positionSide = position.positionSide;

    if (!position.stopLossOrder || isNaN(currentStopPrice)) {
      return;
    }

    const isStopLossInProfit = positionSide === 'LONG'
      ? currentStopPrice >= entryPrice
      : currentStopPrice <= entryPrice;

    if (isStopLossInProfit) {
      return;
    }

    const risk = Math.abs(entryPrice - currentStopPrice);
    const reward = Math.abs(currentPrice - entryPrice);

    if (reward >= risk) {
      // Usar o método estático da nova classe
      const breakevenData = StopLossUpdater.calculateBreakeven(
        entryPrice,
        parseFloat(position.position.positionAmt),
        positionSide,
        this.marketOrderFee,
        this.limitOrderFee
      );
      if (!breakevenData) {
        return;
      }
      if (!this.stopLossUpdater) {
        this.stopLossUpdater = new StopLossUpdater(this.orderExecutor, this.notificationService);
      }

      if (position.stopLossOrder) {
        position.stopLossOrder.stopPrice = breakevenData.breakevenWithFees.toString();
      }

      await this.stopLossUpdater.updateStopLossIfNeeded(
        position,
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

  private createWebSocket(symbol: string, positionSide: 'LONG' | 'SHORT'): BingXWebSocket {
    const normalizedSymbol = normalizeSymbolBingX(symbol);
    const ws = new BingXWebSocket(normalizedSymbol, async (priceData) => {
      const positionKey = this.getPositionKey(normalizedSymbol, positionSide);
      const monitoredPosition = this.monitoredPositions.get(positionKey);

      if (monitoredPosition) {
        monitoredPosition.lastPrice = priceData.price;

        // Check and update stop loss if needed
        await this.checkAndUpdateStopLoss(monitoredPosition, priceData.price);

        if (this.onPriceUpdate) {
          this.onPriceUpdate(monitoredPosition);
        }
      }
    });

    ws.connect();
    return ws;
  }

  private removeClosedPositions(currentPositions: Position[]): void {
    const currentPositionKeys = new Set(
      currentPositions.map(p => this.getPositionKey(p.symbol, p.positionSide))
    );

    // Remove positions that are no longer open
    for (const [positionKey, monitoredPosition] of this.monitoredPositions.entries()) {
      if (!currentPositionKeys.has(positionKey)) {
        monitoredPosition.websocket.disconnect();
        this.monitoredPositions.delete(positionKey);
      }
    }
  }

  public async updatePositions(): Promise<void> {
    try {
      let positions: Position[] = [];
      // Get all open positions from BingX
      positions = await this.positionValidator.getPositions('ALL');
      // Update open orders first
      await this.orderMonitor.updateOpenOrders();

      // Remove positions that are no longer open
      this.removeClosedPositions(positions);

      // Update or add new positions
      for (const position of positions) {
        if (parseFloat(position.positionAmt) !== 0) {
          await this.updateMonitoredPosition(position);
        }
      }

      await this.orderMonitor.cancelOrphanedOrders(this.monitoredPositions);

    } catch (error) {
      console.error('Error updating positions:', error);
      throw error;
    }
  }

  public getMonitoredPositions(): MonitoredPosition[] {
    return Array.from(this.monitoredPositions.values());
  }

  public getMonitoredPosition(symbol: string, positionSide: 'LONG' | 'SHORT'): MonitoredPosition | undefined {
    return this.monitoredPositions.get(this.getPositionKey(symbol, positionSide));
  }

  public getMonitoredPositionsMap(): Map<string, MonitoredPosition> {
    return new Map(this.monitoredPositions);
  }

  public disconnect(): void {
    for (const monitoredPosition of this.monitoredPositions.values()) {
      monitoredPosition.websocket.disconnect();
    }
    this.monitoredPositions.clear();
  }
} 
