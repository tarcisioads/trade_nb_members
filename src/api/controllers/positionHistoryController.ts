import { Request, Response } from 'express';
import { PositionHistoryService } from '../services/PositionHistoryService';

export class PositionHistoryController {
    private positionHistoryService: PositionHistoryService;

    constructor() {
        this.positionHistoryService = new PositionHistoryService();
        this.initialize();
    }

    private async initialize(): Promise<void> {
        // Se necessário, inicialize o banco de dados aqui
        // await this.positionHistoryService.initialize();
    }

    /**
     * Denormalizes a symbol from BingX format (e.g., "BTC-USDT") to original format (e.g., "BTCUSDT")
     */
    private denormalizeSymbolBingX(symbol: string): string {
        if (symbol === 'ALL') {
            return symbol;
        }
        // Remove the dash and convert to uppercase
        return symbol.replace('-', '').toUpperCase();
    }

    /**
     * Filters positions by minimum result value
     * @param positions Array of positions to filter
     * @param minResult Minimum result value (absolute value comparison)
     * @returns Filtered positions
     */
    private filterByMinResult(positions: any[], minResult: string | undefined): any[] {
        if (minResult === undefined || minResult === null) {
            return positions;
        }

        const minResultValue = parseFloat(minResult);
        if (isNaN(minResultValue)) {
            return positions;
        }

        return positions.filter(position => {
            const netProfit = parseFloat(position.netProfit);
            // Use absolute value of netProfit and compare with minResultValue
            return Math.abs(netProfit) >= minResultValue;
        });
    }

    public async getPositionHistory(req: Request, res: Response): Promise<void> {
        try {
            const { 
                symbol = 'ALL', 
                setupDescription,
                startTs, 
                endTs,
                minResult
            } = req.query;

            const positions = await this.positionHistoryService.getPositionHistory(
                symbol as string,
                startTs ? parseInt(startTs as string) : undefined,
                endTs ? parseInt(endTs as string) : undefined,
                1,
                100000
            );

            let positionsWithTradeInfo = await this.positionHistoryService.enrichPositionsWithTradeInfo(positions);

            if (setupDescription && setupDescription !== 'ALL') {
                positionsWithTradeInfo = positionsWithTradeInfo.filter(position => 
                    (!position.tradeInfo?.found) ||( 
                    position.tradeInfo?.found && 
                    position.tradeInfo.trade?.setup_description === setupDescription)
                );
            }

            // Filter by minimum result
            positionsWithTradeInfo = this.filterByMinResult(positionsWithTradeInfo, minResult as string);

            res.json({
                success: true,
                data: positionsWithTradeInfo,
                total: positionsWithTradeInfo.length
            });
        } catch (error) {
            console.error('Error fetching position history:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch position history'
            });
        }
    }

    public async getPositionStats(req: Request, res: Response): Promise<void> {
        try {
            const { symbol = 'ALL', setupDescription, startTs, endTs, minResult } = req.query;

            const positions = await this.positionHistoryService.getPositionHistory(
                symbol as string,
                startTs ? parseInt(startTs as string) : undefined,
                endTs ? parseInt(endTs as string) : undefined,
                1,
                100000
            );

            let positionsWithTradeInfo = await this.positionHistoryService.enrichPositionsWithTradeInfo(positions);

            if (setupDescription && setupDescription !== 'ALL') {
                positionsWithTradeInfo = positionsWithTradeInfo.filter(position => 
                    (!position.tradeInfo?.found) ||( 
                        position.tradeInfo?.found && 
                        position.tradeInfo.trade?.setup_description === setupDescription)
                );
            }

            // Filter by minimum result
            positionsWithTradeInfo = this.filterByMinResult(positionsWithTradeInfo, minResult as string);

            const stats = this.positionHistoryService.calculateStats(positionsWithTradeInfo);

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Error calculating position stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to calculate position stats'
            });
        }
    }

    public async getAvailableSymbols(req: Request, res: Response): Promise<void> {
        try {
            console.log('Fetching available symbols...');
            const positions = await this.positionHistoryService.getPositionHistory('ALL', undefined, undefined, 1, 100000);
            console.log(`Retrieved ${positions.length} positions for symbol extraction`);
            
            if (!positions || positions.length === 0) {
                console.log('No positions found, returning empty symbols array');
                res.json({
                    success: true,
                    data: []
                });
                return;
            }
            
            const symbols = [...new Set(positions.map(p => p.symbol))].sort();
            console.log(`Extracted ${symbols.length} unique symbols:`, symbols);
            
            res.json({
                success: true,
                data: symbols
            });
        } catch (error) {
            console.error('Error fetching available symbols:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch available symbols',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    public async getPositionWithTradeInfo(req: Request, res: Response): Promise<void> {
        try {
            const { positionId } = req.params;
            const positions = await this.positionHistoryService.getPositionHistory('ALL', undefined, undefined, 1, 100000);
            const position = positions.find(p => p.positionId === positionId);
            if (!position) {
                res.status(404).json({
                    success: false,
                    error: 'Position not found'
                });
                return;
            }
            const tradeInfo = await this.positionHistoryService.findTradeForPosition(position);
            res.json({
                success: true,
                data: {
                    position,
                    tradeInfo
                }
            });
        } catch (error) {
            console.error('Error fetching position with trade info:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch position with trade info'
            });
        }
    }

    public async getDetailedRiskStats(req: Request, res: Response): Promise<void> {
        try {
            const { symbol = 'ALL', setupDescription, startTs, endTs, minResult } = req.query;
            const positions = await this.positionHistoryService.getPositionHistory(
                symbol as string,
                startTs ? parseInt(startTs as string) : undefined,
                endTs ? parseInt(endTs as string) : undefined,
                1,
                100000
            );
            let positionsWithTradeInfo = await this.positionHistoryService.enrichPositionsWithTradeInfo(positions);
            if (setupDescription && setupDescription !== 'ALL') {
                positionsWithTradeInfo = positionsWithTradeInfo.filter(position => 
                    (!position.tradeInfo?.found) ||( 
                        position.tradeInfo?.found && 
                        position.tradeInfo.trade?.setup_description === setupDescription)
                );
            }

            // Filter by minimum result
            positionsWithTradeInfo = this.filterByMinResult(positionsWithTradeInfo, minResult as string);

            const detailedStats = this.positionHistoryService.calculateDetailedRiskStats(positionsWithTradeInfo);
            res.json({
                success: true,
                data: detailedStats
            });
        } catch (error) {
            console.error('Error calculating detailed risk stats:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to calculate detailed risk stats'
            });
        }
    }

    public async getAvailableSetupDescriptions(req: Request, res: Response): Promise<void> {
        try {
            const allTrades = await this.positionHistoryService.getAllTrades();
            const setupDescriptions = [...new Set(allTrades.map(trade => trade.setup_description).filter(Boolean))].sort();
            res.json({
                success: true,
                data: setupDescriptions
            });
        } catch (error) {
            console.error('Error fetching available setup descriptions:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch available setup descriptions'
            });
        }
    }

    public async createPositionHistory(req: Request, res: Response): Promise<void> {
        try {
            const position: any = req.body;
            await this.positionHistoryService.savePositionHistory([position]);
            res.status(201).json({ success: true, message: 'Position history created successfully' });
        } catch (error) {
            console.error('Error creating position history:', error);
            res.status(500).json({ success: false, error: 'Failed to create position history' });
        }
    }

    public async updatePositionHistory(req: Request, res: Response): Promise<void> {
        try {
            const { positionId } = req.params;
            const position: any = req.body;
            position.positionId = positionId;
            await this.positionHistoryService.savePositionHistory([position]);
            res.json({ success: true, message: 'Position history updated successfully' });
        } catch (error) {
            console.error('Error updating position history:', error);
            res.status(500).json({ success: false, error: 'Failed to update position history' });
        }
    }

    public async getPositionHistoryById(req: Request, res: Response): Promise<void> {
        try {
            const { positionId } = req.params;
            const positions = await this.positionHistoryService.getPositionHistory('ALL', undefined, undefined, 1, 100000);
            const position = positions.find(p => p.positionId === positionId);
            if (!position) {
                res.status(404).json({ success: false, error: 'Position not found' });
                return;
            }
            res.json(position);
        } catch (error) {
            console.error('Error fetching position history by id:', error);
            res.status(500).json({ success: false, error: 'Failed to fetch position history by id' });
        }
    }
} 