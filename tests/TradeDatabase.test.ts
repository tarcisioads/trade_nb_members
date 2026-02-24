import { createTestDatabase } from './test-utils';
import { Trade } from '../src/utils/types';

describe('TradeDatabase', () => {
  let db: any;

  beforeEach(async () => {
    db = await createTestDatabase();
  });

  afterEach(async () => {
    if (db && db.db) {
      await db.db.close();
    }
  });

  it('should save and retrieve a trade', async () => {
    const trade: Trade = {
      symbol: 'BTCUSDT',
      type: 'LONG',
      interval: '1h',
      entry: 50000,
      stop: 48000,
      tp1: 52000,
      tp2: null,
      tp3: null,
      tp4: null,
      tp5: null,
      tp6: null,
      volume_adds_margin: false,
      volume_required: false,
      setup_description: 'Test Setup'
    };

    const orders = {
      entryOrder: { data: { order: { orderId: 'entry_1' } } } as any,
      stopOrder: { data: { order: { orderId: 'stop_1' } } } as any,
      tpOrders: [{ data: { order: { orderId: 'tp_1' } } } as any]
    };

    const savedTrade = await db.saveTrade(trade, orders, 0.1, 10);
    
    expect(savedTrade).toBeDefined();
    expect(savedTrade.symbol).toBe('BTCUSDT');
    expect(savedTrade.entryOrderId).toBe('entry_1');
    expect(savedTrade.status).toBe('OPEN');
  });

  it('should update trade status', async () => {
    const trade: Trade = {
      symbol: 'ETHUSDT',
      type: 'SHORT',
      interval: '1h',
      entry: 3000,
      stop: 3100,
      tp1: 2800,
      tp2: null,
      tp3: null,
      tp4: null,
      tp5: null,
      tp6: null,
      volume_adds_margin: false,
      volume_required: false,
      setup_description: null
    };

    const orders = {
      entryOrder: { data: { order: { orderId: 'entry_2' } } } as any,
      stopOrder: { data: { order: { orderId: 'stop_2' } } } as any,
      tpOrders: []
    };

    const savedTrade = await db.saveTrade(trade, orders, 1, 5);
    await db.updateTradeStatus(savedTrade.id, 'CLOSED');
    
    const updatedTrade = await db.getTradeById(savedTrade.id);
    expect(updatedTrade.status).toBe('CLOSED');
  });

  it('should return open trades only when requested', async () => {
    const trade: Trade = {
      symbol: 'SOLUSDT',
      type: 'LONG',
      interval: '1h',
      entry: 100,
      stop: 90,
      tp1: 110,
      tp2: null,
      tp3: null,
      tp4: null,
      tp5: null,
      tp6: null,
      volume_adds_margin: false,
      volume_required: false,
      setup_description: null
    };
    const orders: any = {
        entryOrder: { data: { order: { orderId: 'e' } } },
        stopOrder: { data: { order: { orderId: 's' } } },
        tpOrders: []
    };

    await db.saveTrade(trade, orders, 1, 10);
    const openTrades = await db.getOpenTrades();
    expect(openTrades.length).toBe(1);
  });
});
