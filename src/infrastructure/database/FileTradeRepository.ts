import * as fs from 'fs/promises';
import * as path from 'path';
import { ITradeRepository } from '../../core/interfaces/ITradeRepository';
import { Trade } from '../../core/entities/Trade';

export class FileTradeRepository implements ITradeRepository {
    private readonly filePath: string;

    constructor(filePath?: string) {
        this.filePath = filePath || path.join(process.cwd(), 'data', 'trades.json');
    }

    async readTrades(): Promise<Trade[]> {
        try {
            const data = await fs.readFile(this.filePath, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }

    async writeTrades(trades: Trade[]): Promise<void> {
        const tempPath = `${this.filePath}.${Date.now()}-${Math.random().toString(36).substring(7)}.tmp`;
        try {
            await fs.writeFile(tempPath, JSON.stringify(trades, null, 2));
            await fs.rename(tempPath, this.filePath);
        } catch (error) {
            // Attempt to clean up temp file if something fails
            try {
                await fs.unlink(tempPath);
            } catch (ignore) { }
            throw error;
        }
    }

    async addTrade(trade: Trade): Promise<Trade> {
        const trades = await this.readTrades();
        trades.push(trade);
        await this.writeTrades(trades);
        return trade;
    }

    async updateTrade(index: number, trade: Partial<Trade>): Promise<Trade> {
        const trades = await this.readTrades();
        if (index < 0 || index >= trades.length) {
            throw new Error('Trade not found');
        }
        const updatedTrade = { ...trades[index], ...trade };
        trades[index] = updatedTrade;
        await this.writeTrades(trades);
        return updatedTrade;
    }

    async deleteTrade(index: number): Promise<Trade> {
        const trades = await this.readTrades();
        if (index < 0 || index >= trades.length) {
            throw new Error('Trade not found');
        }
        const deletedTrade = trades[index];
        trades.splice(index, 1);
        await this.writeTrades(trades);
        return deletedTrade;
    }

    async getTrade(index: number): Promise<Trade> {
        const trades = await this.readTrades();
        if (index < 0 || index >= trades.length) {
            throw new Error('Trade not found');
        }
        return trades[index];
    }
}
