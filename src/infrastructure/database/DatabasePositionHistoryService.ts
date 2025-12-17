import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { PositionHistory } from '../../utils/types';
import * as path from 'path';

export class DatabasePositionHistoryService {
    private db: Database | null = null;

    constructor() {
        this.initializeDatabase();
    }


    public async initializeDatabase() {
        const dbPath = path.join(process.cwd(), 'db/position_history.db');
        this.db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        await this.db.exec(`
                CREATE TABLE IF NOT EXISTS position_history (
                    positionId TEXT PRIMARY KEY,
                    symbol TEXT NOT NULL,
                    positionSide TEXT NOT NULL,
                    isolated BOOLEAN NOT NULL,
                    closeAllPositions BOOLEAN NOT NULL,
                    positionAmt TEXT NOT NULL,
                    closePositionAmt TEXT NOT NULL,
                    realisedProfit TEXT NOT NULL,
                    netProfit TEXT NOT NULL,
                    avgClosePrice REAL NOT NULL,
                    avgPrice TEXT NOT NULL,
                    leverage INTEGER NOT NULL,
                    positionCommission TEXT NOT NULL,
                    totalFunding TEXT NOT NULL,
                    openTime INTEGER NOT NULL,
                    closeTime INTEGER,
                    updateTime INTEGER
                )
            `);

        // Add updateTime column if it doesn't exist (for existing databases)
        try {
            await this.db.exec('ALTER TABLE position_history ADD COLUMN updateTime INTEGER');
        } catch (error) {
            // Column already exists, ignore error
        }
    }

    public async savePositionHistory(positions: PositionHistory[]): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        const stmt = await this.db.prepare(`
            INSERT OR REPLACE INTO position_history (
                positionId, symbol, positionSide, isolated, closeAllPositions,
                positionAmt, closePositionAmt, realisedProfit, netProfit,
                avgClosePrice, avgPrice, leverage, positionCommission,
                totalFunding, openTime, closeTime, updateTime
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const position of positions) {
            await stmt.run(
                position.positionId,
                position.symbol,
                position.positionSide,
                position.isolated,
                position.closeAllPositions,
                position.positionAmt,
                position.closePositionAmt,
                position.realisedProfit,
                position.netProfit,
                position.avgClosePrice,
                position.avgPrice,
                position.leverage,
                position.positionCommission,
                position.totalFunding,
                position.openTime,
                position.closeTime,
                position.updateTime
            );
        }

        await stmt.finalize();
    }

    public async getPositionHistory(
        symbol: string,
        startTs?: number,
        endTs?: number,
        pageIndex: number = 1,
        pageSize: number = 100
    ): Promise<PositionHistory[]> {
        if (!this.db) throw new Error('Database not initialized');

        const offset = (pageIndex - 1) * pageSize;
        let query = `
            SELECT * FROM position_history 
        `;
        const params: any[] = [];

        // Only filter by symbol if it's not "ALL"
        if (symbol !== 'ALL') {
            query += ' WHERE symbol = ?';
            params.push(symbol);
        } else {
            query += ' WHERE 1=1';
        }

        if (startTs) {
            query += ' AND openTime >= ?';
            params.push(startTs);
        }
        if (endTs) {
            query += ' AND openTime <= ?';
            params.push(endTs);
        }

        // Use COALESCE to fallback to updateTime when closeTime is null
        query += ' ORDER BY COALESCE(closeTime, updateTime) DESC LIMIT ? OFFSET ?';
        params.push(pageSize, offset);

        return this.db.all<PositionHistory[]>(query, params);
    }

    public async clearCache(): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');
        await this.db.run('DELETE FROM position_history');
    }
} 