import { Response } from 'express';
import type { AuthRequest } from '../middlewares/authMiddleware.js';
import { catchAsync, AppError, parsePagination } from '../utils/helpers.js';
import { leadRepository, LeadFilter } from '../repositories/LeadRepository.js';
import { messageRepository } from '../repositories/MessageRepository.js';
import { aiService } from '../services/AIService.js';
import { messageQueue } from '../queues/messageQueue.js';
import type { LeadStatus, MessageChannel } from '../types/index.js';

export const getLeads = catchAsync(async (req: AuthRequest, res: Response) => {
  const { page, limit } = parsePagination(
    Number(req.query.page) || 1,
    Number(req.query.limit) || 20,
  );

  const filter: LeadFilter = {};
  if (req.query.campaignId) filter.campaignId = req.query.campaignId as string;
  if (req.query.status) filter.status = req.query.status as LeadStatus;
  if (req.query.city) filter.city = req.query.city as string;
  if (req.query.minScore) filter.minScore = Number(req.query.minScore);
  if (req.query.search) filter.search = req.query.search as string;
  
  if (req.query.hasWebsite !== undefined && req.query.hasWebsite !== 'all') {
    filter.hasWebsite = req.query.hasWebsite === 'true';
  }

  const { data, total } = await leadRepository.findAll(req.userId!, filter, page, limit);

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

export const getLead = catchAsync(async (req: AuthRequest, res: Response) => {
  const lead = await leadRepository.findById(req.userId!, req.params.id as string);
  if (!lead) {
    throw new AppError('Lead not found', 404);
  }
  res.json({ success: true, data: lead });
});

export const updateLead = catchAsync(async (req: AuthRequest, res: Response) => {
  const lead = await leadRepository.update(req.userId!, req.params.id as string, req.body);
  if (!lead) {
    throw new AppError('Lead not found', 404);
  }
  res.json({ success: true, data: lead });
});

export const deleteLead = catchAsync(async (req: AuthRequest, res: Response) => {
  const deleted = await leadRepository.delete(req.userId!, req.params.id as string);
  if (!deleted) {
    throw new AppError('Lead not found', 404);
  }
  res.json({ success: true, message: 'Lead deleted' });
});

// ── Helper: random delay between 5-15 minutes ──────────────────
function getRandomDelayMs(): number {
  const MIN_DELAY = 5 * 60 * 1000;  // 5 minutes
  const MAX_DELAY = 15 * 60 * 1000; // 15 minutes
  return Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;
}

export const contactLead = catchAsync(async (req: AuthRequest, res: Response) => {
  const lead = await leadRepository.findById(req.userId!, req.params.id as string);
  if (!lead) {
    throw new AppError('Lead not found', 404);
  }

  const channel: MessageChannel = req.body.channel || 'whatsapp';

  // Instagram is manual copy-paste — allow contacting via other channels after
  // Only block if a "real" channel (WhatsApp/Email) has already been used
  if (channel !== 'instagram' && ['CONTACTED', 'MESSAGE_SENT', 'DELIVERED', 'READ', 'REPLIED'].includes(lead.status)) {
    throw new AppError('Lead has already been contacted via WhatsApp or Email', 400);
  }

  // Validate channel-specific requirements
  if (channel === 'email' && !lead.email) {
    throw new AppError('This lead does not have an email address. Try WhatsApp or Instagram instead.', 400);
  }

  // Optimistically update status only for real channels (not Instagram)
  if (channel !== 'instagram') {
    await leadRepository.updateStatus(req.userId!, req.params.id as string, 'CONTACTED');
  }

  let content: string;
  let subject: string | undefined;

  try {
    if (channel === 'email') {
      const emailResult = await aiService.generateEmailMessage({
        businessName: lead.businessName,
        category: lead.category,
        city: lead.city,
        rating: lead.rating,
        reviewCount: lead.reviewCount,
      });
      content = emailResult.body;
      subject = emailResult.subject;
    } else {
      // WhatsApp and Instagram both use the same short message style
      content = await aiService.generateMessage({
        businessName: lead.businessName,
        category: lead.category,
        city: lead.city,
        rating: lead.rating,
        reviewCount: lead.reviewCount,
      });
    }
  } catch (error) {
    // Revert if AI generation completely fails
    await leadRepository.updateStatus(req.userId!, req.params.id as string, 'QUALIFIED');
    throw error;
  }

  // Create message record
  const message = await messageRepository.create(req.userId!, {
    leadId: lead._id,
    campaignId: lead.campaignId,
    type: 'INITIAL',
    channel,
    content,
    subject,
    status: 'QUEUED',
  });

  // Attach message to history
  await leadRepository.addMessageToHistory(req.userId!, req.params.id as string, message._id.toString());

  // ── Enqueue with channel-specific behavior ─────────────────
  const jobOptions: Record<string, any> = {};

  if (channel === 'whatsapp') {
    // Anti-ban: random 5-15 minute delay between WhatsApp messages
    jobOptions.delay = getRandomDelayMs();
  }
  // Email and Instagram: send immediately (no ban risk)

  await messageQueue.add('send-message', {
    userId: req.userId!,
    leadId: req.params.id as string,
    messageId: message._id.toString(),
    phone: lead.phone,
    content,
    channel,
    email: lead.email,
    subject,
  }, jobOptions);

  const delayMinutes = jobOptions.delay
    ? Math.round(jobOptions.delay / 60000)
    : 0;

  res.json({
    success: true,
    data: { message, content, channel, subject },
    message: channel === 'whatsapp'
      ? `WhatsApp message queued — will send in ~${delayMinutes} minutes (anti-ban delay)`
      : channel === 'email'
        ? 'Email sent'
        : 'Instagram message generated — copy it from the message history and paste into Instagram DMs',
  });
});
