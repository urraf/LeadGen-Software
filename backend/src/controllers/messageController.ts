import { Response } from 'express';
import type { AuthRequest } from '../middlewares/authMiddleware.js';
import { catchAsync, AppError, parsePagination } from '../utils/helpers.js';
import { messageRepository } from '../repositories/MessageRepository.js';
import { leadRepository } from '../repositories/LeadRepository.js';
import { aiService } from '../services/AIService.js';
import { messageQueue, followUpQueue } from '../queues/messageQueue.js';
import type { MessageStatus, MessageType } from '../types/index.js';

export const getMessages = catchAsync(async (req: AuthRequest, res: Response) => {
  const { page, limit } = parsePagination(
    Number(req.query.page) || 1,
    Number(req.query.limit) || 20,
  );

  const filter: { leadId?: string; status?: MessageStatus; type?: MessageType; campaignId?: string } = {};
  if (req.query.leadId) filter.leadId = req.query.leadId as string;
  if (req.query.campaignId) filter.campaignId = req.query.campaignId as string;
  if (req.query.status) filter.status = req.query.status as MessageStatus;
  if (req.query.type) filter.type = req.query.type as MessageType;

  const { data, total } = await messageRepository.findAll(req.userId!, filter, page, limit);

  res.json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

export const sendMessage = catchAsync(async (req: AuthRequest, res: Response) => {
  const { leadId, content: customContent } = req.body;

  const lead = await leadRepository.findById(req.userId!, leadId);
  if (!lead) {
    throw new AppError('Lead not found', 404);
  }

  // Use custom content or generate via AI
  const content = customContent || await aiService.generateMessage({
    businessName: lead.businessName,
    category: lead.category,
    city: lead.city,
    rating: lead.rating,
    reviewCount: lead.reviewCount,
  });

  const message = await messageRepository.create(req.userId!, {
    leadId: lead._id,
    campaignId: lead.campaignId,
    type: 'INITIAL',
    content,
    status: 'QUEUED',
  });

  await leadRepository.addMessageToHistory(req.userId!, leadId, message._id.toString());

  await messageQueue.add('send-manual', {
    userId: req.userId!,
    leadId,
    messageId: message._id.toString(),
    phone: lead.phone,
    content,
    channel: 'whatsapp',
  });

  res.json({
    success: true,
    data: message,
    message: 'Message queued for delivery',
  });
});

export const triggerFollowUp = catchAsync(async (req: AuthRequest, res: Response) => {
  const { leadId } = req.body;

  const lead = await leadRepository.findById(req.userId!, leadId);
  if (!lead) {
    throw new AppError('Lead not found', 404);
  }

  if (lead.followUpCount >= 2) {
    throw new AppError('Maximum follow-ups (2) already sent', 400);
  }

  // Add immediate follow-up job (no delay)
  await followUpQueue.add('manual-followup', {
    userId: req.userId!,
    leadId,
    campaignId: lead.campaignId.toString(),
  });

  res.json({
    success: true,
    message: 'Follow-up queued for processing',
  });
});
