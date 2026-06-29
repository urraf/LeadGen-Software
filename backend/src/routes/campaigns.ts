import { Router } from 'express';
import {
  createCampaign,
  getCampaigns,
  getCampaign,
  updateCampaign,
  deleteCampaign,
  startCampaign,
  pauseCampaign,
  stopCampaign,
} from '../controllers/campaignController.js';
import { validate } from '../middlewares/validate.js';
import { createCampaignSchema, updateCampaignSchema, campaignIdSchema } from '../schemas/campaignSchemas.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getCampaigns);
router.post('/', validate(createCampaignSchema), createCampaign);
router.get('/:id', validate(campaignIdSchema), getCampaign);
router.patch('/:id', validate(updateCampaignSchema), updateCampaign);
router.delete('/:id', validate(campaignIdSchema), deleteCampaign);
router.post('/:id/start', validate(campaignIdSchema), startCampaign);
router.post('/:id/pause', validate(campaignIdSchema), pauseCampaign);
router.post('/:id/stop', validate(campaignIdSchema), stopCampaign);

export default router;
