import { KlineData, TradeType } from './types';

export interface Detail {
  high: number;
  low: number;
  mid: number;
}

export interface Zone {
  type: 'ORDER_BLOCK' | 'FVG';
  candleIndex: number;
  price: number;
  candle: KlineData;
  mitigated: boolean;
  mitigatedBy: KlineData | null;
  details: Detail;
}

export class OrderBlockAndFVGDetector {
  /**
   * Encontra order blocks e FVGs de 50% não mitigados na direção do side
   * @param klineData Array de KlineData (ordem: mais antigo para mais recente)
   * @param side 'LONG' ou 'SHORT'
   */
  public static findUnmitigatedZones(klineData: KlineData[], side: TradeType): Zone[] {
    // Inverter o array para trabalhar do mais antigo para o mais recente
    const reversedKlines = [...klineData].reverse();
    const fvgs: Zone[] = this.findFVGs(reversedKlines, side);
    const orderBlocks: Zone[] = this.findOrderBlocks(reversedKlines, side, fvgs);
    // Checar mitigação
    const allZones = [...orderBlocks, ...fvgs];

    for (const zone of allZones) {
      ({ mitigated: zone.mitigated, candle: zone.mitigatedBy } = this.isMitigated(reversedKlines, zone, side));
    }

    // Retornar apenas não mitigados
    const zonesNotMitigated = allZones.filter(z => !z.mitigated);

    // Ordenar do mais recente para o mais antigo usando closeTime
    const sortedZones = zonesNotMitigated.sort((a, b) => {
      const timeA = a.candle.closeTime;
      const timeB = b.candle.closeTime;
      return timeB - timeA; // Ordem decrescente (mais recente primeiro)
    });
    return sortedZones;
  }

  private static findOrderBlocks(klineData: KlineData[], side: TradeType, fvgs: Zone[]): Zone[] {
    // Nova lógica: todo candle que tiver um FVG é um order block, independente da cor
    const allOBs: Zone[] = [];
    for (const fvg of fvgs) {
      const candleIndex = fvg.candleIndex - 1;
      if (candleIndex < 0) continue;
      const candle = klineData[candleIndex];
      const obHigh = parseFloat(candle.high);
      const obLow = parseFloat(candle.low);
      const ob50 = (obLow + obHigh) / 2;
      const ob: Zone = {
        type: 'ORDER_BLOCK',
        candleIndex,
        price: ob50,
        candle,
        mitigated: false,
        mitigatedBy: null,
        details: { high: obHigh, low: obLow, mid: ob50 }
      };
      allOBs.push(ob);
    }
    // Filtrar para manter apenas o mais antigo em sequências de candleIndex consecutivos
    const filteredOBs: Zone[] = [];
    allOBs.sort((a, b) => a.candleIndex - b.candleIndex);
    for (let i = 0; i < allOBs.length; i++) {
      if (i > 0 && allOBs[i].candleIndex === allOBs[i - 1].candleIndex + 1) {
        // Se for sequência, ignore o atual
        continue;
      }
      filteredOBs.push(allOBs[i]);
    }
    return filteredOBs;
  }

  private static findFVGs(klineData: KlineData[], side: TradeType): Zone[] {
    const allFVGs: Zone[] = [];
    // Agora, 0 é o mais antigo, klineData.length-1 é o mais recente
    for (let i = 1; i < klineData.length - 1; i++) {
      const prev = klineData[i - 1];
      const curr = klineData[i];
      const next = klineData[i + 1];
      if (side === 'LONG') {
        // FVG de baixa: gap entre o fechamento anterior e a máxima da próxima
        if (parseFloat(prev.low) > parseFloat(next.high)) {
          const fvgHigh = parseFloat(prev.low);
          const fvgLow = parseFloat(next.high);
          const fvg50 = (fvgHigh + fvgLow) / 2;
          allFVGs.push({
            type: 'FVG',
            candleIndex: i,
            price: fvg50,
            candle: curr,
            mitigated: false,
            mitigatedBy: null,
            details: { high: fvgHigh, low: fvgLow, mid: fvg50 }
          });
        }
      } else {
        // FVG de alta: gap entre o fechamento anterior e a mínima da próxima
        if (parseFloat(prev.high) < parseFloat(next.low)) {
          const fvgLow = parseFloat(prev.high);
          const fvgHigh = parseFloat(next.low);
          const fvg50 = (fvgLow + fvgHigh) / 2;
          allFVGs.push({
            type: 'FVG',
            candleIndex: i,
            price: fvg50,
            candle: curr,
            mitigated: false,
            mitigatedBy: null,
            details: { high: fvgHigh, low: fvgLow, mid: fvg50 }
          });
        }
      }

    }
    const filteredFVGs: Zone[] = [];
    allFVGs.sort((a, b) => a.candleIndex - b.candleIndex);
    for (let i = 0; i < allFVGs.length; i++) {
      if (i > 0 && allFVGs[i].candleIndex === allFVGs[i - 1].candleIndex + 1) {
        // Se for sequência, ignore o atual
        allFVGs[i - 1].details.high = allFVGs[i].details.high
        allFVGs[i - 1].details.mid = (allFVGs[i - 1].details.high + allFVGs[i - 1].details.low) / 2;
        allFVGs[i - 1].price = allFVGs[i - 1].details.mid
        continue;
      }
      filteredFVGs.push(allFVGs[i]);
    }
    return filteredFVGs;
  }

  private static isMitigated(klineData: KlineData[], zone: Zone, side: TradeType): {
    mitigated: boolean,
    candle: KlineData | null
  } {
    // Check if after formation, the price touched the OB or 50% of the FVG
    const { candleIndex, price, type, details } = zone;

    // For FVGs: check if the previous candle is larger than the FVG
    if (type === 'FVG' && candleIndex > 0) {
      const previousCandle = klineData[candleIndex - 1];
      const fvgSize = details.high - details.low;
      const previousCandleSize = parseFloat(previousCandle.high) - parseFloat(previousCandle.low);

      if (previousCandleSize > fvgSize) {
        return { mitigated: true, candle: previousCandle };
      }
    }

    for (let i = candleIndex + 2; i < klineData.length; i++) {
      const candle = klineData[i];
      if (type === 'ORDER_BLOCK') {
        if ((side === 'LONG') && parseFloat(candle.high) >= details.low) return { mitigated: true, candle };
        if ((side === 'SHORT') && parseFloat(candle.low) <= details.high) return { mitigated: true, candle };
      } else if (type === 'FVG') {
        if ((side === 'LONG') && parseFloat(candle.high) >= price) return { mitigated: true, candle };
        if ((side === 'SHORT') && parseFloat(candle.low) <= price) return { mitigated: true, candle };
      }
    }
    return { mitigated: false, candle: null };
  }

  private static isBullish(candle: KlineData): boolean {
    return parseFloat(candle.close) > parseFloat(candle.open);
  }
  private static isBearish(candle: KlineData): boolean {
    return parseFloat(candle.close) < parseFloat(candle.open);
  }
}

