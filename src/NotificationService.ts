import axios from 'axios';
import { TradeNotification } from './utils/types';
import { TradeDatabase } from './TradeDatabase';
import { TelegramService } from './TelegramService';

export class NotificationService {
  private readonly apiUrl: string;
  private readonly tradeDatabase: TradeDatabase;
  private readonly telegramService: TelegramService;

  constructor(
    apiUrl: string = process.env.NOTIFICATION_API_URL || 'http://localhost:3000/api/notification'
  ) {
    this.apiUrl = apiUrl;
    this.tradeDatabase = new TradeDatabase();
    this.telegramService = TelegramService.getInstance();
  }

  public async sendTradeNotification(trade: Omit<TradeNotification, 'timestamp'>): Promise<void> {
    try {
      const notificationWithTimestamp = {
        ...trade,
        interval: trade.interval || '1h',
        timestamp: new Date().toISOString()
      };

      // Save notification to database
      await this.tradeDatabase.saveTradeNotification(notificationWithTimestamp);

      // Send notification to API
      const response = await axios.post(this.apiUrl, notificationWithTimestamp);
      console.log('Trade notification sent successfully:', response.status);

      // Send notification to Telegram
      await this.telegramService.sendTradeNotification(notificationWithTimestamp);
    } catch (error) {
      console.error('Error sending trade notification:', error);
    }
  }

  public async sendCustomTelegramMessage(message: string): Promise<void> {
    await this.telegramService.sendCustomMessage(message);
  }
} 
