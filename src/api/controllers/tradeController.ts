import { Request, Response } from 'express';
import { TradeService } from '../services/tradeService';
import { Trade } from '../../utils/types';
import { PositionValidator } from '../../core/services/PositionValidator';

export class TradeController {
    private tradeService: TradeService;
    private positionValidator: PositionValidator;

    constructor() {
        this.tradeService = new TradeService();
        this.positionValidator = new PositionValidator();
    }

    async checkOpenPosition(req: Request, res: Response): Promise<void> {
        try {
            const { symbol, type } = req.query;

            if (!symbol || typeof symbol !== 'string') {
                res.status(400).json({ error: 'Symbol is required' });
                return;
            }

            // If type is provided, check specific side, otherwise check both
            if (type && (type === 'LONG' || type === 'SHORT')) {
                const result = await this.positionValidator.hasOpenPosition(symbol, type);
                res.json(result);
            } else {
                // Check both sides if type not specified
                const longResult = await this.positionValidator.hasOpenPosition(symbol, 'LONG');
                const shortResult = await this.positionValidator.hasOpenPosition(symbol, 'SHORT');
                
                res.json({
                    hasPosition: longResult.hasPosition || shortResult.hasPosition,
                    details: {
                        long: longResult,
                        short: shortResult
                    },
                    message: longResult.hasPosition || shortResult.hasPosition 
                        ? `Open positions found for ${symbol}` 
                        : `No open positions found for ${symbol}`
                });
            }
        } catch (error) {
            console.error('Error checking open position:', error);
            res.status(500).json({ error: 'Failed to check open position' });
        }
    }

    async listTrades(req: Request, res: Response): Promise<void> {
        try {
            const trades = await this.tradeService.readTrades();
            res.json(trades);
        } catch (error) {
            res.status(500).json({ error: 'Failed to read trades' });
        }
    }

    async addTrade(req: Request, res: Response): Promise<void> {
        try {
            const newTrade = req.body as Trade;
            
            // Validate required fields
            if (!newTrade.entry || !newTrade.stop || !newTrade.type || !newTrade.tp1 || !newTrade.symbol || !newTrade.setup_description) {
                const missingFields = [];
                if (!newTrade.entry) missingFields.push('entry');
                if (!newTrade.stop) missingFields.push('stop');
                if (!newTrade.type) missingFields.push('type');
                if (!newTrade.tp1) missingFields.push('tp1');
                if (!newTrade.symbol) missingFields.push('symbol');
                if (!newTrade.setup_description) missingFields.push('setup_description');
                
                res.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}` });
                return;
            }

            const trade = await this.tradeService.addTrade(newTrade);
            res.status(201).json(trade);
        } catch (error) {
            res.status(500).json({ error: 'Failed to add trade' });
        }
    }

    async updateTrade(req: Request, res: Response): Promise<void> {
        try {
            const index = parseInt(req.params.index);
            const tradeUpdate = req.body as Partial<Trade>;
            
            const updatedTrade = await this.tradeService.updateTrade(index, tradeUpdate);
            res.json(updatedTrade);
        } catch (error) {
            if (error instanceof Error && error.message === 'Trade not found') {
                res.status(404).json({ error: 'Trade not found' });
            } else {
                res.status(500).json({ error: 'Failed to update trade' });
            }
        }
    }

    async deleteTrade(req: Request, res: Response): Promise<void> {
        try {
            const index = parseInt(req.params.index);
            const deletedTrade = await this.tradeService.deleteTrade(index);
            res.json(deletedTrade);
        } catch (error) {
            if (error instanceof Error && error.message === 'Trade not found') {
                res.status(404).json({ error: 'Trade not found' });
            } else {
                res.status(500).json({ error: 'Failed to delete trade' });
            }
        }
    }

    async getTrade(req: Request, res: Response): Promise<void> {
        try {
            const index = parseInt(req.params.index);
            const trade = await this.tradeService.getTrade(index);
            res.json(trade);
        } catch (error) {
            if (error instanceof Error && error.message === 'Trade not found') {
                res.status(404).json({ error: 'Trade not found' });
            } else {
                res.status(500).json({ error: 'Failed to get trade' });
            }
        }
    }
} 