import { Lead, LeadDocument } from '../models/Lead.js';
import type { LeadStatus, BusinessData } from '../types/index.js';
import { FilterQuery, Types } from 'mongoose';

export interface LeadFilter {
  campaignId?: string;
  status?: LeadStatus | LeadStatus[];
  city?: string;
  minScore?: number;
  search?: string;
  hasWebsite?: boolean;
}

export class LeadRepository {
  async create(userId: string, data: Partial<LeadDocument>): Promise<LeadDocument> {
    const lead = new Lead({ ...data, userId });
    return lead.save();
  }

  async bulkCreate(userId: string, leads: Partial<LeadDocument>[]): Promise<LeadDocument[]> {
    const leadsWithUser = leads.map(lead => ({ ...lead, userId }));
    try {
      const result = await Lead.insertMany(leadsWithUser, { ordered: false });
      return result;
    } catch (error: unknown) {
      const mongoError = error as { insertedDocs?: LeadDocument[]; code?: number };
      if (mongoError.code === 11000 && mongoError.insertedDocs) {
        return mongoError.insertedDocs;
      }
      console.error('Lead bulkCreate error:', error);
      throw error;
    }
  }

  async findById(userId: string, id: string): Promise<LeadDocument | null> {
    return Lead.findOne({ _id: id, userId }).populate('messageHistory').exec();
  }

  async findByPhone(userId: string, phone: string): Promise<LeadDocument | null> {
    return Lead.findOne({ phone, userId }).exec();
  }

  async findByPlaceId(userId: string, placeId: string): Promise<LeadDocument | null> {
    return Lead.findOne({ placeId, userId }).exec();
  }

  async existsByPlaceId(userId: string, placeId: string): Promise<boolean> {
    const count = await Lead.countDocuments({ placeId, userId }).exec();
    return count > 0;
  }

  async existsByPlaceIds(userId: string, placeIds: string[]): Promise<Set<string>> {
    const existing = await Lead.find(
      { placeId: { $in: placeIds }, userId },
      { placeId: 1 }
    ).lean().exec();
    return new Set(existing.map((l) => l.placeId));
  }

  async findAll(
    userId: string,
    filter: LeadFilter = {},
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: LeadDocument[]; total: number }> {
    const query = this.buildFilter(userId, filter);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Lead.find(query).sort({ createdAt: -1, aiScore: -1 }).skip(skip).limit(limit).populate('messageHistory').exec(),
      Lead.countDocuments(query).exec(),
    ]);

    return { data, total };
  }

  async findByCampaign(
    userId: string,
    campaignId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: LeadDocument[]; total: number }> {
    return this.findAll(userId, { campaignId }, page, limit);
  }

  async update(userId: string, id: string, data: Partial<LeadDocument>): Promise<LeadDocument | null> {
    return Lead.findOneAndUpdate({ _id: id, userId }, { $set: data }, { new: true }).exec();
  }

  async updateStatus(userId: string, id: string, status: LeadStatus): Promise<LeadDocument | null> {
    return Lead.findOneAndUpdate({ _id: id, userId }, { $set: { status } }, { new: true }).exec();
  }

  async updateStatusByPhone(userId: string, phone: string, status: LeadStatus): Promise<LeadDocument | null> {
    return Lead.findOneAndUpdate(
      { phone, userId },
      { $set: { status } },
      { new: true }
    ).exec();
  }

  async addMessageToHistory(userId: string, leadId: string, messageId: string): Promise<void> {
    await Lead.findOneAndUpdate({ _id: leadId, userId }, {
      $push: { messageHistory: new Types.ObjectId(messageId) },
    }).exec();
  }

  async incrementFollowUpCount(userId: string, leadId: string): Promise<void> {
    await Lead.findOneAndUpdate({ _id: leadId, userId }, {
      $inc: { followUpCount: 1 },
    }).exec();
  }

  async setNextFollowUp(userId: string, leadId: string, date: Date | null): Promise<void> {
    await Lead.findOneAndUpdate({ _id: leadId, userId }, {
      $set: { nextFollowUpAt: date },
    }).exec();
  }

  async delete(userId: string, id: string): Promise<boolean> {
    const result = await Lead.findOneAndDelete({ _id: id, userId }).exec();
    return result !== null;
  }

  async count(userId: string, filter: LeadFilter = {}): Promise<number> {
    const query = this.buildFilter(userId, filter);
    return Lead.countDocuments(query).exec();
  }

  async countByCampaign(userId: string, campaignId: string): Promise<number> {
    return Lead.countDocuments({ campaignId: new Types.ObjectId(campaignId), userId }).exec();
  }

  async countByStatus(userId: string, status: LeadStatus): Promise<number> {
    return Lead.countDocuments({ status, userId }).exec();
  }

  private buildFilter(userId: string, filter: LeadFilter): FilterQuery<LeadDocument> {
    const query: FilterQuery<LeadDocument> = { userId };

    if (filter.campaignId) {
      query.campaignId = new Types.ObjectId(filter.campaignId);
    }
    if (filter.status) {
      if (Array.isArray(filter.status)) {
        query.status = { $in: filter.status };
      } else {
        query.status = filter.status;
      }
    }
    if (filter.city) {
      query.city = { $regex: filter.city, $options: 'i' };
    }
    if (filter.minScore !== undefined) {
      query.aiScore = { $gte: filter.minScore };
    }
    if (filter.search) {
      query.businessName = { $regex: filter.search, $options: 'i' };
    }
    if (filter.hasWebsite !== undefined) {
      if (filter.hasWebsite) {
        query.website = { $exists: true, $type: 'string', $ne: '' };
      } else {
        query.$or = [
          { website: { $exists: false } },
          { website: null },
          { website: '' }
        ];
      }
    }

    return query;
  }
}

export const leadRepository = new LeadRepository();
