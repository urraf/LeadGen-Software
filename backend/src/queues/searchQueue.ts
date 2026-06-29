import { InMemoryQueue } from './messageQueue.js';

export interface SearchJobData {
  userId: string;
  campaignId: string;
  pageToken?: string;
}

export const searchQueue = new InMemoryQueue<SearchJobData>('search-queue', {
  maxAttempts: 2,
  backoffDelay: 10000,
});
