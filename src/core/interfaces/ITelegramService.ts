import { TradeNotification } from '../../utils/types';

export interface ITelegramService {
    sendTradeNotification(trade: TradeNotification): Promise<void>;
    sendCustomMessage(message: string): Promise<void>;
    isConfigured(): boolean;
}
