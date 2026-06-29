import mongoose, { Schema, Document } from 'mongoose';
import type { ILead, LeadStatus } from '../types/index.js';
import { LEAD_STATUSES } from '../types/index.js';

export interface LeadDocument extends Omit<ILead, '_id'>, Document {}

const leadSchema = new Schema<LeadDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
    placeId: {
      type: String,
      required: true,
      unique: true,
    },
    businessName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      min: 0,
    },
    website: {
      type: String,
    },
    googleMapsUrl: {
      type: String,
    },
    openingHours: [{ type: String }],
    photos: [{ type: String }],
    aiScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    aiQualified: {
      type: Boolean,
      default: false,
    },
    aiReason: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: LEAD_STATUSES as unknown as LeadStatus[],
      default: 'NEW',
    },
    notes: {
      type: String,
    },
    messageHistory: [{
      type: Schema.Types.ObjectId,
      ref: 'Message',
    }],
    followUpCount: {
      type: Number,
      default: 0,
      min: 0,
      max: 2,
    },
    nextFollowUpAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
leadSchema.index({ campaignId: 1, status: 1 });
leadSchema.index({ city: 1 });
leadSchema.index({ aiScore: -1 });
leadSchema.index({ status: 1, nextFollowUpAt: 1 });

export const Lead = mongoose.model<LeadDocument>('Lead', leadSchema);
