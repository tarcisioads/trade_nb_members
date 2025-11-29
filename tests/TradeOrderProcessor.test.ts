import { TradeOrderProcessor } from '../src/TradeOrderProcessor';

// Mocks das dependências
jest.mock('../src/TradeDatabase', () => ({
  TradeDatabase: jest.fn().mockImplementation(() => ({
    hasOrderDetails: jest.fn().mockResolvedValue(false),
    saveOrderDetails: jest.fn().mockResolvedValue(undefined),
    updateTradeStatus: jest.fn().mockResolvedValue(undefined)
  }))
}));

jest.mock('../src/OrderStatusChecker', () => ({
  OrderStatusChecker: jest.fn().mockImplementation(() => ({
    getOrderStatus: jest.fn().mockResolvedValue({ status: 'FILLED', type: 'LIMIT' }),
    getOrderStatusWithDetails: jest.fn().mockResolvedValue({
      status: { status: 'FILLED', type: 'LIMIT' },
      executionDetails: {
        executedQuantity: 1,
        averagePrice: 100,
        createTime: Date.now(),
        updateTime: Date.now()
      },
      isFilled: true,
      isCanceled: false,
      isOpen: false
    })
  }))
}));

describe('TradeOrderProcessor', () => {
  let processor: TradeOrderProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new TradeOrderProcessor();
  });

  it('should instantiate without errors', () => {
    expect(processor).toBeInstanceOf(TradeOrderProcessor);
  });

  it('should process a trade and call dependencies', async () => {
    const trade = {
      id: 1,
      symbol: 'BTC/USDT',
      entryOrderId: 'order1',
      stopOrderId: 'order2',
      tp1OrderId: null,
      tp2OrderId: null,
      tp3OrderId: null,
      tp4OrderId: null,
      tp5OrderId: null,
      tp6OrderId: null,
      trailingStopOrderId: null,
      entry: 100,
      stop: 90,
      tp1: 110,
      tp2: null,
      tp3: null,
      tp4: null,
      tp5: null,
      tp6: null,
      quantity: 1,
      leverage: 2,
      status: 'OPEN' as 'OPEN' | 'CLOSED',
      type: 'LONG' as 'LONG' | 'SHORT',
      volume_adds_margin: false,
      setup_description: '',
      volume_required: false
    };

    const db = require('../src/TradeDatabase').TradeDatabase.mock.instances[0];
    const checker = require('../src/OrderStatusChecker').OrderStatusChecker.mock.instances[0];

    await processor['processTrade'](trade);

    expect(checker.getOrderStatus).toHaveBeenCalled();
    expect(checker.getOrderStatusWithDetails).toHaveBeenCalled();
    expect(db.saveOrderDetails).toHaveBeenCalled();
    expect(db.updateTradeStatus).toHaveBeenCalled();
  });

  it('should skip orders with status NEW', async () => {
    const checker = require('../src/OrderStatusChecker').OrderStatusChecker.mock.instances[0];
    checker.getOrderStatus.mockResolvedValue({ status: 'NEW', type: 'LIMIT' });

    const trade = {
      id: 2,
      symbol: 'BTC/USDT',
      entryOrderId: 'order1',
      stopOrderId: 'order2',
      tp1OrderId: null,
      tp2OrderId: null,
      tp3OrderId: null,
      tp4OrderId: null,
      tp5OrderId: null,
      tp6OrderId: null,
      trailingStopOrderId: null,
      entry: 100,
      stop: 90,
      tp1: 110,
      tp2: null,
      tp3: null,
      tp4: null,
      tp5: null,
      tp6: null,
      quantity: 1,
      leverage: 2,
      status: 'OPEN' as 'OPEN' | 'CLOSED',
      type: 'LONG' as 'LONG' | 'SHORT',
      volume_adds_margin: false,
      setup_description: '',
      volume_required: false
    };

    // Não deve chamar getOrderStatusWithDetails nem saveOrderDetails
    const db = require('../src/TradeDatabase').TradeDatabase.mock.instances[0];
    await processor['processTrade'](trade);

    expect(checker.getOrderStatusWithDetails).not.toHaveBeenCalled();
    expect(db.saveOrderDetails).not.toHaveBeenCalled();
  });
}); 