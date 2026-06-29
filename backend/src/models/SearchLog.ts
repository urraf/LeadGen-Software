import mongoose, { Schema, Document } from 'mongoose';
import type { ISearchLog } from '../types/index.js';

export interface SearchLogDocument extends Omit<ISearchLog, '_id'>, Document {}

const searchLogSchema = new Schema<SearchLogDocument>(
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
    query: {
      type: String,
      required: true,
    },
    totalResults: {
      type: Number,
      default: 0,
    },
    filteredResults: {
      type: Number,
      default: 0,
    },
    newLeads: {
      type: Number,
      default: 0,
    },
    duplicates: {
      type: Number,
      default: 0,
    },
    duration: {
      type: Number, // milliseconds
      default: 0,
    },
    error: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

searchLogSchema.index({ createdAt: -1 });

export const SearchLog = mongoose.model<SearchLogDocument>('SearchLog', searchLogSchema);
