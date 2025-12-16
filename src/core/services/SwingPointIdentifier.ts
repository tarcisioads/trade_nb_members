import { KlineData } from '../../utils/types';

export interface SwingPoint {
    type: 'SWING_HIGH' | 'SWING_LOW';
    price: number;
    candleIndex: number;
    candle: KlineData;
}

export class SwingPointIdentifier {
    /**
     * Identifies Swing Highs and Swing Lows based on pivot length.
     * A Swing High is a high greater than N highs to the left and N highs to the right.
     * A Swing Low is a low less than N lows to the left and N lows to the right.
     * @param klineData Array of KlineData (sorted by time ascending: oldest first)
     * @param pivotLength Number of neighbors to check on each side (default: 3)
     */
    public static identifySwingPoints(klineData: KlineData[], pivotLength: number = 3): SwingPoint[] {
        const swingPoints: SwingPoint[] = [];

        if (klineData.length < pivotLength * 2 + 1) {
            return [];
        }

        for (let i = pivotLength; i < klineData.length - pivotLength; i++) {
            const current = klineData[i];
            const currentHigh = parseFloat(current.high);
            const currentLow = parseFloat(current.low);

            // Check Swing High
            let isSwingHigh = true;
            for (let j = 1; j <= pivotLength; j++) {
                const left = parseFloat(klineData[i - j].high);
                const right = parseFloat(klineData[i + j].high);
                if (left > currentHigh || right > currentHigh) { // Strict inequality for left/right neighbors? Or >=? Often strict.
                    isSwingHigh = false;
                    break;
                }
            }

            if (isSwingHigh) {
                swingPoints.push({
                    type: 'SWING_HIGH',
                    price: currentHigh,
                    candleIndex: i,
                    candle: current
                });
            }

            // Check Swing Low
            let isSwingLow = true;
            for (let j = 1; j <= pivotLength; j++) {
                const left = parseFloat(klineData[i - j].low);
                const right = parseFloat(klineData[i + j].low);
                if (left < currentLow || right < currentLow) {
                    isSwingLow = false;
                    break;
                }
            }

            if (isSwingLow) {
                swingPoints.push({
                    type: 'SWING_LOW',
                    price: currentLow,
                    candleIndex: i,
                    candle: current
                });
            }
        }

        // Sort by time descending (newest first) to match Zone Analysis output
        return swingPoints.sort((a, b) => b.candle.closeTime - a.candle.closeTime);
    }
}
