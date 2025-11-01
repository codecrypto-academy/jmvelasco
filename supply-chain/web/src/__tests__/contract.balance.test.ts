import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as contract from '../lib/contract';

describe('contract.getUserTokensWithBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should be exported as a function', () => {
    expect(contract.getUserTokensWithBalance).toBeDefined();
    expect(typeof contract.getUserTokensWithBalance).toBe('function');
  });

  it('should return empty array when provider fails', async () => {
    // In test environment without real provider, should handle gracefully
    const result = await contract.getUserTokensWithBalance('0xfactory');

    // Should handle the error and return empty array
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([]);
  });
});
