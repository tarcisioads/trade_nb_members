import { TradeDatabase } from '../../TradeDatabase';
import { DatabasePositionHistoryService } from '../../services/DatabasePositionHistoryService';
import * as fs from 'fs';
import * as path from 'path';
import { TradeRecord, PositionHistory, TradeInfo } from '../../utils/types';
import e from 'express';

export class PositionHistoryService {
  private tradeDatabase: TradeDatabase;
  private dbService: DatabasePositionHistoryService;

  constructor(dbService?: DatabasePositionHistoryService, tradeDatabase?: TradeDatabase) {
    this.dbService = dbService || new DatabasePositionHistoryService();
    this.tradeDatabase = tradeDatabase || new TradeDatabase();
  }

  public async getPositionHistory(symbol: string, startTs?: number, endTs?: number, page: number = 1, pageSize: number = 100000): Promise<PositionHistory[]> {
    return this.dbService.getPositionHistory(symbol, startTs, endTs, page, pageSize);
  }

  public async getAllTrades(): Promise<TradeRecord[]> {
    return this.tradeDatabase.getAllTrades();
  }

  /**
   * Denormalizes a symbol from BingX format (e.g., "BTC-USDT") to original format (e.g., "BTCUSDT")
   */
  public denormalizeSymbolBingX(symbol: string): string {
    if (symbol === 'ALL') {
      return symbol;
    }
    // Remove the dash and convert to uppercase
    return symbol.replace('-', '').toUpperCase();
  }

  public async enrichPositionsWithTradeInfo(positions: PositionHistory[]): Promise<any[]> {
    const enrichedPositions = [];
    for (const position of positions) {
      const tradeInfo = await this.findTradeForPosition(position);
      enrichedPositions.push({
        ...position,
        tradeInfo
      });
    }
    return enrichedPositions;
  }

  public async findTradeForPosition(position: PositionHistory): Promise<TradeInfo> {
    try {
      const denormalizedPositionSymbol = this.denormalizeSymbolBingX(position.symbol);
      const positionOpenTime = new Date(position.openTime);
      const timeWindow = 10 * 60 * 1000; // 10 minutos em ms
      const startTime = new Date(positionOpenTime.getTime() - timeWindow);
      const endTime = new Date(positionOpenTime.getTime() + timeWindow);
      const allTrades = await this.tradeDatabase.getAllTrades();

      if (position.positionId) {
        const matchingTrades = allTrades.filter((trade: any) => {
          return trade.positionId === position.positionId;
        });
        if (matchingTrades.length > 0) {
          let bestMatch = matchingTrades[0];
          let smallestTimeDiff = Math.abs(new Date(bestMatch.createdAt).getTime() - positionOpenTime.getTime());
          for (const trade of matchingTrades) {
            const timeDiff = Math.abs(new Date(trade.createdAt).getTime() - positionOpenTime.getTime());
            if (timeDiff < smallestTimeDiff) {
              smallestTimeDiff = timeDiff;
              bestMatch = trade;
            }
          }
          return {
            found: true,
            source: 'trade',
            trade: bestMatch as TradeRecord,
            timeDifference: Math.round(smallestTimeDiff / 1000 / 60),
            message: `Found matching trade (ID: ${bestMatch.id}) created ${Math.round(smallestTimeDiff / 1000 / 60)} minutes ${new Date(bestMatch.createdAt) < positionOpenTime ? 'before' : 'after'} position opening`,
            error: null
          };
        }
      }

      const matchingTrades = allTrades.filter((trade: any) => {
        const tradeType = trade.type;
        const positionSide = position.positionSide;
        if (trade.symbol !== denormalizedPositionSymbol) return false;
        if (tradeType !== positionSide) return false;
        const tradeCreatedAt = new Date(trade.createdAt);
        return tradeCreatedAt >= startTime && tradeCreatedAt <= endTime;
      });
      if (matchingTrades.length > 0) {
        let bestMatch = matchingTrades[0];
        let smallestTimeDiff = Math.abs(new Date(bestMatch.createdAt).getTime() - positionOpenTime.getTime());
        for (const trade of matchingTrades) {
          const timeDiff = Math.abs(new Date(trade.createdAt).getTime() - positionOpenTime.getTime());
          if (timeDiff < smallestTimeDiff) {
            smallestTimeDiff = timeDiff;
            bestMatch = trade;
          }
        }
        return {
          found: true,
          source: 'trade',
          trade: bestMatch as TradeRecord,
          timeDifference: Math.round(smallestTimeDiff / 1000 / 60),
          message: `Found matching trade (ID: ${bestMatch.id}) created ${Math.round(smallestTimeDiff / 1000 / 60)} minutes ${new Date(bestMatch.createdAt) < positionOpenTime ? 'before' : 'after'} position opening`,
          error: null
        };
      }

      const matchingTradesBefore = allTrades.filter((trade: any) => {
        const tradeType = trade.type;
        const positionSide = position.positionSide;
        if (trade.symbol !== denormalizedPositionSymbol) return false;
        if (tradeType !== positionSide) return false;
        const tradeCreatedAt = new Date(trade.createdAt);
        return tradeCreatedAt <= endTime;
      });
      if (matchingTradesBefore.length > 0) {
        let bestMatch = matchingTradesBefore[0];
        let smallestTimeDiff = Math.abs(new Date(bestMatch.createdAt).getTime() - positionOpenTime.getTime());
        for (const trade of matchingTradesBefore) {
          const timeDiff = Math.abs(new Date(trade.createdAt).getTime() - positionOpenTime.getTime());
          if (timeDiff < smallestTimeDiff) {
            smallestTimeDiff = timeDiff;
            bestMatch = trade;
          }
        }
        return {
          found: true,
          source: 'trade',
          trade: bestMatch as TradeRecord,
          timeDifference: Math.round(smallestTimeDiff / 1000 / 60),
          message: `Found matching trade (ID: ${bestMatch.id}) created ${Math.round(smallestTimeDiff / 1000 / 60)} minutes ${new Date(bestMatch.createdAt) < positionOpenTime ? 'before' : 'after'} position opening`,
          error: null
        };
      }

      const matchingTradesALL = allTrades.filter((trade: any) => {
        const tradeType = trade.type;
        const positionSide = position.positionSide;
        if (trade.symbol !== denormalizedPositionSymbol) return false;
        if (tradeType !== positionSide) return false;
        return true;
      });
      if (matchingTradesALL.length > 0) {
        let bestMatch = matchingTradesALL[0];
        let smallestTimeDiff = Math.abs(new Date(bestMatch.createdAt).getTime() - positionOpenTime.getTime());
        for (const trade of matchingTradesALL) {
          const timeDiff = Math.abs(new Date(trade.createdAt).getTime() - positionOpenTime.getTime());
          if (timeDiff < smallestTimeDiff) {
            smallestTimeDiff = timeDiff;
            bestMatch = trade;
          }
        }
        return {
          found: true,
          source: 'trade',
          trade: bestMatch as TradeRecord,
          timeDifference: Math.round(smallestTimeDiff / 1000 / 60),
          message: `Found matching trade (ID: ${bestMatch.id}) created ${Math.round(smallestTimeDiff / 1000 / 60)} minutes ${new Date(bestMatch.createdAt) < positionOpenTime ? 'before' : 'after'} position opening`,
          error: null
        };
      }

      const tradesJsonPath = path.join(__dirname, '../../../data/trades.json');
      if (!fs.existsSync(tradesJsonPath)) {
        return {
          found: false,
          source: null,
          trade: null,
          timeDifference: null,
          message: 'No matching trade found for this position and trades.json file not found',
          error: null
        };
      }
      const tradesJsonContent = fs.readFileSync(tradesJsonPath, 'utf8');
      const tradesFromJson = JSON.parse(tradesJsonContent);
      const matchingTradesFromJson = tradesFromJson.filter((trade: any) => {
        const tradeType = trade.type;
        const positionSide = position.positionSide;
        if (trade.symbol !== denormalizedPositionSymbol) return false;
        if (tradeType !== positionSide) return false;
        if (!trade.setup_description || trade.setup_description.trim() === '') return false;
        return true;
      });
      if (matchingTradesFromJson.length === 0) {
        return {
          found: false,
          source: null,
          trade: null,
          timeDifference: null,
          message: 'No matching trade or setup found for this position',
          error: null
        };
      }
      const bestTradeFromJson = matchingTradesFromJson[0];
      // Preencher todos os campos obrigatórios de TradeRecord
      const tradeRecordFromJson: TradeRecord = {
        id: 0,
        symbol: bestTradeFromJson.symbol,
        type: bestTradeFromJson.type,
        entry: bestTradeFromJson.entry,
        stop: bestTradeFromJson.stop,
        tp1: bestTradeFromJson.tp1,
        tp2: bestTradeFromJson.tp2 ?? null,
        tp3: bestTradeFromJson.tp3 ?? null,
        tp4: bestTradeFromJson.tp4 ?? null,
        tp5: bestTradeFromJson.tp5 ?? null,
        tp6: bestTradeFromJson.tp6 ?? null,
        quantity: 0,
        leverage: 1,
        status: 'CLOSED',
        setup_description: bestTradeFromJson.setup_description ?? '',
        interval: bestTradeFromJson.interval ?? null,
        url_analysis: bestTradeFromJson.url_analysis ?? null,
        volume_required: bestTradeFromJson.volume_required ?? false,
        volume_adds_margin: bestTradeFromJson.volume_adds_margin ?? false,
        createdAt: new Date().toString(),
        updatedAt: new Date().toString(),
        entryOrderId: '',
        stopOrderId: '',
        tp1OrderId: null,
        tp2OrderId: null,
        tp3OrderId: null,
        tp4OrderId: null,
        tp5OrderId: null,
        tp6OrderId: null,
        trailingStopOrderId: null,
        positionId: bestTradeFromJson.positionId ?? null
      };
      return {
        found: true,
        source: 'trades.json',
        trade: tradeRecordFromJson,
        timeDifference: null,
        message: `Found matching trade setup from trades.json`,
        error: null
      };
    } catch (error) {
      console.error('[findTradeForPosition] Error finding trade for position:', error);
      return {
        found: false,
        source: null,
        trade: null,
        timeDifference: null,
        message: 'Error occurred while searching for matching trade',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  public async savePositionHistory(positions: PositionHistory[]): Promise<void> {
    return this.dbService.savePositionHistory(positions);
  }

  public calculateStats(positions: PositionHistory[]): any {
    if (positions.length === 0) {
      return {
        totalPositions: 0,
        totalProfit: 0,
        totalLoss: 0,
        netProfit: 0,
        winRate: 0,
        avgProfit: 0,
        avgLoss: 0,
        maxProfit: 0,
        maxLoss: 0,
        profitBySymbol: {},
        profitBySide: { LONG: 0, SHORT: 0 },
        // Novas estatísticas baseadas no trade
        riskMetrics: {
          totalRisk: 0,
          avgRiskPerTrade: 0,
          maxRiskPerTrade: 0,
          riskRewardRatio: 0,
          avgRiskRewardRatio: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          avgDrawdown: 0,
          consecutiveWins: 0,
          consecutiveLosses: 0,
          maxConsecutiveWins: 0,
          maxConsecutiveLosses: 0
        },
        tradeMetrics: {
          totalTradesWithInfo: 0,
          avgEntryPrice: 0,
          avgStopPrice: 0,
          avgTakeProfit1: 0,
          avgLeverage: 0,
          avgQuantity: 0,
          mostProfitableSymbol: '',
          mostProfitableSide: '',
          bestTradeId: null,
          worstTradeId: null
        }
      };
    }

    let totalProfit = 0;
    let totalLoss = 0;
    let winningTrades = 0;
    let losingTrades = 0;
    const profitBySymbol: { [key: string]: number } = {};
    const profitBySide: { [key: string]: number } = { LONG: 0, SHORT: 0 };

    // Arrays para cálculos de risco
    const profits: number[] = [];
    const results: number[] = [];
    const risks: number[] = [];
    const riskRewardRatios: number[] = [];
    const drawdowns: number[] = [];
    let runningBalance = 0;
    let peakBalance = 0;
    let currentDrawdown = 0;
    let maxDrawdown = 0;

    // Contadores para sequências
    let currentConsecutiveWins = 0;
    let currentConsecutiveLosses = 0;
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;

    // Métricas do trade
    let totalTradesWithInfo = 0;
    let totalEntryPrice = 0;
    let totalStopPrice = 0;
    let totalTakeProfit1 = 0;
    let totalLeverage = 0;
    let totalQuantity = 0;
    const symbolProfits: { [key: string]: number } = {};
    const sideProfits: { [key: string]: number } = {};
    let bestTradeId = null;
    let worstTradeId = null;
    let bestProfit = -Infinity;
    let worstProfit = Infinity;

    // Processar cada posição individualmente
    positions.forEach(position => {
      const netProfit = parseFloat(position.netProfit);
      if (netProfit > 0) {
        profits.push(netProfit);
      }

      results.push(netProfit);

      // Atualizar sequências
      if (netProfit > 0) {
        currentConsecutiveWins++;
        currentConsecutiveLosses = 0;
        if (currentConsecutiveWins > maxConsecutiveWins) {
          maxConsecutiveWins = currentConsecutiveWins;
        }
      } else {
        currentConsecutiveLosses++;
        currentConsecutiveWins = 0;
        if (currentConsecutiveLosses > maxConsecutiveLosses) {
          maxConsecutiveLosses = currentConsecutiveLosses;
        }
      }

      if (netProfit > 0) {
        totalProfit += netProfit;
        winningTrades++;
      } else {
        totalLoss += Math.abs(netProfit);
        losingTrades++;
      }

      // Group by symbol
      if (!profitBySymbol[position.symbol]) {
        profitBySymbol[position.symbol] = 0;
        symbolProfits[position.symbol] = 0;
      }
      profitBySymbol[position.symbol] += netProfit;
      symbolProfits[position.symbol] += netProfit;

      // Group by position side
      if (!profitBySide[position.positionSide]) {
        profitBySide[position.positionSide] = 0;
        sideProfits[position.positionSide] = 0;
      }
      profitBySide[position.positionSide] += netProfit;
      sideProfits[position.positionSide] += netProfit;

      // Calcular drawdown
      runningBalance += netProfit;
      if (runningBalance > peakBalance) {
        peakBalance = runningBalance;
      }
      currentDrawdown = peakBalance - runningBalance;
      if (currentDrawdown > maxDrawdown) {
        maxDrawdown = currentDrawdown;
      }
      drawdowns.push(currentDrawdown);

      // Melhor e pior trade
      if (netProfit > bestProfit) {
        bestProfit = netProfit;
        bestTradeId = position.tradeInfo && position.tradeInfo.trade && position.tradeInfo?.found ? position.tradeInfo.trade.id : null;
      }
      if (netProfit < worstProfit) {
        worstProfit = netProfit;
        worstTradeId = position.tradeInfo && position.tradeInfo.trade && position.tradeInfo?.found ? position.tradeInfo.trade.id : null;
      }

      const quantity = parseFloat(position.closePositionAmt)
      const avgPrice = parseFloat(position.avgPrice)
      const leverage = position.leverage

      // Acumular métricas do trade
      totalEntryPrice += avgPrice;
      totalLeverage += leverage;
      totalQuantity += quantity;


      // Check if we have trade info with stop loss
      if (position.tradeInfo?.found && position.tradeInfo.trade?.stop) {
        totalTradesWithInfo++;
        const trade = position.tradeInfo.trade;

        const stopPrice = position.tradeInfo.trade.stop

        totalStopPrice += stopPrice;
        if (trade.tp1) {
          totalTakeProfit1 += trade.tp1;
        }

        // Calculate the price difference to stop loss
        const priceDifference = Math.abs(avgPrice - stopPrice)

        // Calculate the potential loss in dollars (price difference * quantity)
        const potentialLoss = priceDifference * quantity

        // Calculate the margin used (position value / leverage)
        const positionValue = quantity * avgPrice
        const marginUsed = positionValue / leverage

        // Risk is the potential loss (limited by margin used)
        const risk = Math.min(potentialLoss, marginUsed)

        risks.push(risk);

        // Reward is the net profit
        const reward = netProfit

        if (risk > 0) {
          risks.push(risk);
        }

        // Calculate R:R ratio
        if (risk > 0 && reward > 0) {
          const ratio = reward / risk
          riskRewardRatios.push(ratio);
        }
      } else {
        // Fallback to margin-based calculation if no stop loss info
        const positionValue = quantity * avgPrice
        const marginUsed = positionValue / leverage
        const risk = marginUsed
        const reward = netProfit


        if (risk > 0) {
          risks.push(risk);
        }

        if (risk > 0 && reward > 0) {
          const ratio = reward / risk
          riskRewardRatios.push(ratio);
        }
      }


    });

    // Calcular total de posições e win rate
    const totalPositions = positions.length;
    const totalTrades = totalPositions;
    const netProfit = totalProfit - totalLoss;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    const avgProfit = winningTrades > 0 ? totalProfit / winningTrades : 0;
    const avgLoss = losingTrades > 0 ? totalLoss / losingTrades : 0;

    const maxProfit = Math.max(...results);
    const maxLoss = Math.min(...results);

    // Calcular Sharpe Ratio (simplificado)
    const avgReturn = profits.reduce((sum, profit) => sum + profit, 0) / profits.length;
    const variance = profits.reduce((sum, profit) => sum + Math.pow(profit - avgReturn, 2), 0) / profits.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    // Encontrar símbolo e lado mais lucrativos
    const mostProfitableSymbol = Object.keys(symbolProfits).reduce((a, b) =>
      symbolProfits[a] > symbolProfits[b] ? a : b, Object.keys(symbolProfits)[0] || '');
    const mostProfitableSide = Object.keys(sideProfits).reduce((a, b) =>
      sideProfits[a] > sideProfits[b] ? a : b, Object.keys(sideProfits)[0] || '');

    return {
      totalPositions,
      totalProfit,
      totalLoss,
      netProfit,
      winRate: Math.round(winRate * 100) / 100,
      avgProfit: Math.round(avgProfit * 100) / 100,
      avgLoss: Math.round(avgLoss * 100) / 100,
      maxProfit: Math.round(maxProfit * 100) / 100,
      maxLoss: Math.round(maxLoss * 100) / 100,
      profitBySymbol,
      profitBySide,

      // Novas estatísticas de risco
      riskMetrics: {
        totalRisk: risks.length > 0 ? Math.round(risks.reduce((sum, risk) => sum + risk, 0) * 100) / 100 : 0,
        avgRiskPerTrade: risks.length > 0 ? Math.round(risks.reduce((sum, risk) => sum + risk, 0) / risks.length * 100) / 100 : 0,
        maxRiskPerTrade: risks.length > 0 ? Math.round(Math.max(...risks) * 100) / 100 : 0,
        riskRewardRatio: risks.length > 0 && riskRewardRatios.length > 0 ? Math.round(riskRewardRatios.reduce((sum, ratio) => sum + ratio, 0) / riskRewardRatios.length * 100) / 100 : 0,
        avgRiskRewardRatio: riskRewardRatios.length > 0 ? Math.round(riskRewardRatios.reduce((sum, ratio) => sum + ratio, 0) / riskRewardRatios.length * 100) / 100 : 0,
        sharpeRatio: Math.round(sharpeRatio * 100) / 100,
        maxDrawdown: Math.round(maxDrawdown * 100) / 100,
        avgDrawdown: drawdowns.length > 0 ? Math.round(drawdowns.reduce((sum, dd) => sum + dd, 0) / drawdowns.length * 100) / 100 : 0,
        consecutiveWins: currentConsecutiveWins,
        consecutiveLosses: currentConsecutiveLosses,
        maxConsecutiveWins,
        maxConsecutiveLosses
      },

      // Métricas baseadas no trade
      tradeMetrics: {
        totalTradesWithInfo,
        avgEntryPrice: totalTradesWithInfo > 0 ? Math.round(totalEntryPrice / totalTradesWithInfo * 100) / 100 : 0,
        avgStopPrice: totalTradesWithInfo > 0 ? Math.round(totalStopPrice / totalTradesWithInfo * 100) / 100 : 0,
        avgTakeProfit1: totalTradesWithInfo > 0 ? Math.round(totalTakeProfit1 / totalTradesWithInfo * 100) / 100 : 0,
        avgLeverage: totalTradesWithInfo > 0 ? Math.round(totalLeverage / totalTradesWithInfo * 100) / 100 : 0,
        avgQuantity: totalTradesWithInfo > 0 ? Math.round(totalQuantity / totalTradesWithInfo * 100) / 100 : 0,
        mostProfitableSymbol,
        mostProfitableSide,
        bestTradeId,
        worstTradeId,
        bestProfit: Math.round(bestProfit * 100) / 100,
        worstProfit: Math.round(worstProfit * 100) / 100
      }
    };
  }

  public calculateDetailedRiskStats(positions: any[]): any {
    if (positions.length === 0) {
      return {
        summary: {
          totalPositions: 0,
          totalTradesWithInfo: 0,
          totalProfit: 0,
          totalLoss: 0,
          netProfit: 0
        },
        riskAnalysis: {
          avgRiskPerTrade: 0,
          totalRisk: 0,
          riskDistribution: {},
          maxRiskPerTrade: 0,
          minRiskPerTrade: 0
        },
        rewardAnalysis: {
          avgRewardPerTrade: 0,
          totalReward: 0,
          rewardDistribution: {},
          maxRewardPerTrade: 0,
          minRewardPerTrade: 0
        },
        riskRewardAnalysis: {
          avgRiskRewardRatio: 0,
          riskRewardDistribution: {},
          tradesWithPositiveRR: 0,
          tradesWithNegativeRR: 0,
          bestRiskRewardRatio: 0,
          worstRiskRewardRatio: 0
        },
        performanceMetrics: {
          sharpeRatio: 0,
          sortinoRatio: 0,
          calmarRatio: 0,
          maxDrawdown: 0,
          avgDrawdown: 0,
          recoveryFactor: 0
        },
        tradeAnalysis: {
          avgLeverage: 0,
          leverageDistribution: {},
          // Removido: avgQuantity, quantityDistribution, avgEntryPrice, avgStopPrice, avgTakeProfit1
        },
        symbolAnalysis: {},
        sideAnalysis: {}
      };
    }
    const tradesWithInfo = positions.filter(position => position.tradeInfo && position.tradeInfo?.trade && position.tradeInfo?.found);
    const profits = positions.map(p => parseFloat(p.netProfit)).filter(p => p > 0);
    const results = positions.map(p => parseFloat(p.netProfit));
    const totalProfit = results.reduce((sum, p) => p > 0 ? sum + p : sum, 0);
    const totalLoss = results.reduce((sum, p) => p < 0 ? sum + Math.abs(p) : sum, 0);
    const totProfit = totalProfit - totalLoss;

    // Análise de risco
    const risks: number[] = [];
    const rewards: number[] = [];
    const riskRewardRatios: number[] = [];
    const leverages: number[] = [];
    // Novo: array local para R:R positivos
    const positiveRRs: number[] = [];

    // Distribuições
    const riskDistribution: { [key: string]: number } = {};
    const rewardDistribution: { [key: string]: number } = {};
    const rrDistribution: { [key: string]: number } = {};
    const leverageDistribution: { [key: string]: number } = {};
    // Removido: const quantityDistribution: { [key: string]: number } = {};

    // Análise por símbolo e lado
    const symbolAnalysis: { [key: string]: any } = {};
    const sideAnalysis: { [key: string]: any } = {};


    positions.forEach(position => {
      const netProfit = parseFloat(position.netProfit);
      const entryPrice = parseFloat(position.avgPrice);
      const quantity = parseFloat(position.positionAmt);
      const leverage = position.leverage;
      let risk = 0.0
      if (position.tradeInfo && position.tradeInfo?.trade && position.tradeInfo?.found) {
        const trade = position.tradeInfo.trade;

        // Calcular risco financeiro (margem arriscada)
        const stopPrice = trade.stop;
        risk = Math.abs(entryPrice - stopPrice) * quantity;
      } else {
        const positionValue = quantity * entryPrice
        const marginUsed = positionValue / leverage
        risk = marginUsed
      }

      risks.push(risk);

      // Calcular retorno financeiro (profit em margem)
      const reward = netProfit;
      if (reward > 0) {
        rewards.push(reward);
        if (risk > 0) {
          const riskRewardRatio = reward / risk;
          riskRewardRatios.push(riskRewardRatio);
          positiveRRs.push(riskRewardRatio);
        }
      }

      leverages.push(leverage);

      // Análise por símbolo
      if (!symbolAnalysis[position.symbol]) {
        symbolAnalysis[position.symbol] = {
          totalTrades: 0,
          totalProfit: 0,
          totalLoss: 0,
          avgRisk: 0,
          avgReward: 0,
          avgRR: 0,
          avgLeverage: 0,
          risks: [],
          rewards: [],
          rrRatios: []
        };
      }
      symbolAnalysis[position.symbol].totalTrades++;
      symbolAnalysis[position.symbol].totalProfit += netProfit > 0 ? netProfit : 0;
      symbolAnalysis[position.symbol].totalLoss += netProfit < 0 ? Math.abs(netProfit) : 0;
      symbolAnalysis[position.symbol].risks.push(risk);
      symbolAnalysis[position.symbol].rewards.push(reward);
      if ((reward > 0) && (risk > 0)) {
        symbolAnalysis[position.symbol].rrRatios.push(reward / risk);
      }

      // Análise por lado
      if (!sideAnalysis[position.positionSide]) {
        sideAnalysis[position.positionSide] = {
          totalTrades: 0,
          totalProfit: 0,
          totalLoss: 0,
          avgRisk: 0,
          avgReward: 0,
          avgRR: 0,
          avgLeverage: 0,
          risks: [],
          rewards: [],
          rrRatios: []
        };
      }
      sideAnalysis[position.positionSide].totalTrades++;
      sideAnalysis[position.positionSide].totalProfit += netProfit > 0 ? netProfit : 0;
      sideAnalysis[position.positionSide].totalLoss += netProfit < 0 ? Math.abs(netProfit) : 0;
      sideAnalysis[position.positionSide].risks.push(risk);
      sideAnalysis[position.positionSide].rewards.push(reward);
      if ((reward > 0) && (risk > 0)) {
        sideAnalysis[position.positionSide].rrRatios.push(reward / risk);
      }


    });



    // Calcular médias para símbolos e lados
    Object.keys(symbolAnalysis).forEach(symbol => {
      const analysis = symbolAnalysis[symbol];
      analysis.avgRisk = analysis.risks.length > 0 ? analysis.risks.reduce((a: number, b: number) => a + b, 0) / analysis.risks.length : 0;
      analysis.avgReward = analysis.rewards.length > 0 ? analysis.rewards.reduce((a: number, b: number) => a + b, 0) / analysis.rewards.length : 0;
      analysis.avgRR = analysis.rrRatios.length > 0 ? analysis.rrRatios.reduce((a: number, b: number) => a + b, 0) / analysis.rrRatios.length : 0;
      analysis.avgLeverage = leverages.filter((_, i) => positions[i].symbol === symbol).reduce((a: number, b: number) => a + b, 0) / analysis.totalTrades;
    });

    Object.keys(sideAnalysis).forEach(side => {
      const analysis = sideAnalysis[side];
      analysis.avgRisk = analysis.risks.length > 0 ? analysis.risks.reduce((a: number, b: number) => a + b, 0) / analysis.risks.length : 0;
      analysis.avgReward = analysis.rewards.length > 0 ? analysis.rewards.reduce((a: number, b: number) => a + b, 0) / analysis.rewards.length : 0;
      analysis.avgRR = analysis.rrRatios.length > 0 ? analysis.rrRatios.reduce((a: number, b: number) => a + b, 0) / analysis.rrRatios.length : 0;
      analysis.avgLeverage = leverages.filter((_, i) => positions[i].positionSide === side).reduce((a: number, b: number) => a + b, 0) / analysis.totalTrades;
    });

    // Calcular distribuições
    risks.forEach(risk => {
      const range = Math.floor(risk / 10) * 10;
      const key = `${range}-${range + 10}`;
      riskDistribution[key] = (riskDistribution[key] || 0) + 1;
    });

    rewards.forEach(reward => {
      const range = Math.floor(reward / 10) * 10;
      const key = `${range}-${range + 10}`;
      rewardDistribution[key] = (rewardDistribution[key] || 0) + 1;
    });

    riskRewardRatios.forEach(rr => {
      const range = Math.floor(rr * 10) / 10;
      const key = `${range}-${range + 0.1}`;
      rrDistribution[key] = (rrDistribution[key] || 0) + 1;
    });

    leverages.forEach(leverage => {
      const range = Math.floor(leverage / 5) * 5;
      const key = `${range}-${range + 5}`;
      leverageDistribution[key] = (leverageDistribution[key] || 0) + 1;
    });

    // Removido: cálculo de quantityDistribution

    // Calcular métricas de performance
    const avgReturn = profits.reduce((sum, profit) => sum + profit, 0) / profits.length;
    const variance = profits.reduce((sum, profit) => sum + Math.pow(profit - avgReturn, 2), 0) / profits.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    // Novo: calcular média de R:R para posições positivas
    let avgRiskReturnedPositive = 0;
    if (positiveRRs.length > 0) {
      avgRiskReturnedPositive = positiveRRs.reduce((a, b) => a + b, 0) / positiveRRs.length;
    }

    // Calcular Sortino Ratio (usando apenas retornos negativos)
    const negativeReturns = results.filter(p => p < 0);
    const downsideDeviation = negativeReturns.length > 0 ?
      Math.sqrt(negativeReturns.reduce((sum, ret) => sum + Math.pow(ret, 2), 0) / negativeReturns.length) : 0;
    const sortinoRatio = downsideDeviation > 0 ? avgReturn / downsideDeviation : 0;

    // Calcular drawdown
    let runningBalance = 0;
    let peakBalance = 0;
    let maxDrawdown = 0;
    results.forEach(profit => {
      runningBalance += profit;
      if (runningBalance > peakBalance) {
        peakBalance = runningBalance;
      }
      const drawdown = peakBalance - runningBalance;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    const calmarRatio = maxDrawdown > 0 ? totProfit / maxDrawdown : 0;
    const recoveryFactor = maxDrawdown > 0 ? totProfit / maxDrawdown : 0;

    return {
      summary: {
        totalPositions: positions.length,
        totalTradesWithInfo: tradesWithInfo.length,
        totalProfit: Math.round(totalProfit * 100) / 100,
        totalLoss: Math.round(totalLoss * 100) / 100,
        netProfit: Math.round(totProfit * 100) / 100
      },
      riskAnalysis: {
        avgRiskPerTrade: risks.length > 0 ? Math.round(risks.reduce((a, b) => a + b, 0) / risks.length * 100) / 100 : 0,
        totalRisk: Math.round(risks.reduce((a, b) => a + b, 0) * 100) / 100,
        riskDistribution,
        maxRiskPerTrade: risks.length > 0 ? Math.round(Math.max(...risks) * 100) / 100 : 0,
        minRiskPerTrade: risks.length > 0 ? Math.round(Math.min(...risks) * 100) / 100 : 0
      },
      rewardAnalysis: {
        avgRewardPerTrade: rewards.length > 0 ? Math.round(rewards.reduce((a, b) => a + b, 0) / rewards.length * 100) / 100 : 0,
        totalReward: Math.round(rewards.reduce((a, b) => a + b, 0) * 100) / 100,
        rewardDistribution,
        maxRewardPerTrade: rewards.length > 0 ? Math.round(Math.max(...rewards) * 100) / 100 : 0,
        minRewardPerTrade: rewards.length > 0 ? Math.round(Math.min(...rewards) * 100) / 100 : 0
      },
      riskRewardAnalysis: {
        avgRiskRewardRatio: riskRewardRatios.length > 0 ? Math.round(riskRewardRatios.reduce((a, b) => a + b, 0) / riskRewardRatios.length * 100) / 100 : 0,
        riskRewardDistribution: rrDistribution,
        tradesWithPositiveRR: riskRewardRatios.filter(rr => rr > 1).length,
        tradesWithNegativeRR: riskRewardRatios.filter(rr => rr < 1).length,
        bestRiskRewardRatio: riskRewardRatios.length > 0 ? Math.round(Math.max(...riskRewardRatios) * 100) / 100 : 0,
        worstRiskRewardRatio: riskRewardRatios.length > 0 ? Math.round(Math.min(...riskRewardRatios) * 100) / 100 : 0,
        avgRiskReturnedPositive: Math.round(avgRiskReturnedPositive * 100) / 100
      },
      performanceMetrics: {
        sharpeRatio: Math.round(sharpeRatio * 100) / 100,
        sortinoRatio: Math.round(sortinoRatio * 100) / 100,
        calmarRatio: Math.round(calmarRatio * 100) / 100,
        maxDrawdown: Math.round(maxDrawdown * 100) / 100,
        avgDrawdown: 0, // Seria calculado se necessário
        recoveryFactor: Math.round(recoveryFactor * 100) / 100
      },
      tradeAnalysis: {
        avgLeverage: leverages.length > 0 ? Math.round(leverages.reduce((a, b) => a + b, 0) / leverages.length * 100) / 100 : 0,
        leverageDistribution
        // Removido: avgQuantity, quantityDistribution, avgEntryPrice, avgStopPrice, avgTakeProfit1
      },
      symbolAnalysis,
      sideAnalysis
    };
  }
} 
