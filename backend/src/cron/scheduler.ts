import cron from 'node-cron';
import { campaignRepository } from '../repositories/CampaignRepository.js';
import { searchQueue } from '../queues/searchQueue.js';
import { logger } from '../utils/logger.js';

export function startScheduler(): void {
  // Daily search at 2:30 AM UTC (8:00 AM IST)
  cron.schedule('30 2 * * *', async () => {
    logger.info('Cron: daily campaign search triggered');

    try {
      const activeCampaigns = await campaignRepository.findActive();

      if (activeCampaigns.length === 0) {
        logger.info('Cron: no active campaigns with scheduling enabled');
        return;
      }

      for (const campaign of activeCampaigns) {
        await searchQueue.add('cron-search', {
          userId: campaign.userId.toString(),
          campaignId: campaign._id.toString(),
        });

        logger.info(`Cron: search job queued for campaign "${campaign.name}" by User ${campaign.userId}`);
      }

      logger.info(`Cron: ${activeCampaigns.length} campaign search jobs queued`);
    } catch (error) {
      logger.error('Cron: failed to trigger daily campaign searches:', error);
    }
  });

  logger.info('Cron scheduler started — daily search at 2:30 AM UTC (8:00 AM IST)');
}
