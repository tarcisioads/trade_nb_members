import fs from 'fs/promises';
import path from 'path';
import { Trade } from '../../utils/types';


const TRADES_FILE = path.join(__dirname, '../../../data/trades.json');


export class TradeService {
    async readTrades(): Promise<Trade[]> {
        try {
            const data = await fs.readFile(TRADES_FILE, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            // If file doesn't exist, create it with an empty array
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                await this.writeTrades([]);
                return [];
            }
            throw error;
        }
    }

    async writeTrades(trades: Trade[]): Promise<void> {
        await fs.writeFile(TRADES_FILE, JSON.stringify(trades, null, 2));
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