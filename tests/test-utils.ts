import { TradeDatabase } from '../src/infrastructure/database/TradeDatabase';
import { TelegramService } from '../src/infrastructure/telegram/TelegramService';

/**
 * Creates a TradeDatabase instance using an in-memory SQLite database for testing.
 */
export async function createTestDatabase(): Promise<TradeDatabase> {
  const db = new TradeDatabase(':memory:');
  // Wait a bit for initialization as it's async in the constructor
  await new Promise(resolve => setTimeout(resolve, 100));
  return db;
}

/**
 * Mock instance of TelegramService
 */
export const createMockTelegramService = () => {
  return {
    sendTradeNotification: jest.fn().mockResolvedValue(undefined),
    sendCustomMessage: jest.fn().mockResolvedValue(undefined),
    isConfigured: jest.fn().mockReturnValue(true)
  } as any;
};

/**
 * Mock instance of NotificationService
 */
export const createMockNotificationService = () => {
  return {
    sendTradeNotification: jest.fn().mockResolvedValue(undefined),
    sendCustomTelegramMessage: jest.fn().mockResolvedValue(undefined)
  } as any;
};
