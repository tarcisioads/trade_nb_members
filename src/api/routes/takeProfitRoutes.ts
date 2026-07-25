import { Router } from 'express';
import { TakeProfitController } from '../controllers/takeProfitController';

const router = Router();
const takeProfitController = new TakeProfitController();

router.post('/takeprofit', (req, res) => takeProfitController.calculateTakeProfit(req, res));

export default router;
