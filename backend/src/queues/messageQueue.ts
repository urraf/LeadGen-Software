import { logger } from '../utils/logger.js';

// ─── Job Data Interfaces ────────────────────────────────────────
export interface MessageJobData {
  userId: string;
  leadId: string;
  messageId: string;
  phone: string;
  content: string;
  channel: 'whatsapp' | 'email' | 'instagram';
  email?: string;
  subject?: string;
}

export interface FollowUpJobData {
  userId: string;
  leadId: string;
  campaignId: string;
}

// ─── In-Memory Queue ────────────────────────────────────────────
// Replaces BullMQ so we don't need Redis.
// Supports: delayed jobs (setTimeout), retries with exponential backoff.
// Trade-off: jobs are lost on server restart, which is acceptable for free-tier.

type JobHandler<T> = (data: T) => Promise<void>;

interface QueueJob<T> {
  id: string;
  name: string;
  data: T;
  attempts: number;
  maxAttempts: number;
  backoffDelay: number;
}

let jobCounter = 0;

export class InMemoryQueue<T> {
  private queueName: string;
  private handler: JobHandler<T> | null = null;
  private maxAttempts: number;
  private backoffDelay: number;

  constructor(name: string, options?: { maxAttempts?: number; backoffDelay?: number }) {
    this.queueName = name;
    this.maxAttempts = options?.maxAttempts ?? 3;
    this.backoffDelay = options?.backoffDelay ?? 5000;
  }

  /** Register the worker function that processes jobs */
  onProcess(handler: JobHandler<T>): void {
    this.handler = handler;
  }

  /** Add a job to the queue (optionally with a delay in ms) */
  async add(name: string, data: T, options?: { delay?: number }): Promise<{ id: string }> {
    const jobId = String(++jobCounter);
    const delay = options?.delay ?? 0;

    const job: QueueJob<T> = {
      id: jobId,
      name,
      data,
      attempts: 0,
      maxAttempts: this.maxAttempts,
      backoffDelay: this.backoffDelay,
    };

    if (delay > 0) {
      logger.debug(`[${this.queueName}] Job ${jobId} scheduled with ${Math.round(delay / 1000)}s delay`);
      setTimeout(() => this.processJob(job), delay);
    } else {
      // Process in the next tick to avoid blocking the request
      setImmediate(() => this.processJob(job));
    }

    return { id: jobId };
  }

  private async processJob(job: QueueJob<T>): Promise<void> {
    if (!this.handler) {
      logger.error(`[${this.queueName}] No handler registered — dropping job ${job.id}`);
      return;
    }

    job.attempts++;

    try {
      await this.handler(job.data);
      logger.debug(`[${this.queueName}] Job ${job.id} completed (attempt ${job.attempts})`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error(`[${this.queueName}] Job ${job.id} failed (attempt ${job.attempts}/${job.maxAttempts}): ${errorMsg}`);

      if (job.attempts < job.maxAttempts) {
        const retryDelay = job.backoffDelay * Math.pow(2, job.attempts - 1);
        logger.info(`[${this.queueName}] Retrying job ${job.id} in ${Math.round(retryDelay / 1000)}s`);
        setTimeout(() => this.processJob(job), retryDelay);
      } else {
        logger.error(`[${this.queueName}] Job ${job.id} permanently failed after ${job.maxAttempts} attempts`);
      }
    }
  }
}

// ─── Queue Instances ────────────────────────────────────────────
export const messageQueue = new InMemoryQueue<MessageJobData>('message-queue', {
  maxAttempts: 3,
  backoffDelay: 5000,
});

export const followUpQueue = new InMemoryQueue<FollowUpJobData>('followup-queue', {
  maxAttempts: 3,
  backoffDelay: 5000,
});
