import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import * as path from 'path';
import { Trade, TradeRecord, BingXOrderResponse, OrderDetails, TradeNotification } from '../../utils/types';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { ITradeDatabase } from '../../core/interfaces/ITradeDatabase';

export class TradeDatabase implements ITradeDatabase {
  private db: any;

  constructor() {
    this.initializeDatabase();
  }

  private async initializeDatabase() {
    const dbPath = path.join(process.cwd(), 'db/trades.db');
    this.db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    await this.db.exec(`
            CREATE TABLE IF NOT EXISTS trades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                type TEXT NOT NULL,
                interval TEXT NOT NULL,
                entry REAL NOT NULL,
                stop REAL NOT NULL,
                tp1 REAL,
                tp2 REAL,
                tp3 REAL,
                tp4 REAL,
                tp5 REAL,
                tp6 REAL,
                entryOrderId TEXT NOT NULL,
                stopOrderId TEXT NOT NULL,
                tp1OrderId TEXT,
                tp2OrderId TEXT,
                tp3OrderId TEXT,
                tp4OrderId TEXT,
                tp5OrderId TEXT,
                tp6OrderId TEXT,
                trailingStopOrderId TEXT,
                quantity REAL NOT NULL,
                leverage INTEGER NOT NULL,
                status TEXT NOT NULL,
                volume_adds_margin BOOLEAN NOT NULL DEFAULT 0,
                setup_description TEXT,
                volume_required BOOLEAN NOT NULL DEFAULT 0,
                createdAt TEXT NOT NULL,
                updatedAt TEXT NOT NULL,
                positionId TEXT,
                sentiment TEXT,
                lsrtrend TEXT,
                oitrend TEXT,
                lsrsignal TEXT,
                oisignal TEXT,
                sentiment_adds_margin BOOLEAN DEFAULT 0,
                volume TEXT
            )
        `);

    // Adiciona a coluna positionId se não existir
    try {
      const columns = await this.db.all("PRAGMA table_info(trades)");
      const hasPositionId = columns.some((col: any) => col.name === 'positionId');
      if (!hasPositionId) {
        await this.db.exec('ALTER TABLE trades ADD COLUMN positionId TEXT');
      }
    } catch (error) {
      // Se der erro (ex: coluna já existe), ignora
    }

    // Add sentiment columns if they don't exist
    try {
      const columns = await this.db.all("PRAGMA table_info(trades)");
      const sentimentColumns = ['sentiment', 'lsrtrend', 'oitrend', 'lsrsignal', 'oisignal'];
      for (const colName of sentimentColumns) {
        const hasColumn = columns.some((col: any) => col.name === colName);
        if (!hasColumn) {
          await this.db.exec(`ALTER TABLE trades ADD COLUMN ${colName} TEXT`);
        }
      }
    } catch (error) {
      // Ignore errors (e.g., column already exists)
    }

    // Adiciona a coluna sentiment_adds_margin se não existir
    try {
      const columns = await this.db.all("PRAGMA table_info(trades)");
      const has = columns.some((col: any) => col.name === 'sentiment_adds_margin');
      if (!has) {
        await this.db.exec('ALTER TABLE trades ADD COLUMN sentiment_adds_margin BOOLEAN DEFAULT 0');
      }
    } catch (error) {
      // Se der erro (ex: coluna já existe), ignora
    }

    // Adiciona a coluna sentiment_adds_margin se não existir
    try {
      const columns = await this.db.all("PRAGMA table_info(trades)");
      const has = columns.some((col: any) => col.name === 'volume');
      if (!has) {
        await this.db.exec('ALTER TABLE trades ADD COLUMN volume TEXT');
      }
    } catch (error) {
      // Se der erro (ex: coluna já existe), ignora
    }


    await this.db.exec(`
            CREATE TABLE IF NOT EXISTS order_details (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tradeId INTEGER NOT NULL,
                orderId TEXT NOT NULL,
                status TEXT NOT NULL,
                executedQuantity REAL,
                averagePrice REAL,
                createTime TEXT,
                updateTime TEXT,
                isFilled BOOLEAN,
                isCanceled BOOLEAN,
                isOpen BOOLEAN,
                pnl REAL,
                fee REAL,
                feeType TEXT,
                result REAL,
                createdAt TEXT NOT NULL,
                FOREIGN KEY (tradeId) REFERENCES trades(id)
            )
        `);

    await this.db.exec(`
            CREATE TABLE IF NOT EXISTS trade_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tradeId INTEGER NOT NULL,
                timestamp TEXT NOT NULL,
                pair TEXT NOT NULL,
                side TEXT NOT NULL,
                positionSide TEXT NOT NULL,
                type TEXT NOT NULL,
                price REAL,
                stopPrice REAL,
                quantity REAL,
                orderResponse TEXT NOT NULL,
                createdAt TEXT NOT NULL,
                FOREIGN KEY (tradeId) REFERENCES trades(id)
            )
        `);

    await this.db.exec(`
            CREATE TABLE IF NOT EXISTS trade_notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                type TEXT NOT NULL,
                interval TEXT NOT NULL,
                entry REAL NOT NULL,
                stop REAL NOT NULL,
                tp1 REAL,
                tp2 REAL,
                tp3 REAL,
                tp4 REAL,
                tp5 REAL,
                tp6 REAL,
                is_valid BOOLEAN NOT NULL,
                is_warning BOOLEAN NOT NULL DEFAULT 0,
                execution_error TEXT,
                volume_required BOOLEAN NOT NULL DEFAULT 0,
                volume_adds_margin BOOLEAN NOT NULL DEFAULT 0,
                setup_description TEXT,
                notification_data TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                createdAt TEXT NOT NULL
            )
        `);
  }

  public async saveTrade(
    trade: Trade,
    orders: {
      entryOrder: BingXOrderResponse;
      stopOrder: BingXOrderResponse;
      tpOrders: BingXOrderResponse[];
    },
    quantity: number,
    leverage: number,
  ): Promise<TradeRecord> {
    const now = new Date().toISOString();

    const result = await this.db.run(`
            INSERT INTO trades (
                symbol,
                type,
                interval,
                entry,
                stop,
                tp1,
                tp2,
                tp3,
                tp4,
                tp5,
                tp6,
                entryOrderId,
                stopOrderId,
                tp1OrderId,
                tp2OrderId,
                tp3OrderId,
                tp4OrderId,
                tp5OrderId,
                tp6OrderId,
                trailingStopOrderId,
                quantity,
                leverage,
                status,
                volume_adds_margin,
                setup_description,
                volume_required,
                createdAt,
                updatedAt,
                positionId,
                sentiment,
                lsrtrend,
                oitrend,
                lsrsignal,
                oisignal,
                sentiment_adds_margin,
                volume
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
      trade.symbol,
      trade.type,
      trade.interval,
      trade.entry,
      trade.stop,
      trade.tp1,
      trade.tp2,
      trade.tp3,
      trade.tp4,
      trade.tp5,
      trade.tp6,
      orders.entryOrder.data.order.orderId,
      orders.stopOrder.data.order.orderId,
      orders.tpOrders[0]?.data.order.orderId || null,
      orders.tpOrders[1]?.data.order.orderId || null,
      orders.tpOrders[2]?.data.order.orderId || null,
      orders.tpOrders[3]?.data.order.orderId || null,
      orders.tpOrders[4]?.data.order.orderId || null,
      orders.tpOrders[5]?.data.order.orderId || null,
      orders.tpOrders[6]?.data.order.orderId || null,
      quantity,
      leverage,
      'OPEN',
      trade.volume_adds_margin ? 1 : 0,
      trade.setup_description,
      trade.volume_required ? 1 : 0,
      now,
      now,
      trade.positionId || null,
      trade?.sentiment || null,
      trade?.lsrtrend || null,
      trade?.oitrend || null,
      trade?.lsrsignal || null,
      trade?.oisignal || null,
      trade?.sentiment_adds_margin || null,
      trade?.volume || null
    ]);

    return this.getTradeById(result.lastID);
  }

  public async getTradeById(id: number): Promise<TradeRecord> {
    return await this.db.get('SELECT * FROM trades WHERE id = ?', [id]);
  }

  public async getOpenTrades(): Promise<TradeRecord[]> {
    return await this.db.all('SELECT * FROM trades WHERE status = ?', ['OPEN']);
  }

  public async getClosedTrades(): Promise<TradeRecord[]> {
    return await this.db.all('SELECT * FROM trades WHERE status = ?', ['CLOSED']);
  }

  public async getAllTrades(): Promise<TradeRecord[]> {
    return await this.db.all('SELECT * FROM trades ORDER BY createdAt DESC');
  }

  public async updateTradeStatus(id: number, status: 'OPEN' | 'CLOSED'): Promise<void> {
    const now = new Date().toISOString();
    await this.db.run(
      'UPDATE trades SET status = ?, updatedAt = ? WHERE id = ?',
      [status, now, id]
    );
  }

  public async updateOrderIds(
    id: number,
    orderIds: {
      tp1OrderId?: string | null;
      tp2OrderId?: string | null;
      tp3OrderId?: string | null;
      tp4OrderId?: string | null;
      tp5OrderId?: string | null;
      tp6OrderId?: string | null;
      trailingStopOrderId?: string | null;
      entryOrderId?: string;
      stopOrderId?: string;
    }
  ): Promise<void> {
    const updates = [];
    const values = [];

    if ('entryOrderId' in orderIds) {
      if (orderIds.entryOrderId) {
        updates.push('entryOrderId = ?');
        values.push(BigInt(orderIds.entryOrderId).toString());
      }
    }
    if ('stopOrderId' in orderIds) {
      if (orderIds.stopOrderId) {
        updates.push('stopOrderId = ?');
        values.push(BigInt(orderIds.stopOrderId).toString());
      }
    }
    if ('tp1OrderId' in orderIds) {
      if (orderIds.tp1OrderId) {
        updates.push('tp1OrderId = ?');
        values.push(BigInt(orderIds.tp1OrderId).toString());
      }
    }
    if ('tp2OrderId' in orderIds) {
      if (orderIds.tp2OrderId) {
        updates.push('tp2OrderId = ?');
        values.push(BigInt(orderIds.tp2OrderId).toString());
      }
    }
    if ('tp3OrderId' in orderIds) {
      if (orderIds.tp3OrderId) {
        updates.push('tp3OrderId = ?');
        values.push(BigInt(orderIds.tp3OrderId).toString());
      }
    }
    if ('tp4OrderId' in orderIds) {
      if (orderIds.tp4OrderId) {
        updates.push('tp4OrderId = ?');
        values.push(BigInt(orderIds.tp4OrderId).toString());
      }
    }
    if ('tp5OrderId' in orderIds) {
      if (orderIds.tp5OrderId) {
        updates.push('tp5OrderId = ?');
        values.push(BigInt(orderIds.tp5OrderId).toString());
      }
    }
    if ('tp6OrderId' in orderIds) {
      if (orderIds.tp6OrderId) {
        updates.push('tp6OrderId = ?');
        values.push(BigInt(orderIds.tp6OrderId).toString());
      }
    }
    if ('trailingStopOrderId' in orderIds) {
      if (orderIds.trailingStopOrderId) {
        updates.push('trailingStopOrderId = ?');
        values.push(BigInt(orderIds.trailingStopOrderId).toString());
      }

    }

    if (updates.length > 0) {
      const now = new Date().toISOString();
      updates.push('updatedAt = ?');
      values.push(now);
      values.push(id);

      await this.db.run(
        `UPDATE trades SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }
  }

  public async updateLeverage(id: number, leverage: number): Promise<void> {
    const now = new Date().toISOString();
    await this.db.run(
      'UPDATE trades SET leverage = ?, updatedAt = ? WHERE id = ?',
      [leverage, now, id]
    );
  }

  public async saveOrderDetails(
    tradeId: number,
    orderId: string,
    details: {
      status: string;
      executedQuantity: number;
      averagePrice: number;
      createTime: Date;
      updateTime: Date;
      isFilled: boolean;
      isCanceled: boolean;
      isOpen: boolean;
      pnl?: number;
      fee?: number;
      feeType?: 'LIMIT' | 'MAKER';
      result?: number;
    }
  ): Promise<void> {
    const now = new Date().toISOString();

    await this.db.run(`
            INSERT INTO order_details (
                tradeId,
                orderId,
                status,
                executedQuantity,
                averagePrice,
                createTime,
                updateTime,
                isFilled,
                isCanceled,
                isOpen,
                pnl,
                fee,
                feeType,
                result,
                createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
      tradeId,
      orderId,
      details.status,
      details.executedQuantity,
      details.averagePrice,
      details.createTime.toISOString(),
      details.updateTime.toISOString(),
      details.isFilled ? 1 : 0,
      details.isCanceled ? 1 : 0,
      details.isOpen ? 1 : 0,
      details.pnl || null,
      details.fee || null,
      details.feeType || null,
      details.result || null,
      now
    ]);
  }

  public async hasOrderDetails(orderId: string): Promise<boolean> {
    const result = await this.db.get(
      'SELECT COUNT(*) as count FROM order_details WHERE orderId = ?',
      [orderId]
    );
    return result.count > 0;
  }

  public async saveTradeLog(
    tradeId: number,
    pair: string,
    side: 'BUY' | 'SELL',
    positionSide: 'LONG' | 'SHORT',
    type: 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_MARKET' | 'TRIGGER_LIMIT' | 'TRAILING_STOP_MARKET',
    price: number | null,
    stopPrice: number | null,
    quantity: number,
    orderResponse: BingXOrderResponse
  ): Promise<void> {
    const now = new Date().toISOString();

    await this.db.run(`
            INSERT INTO trade_logs (
                tradeId,
                timestamp,
                pair,
                side,
                positionSide,
                type,
                price,
                stopPrice,
                quantity,
                orderResponse,
                createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
      tradeId,
      now,
      pair,
      side,
      positionSide,
      type,
      price,
      stopPrice,
      quantity,
      JSON.stringify(orderResponse),
      now
    ]);
  }

  public async getTradeLogs(tradeId: number): Promise<any[]> {
    return await this.db.all('SELECT * FROM trade_logs WHERE tradeId = ? ORDER BY timestamp DESC', [tradeId]);
  }

  public async saveTradeNotification(notification: TradeNotification): Promise<void> {
    const now = new Date().toISOString();

    await this.db.run(`
            INSERT INTO trade_notifications (
                symbol,
                type,
                interval,
                entry,
                stop,
                tp1,
                tp2,
                tp3,
                tp4,
                tp5,
                tp6,
                is_valid,
                is_warning,
                execution_error,
                volume_required,
                volume_adds_margin,
                setup_description,
                notification_data,
                timestamp,
                createdAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
      notification.symbol,
      notification.type,
      notification.interval,
      notification.entry,
      notification.stop,
      notification.takeProfits.tp1,
      notification.takeProfits.tp2,
      notification.takeProfits.tp3,
      notification.takeProfits.tp4,
      notification.takeProfits.tp5,
      notification.takeProfits.tp6,
      notification.validation.isValid ? 1 : 0,
      notification.isWarning ? 1 : 0,
      notification.executionError || null,
      notification.volume_required ? 1 : 0,
      notification.volume_adds_margin ? 1 : 0,
      notification.setup_description,
      JSON.stringify(notification),
      notification.timestamp,
      now
    ]);
  }

  public async getTradeNotifications(
    filters: {
      symbol?: string;
      type?: 'LONG' | 'SHORT';
      is_valid?: boolean;
      is_warning?: boolean;
      volume_required?: boolean;
      volume_adds_margin?: boolean;
      start_date?: string;
      end_date?: string;
    } = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<TradeNotification[]> {
    const conditions = [];
    const values = [];

    if (filters.symbol) {
      conditions.push('symbol = ?');
      values.push(filters.symbol);
    }
    if (filters.type) {
      conditions.push('type = ?');
      values.push(filters.type);
    }
    if (filters.is_valid !== undefined) {
      conditions.push('is_valid = ?');
      values.push(filters.is_valid ? 1 : 0);
    }
    if (filters.is_warning !== undefined) {
      conditions.push('is_warning = ?');
      values.push(filters.is_warning ? 1 : 0);
    }
    if (filters.volume_required !== undefined) {
      conditions.push('volume_required = ?');
      values.push(filters.volume_required ? 1 : 0);
    }
    if (filters.volume_adds_margin !== undefined) {
      conditions.push('volume_adds_margin = ?');
      values.push(filters.volume_adds_margin ? 1 : 0);
    }
    if (filters.start_date) {
      conditions.push('timestamp >= ?');
      values.push(filters.start_date);
    }
    if (filters.end_date) {
      conditions.push('timestamp <= ?');
      values.push(filters.end_date);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Adiciona LIMIT e OFFSET
    const query = `SELECT notification_data FROM trade_notifications ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
    values.push(limit);
    values.push(offset);

    const rows = (await this.db.all(query, values)) as { notification_data: string }[];

    return rows.map(row => JSON.parse(row.notification_data));
  }

  public async getDistinctSymbols(): Promise<string[]> {
    const result = await this.db.all(`
            SELECT DISTINCT symbol FROM (
                SELECT symbol FROM trades
                UNION
                SELECT symbol FROM trade_notifications
            ) ORDER BY symbol
        `);

    return result.map((row: { symbol: string }) => row.symbol);
  }

  public async updatePositionId(id: number, positionId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.run(
      'UPDATE trades SET positionId = ?, updatedAt = ? WHERE id = ?',
      [positionId, now, id]
    );
  }

  public async updateTradeSentiment(id: number, sentimentData: {
    sentiment: string;
    lsrtrend: string;
    oitrend: string;
    lsrsignal: string;
    oisignal: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    await this.db.run(
      `UPDATE trades SET 
                sentiment = ?, 
                lsrtrend = ?, 
                oitrend = ?, 
                lsrsignal = ?, 
                oisignal = ?, 
                updatedAt = ? 
            WHERE id = ?`,
      [
        sentimentData.sentiment,
        sentimentData.lsrtrend,
        sentimentData.oitrend,
        sentimentData.lsrsignal,
        sentimentData.oisignal,
        now,
        id
      ]
    );
  }
} 
