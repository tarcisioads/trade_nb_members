import { KlineData, AllowedInterval } from '../../utils/types';

export interface IDataProvider {
    getKlineData(symbol: string, interval: AllowedInterval, limit?: number, noCache?: boolean): Promise<KlineData[]>;
    getName(): string;
}
