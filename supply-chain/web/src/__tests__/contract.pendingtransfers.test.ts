import { describe, expect, it } from 'vitest';
import { getPendingTransfersBySender } from '../lib/contract';

describe('contract.getPendingTransfersBySender', () => {
  it('should be defined as a function', () => {
    expect(getPendingTransfersBySender).toBeDefined();
    expect(typeof getPendingTransfersBySender).toBe('function');
  });

  it('returns empty array when no ethereum provider', async () => {
    // Simulate no window.ethereum
    const originalEthereum = (global as any).window?.ethereum;
    if ((global as any).window) {
      (global as any).window.ethereum = undefined;
    }

    const result = await getPendingTransfersBySender('0x123');
    expect(result).toEqual([]);

    // Restore
    if ((global as any).window && originalEthereum) {
      (global as any).window.ethereum = originalEthereum;
    }
  });
});
