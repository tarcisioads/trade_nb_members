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
