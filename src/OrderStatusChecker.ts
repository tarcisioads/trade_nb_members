import { BingXApiClient } from './services/BingXApiClient';
import * as dotenv from 'dotenv';
import { normalizeSymbolBingX } from './utils/bingxUtils';

// Load environment variables
dotenv.config();

interface OrderStatus {
  orderId: string;
  clientOrderId: string;
  symbol: string;
  side: string;
  positionSide: string;
  type: string;
  price: string;
  stopPrice: string;
  quantity: string;
  status: string;
  executedQty: string;
  avgPrice: string;
  time: number;
  updateTime: number;
}

interface Order {
  order: OrderStatus;
}


interface BingXOrderStatusResponse {
  code: number;
  msg: string;
  data: Order;
}

export class OrderStatusChecker {
  private readonly apiClient: BingXApiClient;

  constructor() {
    this.apiClient = new BingXApiClient();
  }

  private isValidBigInt(value: string): boolean {
    // Verifica se é um número inteiro válido para BigInt
    return /^\d{16,}$/.test(value);
  }

  public async getOrderStatus(orderId: string, symbol: string): Promise<Order> {
    if (!this.isValidBigInt(orderId)) {
      throw new Error(`orderId inválido para BigInt: ${orderId}`);
    }
    const path = '/openApi/swap/v2/trade/order';
    const _orderId = BigInt(orderId)
    const normalizedSymbol = normalizeSymbolBingX(symbol);
    const params = {
      orderId: _orderId,
      symbol: normalizedSymbol
    };

    try {
      const response = await this.apiClient.get<BingXOrderStatusResponse>(path, params);

      if (response.code !== 0) {
        throw new Error(`Error fetching order status: ${response.msg}, params: ${JSON.stringify(params)}`);
      }

      return response.data;
    } catch (error) {
      console.error(`Error fetching order status params: ${JSON.stringify(params)} ${error}`);
      throw error;
    }
  }

  public async getOrderStatusWithDetails(orderId: string, symbol: string): Promise<{
    status: OrderStatus;
    isFilled: boolean;
    isCanceled: boolean;
    isOpen: boolean;
    executionDetails: {
      executedQuantity: number;
      averagePrice: number;
      createTime: Date;
      updateTime: Date;
    };
  }> {
    const orderStatus = await this.getOrderStatus(orderId, symbol);

    return {
      status: orderStatus.order,
      isFilled: orderStatus.order.status === 'FILLED',
      isCanceled: orderStatus.order.status === 'CANCELED',
      isOpen: orderStatus.order.status === 'NEW' || orderStatus.order.status === 'PARTIALLY_FILLED',
      executionDetails: {
        executedQuantity: parseFloat(orderStatus.order.executedQty),
        averagePrice: parseFloat(orderStatus.order.avgPrice),
        createTime: new Date(orderStatus.order.time),
        updateTime: new Date(orderStatus.order.updateTime)
      }
    };
  }

  public async getMultipleOrderStatus(orderInfos: { orderId: string, symbol: string }[]): Promise<Map<string, OrderStatus>> {
    const orderStatuses = new Map<string, OrderStatus>();

    await Promise.all(
      orderInfos.map(async ({ orderId, symbol }) => {
        try {
          const status = await this.getOrderStatus(orderId, symbol);
          orderStatuses.set(orderId, status.order);
        } catch (error) {
          console.error(`Error fetching status for order ${orderId}:`, error);
          //orderStatuses.set(orderId, null);
        }
      })
    );

    return orderStatuses;
  }
} 
