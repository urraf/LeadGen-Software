import { z } from 'zod';
import { MESSAGE_STATUSES, MESSAGE_TYPES } from '../types/index.js';

export const listMessagesSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1).optional(),
    limit: z.coerce.number().min(1).max(100).default(20).optional(),
    leadId: z.string().optional(),
    campaignId: z.string().optional(),
    status: z.enum(MESSAGE_STATUSES).optional(),
    type: z.enum(MESSAGE_TYPES).optional(),
  }).optional(),
});

export const sendMessageSchema = z.object({
  body: z.object({
    leadId: z.string().min(1),
    content: z.string().min(1).max(2000).optional(), // Optional — AI generates if not provided
  }),
});

export const followUpSchema = z.object({
  body: z.object({
    leadId: z.string().min(1),
  }),
});
