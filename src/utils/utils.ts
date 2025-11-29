import { Trade, SentimentResult, VolumeColor } from './types';

export function isVolumeValid(color: string | null | undefined): boolean {
  return color === VolumeColor.YELLOW ||
    color === VolumeColor.ORANGE ||
    color === VolumeColor.RED;
}

export function isSentimentValid(trade: Trade, sentimentService: SentimentResult): boolean {
  return ((sentimentService.sentiment != 'Bearish' && trade.type == 'LONG') || (sentimentService.sentiment != 'Bullish' && trade.type == 'SHORT'));
}



