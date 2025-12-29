import { PositionStatisticsService } from '../src/core/services/PositionStatisticsService';
import { PositionHistory } from '../src/utils/types';

describe('PositionStatisticsService', () => {
    let service: PositionStatisticsService;

    beforeEach(() => {
        service = new PositionStatisticsService();
    });

    const createMockPosition = (symbol: string, netProfit: string): PositionHistory => ({
        symbol,
        positionId: '1',
        positionSide: 'LONG',
        isolated: true,
        closeAllPositions: true,
        positionAmt: '1',
        closePositionAmt: '1',
        realisedProfit: netProfit,
        netProfit,
        avgClosePrice: 110,
        avgPrice: '100',
        leverage: 10,
        positionCommission: '0.1',
        totalFunding: '0.1',
        openTime: 1000,
        updateTime: 2000,
        closeTime: 2000,
        tradeInfo: null
    });

    it('should group remaining profitable symbols into "Others" when more than 10', () => {
        const positions: PositionHistory[] = [];

        // Create 12 profitable positions with different symbols
        // Symbols A-L with profits 120 down to 10
        const symbols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
        symbols.forEach((sym, index) => {
            positions.push(createMockPosition(sym, ((12 - index) * 10).toString()));
        });

        const stats = service.calculateStats(positions);

        expect(stats.topProfitableSymbols).toHaveLength(11); // 10 top + 1 Others

        // Check finding top 1 (A: 120)
        expect(stats.topProfitableSymbols[0].symbol).toBe('A');
        expect(stats.topProfitableSymbols[0].amount).toBe(120);

        // Check finding 10th (J: 30)
        expect(stats.topProfitableSymbols[9].symbol).toBe('J');
        expect(stats.topProfitableSymbols[9].amount).toBe(30);

        // Check "Others"
        // K (20) + L (10) = 30
        const others = stats.topProfitableSymbols.find((s: any) => s.symbol === 'Others');
        expect(others).toBeDefined();
        expect(others.amount).toBe(30);
    });

    it('should not add "Others" if profitable symbols <= 10', () => {
        const positions: PositionHistory[] = [];
        // 5 symbols
        ['A', 'B', 'C', 'D', 'E'].forEach((sym, index) => {
            positions.push(createMockPosition(sym, '100'));
        });

        const stats = service.calculateStats(positions);

        expect(stats.topProfitableSymbols).toHaveLength(5);
        expect(stats.topProfitableSymbols.find((s: any) => s.symbol === 'Others')).toBeUndefined();
    });

    it('should group remaining losing symbols into "Others" when more than 10', () => {
        const positions: PositionHistory[] = [];

        // Create 12 losing positions
        // Losses from -120 to -10 (stored as absolute values in topLosingSymbols)
        const symbols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
        symbols.forEach((sym, index) => {
            positions.push(createMockPosition(sym, (-((12 - index) * 10)).toString()));
        });

        const stats = service.calculateStats(positions);

        expect(stats.topLosingSymbols).toHaveLength(11);

        // Check top loser (A: 120)
        expect(stats.topLosingSymbols[0].symbol).toBe('A');
        expect(stats.topLosingSymbols[0].amount).toBe(120);

        // Check "Others"
        // K (20) + L (10) = 30
        const others = stats.topLosingSymbols.find((s: any) => s.symbol === 'Others');
        expect(others).toBeDefined();
        expect(others.amount).toBe(30);
    });
});
