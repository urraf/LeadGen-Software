import { Request, Response, NextFunction, RequestHandler } from 'express';
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';

// ─── Custom Error Class ──────────────────────────────────────────
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Async Route Handler Wrapper ─────────────────────────────────
export function catchAsync(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void | Response>
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ─── Phone Number Normalization ──────────────────────────────────
export function normalizePhone(phone: string, countryCode?: string): string | null {
  if (!phone) return null;

  // Remove common prefixes and whitespace
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Try parsing with libphonenumber-js
  const parsed = parsePhoneNumberFromString(
    cleaned,
    (countryCode?.toUpperCase() as CountryCode) || undefined
  );

  if (parsed && parsed.isValid()) {
    return parsed.format('E.164');
  }

  // Fallback: if already starts with +, return as-is
  if (cleaned.startsWith('+') && cleaned.length >= 10) {
    return cleaned;
  }

  return null;
}

// ─── Sleep Utility ───────────────────────────────────────────────
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Retry with Exponential Backoff ──────────────────────────────
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

// ─── Pagination Helper ──────────────────────────────────────────
export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function parsePagination(page?: number, limit?: number): PaginationParams {
  const p = Math.max(1, page || 1);
  const l = Math.min(100000, Math.max(1, limit || 20)); // Increased limit to allow large CSV exports
  return { page: p, limit: l, skip: (p - 1) * l };
}
