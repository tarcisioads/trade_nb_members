import { TelegramService } from '../src/infrastructure/telegram/TelegramService';
import TelegramBot from 'node-telegram-bot-api';

jest.mock('node-telegram-bot-api');

describe('TelegramService', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = { ...process.env };
    // Reset the singleton instance for each test
    (TelegramService as any).instance = undefined;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should not initialize if env vars are missing', () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;

    const service = TelegramService.getInstance();
    expect(service.isConfigured()).toBe(false);
  });

  it('should initialize correctly if env vars are present', () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test_token';
    process.env.TELEGRAM_CHAT_ID = 'test_chat_id';

    const service = TelegramService.getInstance();
    expect(service.isConfigured()).toBe(true);
    expect(TelegramBot).toHaveBeenCalledWith('test_token', { polling: false });
  });

  it('should send a custom message', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test_token';
    process.env.TELEGRAM_CHAT_ID = 'test_chat_id';

    const service = TelegramService.getInstance();
    const mockSendMessage = jest.fn().mockResolvedValue({});
    (service as any).bot = { sendMessage: mockSendMessage };

    await service.sendCustomMessage('Hello World');

    expect(mockSendMessage).toHaveBeenCalledWith('test_chat_id', 'Hello World', { parse_mode: 'HTML' });
  });

  it('should format and send trade notification', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test_token';
    process.env.TELEGRAM_CHAT_ID = 'test_chat_id';

    const service = TelegramService.getInstance();
    const mockSendMessage = jest.fn().mockResolvedValue({});
    (service as any).bot = { sendMessage: mockSendMessage };

    const trade: any = {
      symbol: 'BTCUSDT',
      type: 'LONG',
      entry: 50000,
      stop: 48000,
      takeProfits: { tp1: 52000 },
      validation: { isValid: true, message: 'Valid' },
      timestamp: new Date().toISOString()
    };

    await service.sendTradeNotification(trade);

    expect(mockSendMessage).toHaveBeenCalled();
    const sentMessage = mockSendMessage.mock.calls[0][1];
    expect(sentMessage).toContain('BTCUSDT');
    expect(sentMessage).toContain('LONG');
    expect(sentMessage).toContain('50000');
  });
});
