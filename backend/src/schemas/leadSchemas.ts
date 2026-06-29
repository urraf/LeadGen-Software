import { z } from 'zod';
import { LEAD_STATUSES } from '../types/index.js';

export const listLeadsSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1).optional(),
    limit: z.coerce.number().min(1).max(100).default(20).optional(),
    campaignId: z.string().optional(),
    status: z.enum(LEAD_STATUSES).optional(),
    city: z.string().optional(),
    minScore: z.coerce.number().min(0).max(100).optional(),
    search: z.string().optional(),
  }).optional(),
});

export const updateLeadSchema = z.object({
  body: z.object({
    status: z.enum(LEAD_STATUSES).optional(),
    notes: z.string().max(2000).optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
});

export const leadIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});
