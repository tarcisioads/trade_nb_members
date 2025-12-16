export class PnLCalculator {
    public static calculatePnL(
        tradeType: 'LONG' | 'SHORT',
        entryPrice: number,
        exitPrice: number,
        quantity: number,
        leverage: number
    ): number {
        let pnl = 0;
        if (tradeType === 'LONG') {
            pnl = (exitPrice - entryPrice) * quantity * leverage;
        } else {
            pnl = (entryPrice - exitPrice) * quantity * leverage;
        }
        return pnl;
    }

    public static calculateFee(
        orderValue: number,
        leverage: number,
        feeRate: number
    ): number {
        // Calculate fee with leverage
        const leveragedOrderValue = orderValue * leverage;
        return leveragedOrderValue * feeRate;
    }

    public static calculateResult(pnl: number, fee: number): number {
        return pnl - fee;
    }
}
