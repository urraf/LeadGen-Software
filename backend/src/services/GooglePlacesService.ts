import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { normalizePhone, retryWithBackoff } from '../utils/helpers.js';
import type { GooglePlaceResult, BusinessData } from '../types/index.js';

const SERPAPI_BASE = 'https://serpapi.com/search.json';
const MAX_PAGES = 25; // Increased to generate more leads
const RESULTS_PER_PAGE = 20;

interface SerpApiLocalResult {
  place_id?: string;
  title?: string;
  rating?: number;
  reviews?: number;
  phone?: string;
  address?: string;
  website?: string;
}

export class GooglePlacesService {
  private apiKey: string;

  constructor() {
    this.apiKey = env.SERPAPI_API_KEY || '';
  }

  async searchBusinesses(
    category: string,
    city: string,
    country: string,
    filters: { minRating: number; minReviews: number; excludeWithWebsite: boolean },
  ): Promise<BusinessData[]> {
    if (!this.apiKey || this.apiKey === 'your-serpapi-key') {
      logger.warn('SerpApi API key not configured — returning mock data for testing');
      return [
        {
          placeId: `mock-1-${Date.now()}`,
          name: `Mock ${category} 1`,
          category,
          phone: '+919876543210',
          address: `123 Mock Street, ${city}`,
          city,
          rating: 4.5,
          reviewCount: 42,
          googleMapsUrl: '',
        },
        {
          placeId: `mock-2-${Date.now()}`,
          name: `Mock ${category} 2`,
          category,
          phone: '+919876543211',
          address: `456 Demo Avenue, ${city}`,
          city,
          rating: 3.8,
          reviewCount: 15,
          googleMapsUrl: '',
        }
      ];
    }

    const query = `${category} in ${city} ${country}`;
    logger.info(`SerpApi: searching for "${query}"`);

    const allResults: SerpApiLocalResult[] = [];

    for (let page = 0; page < MAX_PAGES; page++) {
      try {
        const results = await this.fetchPage(query, page * RESULTS_PER_PAGE);
        allResults.push(...results);

        logger.info(`SerpApi: page ${page + 1} returned ${results.length} results`);

        if (results.length < RESULTS_PER_PAGE) break;

        // Rate limit protection
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        logger.error(`SerpApi: error on page ${page + 1}:`, error);
        break;
      }
    }

    logger.info(`SerpApi: total raw results = ${allResults.length}`);

    // Filter and transform
    const businesses = allResults
      .filter((place) => {
        // Must have phone
        if (!place.phone) return false;

        // Filter by website presence
        if (filters.excludeWithWebsite && place.website) return false;

        // Filter by rating
        if (place.rating !== undefined && place.rating < filters.minRating) return false;

        // Filter by review count
        if (place.reviews !== undefined && place.reviews < filters.minReviews) return false;

        return true;
      })
      .map((place) => this.transformResult(place, category, city, country));

    // Remove entries where phone normalization failed
    const validBusinesses = businesses.filter((b): b is BusinessData => b !== null);

    // Deduplicate by placeId to handle SerpApi potential overlaps
    const uniqueBusinesses = Array.from(new Map(validBusinesses.map(b => [b.placeId, b])).values());

    logger.info(`SerpApi: ${uniqueBusinesses.length} businesses after filtering`);
    return uniqueBusinesses;
  }

  private async fetchPage(
    q: string,
    start: number,
  ): Promise<SerpApiLocalResult[]> {
    return retryWithBackoff(async () => {
      const url = new URL(SERPAPI_BASE);
      url.searchParams.append('engine', 'google_maps');
      url.searchParams.append('type', 'search');
      url.searchParams.append('q', q);
      url.searchParams.append('api_key', this.apiKey);
      url.searchParams.append('start', start.toString());
      url.searchParams.append('num', RESULTS_PER_PAGE.toString());

      const response = await fetch(url.toString(), {
        method: 'GET',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`SerpApi error (${response.status}): ${errorText}`);
      }

      const data = await response.json() as {
        local_results?: SerpApiLocalResult[];
      };

      return data.local_results || [];
    }, 2, 2000);
  }

  private getCountryCode(country: string): string | undefined {
    const c = country.toLowerCase();
    if (c.includes('india')) return 'IN';
    if (c.includes('united states') || c === 'us' || c === 'usa') return 'US';
    if (c.includes('united kingdom') || c === 'uk') return 'GB';
    if (c.includes('canada')) return 'CA';
    if (c.includes('australia')) return 'AU';
    return undefined;
  }

  private transformResult(
    place: SerpApiLocalResult,
    category: string,
    city: string,
    country: string,
  ): BusinessData | null {
    const countryCode = this.getCountryCode(country);
    const phone = normalizePhone(place.phone || '', countryCode);

    if (!phone) return null;

    return {
      placeId: place.place_id || `temp-${Date.now()}-${Math.random()}`,
      name: place.title || 'Unknown Business',
      category,
      phone,
      address: place.address || '',
      city,
      rating: place.rating,
      reviewCount: place.reviews,
      website: place.website || undefined,
      googleMapsUrl: '',
    };
  }
}

export const googlePlacesService = new GooglePlacesService();
