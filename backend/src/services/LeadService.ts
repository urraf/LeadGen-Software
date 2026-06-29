import { leadRepository } from '../repositories/LeadRepository.js';
import { aiService } from './AIService.js';
import { logger } from '../utils/logger.js';
import type { BusinessData, LeadStatus } from '../types/index.js';
import type { LeadDocument } from '../models/Lead.js';
import { Types } from 'mongoose';

export class LeadService {
  /**
   * Calculate local score based on business signals.
   * This is combined with AI score for the final displayed score.
   */
  calculateScore(business: BusinessData): number {
    let score = 0;

    // Core signals
    if (!business.website) score += 50;  // Primary criterion — no website
    if (business.phone) score += 10;     // Contactable

    // Quality signals — rating
    if (business.rating !== undefined) {
      if (business.rating >= 4.5) score += 20;
      else if (business.rating >= 4.0) score += 12;
      else if (business.rating >= 3.5) score += 6;
    }

    // Quality signals — review count
    if (business.reviewCount !== undefined) {
      if (business.reviewCount >= 100) score += 20;
      else if (business.reviewCount >= 50) score += 12;
      else if (business.reviewCount >= 20) score += 6;
    }

    return Math.min(score, 100);
  }

  /**
   * Process search results: filter, deduplicate, AI qualify, and persist.
   * Returns the number of new leads created.
   */
  async processSearchResults(
    userId: string,
    campaignId: string,
    businesses: BusinessData[],
  ): Promise<{ newLeads: number; duplicates: number; createdLeads?: LeadDocument[] }> {
    if (businesses.length === 0) {
      return { newLeads: 0, duplicates: 0 };
    }

    // Check for existing leads by placeId (deduplication)
    const placeIds = businesses.map((b) => b.placeId);
    const existingPlaceIds = await leadRepository.existsByPlaceIds(userId, placeIds);

    const newBusinesses = businesses.filter((b) => !existingPlaceIds.has(b.placeId));
    const duplicates = businesses.length - newBusinesses.length;

    if (duplicates > 0) {
      logger.info(`Lead dedup: ${duplicates} duplicates skipped`);
    }

    if (newBusinesses.length === 0) {
      return { newLeads: 0, duplicates };
    }

    // AI-qualify each lead and create documents
    const leadDocs: Partial<LeadDocument>[] = [];

    for (const business of newBusinesses) {
      try {
        // AI qualification
        const aiResult = await aiService.qualifyLead(business);

        // Local score
        const localScore = this.calculateScore(business);

        // Combined score
        const combinedScore = Math.round((localScore + aiResult.score) / 2);

        const status: LeadStatus = aiResult.qualified ? 'QUALIFIED' : 'NEW';

        leadDocs.push({
          campaignId: new Types.ObjectId(campaignId),
          placeId: business.placeId,
          businessName: business.name,
          category: business.category,
          phone: business.phone,
          address: business.address,
          city: business.city,
          rating: business.rating,
          reviewCount: business.reviewCount,
          website: business.website,
          googleMapsUrl: business.googleMapsUrl,
          openingHours: business.openingHours,
          photos: business.photos,
          aiScore: combinedScore,
          aiQualified: aiResult.qualified,
          aiReason: aiResult.reason,
          status,
          followUpCount: 0,
          messageHistory: [],
        });

        logger.debug(
          `Qualified "${business.name}": score=${combinedScore}, qualified=${aiResult.qualified}, reason="${aiResult.reason}"`
        );
      } catch (error) {
        logger.error(`Failed to qualify lead "${business.name}":`, error);
        // Still create the lead with default scores
        leadDocs.push({
          campaignId: new Types.ObjectId(campaignId),
          placeId: business.placeId,
          businessName: business.name,
          category: business.category,
          phone: business.phone,
          address: business.address,
          city: business.city,
          rating: business.rating,
          reviewCount: business.reviewCount,
          website: business.website,
          googleMapsUrl: business.googleMapsUrl,
          openingHours: business.openingHours,
          photos: business.photos,
          aiScore: this.calculateScore(business),
          aiQualified: false,
          aiReason: 'Qualification failed — using local score only',
          status: 'NEW',
          followUpCount: 0,
          messageHistory: [],
        });
      }
    }

    // Bulk insert
    const created = await leadRepository.bulkCreate(userId, leadDocs);
    logger.info(`Leads created: ${created.length} new, ${duplicates} duplicates`);

    return { newLeads: created.length, duplicates, createdLeads: created };
  }
}

export const leadService = new LeadService();
