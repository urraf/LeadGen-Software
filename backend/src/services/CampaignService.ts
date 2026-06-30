import { campaignRepository } from '../repositories/CampaignRepository.js';
import { searchQueue } from '../queues/searchQueue.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/helpers.js';
import type { CampaignDocument } from '../models/Campaign.js';
import type { CampaignStatus } from '../types/index.js';

export class CampaignService {
  async create(userId: string, data: Partial<CampaignDocument>): Promise<CampaignDocument> {
    const campaign = await campaignRepository.create(userId, {
      ...data,
      status: 'PAUSED',
      stats: { totalSearched: 0, totalLeads: 0, totalContacted: 0, totalWithWebsite: 0, totalWithoutWebsite: 0 },
    });
    logger.info(`Campaign created: "${campaign.name}" (${campaign._id}) by User ${userId}`);
    return campaign;
  }

  async getById(userId: string, id: string): Promise<CampaignDocument> {
    const campaign = await campaignRepository.findById(userId, id);
    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }
    return campaign;
  }

  async list(
    userId: string,
    page: number = 1,
    limit: number = 20,
    status?: CampaignStatus,
  ): Promise<{ data: CampaignDocument[]; total: number }> {
    const filter = status ? { status } : {};
    return campaignRepository.findAll(userId, filter, page, limit);
  }

  async update(userId: string, id: string, data: Partial<CampaignDocument>): Promise<CampaignDocument> {
    const campaign = await campaignRepository.update(userId, id, data);
    if (!campaign) {
      throw new AppError('Campaign not found', 404);
    }
    logger.info(`Campaign updated: "${campaign.name}" (${campaign._id}) by User ${userId}`);
    return campaign;
  }

  async delete(userId: string, id: string): Promise<void> {
    const deleted = await campaignRepository.delete(userId, id);
    if (!deleted) {
      throw new AppError('Campaign not found', 404);
    }
    logger.info(`Campaign deleted: ${id} by User ${userId}`);
  }

  async start(userId: string, id: string): Promise<CampaignDocument> {
    const campaign = await this.getById(userId, id);

    if (campaign.status === 'ACTIVE') {
      throw new AppError('Campaign is already active', 400);
    }

    // Update status to ACTIVE
    const updated = await campaignRepository.updateStatus(userId, id, 'ACTIVE');
    if (!updated) throw new AppError('Failed to start campaign', 500);

    // Enqueue an immediate search job (include userId)
    await searchQueue.add('search', { campaignId: id, userId });

    logger.info(`Campaign started: "${campaign.name}" — search job queued by User ${userId}`);
    return updated;
  }

  async pause(userId: string, id: string): Promise<CampaignDocument> {
    const campaign = await this.getById(userId, id);

    if (campaign.status !== 'ACTIVE') {
      throw new AppError('Campaign is not active', 400);
    }

    const updated = await campaignRepository.updateStatus(userId, id, 'PAUSED');
    if (!updated) throw new AppError('Failed to pause campaign', 500);

    logger.info(`Campaign paused: "${campaign.name}" by User ${userId}`);
    return updated;
  }

  async stop(userId: string, id: string): Promise<CampaignDocument> {
    const campaign = await this.getById(userId, id);

    const updated = await campaignRepository.updateStatus(userId, id, 'COMPLETED');
    if (!updated) throw new AppError('Failed to stop campaign', 500);

    logger.info(`Campaign stopped: "${campaign.name}" by User ${userId}`);
    return updated;
  }
}

export const campaignService = new CampaignService();
