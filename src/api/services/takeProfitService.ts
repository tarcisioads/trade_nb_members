import { ZoneAnalysisService } from '../../services/ZoneAnalysisService';
import { TradeType, AllowedInterval } from '../../utils/types';

export class TakeProfitService {
  private zoneAnalysisService: ZoneAnalysisService;

  constructor() {
    this.zoneAnalysisService = new ZoneAnalysisService();
  }

  public async calculateTakeProfits(symbol: string, side: TradeType, entry: number, stop: number, interval: AllowedInterval = '1h'): Promise<number[]> {
    // Ajusta o interval conforme as regras fornecidas
    let adjustedInterval = interval;
    if (interval === '1h') {
      adjustedInterval = '1d';
    } else if (interval === '15m') {
      adjustedInterval = '4h';
    } else if (interval === '5m') {
      adjustedInterval = '1h';
    }
    // Calcula o alvo 1:1 (RR 1:1)
    let tp1: number;
    if (side === 'LONG') {
      tp1 = entry + (entry - stop);
    } else if (side === 'SHORT') {
      tp1 = entry - (stop - entry);
    } else {
      throw new Error('Tipo de trade inválido');
    }
    tp1 = Number(tp1.toFixed(5));

    // Busca zonas não mitigadas usando ZoneAnalysisService
    const zones = await this.zoneAnalysisService.analyzeZones(symbol, side, entry, stop, adjustedInterval);
    // Ordena as zonas por proximidade ao entry (para o lado correto)
    let filteredZones = zones.filter(z => {
      if (side === 'LONG') return z.price >= tp1;
      if (side === 'SHORT') return z.price <= tp1;
      return false;
    });
    filteredZones = filteredZones.sort((a, b) => {
      if (side === 'LONG') return a.price - b.price;
      if (side === 'SHORT') return b.price - a.price;
      return 0;
    });
    // Remove zona igual ao 1:1 (evita duplicidade)
    filteredZones = filteredZones.filter(z => Number(z.price.toFixed(5)) !== tp1);

    let takeProfits: number[];
    if (filteredZones.length === 0) {
      const rrSteps = [1, 2, 3, 3.5, 4, 5];
      takeProfits = rrSteps.map(rr => {
        let tp: number;
        if (side === 'LONG') {
          tp = entry + rr * (entry - stop);
        } else {
          tp = entry - rr * (stop - entry);
        }
        return Number(tp.toFixed(5));
      });
    } else {
      // Retorna até 6 zonas como take profits, sendo o primeiro o 1:1
      const rrSteps = [2, 3, 3.5, 4, 5];
      const filteredTakeProfits = rrSteps.map(rr => {
        let tp: number;
        if (side === 'LONG') {
          tp = entry + rr * (entry - stop);
        } else {
          tp = entry - rr * (stop - entry);
        }
        const findZone = filteredZones.filter(z => {
          if (side === 'LONG') {
            return z.price >= tp
          } else {
            return z.price <= tp
          }
        })
        let tpValue = tp
        if (findZone.length > 0) {
          tpValue = findZone[0].price
        }
        return Number(tpValue.toFixed(5));
      });

      takeProfits = [tp1, ...filteredTakeProfits.slice(0, 5)];
    }
    return takeProfits;
  }
} 
