import mongoose, { Schema, Document } from 'mongoose';
import type { ICampaign, CampaignStatus } from '../types/index.js';

export interface CampaignDocument extends Omit<ICampaign, '_id'>, Document {}

const campaignSchema = new Schema<CampaignDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'PAUSED', 'STOPPED', 'COMPLETED'] as CampaignStatus[],
      default: 'PAUSED',
    },
    schedule: {
      enabled: { type: Boolean, default: false },
      cronExpression: { type: String, default: '0 8 * * *' },
    },
    filters: {
      minRating: { type: Number, default: 3.5, min: 0, max: 5 },
      minReviews: { type: Number, default: 10, min: 0 },
      excludeWithWebsite: { type: Boolean, default: true },
    },
    stats: {
      totalSearched: { type: Number, default: 0 },
      totalLeads: { type: Number, default: 0 },
      totalContacted: { type: Number, default: 0 },
    },
    lastRunAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
campaignSchema.index({ status: 1 });
campaignSchema.index({ createdAt: -1 });
campaignSchema.index({ category: 1, city: 1 });

export const Campaign = mongoose.model<CampaignDocument>('Campaign', campaignSchema);
