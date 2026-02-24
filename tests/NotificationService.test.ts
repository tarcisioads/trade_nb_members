import { NotificationService } from '../src/infrastructure/telegram/NotificationService';
import { TradeDatabase } from '../src/infrastructure/database/TradeDatabase';
import { TelegramService } from '../src/infrastructure/telegram/TelegramService';
import axios from 'axios';

jest.mock('axios');
jest.mock('../src/infrastructure/database/TradeDatabase');
jest.mock('../src/infrastructure/telegram/TelegramService');

describe('NotificationService', () => {
  let service: NotificationService;
  let mockDb: jest.Mocked<TradeDatabase>;
  let mockTelegram: jest.Mocked<TelegramService>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = new TradeDatabase() as jest.Mocked<TradeDatabase>;
    mockTelegram = {
      sendTradeNotification: jest.fn().mockResolvedValue(undefined),
      sendCustomMessage: jest.fn().mockResolvedValue(undefined),
      isConfigured: jest.fn().mockReturnValue(true)
    } as any;

    service = new NotificationService('http://test-api.com', mockDb, mockTelegram);
  });

  it('should save to DB, call API and Telegram when sending trade notification', async () => {
    (axios.post as jest.Mock).mockResolvedValue({ status: 200 });

    const trade: any = {
      symbol: 'BTCUSDT',
      type: 'LONG',
      entry: 50000,
      stop: 48000,
      takeProfits: { tp1: 52000 },
      validation: { isValid: true, message: 'OK' }
    };

    await service.sendTradeNotification(trade);

    expect(mockDb.saveTradeNotification).toHaveBeenCalled();
    expect(axios.post).toHaveBeenCalledWith('http://test-api.com', expect.objectContaining({ symbol: 'BTCUSDT' }));
    expect(mockTelegram.sendTradeNotification).toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    (axios.post as jest.Mock).mockRejectedValue(new Error('API Down'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const trade: any = {
        symbol: 'BTCUSDT',
        type: 'LONG',
        entry: 50000,
        stop: 48000,
        takeProfits: { tp1: 52000 },
        validation: { isValid: true, message: 'OK' }
      };

    await service.sendTradeNotification(trade);

    expect(consoleSpy).toHaveBeenCalledWith('Error sending trade notification:', expect.any(Error));
    consoleSpy.mockRestore();
  });
});
