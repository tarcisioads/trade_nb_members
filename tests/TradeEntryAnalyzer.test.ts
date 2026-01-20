import { TradeEntryAnalyzer } from '../src/core/services/TradeEntryAnalyzer';
import { TradeType } from '../src/utils/types';
import { DataServiceManager } from '../src/core/services/DataServiceManager';
import { KlineData } from '../src/utils/types';

// Mock DataServiceManager
jest.mock('../src/core/services/DataServiceManager');

describe('TradeEntryAnalyzer', () => {
  let analyzer: TradeEntryAnalyzer;
  let mockDataServiceManager: jest.Mocked<DataServiceManager>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Create a new instance of the analyzer
    analyzer = new TradeEntryAnalyzer();

    // Get the mocked instance - access the mock from the class constructor
    const MockDataServiceManager = DataServiceManager as jest.MockedClass<typeof DataServiceManager>;
    // The constructor is called inside TradeEntryAnalyzer, so we need to access the instance that was created
    mockDataServiceManager = MockDataServiceManager.mock.instances[0] as jest.Mocked<DataServiceManager>;
    
    // If instance is undefined (which shouldn't happen if constructor calls new DataServiceManager),
    // we might need to verify the mock setup.
    // For now, let's assume it works or handle the case where it doesn't.
    if (!mockDataServiceManager) {
        // Fallback or force creation if needed, though this indicates the mock didn't work as expected
        console.warn('Mock DataServiceManager instance not found!');
        // Manually assigning a mock object to the private property if possible (using any)
        mockDataServiceManager = {
            getKlineData: jest.fn(),
            get24hrStats: jest.fn(),
        } as unknown as jest.Mocked<DataServiceManager>;
        (analyzer as any).dataServiceManager = mockDataServiceManager;
    }
  });

  describe('hasClosePriceBeforeEntry', () => {
    it('should return true for LONG if any previous close is less than entry', () => {
      const klineData: KlineData[] = [
        { close: '105', closeTime: 3, high: '106', low: '104', open: '104', openTime: 2, volume: '1000', quoteAssetVolume: '1000', numberOfTrades: 100, takerBuyBaseAssetVolume: '500', takerBuyQuoteAssetVolume: '500' },
        { close: '100', closeTime: 2, high: '101', low: '99', open: '99', openTime: 1, volume: '1000', quoteAssetVolume: '1000', numberOfTrades: 100, takerBuyBaseAssetVolume: '500', takerBuyQuoteAssetVolume: '500' },
        { close: '99', closeTime: 1, high: '100', low: '98', open: '98', openTime: 0, volume: '1000', quoteAssetVolume: '1000', numberOfTrades: 100, takerBuyBaseAssetVolume: '500', takerBuyQuoteAssetVolume: '500' }, // < entry
      ];
      expect(analyzer['hasClosePriceBeforeEntry'](klineData, 100, 'LONG')).toBe(true);
    });

    it('should return false for LONG if all previous closes are greater than or equal to entry', () => {
      const klineData: KlineData[] = [
        { close: '105', closeTime: 3, high: '106', low: '104', open: '104', openTime: 2, volume: '1000', quoteAssetVolume: '1000', numberOfTrades: 100, takerBuyBaseAssetVolume: '500', takerBuyQuoteAssetVolume: '500' },
        { close: '102', closeTime: 2, high: '103', low: '101', open: '101', openTime: 1, volume: '1000', quoteAssetVolume: '1000', numberOfTrades: 100, takerBuyBaseAssetVolume: '500', takerBuyQuoteAssetVolume: '500' },
        { close: '101', closeTime: 1, high: '102', low: '100', open: '100', openTime: 0, volume: '1000', quoteAssetVolume: '1000', numberOfTrades: 100, takerBuyBaseAssetVolume: '500', takerBuyQuoteAssetVolume: '500' },
      ];
      expect(analyzer['hasClosePriceBeforeEntry'](klineData, 100, 'LONG')).toBe(false);
    });

    it('should return true for SHORT if any previous close is greater than entry', () => {
      const klineData: KlineData[] = [
        { close: '95', closeTime: 3, high: '96', low: '94', open: '94', openTime: 2, volume: '1000', quoteAssetVolume: '1000', numberOfTrades: 100, takerBuyBaseAssetVolume: '500', takerBuyQuoteAssetVolume: '500' },
        { close: '100', closeTime: 2, high: '101', low: '99', open: '99', openTime: 1, volume: '1000', quoteAssetVolume: '1000', numberOfTrades: 100, takerBuyBaseAssetVolume: '500', takerBuyQuoteAssetVolume: '500' },
        { close: '101', closeTime: 1, high: '102', low: '100', open: '100', openTime: 0, volume: '1000', quoteAssetVolume: '1000', numberOfTrades: 100, takerBuyBaseAssetVolume: '500', takerBuyQuoteAssetVolume: '500' }, // > entry
      ];
      expect(analyzer['hasClosePriceBeforeEntry'](klineData, 100, 'SHORT')).toBe(true);
    });

    it('should return false for SHORT if all previous closes are less than or equal to entry', () => {
      const klineData: KlineData[] = [
        { close: '95', closeTime: 3, high: '96', low: '94', open: '94', openTime: 2, volume: '1000', quoteAssetVolume: '1000', numberOfTrades: 100, takerBuyBaseAssetVolume: '500', takerBuyQuoteAssetVolume: '500' },
        { close: '98', closeTime: 2, high: '99', low: '97', open: '97', openTime: 1, volume: '1000', quoteAssetVolume: '1000', numberOfTrades: 100, takerBuyBaseAssetVolume: '500', takerBuyQuoteAssetVolume: '500' },
        { close: '99', closeTime: 1, high: '100', low: '98', open: '98', openTime: 0, volume: '1000', quoteAssetVolume: '1000', numberOfTrades: 100, takerBuyBaseAssetVolume: '500', takerBuyQuoteAssetVolume: '500' },
      ];
      expect(analyzer['hasClosePriceBeforeEntry'](klineData, 100, 'SHORT')).toBe(false);
    });
  });

  describe('analyzeEntry', () => {
    it('should return correct analysis for LONG entry', async () => {
      const mockKlineData: KlineData[] = [
        { close: '101', closeTime: 3, high: '103', low: '100', open: '100', openTime: 2, volume: '1000', quoteAssetVolume: '1000', numberOfTrades: 100, takerBuyBaseAssetVolume: '500', takerBuyQuoteAssetVolume: '500' },
        { close: '100', closeTime: 2, high: '103', low: '99', open: '99', openTime: 1, volume: '1000', quoteAssetVolume: '1000', numberOfTrades: 100, takerBuyBaseAssetVolume: '500', takerBuyQuoteAssetVolume: '500' },
        { close: '99', closeTime: 1, high: '100', low: '98', open: '98', openTime: 0, volume: '1000', quoteAssetVolume: '1000', numberOfTrades: 100, takerBuyBaseAssetVolume: '500', takerBuyQuoteAssetVolume: '500' },
      ];

      mockDataServiceManager.getKlineData.mockResolvedValue({ data: mockKlineData, source: 'binance' });

      const result = await analyzer.analyzeEntry({
        symbol: 'BTCUSDT',
        type: 'LONG',
        entry: 100,
        stop: 95,
        tp1: 110,
        tp2: null,
        tp3: null,
        tp4: null,
        tp5: null,
        tp6: null,
        volume_adds_margin: false,
        setup_description: '',
        volume_required: false
      } as any);

      expect(result.canEnter).toBe(true);
      expect(result.currentClose).toBe(101);
      expect(result.hasClosePriceBeforeEntry).toBe(true);
      expect(result.message).toContain('Entry condition met');
    });

    it('should return correct analysis for SHORT entry', async () => {
      const mockKlineData: KlineData[] = [
        { close: '99', closeTime: 3, high: '100', low: '97', open: '100', openTime: 2, volume: '1000', quoteAssetVolume: '1000', numberOfTrades: 100, takerBuyBaseAssetVolume: '500', takerBuyQuoteAssetVolume: '500' },
        { close: '100', closeTime: 2, high: '101', low: '99', open: '99', openTime: 1, volume: '1000', quoteAssetVolume: '1000', numberOfTrades: 100, takerBuyBaseAssetVolume: '500', takerBuyQuoteAssetVolume: '500' },
        { close: '101', closeTime: 1, high: '102', low: '100', open: '100', openTime: 0, volume: '1000', quoteAssetVolume: '1000', numberOfTrades: 100, takerBuyBaseAssetVolume: '500', takerBuyQuoteAssetVolume: '500' },
      ];

      mockDataServiceManager.getKlineData.mockResolvedValue({ data: mockKlineData, source: 'binance' });

      const result = await analyzer.analyzeEntry({
        symbol: 'BTCUSDT',
        type: 'SHORT',
        entry: 100,
        stop: 105,
        tp1: 90,
        tp2: null,
        tp3: null,
        tp4: null,
        tp5: null,
        tp6: null,
        volume_adds_margin: false,
        setup_description: '',
        volume_required: false
      } as any);

      expect(result.canEnter).toBe(true);
      expect(result.currentClose).toBe(99);
      expect(result.hasClosePriceBeforeEntry).toBe(true);
      expect(result.message).toContain('Entry condition met');
    });
  });
}); 