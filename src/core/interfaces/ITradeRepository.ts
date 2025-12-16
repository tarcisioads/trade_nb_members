import { Trade } from '../entities/Trade';

export interface ITradeRepository {
    readTrades(): Promise<Trade[]>;
    writeTrades(trades: Trade[]): Promise<void>;
    addTrade(trade: Trade): Promise<Trade>;
    updateTrade(index: number, trade: Partial<Trade>): Promise<Trade>;
    deleteTrade(index: number): Promise<Trade>;
    getTrade(index: number): Promise<Trade>;
}
