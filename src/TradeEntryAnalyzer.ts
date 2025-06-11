import { DataServiceManager } from './DataServiceManager';
import { KlineData, Trade, TradeType, AllowedInterval } from './utils/types';


export class TradeEntryAnalyzer {
    private readonly dataServiceManager: DataServiceManager;

    constructor() {
        this.dataServiceManager = new DataServiceManager();
    }

    private isEntryConditionMet(currentCandle: KlineData, entry: number, type: TradeType): boolean {
        if (type === 'LONG') {
            return parseFloat(currentCandle.close) > entry && parseFloat(currentCandle.low) <= entry;
        } else {
            return parseFloat(currentCandle.close) < entry && parseFloat(currentCandle.high) >= entry;
        }
    }

    private hasClosePriceBeforeEntry(klineData: KlineData[], entry: number, type: TradeType): boolean {
        // Skip the most recent candle as we already checked it
        const dataToCheck = [...klineData].slice(1)
        
        for (const kline of dataToCheck) {
            const close = parseFloat(kline.close);
            
            // First check if this close meets entry condition
            if (this.isEntryConditionMet(kline, entry, type)) {
                return false; // Found a close that meets entry condition, stop checking
            }
            
            if (type === 'LONG') {
                // For LONG, return true if any close is less than entry
                if (close < entry) {
                    return true;
                }
            } else {
                // For SHORT, return true if any close is greater than entry
                if (close > entry) {
                    return true;
                }
            }
        }

        return false;
    }

    private isWickRatioValid(candle: KlineData, type: TradeType): boolean {
        const high = parseFloat(candle.high);
        const low = parseFloat(candle.low);
        const open = parseFloat(candle.open);
        const close = parseFloat(candle.close);
        
        const totalCandleHeight = high - low;
        
        if (type === 'LONG') {
            const upperWick = high - Math.max(open, close);
            const upperWickRatio = upperWick / totalCandleHeight;
            return upperWickRatio <= 0.8;
        } else {
            const lowerWick = Math.min(open, close) - low;
            const lowerWickRatio = lowerWick / totalCandleHeight;
            return lowerWickRatio <= 0.8;
        }
    }

    public async analyzeEntry(trade: Trade
    ): Promise<{
        canEnter: boolean;
        currentClose: number;
        hasClosePriceBeforeEntry: boolean;
        message: string;
        warning: boolean;
    }> {
        try {
            // Calculate risk-reward ratio
            const entryToStopDistance = Math.abs(trade.entry - trade.stop);
            const entryToTP1Distance = Math.abs(trade.entry - trade.tp1);
            const riskRewardRatio = entryToTP1Distance / entryToStopDistance;

            // Get data from either Binance or BingX using DataServiceManager
            const { data: klineData, source } = await this.dataServiceManager.getKlineData(trade.symbol, trade.interval);
            
            // Get the most recent close price
            const currentCandle = klineData[0];
            const currentClose = parseFloat(currentCandle.close);
            
            // Check if entry condition is met first
            const entryConditionMet = this.isEntryConditionMet(currentCandle, trade.entry, trade.type);
            let hasClosePriceBeforeEntry = false;
            if (entryConditionMet) {
                hasClosePriceBeforeEntry = this.hasClosePriceBeforeEntry(klineData, trade.entry, trade.type);
            }
            if (entryConditionMet && hasClosePriceBeforeEntry){
                // Validate risk-reward ratio
                if (riskRewardRatio < 0.9) {
                    return {
                        canEnter: false,
                        currentClose,
                        hasClosePriceBeforeEntry,
                        warning: entryConditionMet && hasClosePriceBeforeEntry,
                        message: `Invalid risk-reward ratio. Distance to TP1 (${entryToTP1Distance}) is less than 90% of distance to stop (${entryToStopDistance})`
                    };
                }
                
                // Check if wick ratio is valid
                if (!this.isWickRatioValid(currentCandle, trade.type)) {
                    return {
                        canEnter: false,
                        currentClose,
                        hasClosePriceBeforeEntry,
                        warning: entryConditionMet && hasClosePriceBeforeEntry,
                        message: `Invalid candle wick ratio. ${trade.type === 'LONG' ? 'Upper' : 'Lower'} wick is more than 80% of total candle height [${source}]`
                    };
                }

            }

            // Determine if we can enter the trade
            const canEnter = entryConditionMet && hasClosePriceBeforeEntry;

            // Generate appropriate message
            let message = '';
            if (!entryConditionMet) {
                message = `Entry condition not met. Current close (${currentClose}) is not ${trade.type === 'LONG' ? 'above' : 'below'} entry (${trade.entry}) [${source}]`;
            } else if (!hasClosePriceBeforeEntry) {
                message = `Entry condition met but no price has been close before entry (${trade.entry}) [${source}]`;
            } else {
                message = `Entry condition met and price has been close before entry (${trade.entry}) [${source}]`;
            }

            return {
                canEnter,
                currentClose,
                hasClosePriceBeforeEntry,
                warning: false,
                message
            };
        } catch (error: any) {
            console.error(`Error analyzing entry for ${trade.symbol}:`, error);
            throw new Error(`Failed to analyze entry for ${trade.symbol}: ${error.message}`);
        }
    }

    public async getRecentCloses(trade: Trade, count: number): Promise<number[]> {
        try {
            const { data: klineData } = await this.dataServiceManager.getKlineData(trade.symbol, trade.interval);
            return klineData
                .slice(0, count)
                .map(kline => parseFloat(kline.close));
        } catch (error: any) {
            console.error(`Error getting recent closes for ${trade.symbol}:`, error);
            throw new Error(`Failed to get recent closes for ${trade.symbol}: ${error.message}`);
        }
    }
} 