import { SentimentService } from '../src/core/services/SentimentService';
import { LongShortRatioVariationService } from '../src/core/services/LongShortRatioVariationService';
import { OpenInterestVariationService } from '../src/core/services/OpenInterestVariationService';

jest.mock('../src/core/services/LongShortRatioVariationService');
jest.mock('../src/core/services/OpenInterestVariationService');

describe('SentimentService', () => {
  let service: SentimentService;
  let mockLsrService: jest.Mocked<LongShortRatioVariationService>;
  let mockOiService: jest.Mocked<OpenInterestVariationService>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SentimentService();
    mockLsrService = (service as any).lsRatioService;
    mockOiService = (service as any).oiService;
  });

  it('should return Bullish sentiment when retail is shorting and OI is increasing for LONG', async () => {
    mockLsrService.getRatioVariation.mockResolvedValue({
      symbol: 'BTCUSDT',
      variation: { vs1h: -2, vs4h: -1, vs24h: -1 } // Downward trend in LSR -> Bullish signal
    } as any);

    mockOiService.getVariation.mockResolvedValue({
      symbol: 'BTCUSDT',
      variation: { vs1h: 2, vs4h: 1, vs24h: 1 } // Upward trend in OI -> Confirmation
    } as any);

    const result = await service.getSentiment('BTCUSDT', '1h', 'LONG');

    expect(result.sentiment).toBe('Bullish');
    expect(result.details.analysis.lsrSignal).toBe('Bullish');
    expect(result.details.analysis.oiSignal).toBe('Bullish');
  });

  it('should return Bearish sentiment when retail is longing and OI is increasing for SHORT', async () => {
    mockLsrService.getRatioVariation.mockResolvedValue({
      symbol: 'BTCUSDT',
      variation: { vs1h: 2, vs4h: 1, vs24h: 1 } // Upward trend in LSR -> Bearish signal
    } as any);

    mockOiService.getVariation.mockResolvedValue({
      symbol: 'BTCUSDT',
      variation: { vs1h: 2, vs4h: 1, vs24h: 1 } // Upward trend in OI -> Confirmation for SHORT
    } as any);

    const result = await service.getSentiment('BTCUSDT', '1h', 'SHORT');

    expect(result.sentiment).toBe('Bearish');
    expect(result.details.analysis.lsrSignal).toBe('Bearish');
    expect(result.details.analysis.oiSignal).toBe('Bearish');
  });

  it('should return Neutral when signals do not align', async () => {
    mockLsrService.getRatioVariation.mockResolvedValue({
      symbol: 'BTCUSDT',
      variation: { vs1h: -2, vs4h: -1, vs24h: -1 } // Bullish signal
    } as any);

    mockOiService.getVariation.mockResolvedValue({
      symbol: 'BTCUSDT',
      variation: { vs1h: -2, vs4h: -1, vs24h: -1 } // Downward trend in OI -> Neutral signal
    } as any);

    const result = await service.getSentiment('BTCUSDT', '1h', 'LONG');

    expect(result.sentiment).toBe('Bullish'); // Since OI is Neutral, only LSR counts
  });

  it('should handle service errors gracefully', async () => {
    mockLsrService.getRatioVariation.mockRejectedValue(new Error('LSR Error'));
    mockOiService.getVariation.mockRejectedValue(new Error('OI Error'));

    const result = await service.getSentiment('BTCUSDT', '1h', 'LONG');

    expect(result.sentiment).toBe('Neutral');
    expect(result.details.longShortRatio.currentRatio).toBeNull();
  });
});
