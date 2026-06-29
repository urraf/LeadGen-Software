import mongoose from 'mongoose';
import { Lead } from '../models/Lead.js';
import { Message } from '../models/Message.js';
import { Campaign } from '../models/Campaign.js';
import { logger } from '../utils/logger.js';
import type { AnalyticsOverview, DailyAnalytics, TopItem } from '../types/index.js';

export class AnalyticsService {
  async getOverview(userId: string): Promise<AnalyticsOverview> {
    const [
      totalLeads,
      qualifiedLeads,
      messagesSent,
      messagesDelivered,
      messagesRead,
      replies,
    ] = await Promise.all([
      Lead.countDocuments({ userId }).exec(),
      Lead.countDocuments({ aiQualified: true, userId }).exec(),
      Message.countDocuments({ status: { $in: ['SENT', 'DELIVERED', 'READ'] }, userId }).exec(),
      Message.countDocuments({ status: { $in: ['DELIVERED', 'READ'] }, userId }).exec(),
      Message.countDocuments({ status: 'READ', userId }).exec(),
      Lead.countDocuments({ status: 'REPLIED', userId }).exec(),
    ]);

    const conversionRate = totalLeads > 0
      ? Math.round((replies / totalLeads) * 100 * 10) / 10
      : 0;

    return {
      totalLeads,
      qualifiedLeads,
      messagesSent,
      messagesDelivered,
      messagesRead,
      replies,
      conversionRate,
    };
  }

  async getDailyStats(userId: string, days: number = 30): Promise<DailyAnalytics[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const [leadsByDay, messagesByDay] = await Promise.all([
      Lead.aggregate([
        { $match: { createdAt: { $gte: startDate }, userId: userObjectId } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]).exec(),
      Message.aggregate([
        { $match: { createdAt: { $gte: startDate }, userId: userObjectId } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]).exec(),
    ]);

    // Merge into a single array with all dates
    const dailyMap = new Map<string, DailyAnalytics>();

    // Fill all dates
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      dailyMap.set(dateStr, { date: dateStr, leads: 0, messages: 0 });
    }

    for (const entry of leadsByDay) {
      const existing = dailyMap.get(entry._id);
      if (existing) existing.leads = entry.count;
    }

    for (const entry of messagesByDay) {
      const existing = dailyMap.get(entry._id);
      if (existing) existing.messages = entry.count;
    }

    return Array.from(dailyMap.values());
  }

  async getTopCategories(userId: string, limit: number = 5): Promise<TopItem[]> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const results = await Lead.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { _id: 0, name: '$_id', count: 1 } },
    ]).exec();

    return results;
  }

  async getTopCities(userId: string, limit: number = 5): Promise<TopItem[]> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const results = await Lead.aggregate([
      { $match: { userId: userObjectId } },
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { _id: 0, name: '$_id', count: 1 } },
    ]).exec();

    return results;
  }

  async getFunnel(userId: string): Promise<Record<string, number>> {
    const statuses = ['NEW', 'QUALIFIED', 'CONTACTED', 'REPLIED', 'INTERESTED', 'CONVERTED'];

    const counts = await Promise.all(
      statuses.map(async (status) => {
        // Count leads that have been in this status or beyond
        const statusIndex = statuses.indexOf(status);
        const applicableStatuses = statuses.slice(statusIndex);
        const count = await Lead.countDocuments({
          status: { $in: applicableStatuses },
          userId,
        }).exec();
        return { status, count };
      })
    );

    // Also count total for the top of funnel
    const totalLeads = await Lead.countDocuments({ userId }).exec();

    const funnel: Record<string, number> = { total: totalLeads };
    for (const { status, count } of counts) {
      funnel[status.toLowerCase()] = count;
    }

    return funnel;
  }
}

export const analyticsService = new AnalyticsService();
