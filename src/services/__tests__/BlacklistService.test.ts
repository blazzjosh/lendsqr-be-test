/**
 * BlacklistService Unit Tests
 */

import { BlacklistService } from '../BlacklistService.js';

// Mock global fetch
global.fetch = jest.fn();

describe('BlacklistService', () => {
  let blacklistService: BlacklistService;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    blacklistService = new BlacklistService('https://test-api.com/blacklist', 5000);
  });

  describe('checkBlacklist', () => {
    const email = 'test@example.com';
    const phoneNumber = '+2348012345678';

    it('should return not blacklisted when API confirms user is clean', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'clear' }),
      } as Response);

      const result = await blacklistService.checkBlacklist(email, phoneNumber);

      expect(result.isBlacklisted).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.com/blacklist',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should return blacklisted when API confirms user is blacklisted', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'blacklisted',
          reason: 'Fraudulent activity detected',
        }),
      } as Response);

      const result = await blacklistService.checkBlacklist(email, phoneNumber);

      expect(result.isBlacklisted).toBe(true);
      expect(result.reason).toBe('Fraudulent activity detected');
    });

    it('should return blacklisted when karma.blacklist is true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          karma: { blacklist: true },
          reason: 'Found in karma database',
        }),
      } as Response);

      const result = await blacklistService.checkBlacklist(email, phoneNumber);

      expect(result.isBlacklisted).toBe(true);
      expect(result.reason).toBe('Found in karma database');
    });

    it('should return blacklisted on API error (fail-safe)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await blacklistService.checkBlacklist(email, phoneNumber);

      expect(result.isBlacklisted).toBe(true);
    });

    it('should return blacklisted on timeout (fail-safe)', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const result = await blacklistService.checkBlacklist(email, phoneNumber);

      expect(result.isBlacklisted).toBe(true);
    });

    it('should return blacklisted when API returns non-OK status (fail-safe)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const result = await blacklistService.checkBlacklist(email, phoneNumber);

      expect(result.isBlacklisted).toBe(true);
      expect(result.reason).toBe('Blacklist verification service unavailable');
    });

    it('should handle empty API response gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

      const result = await blacklistService.checkBlacklist(email, phoneNumber);

      expect(result.isBlacklisted).toBe(false);
    });
  });

  describe('checkBlacklistByIdentity', () => {
    const identityNumber = '12345678901';

    it('should return not blacklisted for clean identity', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'clear' }),
      } as Response);

      const result = await blacklistService.checkBlacklistByIdentity(identityNumber);

      expect(result.isBlacklisted).toBe(false);
    });

    it('should return blacklisted for blacklisted identity', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'blacklisted',
          reason: 'Identity found in blacklist',
        }),
      } as Response);

      const result = await blacklistService.checkBlacklistByIdentity(identityNumber);

      expect(result.isBlacklisted).toBe(true);
      expect(result.reason).toBe('Identity found in blacklist');
    });

    it('should return blacklisted on error (fail-safe)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await blacklistService.checkBlacklistByIdentity(identityNumber);

      expect(result.isBlacklisted).toBe(true);
    });
  });
});
