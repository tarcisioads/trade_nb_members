import { VolumeAnalyzer } from '../src/core/services/VolumeAnalyzer';
import { VolumeColor } from '../src/utils/types';

// Helper para mockar volumes e forçar cada cor
function mockVolumes(volumes: number[]) {
  jest.mock('../src/core/services/DataServiceManager', () => {
    return {
      DataServiceManager: jest.fn().mockImplementation(() => ({
        getKlineDataVolume: jest.fn().mockResolvedValue({
          data: volumes.map(v => ({ volume: v.toString() })),
          source: 'binance'
        })
      }))
    };
  });
}

describe('VolumeAnalyzer', () => {
  afterEach(() => {
    jest.resetModules(); // Limpa o cache do jest.mock para cada teste
  });

  it('should return BLUE when stdBar < -0.5 (Low Volume)', async () => {
    // Current volume 1 (low), history 10.
    mockVolumes([1, 10, 10, 10, 10]);
    const { VolumeAnalyzer } = await import('../src/core/services/VolumeAnalyzer');
    const analyzer = new VolumeAnalyzer();
    const result = await analyzer.analyzeVolume('BTCUSDT', '1h');
    expect(result.color).toBe(VolumeColor.BLUE);
  });

  it('should return WHITE when -0.5 <= stdBar < 1 (Normal Volume)', async () => {
    // Current 10, history 10. StdBar 0.
    // Wait, std is 0 -> NaN.
    // Need slight variation.
    // [10, 11, 9, 10, 10]. Mean 10. Std small. Current 10. StdBar 0.
    mockVolumes([10, 11, 9, 10, 10]);
    const { VolumeAnalyzer } = await import('../src/core/services/VolumeAnalyzer');
    const analyzer = new VolumeAnalyzer();
    const result = await analyzer.analyzeVolume('BTCUSDT', '1h');
    expect(result.color).toBe(VolumeColor.WHITE);
  });

  it('should return YELLOW when 1 <= stdBar < 2.5 (Medium Volume)', async () => {
    // Current 15, history 10.
    mockVolumes([15, 10, 10, 10, 10]);
    const { VolumeAnalyzer } = await import('../src/core/services/VolumeAnalyzer');
    const analyzer = new VolumeAnalyzer();
    const result = await analyzer.analyzeVolume('BTCUSDT', '1h');
    expect(result.color).toBe(VolumeColor.YELLOW);
  });

  it('should return ORANGE when 2.5 <= stdBar < 4 (High Volume)', async () => {
    // Need N >= 18 to get > 4.
    // For > 2.5, N=5 max is 1.78. So we need more samples for ORANGE too!
    // Max Z for N=10 is 9/sqrt(10) = 2.84. So N=10 is enough for ORANGE.

    // [40, 10, 10, 10, 10, 10, 10, 10, 10, 10].
    mockVolumes([40, 10, 10, 10, 10, 10, 10, 10, 10, 10]);
    const { VolumeAnalyzer } = await import('../src/core/services/VolumeAnalyzer');
    const analyzer = new VolumeAnalyzer();
    const result = await analyzer.analyzeVolume('BTCUSDT', '1h');
    expect(result.color).toBe(VolumeColor.ORANGE);
  });

  it('should return RED when stdBar >= 4 (Extra High Volume)', async () => {
    // Need N >= 18.
    // [100, 10...10].
    const volumes = [100].concat(Array(19).fill(10));
    mockVolumes(volumes);
    const { VolumeAnalyzer } = await import('../src/core/services/VolumeAnalyzer');
    const analyzer = new VolumeAnalyzer();
    const result = await analyzer.analyzeVolume('BTCUSDT', '1h');
    expect(result.color).toBe(VolumeColor.RED);
  });
}); 