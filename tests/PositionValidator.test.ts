import { PositionValidator } from '../src/core/services/PositionValidator';
import { BingXApiClient } from '../src/infrastructure/bingx/BingXApiClient';

jest.mock('../src/infrastructure/bingx/BingXApiClient');

describe('PositionValidator', () => {
  let validator: PositionValidator;
  let mockApiClient: jest.Mocked<BingXApiClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    validator = new PositionValidator();
    mockApiClient = (validator as any).apiClient;
  });

  it('should return true when an open position exists', async () => {
    mockApiClient.get.mockResolvedValue({
      code: 0,
      data: [
        {
          symbol: 'BTC-USDT',
          positionSide: 'LONG',
          positionAmt: '0.1',
          avgPrice: '50000',
          markPrice: '51000',
          unRealizedProfit: '100',
          liquidationPrice: '40000',
          leverage: '10'
        }
      ]
    });

    const result = await validator.hasOpenPosition('BTCUSDT', 'LONG');

    expect(result.hasPosition).toBe(true);
    expect(result.position).toBeDefined();
    expect(result.message).toContain('Found open LONG position');
  });

  it('should return false when no open position exists', async () => {
    mockApiClient.get.mockResolvedValue({
      code: 0,
      data: []
    });

    const result = await validator.hasOpenPosition('BTCUSDT', 'LONG');

    expect(result.hasPosition).toBe(false);
    expect(result.message).toContain('No open LONG position found');
  });

  it('should return position details correctly', async () => {
    mockApiClient.get.mockResolvedValue({
      code: 0,
      data: [
        {
          symbol: 'BTC-USDT',
          positionSide: 'LONG',
          positionAmt: '0.1',
          avgPrice: '50000',
          markPrice: '51000',
          unRealizedProfit: '100',
          liquidationPrice: '40000',
          leverage: '10'
        }
      ]
    });

    const result = await validator.getPositionDetails('BTCUSDT', 'LONG');

    expect(result.hasPosition).toBe(true);
    expect(result.details).toEqual({
      entryPrice: 50000,
      markPrice: 51000,
      unrealizedPnL: 100,
      liquidationPrice: 40000,
      leverage: 10,
      positionAmount: 0.1
    });
  });

  it('should throw error when API returns error code', async () => {
    mockApiClient.get.mockResolvedValue({
      code: 100001,
      msg: 'Invalid API Key'
    });

    await expect(validator.getPositions('BTCUSDT')).rejects.toThrow('API returned non-zero code: 100001');
  });
});
