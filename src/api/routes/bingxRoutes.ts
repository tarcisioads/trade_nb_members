import { Router } from 'express';
import { getContracts } from '../controllers/bingxController';

const router = Router();

router.get('/bingx/contracts', getContracts);

export default router;
