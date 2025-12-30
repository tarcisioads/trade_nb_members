export interface PositionHistory {
  positionId: string
  symbol: string
  positionSide: string
  isolated: boolean
  closeAllPositions: boolean
  positionAmt: string
  closePositionAmt: string
  realisedProfit: string
  netProfit: string
  avgClosePrice: number
  avgPrice: string
  leverage: number
  positionCommission: string
  totalFunding: string
  openTime: number
  closeTime: number
  updateTime: number
  tradeInfo?: {
    found: boolean
    trade?: {
      id: number
      symbol: string
      type: string
      entry: number
      stop: number
      tp1: number
      tp2: number | null
      tp3: number | null
      tp4: number | null
      tp5: number | null
      tp6: number | null
      quantity: number
      leverage: number
      status: string
      setup_description: string | null
      createdAt: string
      updatedAt: string
      timeDifference: number
      volume?: string
      sentiment?: string
    }
    message: string
  }
}

export interface PositionStats {
  totalPositions: number
  totalProfit: number
  totalLoss: number
  netProfit: number
  winRate: number
  avgProfit: number
  avgLoss: number
  maxProfit: number
  maxLoss: number
  profitBySymbol: { [key: string]: number }
  profitBySide: { [key: string]: number }
  topProfitableSymbols?: { symbol: string; amount: number }[]
  topLosingSymbols?: { symbol: string; amount: number }[]
  riskMetrics?: {
    totalRisk: number
    avgRiskPerTrade: number
    maxRiskPerTrade: number
    riskRewardRatio: number
    avgRiskRewardRatio: number
    sharpeRatio: number
    maxDrawdown: number
    avgDrawdown: number
    consecutiveWins: number
    consecutiveLosses: number
    maxConsecutiveWins: number
    maxConsecutiveLosses: number
  }
  tradeMetrics?: {
    totalTradesWithInfo: number
    avgEntryPrice: number
    avgStopPrice: number
    avgTakeProfit1: number
    avgLeverage: number
    avgQuantity: number
    mostProfitableSymbol: string
    mostProfitableSide: string
    bestTradeId: number | null
    worstTradeId: number | null
    bestProfit: number
    worstProfit: number
  }
}

export interface DetailedRiskStats {
  summary: {
    totalPositions: number
    totalTradesWithInfo: number
    totalProfit: number
    totalLoss: number
    netProfit: number
  }
  riskAnalysis: {
    avgRiskPerTrade: number
    totalRisk: number
    riskDistribution: { [key: string]: number }
    maxRiskPerTrade: number
    minRiskPerTrade: number
  }
  rewardAnalysis: {
    avgRewardPerTrade: number
    totalReward: number
    rewardDistribution: { [key: string]: number }
    maxRewardPerTrade: number
    minRewardPerTrade: number
  }
  riskRewardAnalysis: {
    avgRiskRewardRatio: number
    riskRewardDistribution: { [key: string]: number }
    tradesWithPositiveRR: number
    tradesWithNegativeRR: number
    bestRiskRewardRatio: number
    worstRiskRewardRatio: number
    avgRiskReturnedPositive: number
  }
  performanceMetrics: {
    sharpeRatio: number
    sortinoRatio: number
    calmarRatio: number
    maxDrawdown: number
    avgDrawdown: number
    recoveryFactor: number
  }
  tradeAnalysis: {
    avgLeverage: number
    leverageDistribution: { [key: string]: number }
    avgQuantity: number
    quantityDistribution: { [key: string]: number }
    avgEntryPrice: number
    avgStopPrice: number
    avgTakeProfit1: number
  }
  symbolAnalysis: {
    [key: string]: {
      totalTrades: number
      totalProfit: number
      totalLoss: number
      avgRisk: number
      avgReward: number
      avgRR: number
      avgLeverage: number
    }
  }
  sideAnalysis: {
    [key: string]: {
      totalTrades: number
      totalProfit: number
      totalLoss: number
      avgRisk: number
      avgReward: number
      avgRR: number
      avgLeverage: number
    }
  }
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
}

export interface PaginationResponse<T> extends ApiResponse<T> {
  pagination: {
    pageIndex: number
    pageSize: number
    total: number
  }
} 