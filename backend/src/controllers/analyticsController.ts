import { Response } from 'express';
import type { AuthRequest } from '../middlewares/authMiddleware.js';
import { catchAsync } from '../utils/helpers.js';
import { analyticsService } from '../services/AnalyticsService.js';

export const getOverview = catchAsync(async (req: AuthRequest, res: Response) => {
  const overview = await analyticsService.getOverview(req.userId!);
  res.json({ success: true, data: overview });
});

export const getDailyStats = catchAsync(async (req: AuthRequest, res: Response) => {
  const days = Number(req.query.days) || 30;
  const daily = await analyticsService.getDailyStats(req.userId!, days);
  res.json({ success: true, data: daily });
});

export const getTopStats = catchAsync(async (req: AuthRequest, res: Response) => {
  const [categories, cities, funnel] = await Promise.all([
    analyticsService.getTopCategories(req.userId!),
    analyticsService.getTopCities(req.userId!),
    analyticsService.getFunnel(req.userId!),
  ]);

  res.json({
    success: true,
    data: { categories, cities, funnel },
  });
});
