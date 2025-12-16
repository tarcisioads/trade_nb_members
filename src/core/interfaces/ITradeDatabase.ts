import { Trade, TradeRecord, BingXOrderResponse, TradeNotification } from '../../utils/types';

export interface ITradeDatabase {
    saveTrade(
        trade: Trade,
        orders: {
            entryOrder: BingXOrderResponse;
            stopOrder: BingXOrderResponse;
            tpOrders: BingXOrderResponse[];
        },
        quantity: number,
        leverage: number
    ): Promise<TradeRecord>;

    getTradeById(id: number): Promise<TradeRecord>;
    getOpenTrades(): Promise<TradeRecord[]>;
    getClosedTrades(): Promise<TradeRecord[]>;
    getAllTrades(): Promise<TradeRecord[]>;
    updateTradeStatus(id: number, status: 'OPEN' | 'CLOSED'): Promise<void>;

    updateOrderIds(
        id: number,
        orderIds: {
            tp1OrderId?: string | null;
            tp2OrderId?: string | null;
            tp3OrderId?: string | null;
            tp4OrderId?: string | null;
            tp5OrderId?: string | null;
            tp6OrderId?: string | null;
            trailingStopOrderId?: string | null;
            entryOrderId?: string;
            stopOrderId?: string;
        }
    ): Promise<void>;

    updateLeverage(id: number, leverage: number): Promise<void>;

    saveOrderDetails(
        tradeId: number,
        orderId: string,
        details: {
            status: string;
            executedQuantity: number;
            averagePrice: number;
            createTime: Date;
            updateTime: Date;
            isFilled: boolean;
            isCanceled: boolean;
            isOpen: boolean;
            pnl?: number;
            fee?: number;
            feeType?: 'LIMIT' | 'MAKER';
            result?: number;
        }
    ): Promise<void>;

    hasOrderDetails(orderId: string): Promise<boolean>;

    saveTradeLog(
        tradeId: number,
        pair: string,
        side: 'BUY' | 'SELL',
        positionSide: 'LONG' | 'SHORT',
        type: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_MARKET' | 'TRIGGER_LIMIT' | 'TRAILING_STOP_MARKET',
        price: number | null,
        stopPrice: number | null,
        quantity: number,
        orderResponse: BingXOrderResponse
    ): Promise<void>;

    getTradeLogs(tradeId: number): Promise<any[]>;

    saveTradeNotification(notification: TradeNotification): Promise<void>;

    getTradeNotifications(
        filters?: {
            symbol?: string;
            type?: 'LONG' | 'SHORT';
            is_valid?: boolean;
            is_warning?: boolean;
            volume_required?: boolean;
            volume_adds_margin?: boolean;
            start_date?: string;
            end_date?: string;
        }
    ): Promise<TradeNotification[]>;

    getDistinctSymbols(): Promise<string[]>;
    updatePositionId(id: number, positionId: string): Promise<void>;

    updateTradeSentiment(id: number, sentimentData: {
        sentiment: string;
        lsrtrend: string;
        oitrend: string;
        lsrsignal: string;
        oisignal: string;
    }): Promise<void>;
}
