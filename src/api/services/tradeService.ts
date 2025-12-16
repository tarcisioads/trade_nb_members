import { ITradeRepository } from '../../core/interfaces/ITradeRepository';
import { FileTradeRepository } from '../../infrastructure/database/FileTradeRepository';
import { Trade } from '../../utils/types';

export class TradeService {
    private repository: ITradeRepository;

    constructor(repository?: ITradeRepository) {
        this.repository = repository || new FileTradeRepository();
    }

    async readTrades(): Promise<Trade[]> {
        return this.repository.readTrades();
    }

    async writeTrades(trades: Trade[]): Promise<void> {
        return this.repository.writeTrades(trades);
    }

    async addTrade(trade: Trade): Promise<Trade> {
        return this.repository.addTrade(trade);
    }

    async updateTrade(index: number, trade: Partial<Trade>): Promise<Trade> {
        return this.repository.updateTrade(index, trade);
    }

    async deleteTrade(index: number): Promise<Trade> {
        return this.repository.deleteTrade(index);
    }

    async getTrade(index: number): Promise<Trade> {
        return this.repository.getTrade(index);
    }
} 