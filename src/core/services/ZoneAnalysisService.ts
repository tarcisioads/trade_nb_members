import { DataServiceManager } from './DataServiceManager';
import { OrderBlockAndFVGDetector } from '../../utils/OrderBlockAndFVGDetector';
import { TradeType, AllowedInterval } from '../../utils/types';

export class ZoneAnalysisService {
    private dataServiceManager: DataServiceManager;

    constructor() {
        this.dataServiceManager = new DataServiceManager();
    }

    /**
     * Analyzes unmitigated Order Block and FVG zones
     * @param symbol asset symbol
     * @param side 'LONG' or 'SHORT'
     * @param entry entry price
     * @param stop stop price
     * @param interval kline interval (optional, default '1h')
     */
    public async analyzeZones(symbol: string, side: TradeType, entry: number, stop: number, interval: AllowedInterval = '1h') {
        // Busca os dados de kline (limit 500)
        const { data: klineData } = await this.dataServiceManager.getKlineData(symbol, interval, 800)
        // Chama o detector de zonas
        const zones = OrderBlockAndFVGDetector.findUnmitigatedZones(klineData, side);
        return zones;
    }
} 