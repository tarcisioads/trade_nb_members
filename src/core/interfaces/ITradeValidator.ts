import { Trade } from '../entities/Trade';

export interface ValidationResult {
    isValid: boolean;
    message: string;
    warning?: boolean;
    volumeAnalysis?: any; // Define specific type if needed
    sentimentAnalysis?: any; // Define specific type if needed
    entryAnalysis?: any; // Define specific type if needed
}

export interface ITradeValidator {
    validateTrade(trade: Trade): Promise<ValidationResult>;
}
