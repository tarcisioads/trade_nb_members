import { ITradeDatabase } from '../interfaces/ITradeDatabase';
import { PositionHistory, TradeRecord, TradeInfo } from '../../utils/types';
import * as fs from 'fs';
import * as path from 'path';

export class TradeMatcherService {
    private tradeDatabase: ITradeDatabase;

    constructor(tradeDatabase: ITradeDatabase) {
        this.tradeDatabase = tradeDatabase;
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
            const timeWindow = 10 * 60 * 1000; // 10 minutes in ms
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

            // Note: This path traversal is not ideal but preserved from original for behavior parity
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
            // Populate all mandatory TradeRecord fields
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
                sentiment_required: bestTradeFromJson.sentiment_required ?? false,
                sentiment_adds_margin: bestTradeFromJson.sentiment_adds_margin ?? false,
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
}
