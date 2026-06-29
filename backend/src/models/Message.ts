import mongoose, { Schema, Document } from 'mongoose';
import type { IMessage, MessageType, MessageStatus, MessageChannel } from '../types/index.js';

export interface MessageDocument extends Omit<IMessage, '_id'>, Document {}

const messageSchema = new Schema<MessageDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    leadId: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },
    campaignId: {
      type: Schema.Types.ObjectId,
      ref: 'Campaign',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['INITIAL', 'FOLLOW_UP_1', 'FOLLOW_UP_2'] as MessageType[],
      required: true,
    },
    channel: {
      type: String,
      enum: ['whatsapp', 'email', 'instagram'] as MessageChannel[],
      default: 'whatsapp',
    },
    content: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
    },
    whatsappMessageId: {
      type: String,
    },
    status: {
      type: String,
      enum: ['QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED'] as MessageStatus[],
      default: 'QUEUED',
    },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    readAt: { type: Date },
    errorMessage: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes
messageSchema.index({ status: 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ leadId: 1, type: 1 });

export const Message = mongoose.model<MessageDocument>('Message', messageSchema);
