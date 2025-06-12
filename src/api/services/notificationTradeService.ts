import { TradeDatabase } from '../../TradeDatabase';
import { TradeNotification, Trade } from '../../utils/types';
import { TradeExecutor } from '../../TradeExecutor';
import { NotificationService } from '../../NotificationService';

export class NotificationTradeService {
    private tradeDatabase: TradeDatabase;
    private tradeExecutor: TradeExecutor;
    private notificationService: NotificationService;

    constructor() {
        this.tradeDatabase = new TradeDatabase();
        this.tradeExecutor = new TradeExecutor();
        this.notificationService = new NotificationService();
    }

    async getNotifications(limit?: number): Promise<TradeNotification[]> {
        const notifications = await this.tradeDatabase.getTradeNotifications();
        if (limit) {
            return notifications.slice(0, limit);
        }
        return notifications;
    }

    private convertToTrade(notification: TradeNotification): Trade {
        return {
            symbol: notification.symbol,
            type: notification.type,
            entry: notification.entry,
            stop: notification.stop,
            tp1: notification.takeProfits.tp1,
            tp2: notification.takeProfits.tp2,
            tp3: notification.takeProfits.tp3,
            tp4: notification.takeProfits.tp4,
            tp5: notification.takeProfits.tp5,
            tp6: notification.takeProfits.tp6,
            volume_adds_margin: notification.volume_adds_margin,
            setup_description: notification.setup_description,
            volume_required: notification.volume_required,
            modify_tp1: false,
            interval: notification.interval
        };
    }


    private async executeTrade(trade: Trade, tradeNotification: TradeNotification) {
        console.log(trade)
        // Check if BingX API credentials are available
        const bingxApiKey = process.env.BINGX_API_KEY;
        const bingxApiSecret = process.env.BINGX_API_SECRET;

        if (!bingxApiKey || !bingxApiSecret) {
            console.log('\nTrade Execution Skipped:');
            console.log('BingX API credentials not configured. Please set bingx_api_key and bingx_api_secret environment variables.');
            console.log('----------------------------------------');
            
            // Send notification about skipped execution
            await this.notificationService.sendTradeNotification({
                symbol: trade.symbol,
                type: trade.type,
                entry: trade.entry,
                stop: trade.stop,
                takeProfits: {
                    tp1: trade.tp1,
                    tp2: trade.tp2,
                    tp3: trade.tp3,
                    tp4: trade.tp4,
                    tp5: trade.tp5,
                    tp6: trade.tp6
                },
                validation: {
                    isValid: true,
                    message: 'Trade forced by user but skipped: Missing BingX API credentials',
                    volumeAnalysis: tradeNotification.validation.volumeAnalysis,
                    entryAnalysis: tradeNotification.validation.entryAnalysis,       
                }
                ,
                analysisUrl: tradeNotification.analysisUrl,
                executionError: 'BingX API credentials not configured',
                volume_adds_margin: trade.volume_adds_margin,
                setup_description: trade.setup_description,
                volume_required: trade.volume_required,
                isWarning: false,
                manually_generated: true
            });
            return;
        }

        // Execute the trade using TradeExecutor
        try {
            const executionResult = await this.tradeExecutor.executeTrade({
                symbol: trade.symbol,
                type: trade.type,
                entry: trade.entry,
                stop: trade.stop,
                tp1: trade.tp1,
                tp2: trade.tp2,
                tp3: trade.tp3,
                tp4: trade.tp4,
                tp5: trade.tp5,
                tp6: trade.tp6,
                volume_adds_margin: trade.volume_adds_margin,
                setup_description: trade.setup_description,
                volume_required: trade.volume_required,
                modify_tp1: false
            });

            if (executionResult.success) {
                console.log('\nTrade Execution Results:');
                console.log(`Status: ${executionResult.message}`);
                console.log(`Leverage: ${executionResult.data?.leverage.optimalLeverage}x`);
                console.log(`Quantity: ${executionResult.data?.quantity}`);
                
                // Volume margin info is now handled by TradeExecutor
                if (executionResult.data?.volumeMarginAdded) {
                    console.log(`Volume Margin Added: ${executionResult.data.volumeMarginAdded.percentage}%`);
                    console.log(`Base Margin: ${executionResult.data.volumeMarginAdded.baseMargin.toFixed(2)}`);
                    console.log(`Total Margin: ${executionResult.data.volumeMarginAdded.totalMargin.toFixed(2)}`);
                }
                
                console.log('----------------------------------------');

                // Send notification for valid trade
                await this.notificationService.sendTradeNotification({
                    symbol: trade.symbol,
                    type: trade.type,
                    entry: trade.entry,
                    stop: trade.stop,
                    takeProfits: {
                        tp1: trade.tp1,
                        tp2: trade.tp2,
                        tp3: trade.tp3,
                        tp4: trade.tp4,
                        tp5: trade.tp5,
                        tp6: trade.tp6
                    },
                    validation: {
                        isValid: true,
                        message: trade.modify_tp1 ? 'Trade forced by user (TP1 adjusted)' : 'Trade forced by user',
                        volumeAnalysis: tradeNotification.validation.volumeAnalysis,
                        entryAnalysis: tradeNotification.validation.entryAnalysis,       
                    },
                    analysisUrl: tradeNotification.analysisUrl,
                    volume_adds_margin: trade.volume_adds_margin,
                    setup_description: trade.setup_description,
                    volume_required: trade.volume_required,
                    executionResult: executionResult.success && executionResult.data ? {
                        leverage: executionResult.data.leverage.optimalLeverage,
                        quantity: executionResult.data.quantity,
                        entryOrderId: executionResult.data.entryOrder.data.order.orderId,
                        stopOrderId: executionResult.data.stopOrder.data.order.orderId,
                        volumeMarginAdded: executionResult.data.volumeMarginAdded
                    } : undefined,
                    executionError: !executionResult.success ? executionResult.message : undefined,
                    isWarning: false,
                    manually_generated: true

                });
            } else {
                console.error('\nTrade Execution Failed:');
                console.error(`Error: ${executionResult.message}`);
                console.log('----------------------------------------');
            }
        } catch (error) {
            console.error('Failed to execute trade:', error);
            // Send notification about execution failure
            await this.notificationService.sendTradeNotification({
                symbol: trade.symbol,
                type: trade.type,
                entry: trade.entry,
                stop: trade.stop,
                takeProfits: {
                    tp1: trade.tp1,
                    tp2: trade.tp2,
                    tp3: trade.tp3,
                    tp4: trade.tp4,
                    tp5: trade.tp5,
                    tp6: trade.tp6
                },
                validation: {
                    isValid: true,
                    message: trade.modify_tp1 ? 'Trade forced by user (TP1 adjusted)' : 'Trade forced by user',
                    volumeAnalysis: tradeNotification.validation.volumeAnalysis,
                    entryAnalysis: tradeNotification.validation.entryAnalysis,       
                },
                analysisUrl: tradeNotification.analysisUrl,
                executionError: error instanceof Error ? error.message : undefined,
                volume_adds_margin: trade.volume_adds_margin,
                setup_description: trade.setup_description,
                volume_required: trade.volume_required,
                isWarning: false,
                manually_generated: true

            });
        }

    }


    async handleMarketTrade(tradeNotification: TradeNotification): Promise<TradeNotification> {
        // Store the original notification first
        await this.tradeDatabase.saveTradeNotification(tradeNotification);
        
        // Convert notification to trade
        const trade = this.convertToTrade(tradeNotification);

        await this.executeTrade(trade, tradeNotification);

        return tradeNotification;
    }

    async handleTpAdjustedMarketTrade(tradeNotification: TradeNotification): Promise<TradeNotification> {
        // Store the original notification first
        await this.tradeDatabase.saveTradeNotification(tradeNotification);
        
        // Convert notification to trade
        const trade = this.convertToTrade(tradeNotification);
        trade.modify_tp1 = true; // Enable tp1 modification for adjusted trades
        
        await this.executeTrade(trade, tradeNotification);

        return tradeNotification;

    }
} 