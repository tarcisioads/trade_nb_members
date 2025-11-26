import { BingXWebSocket } from '../BingXWebSocket';

export interface KlineData {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
}

export type AllowedInterval = '5m' | '15m' | '1h' | '4h' | '1d' | null;
export type TradeType = 'LONG' | 'SHORT';

export interface Trade {
  symbol: string;
  type: TradeType;
  entry: number;
  stop: number;
  tp1: number;
  tp2: number | null;
  tp3: number | null;
  tp4: number | null;
  tp5: number | null;
  tp6: number | null;
  volume_adds_margin: boolean;
  setup_description: string | null;
  volume_required: boolean;
  modify_tp1?: boolean | false;
  interval?: AllowedInterval | null;
  url_analysis?: string | null;
  isLoading?: boolean;
  isLoadingTP1?: boolean;
  positionId?: string | null;
  sentiment?: string | null;
  lsrtrend?: string | null;
  oitrend?: string | null;
  lsrsignal?: string | null;
  oisignal?: string | null;
  sentiment_required?: boolean | null;
  sentiment_adds_margin?: boolean | null;
  volume?: string | null;
}

export interface BingXOrderResponse {
  code: number;
  msg: string;
  data: {
    order: {
      orderId: string;
      clientOrderId: string;
      symbol: string;
      side: string;
      positionSide: string;
      type: string;
      price: string;
      stopPrice: string;
      quantity: string;
      status: string;
    }
  };
}

export interface Order {
  orderId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  positionSide: 'LONG' | 'SHORT';
  type: 'LIMIT' | 'MARKET' | 'STOP' | 'STOP_MARKET' | 'TAKE_PROFIT' | 'TAKE_PROFIT_MARKET';
  price: string;
  stopPrice: string;
  quantity: string;
  status: 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'REJECTED' | 'EXPIRED';
  clientOrderId: string;
  createTime: number;
  updateTime: number;
}

export interface Orders {
  orders: Order[]
}

export interface BingXOrdersResponse {
  code: number;
  msg: string;
  data: Orders;
}


export interface TradeRecord extends Trade {
  id: number;
  entryOrderId: string;
  stopOrderId: string;
  tp1OrderId: string | null;
  tp2OrderId: string | null;
  tp3OrderId: string | null;
  tp4OrderId: string | null;
  tp5OrderId: string | null;
  tp6OrderId: string | null;
  trailingStopOrderId: string | null;
  quantity: number;
  leverage: number;
  status: 'OPEN' | 'CLOSED';
  interval: AllowedInterval | null;
  createdAt: string;
  updatedAt: string;
  positionId?: string | null;
}

export interface TradeExecutionResult {
  success: boolean;
  message: string;
  data?: {
    entryOrder: BingXOrderResponse;
    stopOrder: BingXOrderResponse;
    tpOrders: BingXOrderResponse[];
    leverage: {
      optimalLeverage: number;
      theoreticalMaxLeverage: number;
      exchangeMaxLeverage: number;
      stopLossPercentage: number;
    };
    quantity: number;
    tradeRecord: TradeRecord;
    volumeMarginAdded?: {
      percentage: number;
      baseMargin: number;
      totalMargin: number;
    };
    sentimentMarginAdded?: {
      percentage: number;
      baseMargin: number;
      totalMargin: number;
    };
  };
}

export interface OrderDetails {
  status: string;
  executedQuantity: number;
  averagePrice: number;
  createTime: number;
  updateTime: number;
  isFilled: boolean;
  isCanceled: boolean;
  isOpen: boolean;
  pnl: number;
  fee: number;
  feeType?: 'LIMIT' | 'MAKER';
  result: number;
}

export interface Position {
  positionId: string;
  symbol: string;
  positionSide: 'LONG' | 'SHORT';
  positionAmt: string;
  avgPrice: string;
  markPrice: string;
  margin: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
}

export interface BingXPositionResponse {
  code: number;
  msg: string;
  data: Position[];
}

export interface MonitoredPosition {
  symbol: string;
  positionSide: 'LONG' | 'SHORT';
  position: Position;
  websocket: BingXWebSocket;
  tradeId?: number;
  lastPrice?: number;
  stopLossOrder?: Order;
  initialStopPrice?: number;
  entryPrice?: number;
  leverage?: number;
  initialTp1?: number;
}

export interface TradeNotification {
  symbol: string;
  type: 'LONG' | 'SHORT';
  entry: number;
  stop: number;
  takeProfits: {
    tp1: number;
    tp2: number | null;
    tp3: number | null;
    tp4: number | null;
    tp5: number | null;
    tp6: number | null;
  };
  validation: {
    isValid: boolean;
    message: string;
    volumeAnalysis: {
      color: string;
      stdBar: number;
      currentVolume: number;
      mean: number;
      std: number;
    };
    entryAnalysis: {
      currentClose: number;
      canEnter: boolean;
      hasClosePriceBeforeEntry: boolean;
      message: string;
    };
  };
  analysisUrl: string;
  executionResult?: {
    leverage: number;
    quantity: number;
    entryOrderId: string;
    stopOrderId: string;
    volumeMarginAdded?: {
      percentage: number;
      baseMargin: number;
      totalMargin: number;
    };
    sentimentMarginAdded?: {
      percentage: number;
      baseMargin: number;
      totalMargin: number;
    };
  };
  executionError?: string;
  timestamp: string;
  isWarning?: boolean;
  volume_required: boolean;
  volume_adds_margin: boolean;
  setup_description: string | null;
  manually_generated?: boolean;
  interval?: AllowedInterval | null;
  sentiment_required?: boolean | null;
  sentiment_adds_margin?: boolean | null;

}

export interface PositionHistory {
  symbol: string;
  positionId: string;
  positionSide: string;
  isolated: boolean;
  closeAllPositions: boolean;
  positionAmt: string;
  closePositionAmt: string;
  realisedProfit: string;
  netProfit: string;
  avgClosePrice: number;
  avgPrice: string;
  leverage: number;
  positionCommission: string;
  totalFunding: string;
  openTime: number;
  updateTime: number;
  closeTime: number;
}

export interface PositionHistory {
  symbol: string;
  positionId: string;
  positionSide: string;
  isolated: boolean;
  closeAllPositions: boolean;
  positionAmt: string;
  closePositionAmt: string;
  realisedProfit: string;
  netProfit: string;
  avgClosePrice: number;
  avgPrice: string;
  leverage: number;
  positionCommission: string;
  totalFunding: string;
  openTime: number;
  updateTime: number;
  closeTime: number;
  tradeInfo: TradeInfo | null;
}

export interface TradeInfo {
  found: boolean;
  source: string | null;
  trade: TradeRecord | null;
  timeDifference: number | null;
  message: string;
  error: string | null;
}

export interface BingXPositionHistoryResponse {
  code: number;
  msg: string;
  data: {
    positionHistory: PositionHistory[];
  }
}

export interface Zone {
  type: 'ORDER_BLOCK' | 'FVG';
  candleIndex: number;
  price: number;
  candle: KlineData;
  mitigated: boolean;
  details?: any;
}

// Types from SentimentService
export type Sentiment = 'Bullish' | 'Bearish' | 'Neutral';
export type Trend = 'Up' | 'Down' | 'Neutral';
export type Side = 'Long' | 'Short';
export type Signal = 'Bullish' | 'Bearish' | 'Neutral';

export interface TrendAnalysis {
  trend: Trend;
  score: number;
}

// Defines the structure for the variation calculation result
export interface RatioVariationResult {
  symbol: string;
  currentRatio: number | null;
  variation: {
    vs1h: number | null;
    vs4h: number | null;
    vs24h: number | null;
  };
  timestamps: {
    current: number | null;
    h1: number | null;
    h4: number | null;
    d1: number | null;
  }
}

// Defines the structure for the variation calculation result
export interface OpenInterestVariationResult {
  symbol: string;
  currentOpenInterestValue: number | null;
  variation: {
    vs1h: number | null;
    vs4h: number | null;
    vs24h: number | null;
  };
  timestamps: {
    current: number | null;
    h1: number | null;
    h4: number | null;
    d1: number | null;
  }
}

export interface SentimentResult {
  sentiment: Sentiment;
  details: {
    side: TradeType;
    longShortRatio: RatioVariationResult;
    openInterest: OpenInterestVariationResult;
    analysis: {
      lsrTrend: TrendAnalysis;
      oiTrend: TrendAnalysis;
      lsrSignal: Signal;
      oiSignal: Signal;
    }
  };


}

export enum VolumeColor {
  RED = 'red',
  ORANGE = 'orange',
  YELLOW = 'yellow',
  WHITE = 'white',
  BLUE = 'blue'
}

export interface AnalyzeVolumeResult {
  color: VolumeColor;
  stdBar: number;
  mean: number;
  std: number;
  currentVolume: number;
};


