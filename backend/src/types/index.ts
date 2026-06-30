import { Types } from 'mongoose';

// ─── Enums ───────────────────────────────────────────────────────

export const LEAD_STATUSES = [
  'NEW',
  'QUALIFIED',
  'CONTACTED',
  'MESSAGE_SENT',
  'DELIVERED',
  'READ',
  'REPLIED',
  'INTERESTED',
  'NOT_INTERESTED',
  'MEETING_BOOKED',
  'PROPOSAL_SENT',
  'CONVERTED',
  'LOST',
  'COLD',
] as const;

export type LeadStatus = typeof LEAD_STATUSES[number];

export const CAMPAIGN_STATUSES = ['ACTIVE', 'PAUSED', 'STOPPED', 'COMPLETED'] as const;
export type CampaignStatus = typeof CAMPAIGN_STATUSES[number];

export const MESSAGE_TYPES = ['INITIAL', 'FOLLOW_UP_1', 'FOLLOW_UP_2'] as const;
export type MessageType = typeof MESSAGE_TYPES[number];

export const MESSAGE_STATUSES = ['QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED'] as const;
export type MessageStatus = typeof MESSAGE_STATUSES[number];

export const MESSAGE_CHANNELS = ['whatsapp', 'email', 'instagram'] as const;
export type MessageChannel = typeof MESSAGE_CHANNELS[number];

// ─── Interfaces ──────────────────────────────────────────────────

export interface ICampaignSchedule {
  enabled: boolean;
  cronExpression: string;
}

export interface ICampaignFilters {
  minRating: number;
  minReviews: number;
  excludeWithWebsite: boolean;
}

export interface ICampaignStats {
  totalSearched: number;
  totalLeads: number;
  totalContacted: number;
  totalWithWebsite: number;
  totalWithoutWebsite: number;
}

export interface ICampaign {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  category: string;
  city: string;
  country: string;
  state?: string;
  status: CampaignStatus;
  isSearching: boolean;
  schedule?: ICampaignSchedule;
  filters: ICampaignFilters;
  stats: ICampaignStats;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILead {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  campaignId: Types.ObjectId;
  placeId: string;
  businessName: string;
  category: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  rating?: number;
  reviewCount?: number;
  website?: string;
  googleMapsUrl: string;
  openingHours?: string[];
  photos?: string[];
  aiScore: number;
  aiQualified: boolean;
  aiReason: string;
  websiteQualityScore?: number;
  websiteQualityIssues?: string;
  status: LeadStatus;
  notes?: string;
  messageHistory: Types.ObjectId[];
  followUpCount: number;
  nextFollowUpAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessage {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  leadId: Types.ObjectId;
  campaignId: Types.ObjectId;
  type: MessageType;
  channel: MessageChannel;
  content: string;
  subject?: string;
  whatsappMessageId?: string;
  status: MessageStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  errorMessage?: string;
  createdAt: Date;
}

export interface ISearchLog {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  campaignId: Types.ObjectId;
  query: string;
  totalResults: number;
  filteredResults: number;
  newLeads: number;
  duplicates: number;
  duration: number;
  error?: string;
  createdAt: Date;
}

// ─── Google Places Types ─────────────────────────────────────────

export interface GooglePlaceResult {
  id: string;
  displayName: { text: string; languageCode: string };
  formattedAddress: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  currentOpeningHours?: { weekdayDescriptions: string[] };
  photos?: Array<{ name: string }>;
  googleMapsUri?: string;
  businessStatus?: string;
}

export interface BusinessData {
  placeId: string;
  name: string;
  category: string;
  phone: string;
  address: string;
  city: string;
  rating?: number;
  reviewCount?: number;
  website?: string;
  googleMapsUrl: string;
  openingHours?: string[];
  photos?: string[];
}

// ─── AI Types ────────────────────────────────────────────────────

export interface AIQualificationResult {
  qualified: boolean;
  score: number;
  reason: string;
  websiteQualityScore?: number;
  websiteQualityIssues?: string;
}

// ─── API Response Types ──────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AnalyticsOverview {
  totalLeads: number;
  qualifiedLeads: number;
  messagesSent: number;
  messagesDelivered: number;
  messagesRead: number;
  replies: number;
  conversionRate: number;
}

export interface DailyAnalytics {
  date: string;
  leads: number;
  messages: number;
}

export interface TopItem {
  name: string;
  count: number;
}
