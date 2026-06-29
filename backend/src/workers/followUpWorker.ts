import { leadRepository } from '../repositories/LeadRepository.js';
import { messageRepository } from '../repositories/MessageRepository.js';
import { aiService } from '../services/AIService.js';
import { messageQueue, followUpQueue } from '../queues/messageQueue.js';
import { logger } from '../utils/logger.js';
import type { FollowUpJobData } from '../queues/messageQueue.js';
import type { MessageType } from '../types/index.js';

/**
 * Process a follow-up job.
 * Called by the InMemoryQueue — no BullMQ or Redis needed.
 */
async function handleFollowUpJob(data: FollowUpJobData): Promise<void> {
  const { userId, leadId, campaignId } = data;

  logger.info(`Follow-up worker: processing for lead ${leadId} by User ${userId}`);

  try {
    const lead = await leadRepository.findById(userId, leadId);
    if (!lead) {
      logger.warn(`Follow-up: lead ${leadId} not found — skipping`);
      return;
    }

    // Skip if lead already replied or is in a terminal state
    const skipStatuses = ['REPLIED', 'INTERESTED', 'MEETING_BOOKED', 'PROPOSAL_SENT', 'CONVERTED', 'LOST'];
    if (skipStatuses.includes(lead.status)) {
      logger.info(`Follow-up: lead ${leadId} already in status "${lead.status}" — skipping`);
      return;
    }

    // Check follow-up limit
    if (lead.followUpCount >= 2) {
      logger.info(`Follow-up: lead ${leadId} reached max follow-ups (2) — marking as COLD`);
      await leadRepository.updateStatus(userId, leadId, 'COLD');
      await leadRepository.setNextFollowUp(userId, leadId, null);
      return;
    }

    // Get the original message for context
    const latestMessage = await messageRepository.getLatestForLead(userId, leadId);
    const originalContent = latestMessage?.content || '';

    // Determine follow-up type
    const followUpNumber = lead.followUpCount + 1;
    const messageType: MessageType = followUpNumber === 1 ? 'FOLLOW_UP_1' : 'FOLLOW_UP_2';

    // Generate follow-up message via AI
    const followUpContent = await aiService.generateFollowUp(
      {
        businessName: lead.businessName,
        category: lead.category,
        city: lead.city,
      },
      originalContent,
      followUpNumber,
    );

    // Create message record
    const message = await messageRepository.create(userId, {
      leadId: lead._id,
      campaignId: lead.campaignId,
      type: messageType,
      content: followUpContent,
      status: 'QUEUED',
    });

    // Increment follow-up count
    await leadRepository.incrementFollowUpCount(userId, leadId);

    // Enqueue to message queue for WhatsApp sending
    await messageQueue.add('send-followup', {
      userId,
      leadId,
      messageId: message._id.toString(),
      phone: lead.phone,
      content: followUpContent,
      channel: 'whatsapp',
    });

    // Add to lead message history
    await leadRepository.addMessageToHistory(userId, leadId, message._id.toString());

    logger.info(`Follow-up #${followUpNumber} queued for lead "${lead.businessName}" by User ${userId}`);
  } catch (error) {
    logger.error(`Follow-up worker failed for lead ${leadId}:`, error);
    throw error;
  }
}

/**
 * Register the follow-up handler with the in-memory queue.
 */
export function startFollowUpWorker(): void {
  followUpQueue.onProcess(handleFollowUpJob);
  logger.info('Follow-up worker handler registered');
}
