import { z } from 'zod';

export const createCampaignSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    category: z.string().min(1).max(500),
    city: z.string().min(1).max(100),
    country: z.string().min(1).max(100),
    state: z.string().max(100).optional(),
    schedule: z.object({
      enabled: z.boolean().default(false),
      cronExpression: z.string().default('0 8 * * *'),
    }).optional(),
    filters: z.object({
      minRating: z.number().min(0).max(5).default(3.5),
      minReviews: z.number().min(0).default(10),
      excludeWithWebsite: z.boolean().default(true),
    }).optional(),
  }),
});

export const updateCampaignSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200).optional(),
    category: z.string().min(1).max(100).optional(),
    city: z.string().min(1).max(100).optional(),
    country: z.string().min(1).max(100).optional(),
    state: z.string().max(100).optional(),
    schedule: z.object({
      enabled: z.boolean(),
      cronExpression: z.string(),
    }).optional(),
    filters: z.object({
      minRating: z.number().min(0).max(5),
      minReviews: z.number().min(0),
      excludeWithWebsite: z.boolean(),
    }).optional(),
  }),
  params: z.object({
    id: z.string().min(1),
  }),
});

export const campaignIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

export const listCampaignsSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1).optional(),
    limit: z.coerce.number().min(1).max(100).default(20).optional(),
    status: z.enum(['ACTIVE', 'PAUSED', 'STOPPED', 'COMPLETED']).optional(),
  }).optional(),
});
