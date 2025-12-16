import { Trade } from '../entities/Trade';

export interface ExecutionResult {
    success: boolean;
    message: string;
    data?: any;
}

export interface IExchangeService {
    executeTrade(trade: Trade): Promise<ExecutionResult>;
    getMarketPrice(symbol: string): Promise<number>;
}
