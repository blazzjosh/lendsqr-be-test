import { BlacklistCheckResult } from '../types/index.js';

interface BlacklistApiResponse {
  status?: string;
  reason?: string;
  karma?: {
    blacklist?: boolean;
  };
  [key: string]: any;
}

/**
 * BlacklistService
 * 
 * Integrates with Lendsqr Adjutor Karma API to check if users are blacklisted.
 * Implements fail-safe design: if API fails, treat user as blacklisted (err on side of caution).
 */
export class BlacklistService {
  private apiUrl: string;
  private timeout: number;

  constructor(apiUrl?: string, timeout: number = 5000) {
    // Use passed URL first, then env var, then default
    this.apiUrl = apiUrl || process.env.BLACKLIST_API_URL || 'https://adjutor.lendsqr.com/v2/verification/karma';
    this.timeout = timeout;
  }

  async checkBlacklist(email: string, phoneNumber: string): Promise<BlacklistCheckResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          phone_number: phoneNumber,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          isBlacklisted: true,
          reason: 'Blacklist verification service unavailable',
        };
      }

      const data = (await response.json()) as BlacklistApiResponse;

      if (data.status === 'blacklisted' || data.karma?.blacklist === true) {
        return {
          isBlacklisted: true,
          reason: data.reason || 'User found in blacklist',
        };
      }

      return {
        isBlacklisted: false,
      };

    } catch (error: any) {
      return {
        isBlacklisted: true,
        reason: 'Unable to verify blacklist status - treating as blacklisted for safety',
      };
    }
  }

  async checkBlacklistByIdentity(identityNumber: string): Promise<BlacklistCheckResult> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identity: identityNumber,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          isBlacklisted: true,
          reason: 'Blacklist verification service unavailable',
        };
      }

      const data = (await response.json()) as BlacklistApiResponse;

      if (data.status === 'blacklisted' || data.karma?.blacklist === true) {
        return {
          isBlacklisted: true,
          reason: data.reason || 'Identity found in blacklist',
        };
      }

      return {
        isBlacklisted: false,
      };

    } catch (error: any) {
      return {
        isBlacklisted: true,
        reason: 'Unable to verify blacklist status',
      };
    }
  }
}

export default BlacklistService;
