import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoisted mock for ethers
let currentAccount = '0xabc';
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

function TestConsumer() {
  const { address, connect } = useWeb3();
  return (
    <div>
      <span data-testid="address">{address ?? ''}</span>
      <button onClick={connect}>connect</button>
    </div>
  );
}

// Helpers to render with provider
function renderWithProvider() {
  return render(
    <Web3Provider>
      <TestConsumer />
    </Web3Provider>
  );
}

// Mock ethereum
let listeners: Record<string, Function[]> = {};
type ReqFn = (args: any) => Promise<any>;
const mockEthereum = {
  request: vi.fn<ReqFn>(async ({ method }: any) => {
    if (method === 'eth_accounts') return [];
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
  currentAccount = '0xabc';
});

describe('Web3Provider persistence', () => {
  it('does not have address initially and persists after connect', async () => {
    renderWithProvider();
    expect(screen.getByTestId('address').textContent).toBe('');

    // Simulate connect by mocking eth_accounts to have one account then clicking connect
    mockEthereum.request.mockImplementationOnce(async ({ method }: any) => {
      if (method === 'eth_requestAccounts') return ['0xabc'];
      return null;
    });

    // Click connect (simulate real user)
    await userEvent.click(screen.getByText('connect'));

    await waitFor(() => {
      expect(screen.getByTestId('address').textContent).toBe('0xabc');
    });

    // Expect persisted
    expect(localStorage.getItem('web3:address')).toBe('0xabc');
  });

  it('auto-connects from localStorage on load', async () => {
    localStorage.setItem('web3:address', '0xdef');
    // Also simulate eth_accounts contains that address
    mockEthereum.request.mockImplementation(async ({ method }: any) => {
      if (method === 'eth_accounts') return ['0xdef'];
      return null;
    });

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('address').textContent).toBe('0xdef');
    });
  });
});

describe('Web3Provider MetaMask events', () => {
  it('updates address on accountsChanged', async () => {
    // Start connected
    mockEthereum.request.mockImplementation(async ({ method }: any) => {
      if (method === 'eth_accounts') return ['0xabc'];
      return null;
    });
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('address').textContent).toBe('0xabc'));

    // Emit accountsChanged
    await act(async () => {
      mockEthereum._emit('accountsChanged', ['0x123']);
    });

    await waitFor(() => expect(screen.getByTestId('address').textContent).toBe('0x123'));
  });

  it('resets state on chainChanged', async () => {
    mockEthereum.request.mockImplementation(async ({ method }: any) => {
      if (method === 'eth_accounts') return ['0xabc'];
      return null;
    });
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('address').textContent).toBe('0xabc'));

    // Emit chainChanged
    await act(async () => {
      mockEthereum._emit('chainChanged', '0x7a69');
    });

    await waitFor(() => expect(screen.getByTestId('address').textContent).toBe(''));
  });
});
