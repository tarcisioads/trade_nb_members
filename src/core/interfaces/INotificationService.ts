import { TradeNotification } from '../../utils/types';

export interface INotificationService {
    sendTradeNotification(notification: TradeNotification): Promise<void>;
}
