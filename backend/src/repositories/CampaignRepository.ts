import { Campaign, CampaignDocument } from '../models/Campaign.js';
import type { CampaignStatus, ICampaignStats } from '../types/index.js';
import { Types, FilterQuery } from 'mongoose';

export class CampaignRepository {
  async create(userId: string, data: Partial<CampaignDocument>): Promise<CampaignDocument> {
    const campaign = new Campaign({ ...data, userId });
    return campaign.save();
  }

  async findById(userId: string, id: string): Promise<CampaignDocument | null> {
    return Campaign.findOne({ _id: id, userId }).exec();
  }

  async findAll(
    userId: string,
    filter: FilterQuery<CampaignDocument> = {},
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: CampaignDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const finalFilter = { ...filter, userId };
    const [data, total] = await Promise.all([
      Campaign.find(finalFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      Campaign.countDocuments(finalFilter).exec(),
    ]);
    return { data, total };
  }

  async findActive(): Promise<CampaignDocument[]> {
    return Campaign.find({
      status: 'ACTIVE',
      'schedule.enabled': true,
    }).exec();
  }

  async update(userId: string, id: string, data: Partial<CampaignDocument>): Promise<CampaignDocument | null> {
    return Campaign.findOneAndUpdate({ _id: id, userId }, { $set: data }, { new: true }).exec();
  }

  async updateStatus(userId: string, id: string, status: CampaignStatus): Promise<CampaignDocument | null> {
    return Campaign.findOneAndUpdate({ _id: id, userId }, { $set: { status } }, { new: true }).exec();
  }

  async updateStats(userId: string, id: string, stats: Partial<ICampaignStats>): Promise<void> {
    const update: Record<string, number> = {};
    for (const [key, value] of Object.entries(stats)) {
      if (value !== undefined) {
        update[`stats.${key}`] = value;
      }
    }
    await Campaign.findOneAndUpdate({ _id: id, userId }, { $inc: update }).exec();
  }

  async updateLastRunAt(userId: string, id: string): Promise<void> {
    await Campaign.findOneAndUpdate({ _id: id, userId }, { $set: { lastRunAt: new Date() } }).exec();
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await Campaign.findOneAndDelete({ _id: id, userId }).exec();
    return result !== null;
  }

  async count(userId: string, filter: FilterQuery<CampaignDocument> = {}): Promise<number> {
    return Campaign.countDocuments({ ...filter, userId }).exec();
  }
}

export const campaignRepository = new CampaignRepository();
