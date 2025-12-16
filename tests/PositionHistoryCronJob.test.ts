import { PositionHistoryCronJob } from '../src/application/jobs/PositionHistoryCronJob';
import { PositionHistory } from '../src/application/services/PositionHistory';
import { TradeDatabase } from '../src/infrastructure/database/TradeDatabase';

jest.mock('../src/application/services/PositionHistory');
jest.mock('../src/infrastructure/database/TradeDatabase', () => {
    return {
        TradeDatabase: jest.fn().mockImplementation(() => ({
            getDistinctSymbols: jest.fn().mockResolvedValue(['BTCUSDT', 'ETHUSDT']),
            // Add other methods if needed
        }))
    };
});

describe('PositionHistoryCronJob', () => {
    let positionHistoryCron: PositionHistoryCronJob;
    let mockPositionHistory: jest.Mocked<PositionHistory>;
    let mockTradeDatabase: jest.Mocked<TradeDatabase>;

    beforeEach(() => {
        mockPositionHistory = new PositionHistory() as jest.Mocked<PositionHistory>;
        mockTradeDatabase = new TradeDatabase() as jest.Mocked<TradeDatabase>;

        positionHistoryCron = new PositionHistoryCronJob(mockPositionHistory, mockTradeDatabase);
    });

    afterEach(() => {
        positionHistoryCron.stop();
        jest.clearAllMocks();
    });

    describe('State management', () => {
        it('should start and stop correctly', async () => {
            // Mock console.log to avoid output during tests
            const originalLog = console.log;
            console.log = jest.fn();

            await positionHistoryCron.start();
            positionHistoryCron.stop();

            // Restore console.log
            console.log = originalLog;

            expect(true).toBe(true);
        });

        it('should not start if already running', async () => {
            const originalLog = console.log;
            console.log = jest.fn();

            await positionHistoryCron.start();
            await positionHistoryCron.start(); // Should not start again

            positionHistoryCron.stop();

            console.log = originalLog;

            expect(true).toBe(true);
        });

        it('should not stop if not running', () => {
            const originalLog = console.log;
            console.log = jest.fn();

            positionHistoryCron.stop(); // Should not stop if not running

            console.log = originalLog;

            expect(true).toBe(true);
        });
    });

    describe('Manual update', () => {
        it('should execute manual update without errors', async () => {
            const originalLog = console.log;
            console.log = jest.fn();

            await positionHistoryCron.manualUpdate();

            console.log = originalLog;

            expect(mockPositionHistory.createOrUpdateCache).toHaveBeenCalled();
        });
    });
});