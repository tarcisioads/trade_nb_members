import { TradeOrderProcessor } from '../src/application/services/TradeOrderProcessor';
import { TradeDatabase } from '../src/infrastructure/database/TradeDatabase';
import { OrderStatusChecker } from '../src/application/services/OrderStatusChecker';
import { BingXOrderExecutor } from '../src/infrastructure/bingx/BingXOrderExecutor';
import { BingXDataService } from '../src/infrastructure/bingx/BingXDataService';
import { NotificationService } from '../src/infrastructure/telegram/NotificationService';
import { PositionValidator } from '../src/core/services/PositionValidator';

// Mocks das dependências
jest.mock('../src/infrastructure/database/TradeDatabase');
jest.mock('../src/application/services/OrderStatusChecker');
jest.mock('../src/infrastructure/bingx/BingXOrderExecutor');
jest.mock('../src/infrastructure/bingx/BingXDataService');
jest.mock('../src/infrastructure/telegram/NotificationService');
jest.mock('../src/core/services/PositionValidator');

describe('TradeOrderProcessor', () => {
  let processor: TradeOrderProcessor;
  let mockTradeDatabase: jest.Mocked<TradeDatabase>;
  let mockOrderStatusChecker: jest.Mocked<OrderStatusChecker>;
  let mockOrderExecutor: jest.Mocked<BingXOrderExecutor>;
  let mockDataService: jest.Mocked<BingXDataService>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockPositionValidator: jest.Mocked<PositionValidator>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock instances directly or use the auto-mocked class instances
    // Since we are mocking the modules, we can just instantiate them and they should be mocks
    // However, to be safe and explicit, let's cast them properly
    
    mockTradeDatabase = new TradeDatabase() as jest.Mocked<TradeDatabase>;
    // Ensure methods are mocks
    mockTradeDatabase.hasOrderDetails = jest.fn();
    mockTradeDatabase.saveOrderDetails = jest.fn();
    mockTradeDatabase.updateTradeStatus = jest.fn();
    mockTradeDatabase.getOpenTrades = jest.fn();

    mockOrderStatusChecker = new OrderStatusChecker() as jest.Mocked<OrderStatusChecker>;
    mockOrderStatusChecker.getOrderStatus = jest.fn();
    mockOrderStatusChecker.getOrderStatusWithDetails = jest.fn();

    mockOrderExecutor = new BingXOrderExecutor(mockTradeDatabase) as jest.Mocked<BingXOrderExecutor>;
    
    mockDataService = new BingXDataService() as jest.Mocked<BingXDataService>;
    
    mockNotificationService = new NotificationService() as jest.Mocked<NotificationService>;
    
    mockPositionValidator = new PositionValidator() as jest.Mocked<PositionValidator>;

    // Setup default mock implementations
    mockTradeDatabase.hasOrderDetails.mockResolvedValue(false);
    mockTradeDatabase.saveOrderDetails.mockResolvedValue(undefined);
    mockTradeDatabase.updateTradeStatus.mockResolvedValue(undefined);
    mockTradeDatabase.getOpenTrades.mockResolvedValue([]);

    mockOrderStatusChecker.getOrderStatus.mockResolvedValue({ status: 'FILLED', type: 'LIMIT' } as any);
    mockOrderStatusChecker.getOrderStatusWithDetails.mockResolvedValue({
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
    } as any);

    processor = new TradeOrderProcessor(
      mockTradeDatabase,
      mockOrderStatusChecker,
      mockOrderExecutor,
      mockDataService,
      mockNotificationService,
      mockPositionValidator
    );
  });

  it('should instantiate without errors', () => {
    expect(processor).toBeInstanceOf(TradeOrderProcessor);
  });

  it('should process a trade and call dependencies', async () => {
    const trade = {
      id: 1,
      symbol: 'BTC/USDT',
      entryOrderId: '1234567890123456',
      stopOrderId: '1234567890123457',
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

    await processor['processTrade'](trade as any);

    expect(mockOrderStatusChecker.getOrderStatus).toHaveBeenCalled();
    expect(mockOrderStatusChecker.getOrderStatusWithDetails).toHaveBeenCalled();
    expect(mockTradeDatabase.saveOrderDetails).toHaveBeenCalled();
    expect(mockTradeDatabase.updateTradeStatus).toHaveBeenCalled();
  });

  it('should skip orders with status NEW', async () => {
    mockOrderStatusChecker.getOrderStatus.mockResolvedValue({ status: 'NEW', type: 'LIMIT' } as any);

    const trade = {
      id: 2,
      symbol: 'BTC/USDT',
      entryOrderId: '1234567890123456',
      stopOrderId: '1234567890123457',
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
    await processor['processTrade'](trade as any);

    expect(mockOrderStatusChecker.getOrderStatusWithDetails).not.toHaveBeenCalled();
    expect(mockTradeDatabase.saveOrderDetails).not.toHaveBeenCalled();
  });
});