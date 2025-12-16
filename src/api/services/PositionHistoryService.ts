import { TradeDatabase } from '../../infrastructure/database/TradeDatabase';
import { DatabasePositionHistoryService } from '../../infrastructure/database/DatabasePositionHistoryService';
import { TradeRecord, PositionHistory, TradeInfo } from '../../utils/types';
import { PositionStatisticsService } from '../../core/services/PositionStatisticsService';
import { TradeMatcherService } from '../../core/services/TradeMatcherService';

export class PositionHistoryService {
  private tradeDatabase: TradeDatabase;
  private dbService: DatabasePositionHistoryService;
  private positionStatsService: PositionStatisticsService;
  private tradeMatcherService: TradeMatcherService;

  constructor(
    dbService?: DatabasePositionHistoryService,
    tradeDatabase?: TradeDatabase,
    positionStatsService?: PositionStatisticsService,
    tradeMatcherService?: TradeMatcherService
  ) {
    this.dbService = dbService || new DatabasePositionHistoryService();
    this.tradeDatabase = tradeDatabase || new TradeDatabase();
    this.positionStatsService = positionStatsService || new PositionStatisticsService();
    this.tradeMatcherService = tradeMatcherService || new TradeMatcherService(this.tradeDatabase);
  }

  public async getPositionHistory(symbol: string, startTs?: number, endTs?: number, page: number = 1, pageSize: number = 100000): Promise<PositionHistory[]> {
    return this.dbService.getPositionHistory(symbol, startTs, endTs, page, pageSize);
  }

  public async getAllTrades(): Promise<TradeRecord[]> {
    return this.tradeDatabase.getAllTrades();
  }

  public async enrichPositionsWithTradeInfo(positions: PositionHistory[]): Promise<any[]> {
    return this.tradeMatcherService.enrichPositionsWithTradeInfo(positions);
  }

  public async findTradeForPosition(position: PositionHistory): Promise<TradeInfo> {
    return this.tradeMatcherService.findTradeForPosition(position);
  }

  public async savePositionHistory(positions: PositionHistory[]): Promise<void> {
    return this.dbService.savePositionHistory(positions);
  }

  public calculateStats(positions: PositionHistory[]): any {
    return this.positionStatsService.calculateStats(positions);
  }

  public calculateDetailedRiskStats(positions: any[]): any {
    return this.positionStatsService.calculateDetailedRiskStats(positions);
  }
}
