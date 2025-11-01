import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoisted mock for ethers
let currentAccount = '0xOLD_ACCOUNT';
vi.mock('ethers', () => {
  class MockSigner {
    async getAddress() {
      return currentAccount;
    }
  }
  class MockBrowserProvider {
    constructor(_eth: any) {}
    async getSigner() {
      return new MockSigner();
    }
  }
  return {
    ethers: {
      BrowserProvider: MockBrowserProvider,
      Contract: vi.fn(),
    },
  };
});

import { useWeb3, Web3Provider } from '../contexts/Web3Provider';

// Mock ethereum
let listeners: Record<string, Function[]> = {};
type ReqFn = (args: any) => Promise<any>;
const mockEthereum = {
  request: vi.fn<ReqFn>(async ({ method }: any) => {
    if (method === 'eth_accounts') return ['0xOLD_ACCOUNT'];
    if (method === 'eth_chainId') return '0x7a69';
    return null;
  }),
  on: vi.fn((event: string, cb: Function) => {
    listeners[event] = listeners[event] || [];
    listeners[event].push(cb);
  }),
  removeListener: vi.fn((event: string, cb: Function) => {
    listeners[event] = (listeners[event] || []).filter((fn) => fn !== cb);
  }),
  // util to emit
  _emit(event: string, payload: any) {
    (listeners[event] || []).forEach((fn) => fn(payload));
  },
};

// Patch globals before each test
beforeEach(() => {
  listeners = {};
  (global as any).window = Object.create(window);
  (window as any).ethereum = mockEthereum;
  // Clear storage
  localStorage.clear();
  currentAccount = '0xOLD_ACCOUNT';
});

describe('Web3Provider Account Change Bug', () => {
  it('updates to correct account when MetaMask account changes after page reload', async () => {
    const { result } = renderHook(() => useWeb3(), { wrapper: Web3Provider });

    // Initial connect with first account
    mockEthereum.request.mockImplementationOnce(async ({ method }: any) => {
      if (method === 'eth_requestAccounts') return ['0xOLD_ACCOUNT'];
      return null;
    });

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.address).toBe('0xOLD_ACCOUNT');
    expect(localStorage.getItem('web3:address')).toBe('0xOLD_ACCOUNT');

    // Simulate MetaMask account change
    currentAccount = '0xNEW_ACCOUNT';

    await act(async () => {
      mockEthereum._emit('accountsChanged', ['0xNEW_ACCOUNT']);
    });

    // BUG: This fails because handler uses stale provider
    // The address should update to the new account
    await waitFor(() => {
      expect(result.current.address).toBe('0xNEW_ACCOUNT');
    });

    // localStorage should also sync with the new account
    expect(localStorage.getItem('web3:address')).toBe('0xNEW_ACCOUNT');
  });
});
