import { Request, Response } from 'express';
import { NotificationTradeService } from '../services/notificationTradeService';
import { TradeNotification } from '../../utils/types';

export class NotificationController {
    private notificationService: NotificationTradeService;

    constructor() {
        this.notificationService = new NotificationTradeService();
    }

    async getNotifications(req: Request, res: Response): Promise<void> {
        try {
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 15;
            const page = req.query.page ? parseInt(req.query.page as string) : 1;
            const notifications = await this.notificationService.getNotifications(limit, page);
            res.status(200).json(notifications);
        } catch (error) {
            console.error('Error getting notifications:', error);
            res.status(500).json({ error: 'Failed to get notifications' });
        }
    }

    async handleMarketTrade(req: Request, res: Response): Promise<void> {
        try {
            const tradeNotification = req.body as TradeNotification;
            
            // Validate required fields
            if (!tradeNotification.symbol || !tradeNotification.type || !tradeNotification.entry) {
                const missingFields = [];
                if (!tradeNotification.symbol) missingFields.push('symbol');
                if (!tradeNotification.type) missingFields.push('type');
                if (!tradeNotification.entry) missingFields.push('entry');
                
                res.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}` });
                return;
            }

            const savedNotification = await this.notificationService.handleMarketTrade(tradeNotification);
            res.status(200).json(savedNotification);
        } catch (error) {
            console.error('Error handling market trade:', error);
            res.status(500).json({ error: 'Failed to process market trade' });
        }
    }

    async handleTpAdjustedMarketTrade(req: Request, res: Response): Promise<void> {
        try {
            const tradeNotification = req.body as TradeNotification;
            
            // Validate required fields
            if (!tradeNotification.symbol || !tradeNotification.type || !tradeNotification.entry || !tradeNotification.takeProfits.tp1) {
                const missingFields = [];
                if (!tradeNotification.symbol) missingFields.push('symbol');
                if (!tradeNotification.type) missingFields.push('type');
                if (!tradeNotification.entry) missingFields.push('entry');
                if (!tradeNotification.takeProfits.tp1) missingFields.push('takeProfits.tp1');
                
                res.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}` });
                return;
            }

            const savedNotification = await this.notificationService.handleTpAdjustedMarketTrade(tradeNotification);
            res.status(200).json(savedNotification);
        } catch (error) {
            console.error('Error handling tp adjusted market trade:', error);
            res.status(500).json({ error: 'Failed to process tp adjusted market trade' });
        }
    }
} 