import { Request, Response } from 'express';
import { TakeProfitService } from '../services/takeProfitService';

export class TakeProfitController {
  private takeProfitService: TakeProfitService;

  constructor() {
    this.takeProfitService = new TakeProfitService();
  }

  public async calculateTakeProfit(req: Request, res: Response): Promise<void> {
    const { symbol, side, entry, stop, interval } = req.body;

    if (!symbol || !side || typeof entry !== 'number' || typeof stop !== 'number') {
      res
        .status(400)
        .json({ error: 'symbol, side, entry, and stop are required and must be valid.' });
    }

    const takeProfits = await this.takeProfitService.calculateTakeProfits(
      symbol,
      side,
      entry,
      stop,
      interval
    );

    if (takeProfits.length === 0) {
      res.status(400).json({ error: 'side must be LONG or SHORT' });
    }

    res.json({ symbol, side, entry, stop, interval, takeProfits });
  }
}
