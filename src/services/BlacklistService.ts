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
    this.apiUrl = process.env.BLACKLIST_API_URL || 'https://adjutor.lendsqr.com/v2/verification/karma';
    this.timeout = timeout;
  }

  /**
   * Check if a user is blacklisted by email or phone number
   * 
   * @param email - User's email address
   * @param phoneNumber - User's phone number
   * @returns BlacklistCheckResult indicating if user is blacklisted
   */
  async checkBlacklist(email: string, phoneNumber: string): Promise<BlacklistCheckResult> {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      // Make API request
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

      // Check if response is OK
      if (!response.ok) {
        console.error(`Blacklist API returned status ${response.status}`);
        // Fail-safe: treat as blacklisted if API returns error
        return {
          isBlacklisted: true,
          reason: 'Blacklist verification service unavailable',
        };
      }

      // Parse response
      const data = (await response.json()) as BlacklistApiResponse;

      // Check if user is blacklisted based on API response
      // Adjust this logic based on actual API response format
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
      // Log error for debugging
      console.error('Blacklist check failed:', error.message);

      // Fail-safe: if API is unreachable or times out, treat as blacklisted
      if (error.name === 'AbortError') {
        console.error('Blacklist API timeout');
      }

      return {
        isBlacklisted: true,
        reason: 'Unable to verify blacklist status - treating as blacklisted for safety',
      };
    }
  }

  /**
   * Check blacklist with identity number (optional)
   * 
   * @param identityNumber - User's identity number (e.g., BVN)
   * @returns BlacklistCheckResult
   */
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
      console.error('Blacklist identity check failed:', error.message);

      return {
        isBlacklisted: true,
        reason: 'Unable to verify blacklist status',
      };
    }
  }
}

export default BlacklistService;
