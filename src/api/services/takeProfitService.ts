import { ZoneAnalysisService } from '../../core/services/ZoneAnalysisService';
import { TradeType, AllowedInterval } from '../../utils/types';

export class TakeProfitService {
  private zoneAnalysisService: ZoneAnalysisService;

  constructor() {
    this.zoneAnalysisService = new ZoneAnalysisService();
  }

  public async calculateTakeProfits(symbol: string, side: TradeType, entry: number, stop: number, interval: AllowedInterval = '1h'): Promise<number[]> {
    const countDecimalPlaces = (value: number): number => {
      if (Math.floor(value) === value) return 0;
      const valueStr = value.toString();
      const decimalPart = valueStr.split('.')[1];
      return decimalPart ? decimalPart.length : 0;
    };

    const decimalPlaces = Math.max(countDecimalPlaces(entry), countDecimalPlaces(stop));

    // Ajusta o interval conforme as regras fornecidas
    let adjustedInterval = interval;

    // Calcula o alvo 1:1 (RR 1:1)
    let tp1: number;
    if (side === 'LONG') {
      tp1 = entry + (entry - stop);
    } else if (side === 'SHORT') {
      tp1 = entry - (stop - entry);
    } else {
      throw new Error('Tipo de trade inválido');
    }
    tp1 = Number(tp1.toFixed(decimalPlaces));

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
    filteredZones = filteredZones.filter(z => Number(z.price.toFixed(decimalPlaces)) !== tp1);

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
        return Number(tp.toFixed(decimalPlaces));
      });
    } else {
      // Retorna até 6 zonas como take profits, sendo o primeiro o 1:1
      const rrSteps = [2, 3, 3.5, 4, 5];
      const usedValues = new Set<number>();
      usedValues.add(tp1);
      
      takeProfits = [tp1];

      for (const rr of rrSteps) {
        let tp: number;
        if (side === 'LONG') {
          tp = entry + rr * (entry - stop);
        } else {
          tp = entry - rr * (stop - entry);
        }
        
        // Find suitable zones
        const validZones = filteredZones.filter(z => {
          if (side === 'LONG') {
            return z.price >= tp;
          } else {
            return z.price <= tp;
          }
        });

        // Try to find an unused zone
        let selectedValue: number | null = null;
        for (const zone of validZones) {
          const zonePrice = Number(zone.price.toFixed(decimalPlaces));
          if (!usedValues.has(zonePrice)) {
            selectedValue = zonePrice;
            break;
          }
        }

        // If no unused zone found, use theoretical TP
        if (selectedValue === null) {
          const theoreticalTp = Number(tp.toFixed(decimalPlaces));
          // Ensure theoretical TP is also unique (though RR steps should guarantee this mostly)
          if (!usedValues.has(theoreticalTp)) {
            selectedValue = theoreticalTp;
          } else {
             // Edge case: theoretical matches existing? (unlikely with 1, 2, 3...)
             // Just skip or keep looking? 
             // Logic: If theoretical is used, it means we have a duplicate structure somehow.
             // We can just skip or add epsilon. But simpler to just use it? 
             // If we rely on Set, we can't add it.
             // Let's assume distinct RR steps generate distinct values.
             selectedValue = theoreticalTp;
          }
        }

        if (selectedValue !== null && !usedValues.has(selectedValue)) {
            takeProfits.push(selectedValue);
            usedValues.add(selectedValue);
        }
      }
    }
    return takeProfits;
  }
} 
