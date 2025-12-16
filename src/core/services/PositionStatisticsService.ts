import { PositionHistory } from '../../utils/types';

export class PositionStatisticsService {
    public calculateStats(positions: PositionHistory[]): any {
        if (positions.length === 0) {
            return this.getEmptyStats();
        }

        let totalProfit = 0;
        let totalLoss = 0;
        let winningTrades = 0;
        let losingTrades = 0;
        const profitBySymbol: { [key: string]: number } = {};
        const profitBySide: { [key: string]: number } = { LONG: 0, SHORT: 0 };

        // Arrays for risk calculations
        const profits: number[] = [];
        const results: number[] = [];
        const risks: number[] = [];
        const riskRewardRatios: number[] = [];
        const drawdowns: number[] = [];
        let runningBalance = 0;
        let peakBalance = 0;
        let currentDrawdown = 0;
        let maxDrawdown = 0;

        // Gross profit/loss by symbol (for Top 10 charts)
        const grossProfitBySymbol: { [key: string]: number } = {};
        const grossLossBySymbol: { [key: string]: number } = {};

        // Counters for sequences
        let currentConsecutiveWins = 0;
        let currentConsecutiveLosses = 0;
        let maxConsecutiveWins = 0;
        let maxConsecutiveLosses = 0;

        // Trade metrics
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

        // Process each position individually
        positions.forEach(position => {
            const netProfit = parseFloat(position.netProfit);
            if (netProfit > 0) {
                profits.push(netProfit);
                grossProfitBySymbol[position.symbol] = (grossProfitBySymbol[position.symbol] || 0) + netProfit;
            } else if (netProfit < 0) {
                grossLossBySymbol[position.symbol] = (grossLossBySymbol[position.symbol] || 0) + Math.abs(netProfit);
            }

            results.push(netProfit);

            // Update sequences
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

            // Calculate drawdown
            runningBalance += netProfit;
            if (runningBalance > peakBalance) {
                peakBalance = runningBalance;
            }
            currentDrawdown = peakBalance - runningBalance;
            if (currentDrawdown > maxDrawdown) {
                maxDrawdown = currentDrawdown;
            }
            drawdowns.push(currentDrawdown);

            // Best and worst trade
            if (netProfit > bestProfit) {
                bestProfit = netProfit;
                bestTradeId = position.tradeInfo && position.tradeInfo.trade && position.tradeInfo?.found ? position.tradeInfo.trade.id : null;
            }
            if (netProfit < worstProfit) {
                worstProfit = netProfit;
                worstTradeId = position.tradeInfo && position.tradeInfo.trade && position.tradeInfo?.found ? position.tradeInfo.trade.id : null;
            }

            const quantity = parseFloat(position.closePositionAmt);
            const avgPrice = parseFloat(position.avgPrice);
            const leverage = position.leverage;

            // Accumulate trade metrics
            totalEntryPrice += avgPrice;
            totalLeverage += leverage;
            totalQuantity += quantity;


            // Check if we have trade info with stop loss
            if (position.tradeInfo?.found && position.tradeInfo.trade?.stop) {
                totalTradesWithInfo++;
                const trade = position.tradeInfo.trade;

                const stopPrice = position.tradeInfo.trade.stop;

                totalStopPrice += stopPrice;
                if (trade.tp1) {
                    totalTakeProfit1 += trade.tp1;
                }

                // Calculate the price difference to stop loss
                const priceDifference = Math.abs(avgPrice - stopPrice);

                // Calculate the potential loss in dollars (price difference * quantity)
                const potentialLoss = priceDifference * quantity;

                // Calculate the margin used (position value / leverage)
                const positionValue = quantity * avgPrice;
                const marginUsed = positionValue / leverage;

                // Risk is the potential loss (limited by margin used)
                const risk = Math.min(potentialLoss, marginUsed);

                risks.push(risk);

                // Reward is the net profit
                const reward = netProfit;

                if (risk > 0) {
                    risks.push(risk);
                }

                // Calculate R:R ratio
                if (risk > 0 && reward > 0) {
                    const ratio = reward / risk;
                    riskRewardRatios.push(ratio);
                }
            } else {
                // Fallback to margin-based calculation if no stop loss info
                const positionValue = quantity * avgPrice;
                const marginUsed = positionValue / leverage;
                const risk = marginUsed;
                const reward = netProfit;


                if (risk > 0) {
                    risks.push(risk);
                }

                if (risk > 0 && reward > 0) {
                    const ratio = reward / risk;
                    riskRewardRatios.push(ratio);
                }
            }
        });

        // Calculate total positions and win rate
        const totalPositions = positions.length;
        const totalTrades = totalPositions;
        const netProfit = totalProfit - totalLoss;
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
        const avgProfit = winningTrades > 0 ? totalProfit / winningTrades : 0;
        const avgLoss = losingTrades > 0 ? totalLoss / losingTrades : 0;

        const maxProfit = Math.max(...results);
        const maxLoss = Math.min(...results);

        // Calculate Sharpe Ratio (simplified)
        const avgReturn = profits.reduce((sum, profit) => sum + profit, 0) / profits.length;
        const variance = profits.reduce((sum, profit) => sum + Math.pow(profit - avgReturn, 2), 0) / profits.length;
        const stdDev = Math.sqrt(variance);
        const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

        // Find most profitable symbol and side
        const mostProfitableSymbol = Object.keys(symbolProfits).reduce((a, b) =>
            symbolProfits[a] > symbolProfits[b] ? a : b, Object.keys(symbolProfits)[0] || '');
        const mostProfitableSide = Object.keys(sideProfits).reduce((a, b) =>
            sideProfits[a] > sideProfits[b] ? a : b, Object.keys(sideProfits)[0] || '');

        const topProfitableSymbols = Object.entries(grossProfitBySymbol)
            .map(([symbol, amount]) => ({ symbol, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 10);

        const topLosingSymbols = Object.entries(grossLossBySymbol)
            .map(([symbol, amount]) => ({ symbol, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 10);

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
            topProfitableSymbols,
            topLosingSymbols,

            // New risk stats
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

            // Trade based metrics
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
            return this.getEmptyDetailedStats();
        }
        const tradesWithInfo = positions.filter(position => position.tradeInfo && position.tradeInfo?.trade && position.tradeInfo?.found);
        const profits = positions.map(p => parseFloat(p.netProfit)).filter(p => p > 0);
        const results = positions.map(p => parseFloat(p.netProfit));
        const totalProfit = results.reduce((sum, p) => p > 0 ? sum + p : sum, 0);
        const totalLoss = results.reduce((sum, p) => p < 0 ? sum + Math.abs(p) : sum, 0);
        const totProfit = totalProfit - totalLoss;

        // Risk analysis
        const risks: number[] = [];
        const rewards: number[] = [];
        const riskRewardRatios: number[] = [];
        const leverages: number[] = [];
        // Positive R:R local array
        const positiveRRs: number[] = [];

        // Distributions
        const riskDistribution: { [key: string]: number } = {};
        const rewardDistribution: { [key: string]: number } = {};
        const rrDistribution: { [key: string]: number } = {};
        const leverageDistribution: { [key: string]: number } = {};

        // Symbol and Side Analysis
        const symbolAnalysis: { [key: string]: any } = {};
        const sideAnalysis: { [key: string]: any } = {};


        positions.forEach(position => {
            const netProfit = parseFloat(position.netProfit);
            const entryPrice = parseFloat(position.avgPrice);
            const quantity = parseFloat(position.positionAmt);
            const leverage = position.leverage;
            let risk = 0.0;
            if (position.tradeInfo && position.tradeInfo?.trade && position.tradeInfo?.found) {
                const trade = position.tradeInfo.trade;

                // Calculate financial risk (margin at risk)
                const stopPrice = trade.stop;
                risk = Math.abs(entryPrice - stopPrice) * quantity;
            } else {
                const positionValue = quantity * entryPrice;
                const marginUsed = positionValue / leverage;
                risk = marginUsed;
            }

            risks.push(risk);

            // Calculate financial reward (profit)
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

            // Symbol Analysis
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

            // Side Analysis
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

        // Calculate averages for symbols and sides
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

        // Calculate distributions
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

        // Calculate performance metrics
        const avgReturn = profits.reduce((sum, profit) => sum + profit, 0) / profits.length;
        const variance = profits.reduce((sum, profit) => sum + Math.pow(profit - avgReturn, 2), 0) / profits.length;
        const stdDev = Math.sqrt(variance);
        const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

        // Calculate Sortino Ratio (using only negative returns)
        const negativeReturns = results.filter(p => p < 0);
        const downsideDeviation = negativeReturns.length > 0 ?
            Math.sqrt(negativeReturns.reduce((sum, ret) => sum + Math.pow(ret, 2), 0) / negativeReturns.length) : 0;
        const sortinoRatio = downsideDeviation > 0 ? avgReturn / downsideDeviation : 0;

        // Calculate drawdown
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

        const recoveryFactor = maxDrawdown > 0 ? totProfit / maxDrawdown : 0;
        const calmarRatio = maxDrawdown > 0 ? totProfit / maxDrawdown : 0;

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
                tradesWithPositiveRR: positiveRRs.length,
                tradesWithNegativeRR: riskRewardRatios.length - positiveRRs.length,
                bestRiskRewardRatio: riskRewardRatios.length > 0 ? Math.round(Math.max(...riskRewardRatios) * 100) / 100 : 0,
                worstRiskRewardRatio: riskRewardRatios.length > 0 ? Math.round(Math.min(...riskRewardRatios) * 100) / 100 : 0
            },
            performanceMetrics: {
                sharpeRatio: Math.round(sharpeRatio * 100) / 100,
                sortinoRatio: Math.round(sortinoRatio * 100) / 100,
                calmarRatio: Math.round(calmarRatio * 100) / 100,
                maxDrawdown: Math.round(maxDrawdown * 100) / 100,
                avgDrawdown: 0, // Not calculated in original, keeping strict structure
                recoveryFactor: Math.round(recoveryFactor * 100) / 100
            },
            tradeAnalysis: {
                avgLeverage: leverages.length > 0 ? Math.round(leverages.reduce((a, b) => a + b, 0) / leverages.length * 100) / 100 : 0,
                leverageDistribution
            },
            symbolAnalysis,
            sideAnalysis
        };
    }

    private getEmptyStats(): any {
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

    private getEmptyDetailedStats(): any {
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
            },
            symbolAnalysis: {},
            sideAnalysis: {}
        };
    }
}
