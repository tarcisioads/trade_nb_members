import { DataServiceManager } from './DataServiceManager';
import { KlineData, AllowedInterval, VolumeColor, AnalyzeVolumeResult } from './utils/types';



export class VolumeAnalyzer {
  private readonly dataServiceManager: DataServiceManager;
  private readonly thresholdExtraHigh: number = 4;
  private readonly thresholdHigh: number = 2.5;
  private readonly thresholdMedium: number = 1;
  private readonly thresholdNormal: number = -0.5;

  constructor() {
    this.dataServiceManager = new DataServiceManager();
  }

  private calculateMean(volumes: number[]): number {
    return volumes.reduce((sum, volume) => sum + volume, 0) / volumes.length;
  }

  private calculateStd(volumes: number[], mean: number): number {
    const squaredDifferences = volumes.map(volume => Math.pow(volume - mean, 2));
    const variance = squaredDifferences.reduce((sum, diff) => sum + diff, 0) / volumes.length;
    return Math.sqrt(variance);
  }

  private calculateStdBar(currentVolume: number, mean: number, std: number): number {
    return (currentVolume - mean) / std;
  }

  private getVolumeColor(stdBar: number): VolumeColor {
    if (stdBar > this.thresholdExtraHigh) return VolumeColor.RED;
    if (stdBar > this.thresholdHigh) return VolumeColor.ORANGE;
    if (stdBar > this.thresholdMedium) return VolumeColor.YELLOW;
    if (stdBar > this.thresholdNormal) return VolumeColor.WHITE;
    return VolumeColor.BLUE;
  }

  public async analyzeVolume(symbol: string, interval: AllowedInterval | undefined): Promise<AnalyzeVolumeResult> {
    try {
      // Get data from either Binance or BingX using DataServiceManager
      const { data: klineData, source } = await this.dataServiceManager.getKlineDataVolume(symbol, interval);

      // Convert volumes to numbers and calculate statistics
      const volumes = klineData.map(kline => parseFloat(kline.volume))
      const currentVolume = volumes[0];
      const mean = this.calculateMean(volumes);
      const std = this.calculateStd(volumes, mean);
      const stdBar = this.calculateStdBar(currentVolume, mean, std);
      const color = this.getVolumeColor(stdBar);

      console.log(`Volume analysis for ${symbol} using ${source}:`);
      console.log(`Current Volume: ${currentVolume}`);
      console.log(`Mean: ${mean}`);
      console.log(`Std: ${std}`);
      console.log(`StdBar: ${stdBar}`);
      console.log(`Color: ${color}`);

      return {
        color,
        stdBar,
        mean,
        std,
        currentVolume
      };
    } catch (error: any) {
      console.error(`Error analyzing volume for ${symbol}:`, error);
      throw new Error(`Failed to analyze volume for ${symbol}: ${error.message}`);
    }
  }
} 
