import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController';

const router = Router();
const notificationController = new NotificationController();

router.get('/notifications', (req, res) => notificationController.getNotifications(req, res));

router.post('/trade/market', (req, res) => notificationController.handleMarketTrade(req, res));

router.post('/trade/market/tp_adjusted', (req, res) =>
  notificationController.handleTpAdjustedMarketTrade(req, res)
);

export default router;
