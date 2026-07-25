import type {
  PositionHistory,
  PositionStats,
  ApiResponse,
  PaginationResponse,
} from '../types/positionHistory';

export class PositionHistoryService {
  private baseUrl = '/api';

  async getPositionHistory(params: {
    symbol?: string;
    startTs?: number;
    endTs?: number;
    pageIndex?: number;
    pageSize?: number;
  }): Promise<PaginationResponse<PositionHistory[]>> {
    const searchParams = new URLSearchParams();

    if (params.symbol) searchParams.append('symbol', params.symbol);
    if (params.startTs) searchParams.append('startTs', params.startTs.toString());
    if (params.endTs) searchParams.append('endTs', params.endTs.toString());
    if (params.pageIndex) searchParams.append('pageIndex', params.pageIndex.toString());
    if (params.pageSize) searchParams.append('pageSize', params.pageSize.toString());

    const response = await fetch(`${this.baseUrl}/position-history?${searchParams}`);
    return response.json();
  }

  async getPositionStats(params: {
    symbol?: string;
    startTs?: number;
    endTs?: number;
  }): Promise<ApiResponse<PositionStats>> {
    const searchParams = new URLSearchParams();

    if (params.symbol) searchParams.append('symbol', params.symbol);
    if (params.startTs) searchParams.append('startTs', params.startTs.toString());
    if (params.endTs) searchParams.append('endTs', params.endTs.toString());

    const response = await fetch(`${this.baseUrl}/position-history/stats?${searchParams}`);
    return response.json();
  }

  async getAvailableSymbols(): Promise<ApiResponse<string[]>> {
    const response = await fetch(`${this.baseUrl}/position-history/symbols`);
    return response.json();
  }
}

export const positionHistoryService = new PositionHistoryService();
