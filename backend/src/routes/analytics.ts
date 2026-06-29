import { Router } from 'express';
import { getOverview, getDailyStats, getTopStats } from '../controllers/analyticsController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/overview', getOverview);
router.get('/daily', getDailyStats);
router.get('/top', getTopStats);

export default router;
