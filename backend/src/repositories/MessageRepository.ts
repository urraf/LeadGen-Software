import { Message, MessageDocument } from '../models/Message.js';
import type { MessageStatus, MessageType } from '../types/index.js';
import { FilterQuery, Types } from 'mongoose';

export class MessageRepository {
  async create(userId: string, data: Partial<MessageDocument>): Promise<MessageDocument> {
    const message = new Message({ ...data, userId });
    return message.save();
  }

  async findById(userId: string, id: string): Promise<MessageDocument | null> {
    return Message.findOne({ _id: id, userId }).exec();
  }

  async findByLead(userId: string, leadId: string): Promise<MessageDocument[]> {
    return Message.find({ leadId: new Types.ObjectId(leadId), userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findAll(
    userId: string,
    filter: { leadId?: string; status?: MessageStatus; type?: MessageType; campaignId?: string } = {},
    page: number = 1,
    limit: number = 20,
  ): Promise<{ data: MessageDocument[]; total: number }> {
    const query: FilterQuery<MessageDocument> = { userId };

    if (filter.leadId) query.leadId = new Types.ObjectId(filter.leadId);
    if (filter.campaignId) query.campaignId = new Types.ObjectId(filter.campaignId);
    if (filter.status) query.status = filter.status;
    if (filter.type) query.type = filter.type;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Message.find(query)
        .populate('leadId', 'businessName phone city')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      Message.countDocuments(query).exec(),
    ]);

    return { data, total };
  }

  async updateStatus(
    userId: string,
    id: string,
    status: MessageStatus,
    extra?: Partial<MessageDocument>
  ): Promise<MessageDocument | null> {
    const update: Partial<MessageDocument> = { status, ...extra };

    if (status === 'SENT') update.sentAt = new Date();
    if (status === 'DELIVERED') update.deliveredAt = new Date();
    if (status === 'READ') update.readAt = new Date();

    return Message.findOneAndUpdate({ _id: id, userId }, { $set: update }, { new: true }).exec();
  }

  async updateByWhatsAppId(
    whatsappMessageId: string,
    status: MessageStatus,
  ): Promise<MessageDocument | null> {
    const update: Partial<MessageDocument> = { status };
    if (status === 'DELIVERED') update.deliveredAt = new Date();
    if (status === 'READ') update.readAt = new Date();

    return Message.findOneAndUpdate(
      { whatsappMessageId },
      { $set: update },
      { new: true }
    ).exec();
  }

  async saveIncoming(data: {
    phone: string;
    content: string;
  }): Promise<void> {
    // Store incoming reply as a log (find the lead by phone first)
    // This is handled in WhatsAppService by updating lead status
    // This method is a hook for future use (storing full incoming messages)
  }

  async countByStatus(userId: string, status: MessageStatus): Promise<number> {
    return Message.countDocuments({ status, userId }).exec();
  }

  async countByCampaign(userId: string, campaignId: string): Promise<number> {
    return Message.countDocuments({
      campaignId: new Types.ObjectId(campaignId),
      userId,
    }).exec();
  }

  async getLatestForLead(userId: string, leadId: string): Promise<MessageDocument | null> {
    return Message.findOne({ leadId: new Types.ObjectId(leadId), userId })
      .sort({ createdAt: -1 })
      .exec();
  }
}

export const messageRepository = new MessageRepository();
