import { googlePlacesService } from '../services/GooglePlacesService.js';
import { leadService } from '../services/LeadService.js';
import { campaignRepository } from '../repositories/CampaignRepository.js';
import { searchQueue } from '../queues/searchQueue.js';
import { SearchLog } from '../models/SearchLog.js';
import { logger } from '../utils/logger.js';
import type { SearchJobData } from '../queues/searchQueue.js';

/**
 * Process a search job for a campaign.
 * Called by the InMemoryQueue — no BullMQ or Redis needed.
 */
async function handleSearchJob(data: SearchJobData): Promise<void> {
  const { campaignId, userId } = data;
  const startTime = Date.now();

  logger.info(`Search worker: processing campaign ${campaignId} for User ${userId}`);

  try {
    const campaign = await campaignRepository.findById(userId, campaignId);
    if (!campaign) {
      logger.warn(`Search worker: campaign ${campaignId} not found — skipping`);
      return;
    }

    if (campaign.status !== 'ACTIVE') {
      logger.info(`Search worker: campaign ${campaignId} is not active — skipping`);
      return;
    }

    // Search Google Places
    const businesses = await googlePlacesService.searchBusinesses(
      campaign.category,
      campaign.city,
      campaign.country,
      campaign.filters,
    );

    // Process results (filter, deduplicate, AI qualify, persist)
    const { newLeads, duplicates, createdLeads } = await leadService.processSearchResults(
      userId,
      campaignId,
      businesses,
    );

    const duration = Date.now() - startTime;

    // Update campaign stats
    await campaignRepository.updateStats(userId, campaignId, {
      totalSearched: businesses.length,
      totalLeads: newLeads,
    });
    await campaignRepository.updateLastRunAt(userId, campaignId);

    // Log the search
    await SearchLog.create({
      userId,
      campaignId: campaign._id,
      query: `${campaign.category} in ${campaign.city} ${campaign.country}`,
      totalResults: businesses.length,
      filteredResults: businesses.length,
      newLeads,
      duplicates,
      duration,
    });

    logger.info(
      `Search completed for campaign "${campaign.name}": ${businesses.length} found, ${newLeads} new leads, ${duplicates} duplicates, took ${duration}ms`
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(`Search worker failed for campaign ${campaignId}: ${errorMessage}`);

    // Log the failed search
    await SearchLog.create({
      userId,
      campaignId,
      query: 'unknown',
      totalResults: 0,
      filteredResults: 0,
      newLeads: 0,
      duplicates: 0,
      duration,
      error: errorMessage,
    });

    throw error;
  }
}

/**
 * Register the search handler with the in-memory queue.
 */
export function startSearchWorker(): void {
  searchQueue.onProcess(handleSearchJob);
  logger.info('Search worker handler registered');
}
