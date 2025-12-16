import { Trade, BingXOrderResponse, TradeRecord } from '../../utils/types';

export interface IOrderExecutor {
    placeOrder(
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
    ): Promise<BingXOrderResponse>;

    cancelOrder(pair: string, orderId: string): Promise<void>;

    cancelReplaceOrder(
        pair: string,
        side: 'BUY' | 'SELL',
        positionSide: 'LONG' | 'SHORT',
        type: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_MARKET' | 'TRIGGER_LIMIT',
        price: number,
        stopPrice: number,
        quantity: number,
        tradeId?: number,
        orderId?: string
    ): Promise<BingXOrderResponse>;

    executeTrade(trade: Trade): Promise<{
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
    }>;
}
