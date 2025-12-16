import { DataServiceManager } from './DataServiceManager';
import { OrderBlockAndFVGDetector, Zone } from '../../utils/OrderBlockAndFVGDetector';
import { TradeType, AllowedInterval } from '../../utils/types';
import { SwingPointIdentifier, SwingPoint } from './SwingPointIdentifier';

export class ZoneAnalysisService {
    private dataServiceManager: DataServiceManager;

    constructor() {
        this.dataServiceManager = new DataServiceManager();
    }

    /**
     * Analyzes unmitigated Order Block and FVG zones, and relevant Swing Points
     * @param symbol asset symbol
     * @param side 'LONG' or 'SHORT'
     * @param entry entry price
     * @param stop stop price
     * @param interval kline interval (optional, default '1h')
     */
    public async analyzeZones(symbol: string, side: TradeType, entry: number, stop: number, interval: AllowedInterval = '1h') {
        // Busca os dados de kline (limit 500)
        const { data: klineData } = await this.dataServiceManager.getKlineData(symbol, interval, 800)
        
        // Chama o detector de zonas (espera Descending: Newest -> Oldest)
        const zones = OrderBlockAndFVGDetector.findUnmitigatedZones(klineData, side);

        // Prepara dados para Swing Points (espera Ascending: Oldest -> Newest)
        const ascendingKlines = [...klineData].reverse();
        const swingPoints = SwingPointIdentifier.identifySwingPoints(ascendingKlines);

        // Combine and deduplicate by price (rounded to 4 decimals)
        const combined = [...zones, ...swingPoints];
        const unique: (Zone | SwingPoint)[] = [];
        const seenPrices = new Set<string>();

        // Prioritize Zones (OB/FVG) over Swing Points if prices are close?
        // Or just order by some criteria?
        // Let's preserve the order of preference: Zones first, then Swing Points.
        // But we want to filter based on price proximity? 
        // "nao retornar valores iguais" -> exact match?
        
        for (const item of combined) {
            const price = item.price;
            const key = price.toFixed(4); // Adjust precision as needed
            if (!seenPrices.has(key)) {
                seenPrices.add(key);
                unique.push(item);
            }
        }

        // Sort combined result by price? Or by time?
        // User didn't specify. Usually sorted by proximity to current price or time.
        // Zones are sorted by time (newest first). SwingPoints are sorted by time (newest first).
        // Let's sort by time descending (candleIndex or closeTime).
        // Zone has candleIndex (relative to Ascending array? No, `OrderBlockAndFVGDetector` uses index from reversed array? Let's check).
        
        // Zone.candleIndex comes from `i` in loop over `reversedKlines` (Ascending).
        // So candleIndex 0 is Oldest.
        
        // SwingPoint.candleIndex comes from loop over `klineData` (passed as Ascending).
        // So candleIndex 0 is Oldest.
        
        // So both use Ascending index.
        // We can sort by candleIndex descending (Newest first).
        
        unique.sort((a, b) => b.candleIndex - a.candleIndex);

        return unique;
    }
} 