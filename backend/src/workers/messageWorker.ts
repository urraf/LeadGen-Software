import { whatsappService } from '../services/WhatsAppService.js';
import { emailService } from '../services/EmailService.js';
import { messageRepository } from '../repositories/MessageRepository.js';
import { leadRepository } from '../repositories/LeadRepository.js';
import { followUpQueue, messageQueue } from '../queues/messageQueue.js';
import { logger } from '../utils/logger.js';
import type { MessageJobData } from '../queues/messageQueue.js';

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Process a message job (WhatsApp / Email / Instagram).
 * Called by the InMemoryQueue — no BullMQ or Redis needed.
 */
async function handleMessageJob(data: MessageJobData): Promise<void> {
  const { userId, leadId, messageId, phone, content, channel, email, subject } = data;

  logger.info(`Message worker: processing ${channel} job for lead ${leadId} by User ${userId}`);

  try {
    let externalMessageId: string | undefined;

    // ── Route by channel ───────────────────────────────────────
    if (channel === 'whatsapp') {
      if (!whatsappService.getIsReady(userId)) {
        throw new Error('WhatsApp client is not ready — will retry');
      }
      externalMessageId = await whatsappService.sendMessage(userId, phone, content);

    } else if (channel === 'email') {
      if (!email) {
        throw new Error('No email address available for this lead');
      }
      if (!emailService.getIsReady()) {
        throw new Error('Email is not configured — add SMTP settings to your .env file');
      }
      externalMessageId = await emailService.sendEmail(email, subject || 'Hello', content);

    } else if (channel === 'instagram') {
      // Instagram can't be automated — mark as SENT immediately
      logger.info(`Instagram: message ready for manual copy for lead ${leadId}`);
      await messageRepository.updateStatus(userId, messageId, 'SENT', {} as any);
      await leadRepository.updateStatus(userId, leadId, 'MESSAGE_SENT');
      return; // done — no follow-up scheduling for manual channels
    }

    // ── Success path (WhatsApp / Email) ────────────────────────
    await messageRepository.updateStatus(userId, messageId, 'SENT', {
      whatsappMessageId: externalMessageId,
    } as Partial<import('../models/Message.js').MessageDocument>);

    await leadRepository.updateStatus(userId, leadId, 'MESSAGE_SENT');
    logger.info(`${channel} message sent to ${channel === 'email' ? email : phone} for lead ${leadId} by User ${userId}`);

    // Schedule follow-up in 3 days
    const lead = await leadRepository.findById(userId, leadId);
    if (lead && lead.followUpCount < 2) {
      await followUpQueue.add(
        'followup',
        { userId, leadId, campaignId: lead.campaignId.toString() },
        { delay: THREE_DAYS_MS }
      );

      const nextFollowUpDate = new Date(Date.now() + THREE_DAYS_MS);
      await leadRepository.setNextFollowUp(userId, leadId, nextFollowUpDate);
      logger.info(`Follow-up scheduled for lead ${leadId} in 3 days`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Message worker failed for lead ${leadId}: ${errorMessage}`);

    await messageRepository.updateStatus(userId, messageId, 'FAILED', {
      errorMessage,
    } as Partial<import('../models/Message.js').MessageDocument>);

    // Revert lead status so user can retry
    await leadRepository.updateStatus(userId, leadId, 'QUALIFIED');

    throw error; // Re-throw for InMemoryQueue retry logic
  }
}

/**
 * Register the message handler with the in-memory queue.
 */
export function startMessageWorker(): void {
  messageQueue.onProcess(handleMessageJob);
  logger.info('Message worker handler registered');
}
