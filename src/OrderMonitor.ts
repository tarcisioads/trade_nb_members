import { BingXApiClient } from './services/BingXApiClient';
import * as dotenv from 'dotenv';
import { BingXOrderExecutor } from './BingXOrderExecutor';
import { MonitoredPosition, BingXOrdersResponse, Order } from './utils/types';
import { PositionValidator } from './PositionValidator';
import { NotificationService } from './NotificationService';

// Load environment variables
dotenv.config();

export class OrderMonitor {
  private readonly apiClient: BingXApiClient;
  private openOrders: Map<string, Order> = new Map();
  private readonly orderExecutor: BingXOrderExecutor;
  private positionValidator: PositionValidator;
  private readonly notificationService: NotificationService;

  constructor() {
    this.apiClient = new BingXApiClient();
    this.orderExecutor = new BingXOrderExecutor();
    this.positionValidator = new PositionValidator();
    this.notificationService = new NotificationService();
  }

  private getOrderKey(order: Order): string {
    return `${order.orderId}_${order.symbol}_${order.positionSide}`;
  }

  public async updateOpenOrders(): Promise<void> {
    try {
      const path = '/openApi/swap/v2/trade/openOrders';
      const params = {
        timestamp: Date.now().toString()
      };

      try {
        const response = await this.apiClient.get<BingXOrdersResponse>(path, params);
        if (!response || !response.data || typeof response.code !== 'number') {
          throw new Error(`API returned invalid response: ${JSON.stringify(response)}`);
        }

        if (response.code !== 0) {
          throw new Error(`API returned non-zero code: ${response.code}, message: ${response.msg}`);
        }
        if (!response.data.orders) {
          throw new Error(`API returned non-zero code: ${response.code}, message: ${response.msg}`);
        }
        // Clear existing orders
        this.openOrders.clear();

        // Update with new orders
        for (const order of response.data.orders) {
          if (order.status === 'NEW' || order.status === 'PARTIALLY_FILLED') {
            this.openOrders.set(this.getOrderKey(order), order);
          }
        }


      } catch (error) {
        console.error('Error fetching open orders:', error);
        throw new Error('Error fetching positions: ' + (error instanceof Error ? error.message : error));
      }


    } catch (error) {
      console.error('Error fetching open orders:', error);
      throw error;
    }
  }

  public getStopMarketOrder(symbol: string, positionSide: 'LONG' | 'SHORT'): Order | undefined {
    for (const order of this.openOrders.values()) {
      if (
        order.symbol === symbol &&
        order.positionSide === positionSide &&
        (order.type === 'STOP_MARKET' || order.type === 'STOP') &&
        (order.status === 'NEW' || order.status === 'PARTIALLY_FILLED')
      ) {
        return order;
      }
    }
    return undefined;
  }

  public getAllOpenOrders(): Order[] {
    return Array.from(this.openOrders.values());
  }

  public getOpenOrdersBySymbol(symbol: string): Order[] {
    return Array.from(this.openOrders.values())
      .filter(order => order.symbol === symbol);
  }

  public getOpenOrdersByPositionSide(symbol: string, positionSide: 'LONG' | 'SHORT'): Order[] {
    return Array.from(this.openOrders.values())
      .filter(order =>
        order.symbol === symbol &&
        order.positionSide === positionSide
      );
  }

  public hasOpenStopMarketOrder(symbol: string, positionSide: 'LONG' | 'SHORT'): boolean {
    return this.getStopMarketOrder(symbol, positionSide) !== undefined;
  }

  public getOrderById(orderId: string): Order | undefined {
    for (const order of this.openOrders.values()) {
      if (order.orderId === orderId) {
        return order;
      }
    }
    return undefined;
  }

  private async cancelOrder(order: Order): Promise<void> {
    try {
      await this.orderExecutor.cancelOrder(order.symbol, order.orderId);
      console.log(`Cancelled order ${order.orderId} for ${order.symbol} ${order.positionSide}`);

      // Send notification about cancelled orphaned order
      await this.notificationService.sendTradeNotification({
        symbol: order.symbol,
        type: order.positionSide,
        entry: 0, // Not applicable for orphaned orders
        stop: parseFloat(order.stopPrice || '0'),
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
          message: `Cancelled orphaned ${order.type} order for ${order.symbol} ${order.positionSide}`,
          volumeAnalysis: {
            color: 'yellow',
            stdBar: 0,
            currentVolume: 0,
            mean: 0,
            std: 0
          },
          entryAnalysis: {
            currentClose: 0, // Not applicable for orphaned orders
            canEnter: false,
            hasClosePriceBeforeEntry: true,
            message: 'Orphaned order cancelled'
          }
        },
        analysisUrl: '',
        volume_required: false,
        volume_adds_margin: false,
        setup_description: `⚠️ Cancelled orphaned ${order.type} order for ${order.symbol} ${order.positionSide}. Order ID: ${order.orderId}, Price: ${order.price}, Stop: ${order.stopPrice || 'N/A'}`,
        interval: null
      });
    } catch (error) {
      console.error(`Error cancelling order ${order.orderId} for ${order.symbol} ${order.positionSide}:`, error);

      // Send notification about the error cancelling the order
      await this.notificationService.sendTradeNotification({
        symbol: order.symbol,
        type: order.positionSide,
        entry: 0,
        stop: parseFloat(order.stopPrice || '0'),
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
          message: `Failed to cancel orphaned ${order.type} order for ${order.symbol} ${order.positionSide}`,
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
            hasClosePriceBeforeEntry: true,
            message: 'Error cancelling orphaned order'
          }
        },
        analysisUrl: '',
        volume_required: false,
        volume_adds_margin: false,
        setup_description: `❌ Failed to cancel orphaned ${order.type} order for ${order.symbol} ${order.positionSide}. Order ID: ${order.orderId}, Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        interval: null
      });
    }
  }

  public async cancelOrphanedOrders(monitoredPositions: Map<string, MonitoredPosition>): Promise<void> {
    try {
      // Update open orders first to get latest state
      await this.updateOpenOrders();

      let list: string[] = []

      // For each open order, check if there's a corresponding monitored position
      for (const order of this.openOrders.values()) {
        const positionKey = `${order.symbol}_${order.positionSide}`;
        const hasPosition = monitoredPositions.has(positionKey);

        // If no position exists for this order, cancel it
        if (!hasPosition) {
          // Add 1 second delay before checking position
          await new Promise(resolve => setTimeout(resolve, 1000));

          try {
            // Check for existing position
            const { hasPosition: hasPositionRevalidate, position, message } = await this.positionValidator.hasOpenPosition(order.symbol, order.positionSide);
            if ((!hasPositionRevalidate) && (!position) && (!message.toLowerCase().includes('error'))) {
              console.log(`Found orphaned order for ${order.symbol} ${order.positionSide} (${order.type})`);
              //await this.cancelOrder(order);
              const item = list.find(p => p == positionKey)
              if (!item) {
                list.push(positionKey)
                // Send notification about the error cancelling the order
                await this.notificationService.sendTradeNotification({
                  symbol: order.symbol,
                  type: order.positionSide,
                  entry: 0,
                  stop: parseFloat(order.stopPrice || '0'),
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
                    message: `Founded orphaned order for ${order.symbol} ${order.positionSide}`,
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
                      hasClosePriceBeforeEntry: true,
                      message: 'Founded orphaned order'
                    }
                  },
                  analysisUrl: '',
                  volume_required: false,
                  volume_adds_margin: false,
                  setup_description: `❌ Founded orphaned order for ${order.symbol} ${order.positionSide}. Order ID: ${order.orderId}`,
                  interval: null
                });

              }
            }
          } catch (error) {
            console.error('Error cancelling orphaned orders:', error);
            throw error;
          }

        }
      }
    } catch (error) {
      console.error('Error cancelling orphaned orders:', error);
      throw error;
    }
  }
} 
