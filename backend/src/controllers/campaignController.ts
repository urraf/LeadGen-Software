import { Response } from 'express';
import type { AuthRequest } from '../middlewares/authMiddleware.js';
import { catchAsync, AppError, parsePagination } from '../utils/helpers.js';
import { campaignService } from '../services/CampaignService.js';
import type { CampaignStatus } from '../types/index.js';

export const createCampaign = catchAsync(async (req: AuthRequest, res: Response) => {
  const campaign = await campaignService.create(req.userId!, req.body);
  res.status(201).json({ success: true, data: campaign });
});

export const getCampaigns = catchAsync(async (req: AuthRequest, res: Response) => {
  const { page, limit } = parsePagination(
    Number(req.query.page) || 1,
    Number(req.query.limit) || 20,
  );
  const status = req.query.status as CampaignStatus | undefined;

  const { data, total } = await campaignService.list(req.userId!, page, limit, status);

  res.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export const getCampaign = catchAsync(async (req: AuthRequest, res: Response) => {
  const campaign = await campaignService.getById(req.userId!, req.params.id as string);
  res.json({ success: true, data: campaign });
});

export const updateCampaign = catchAsync(async (req: AuthRequest, res: Response) => {
  const campaign = await campaignService.update(req.userId!, req.params.id as string, req.body);
  res.json({ success: true, data: campaign });
});

export const deleteCampaign = catchAsync(async (req: AuthRequest, res: Response) => {
  await campaignService.delete(req.userId!, req.params.id as string);
  res.json({ success: true, message: 'Campaign deleted' });
});

export const startCampaign = catchAsync(async (req: AuthRequest, res: Response) => {
  const campaign = await campaignService.start(req.userId!, req.params.id as string);
  res.json({ success: true, data: campaign, message: 'Campaign started — search job queued' });
});

export const pauseCampaign = catchAsync(async (req: AuthRequest, res: Response) => {
  const campaign = await campaignService.pause(req.userId!, req.params.id as string);
  res.json({ success: true, data: campaign, message: 'Campaign paused' });
});

export const stopCampaign = catchAsync(async (req: AuthRequest, res: Response) => {
  const campaign = await campaignService.stop(req.userId!, req.params.id as string);
  res.json({ success: true, data: campaign, message: 'Campaign stopped' });
});
