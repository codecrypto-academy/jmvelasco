import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MyTokens from '../components/tokenOps/MyTokens';
import * as contractModule from '../lib/contract';
import { buildToken } from './utils/builders';

// Mock contract module
vi.mock('../lib/contract', () => ({
  getUserTokens: vi.fn(),
  getUserTokensWithBalance: vi.fn(),
  getTokenDetails: vi.fn(),
}));

// Mock Web3Provider context
vi.mock('../contexts/Web3Provider', () => ({
  useWeb3: () => ({
    contract: {},
    provider: {},
  }),
}));

// Mock ethers BrowserProvider to avoid real provider checks
vi.mock('ethers', () => ({
  ethers: {
    BrowserProvider: class {
      constructor(_arg: any) {}
    },
  },
}));

// Mock SupplyChain__factory to capture event listener registration
vi.mock('../types/factories/SupplyChain__factory', () => {
  const listeners: Record<string, ((...args: any[]) => Promise<void> | void) | null> = {
    TokenCreated: null,
    TransferAccepted: null,
  };
  const contract = {
    filters: {
      TokenCreated: () => 'TokenCreated',
      TransferAccepted: () => 'TransferAccepted',
    },
    on: (filter: any, handler: any) => {
      listeners[filter] = handler;
    },
    off: (filter: any, handler: any) => {
      if (listeners[filter] === handler) listeners[filter] = null;
    },
    removeAllListeners: () => {
      listeners.TokenCreated = null;
      listeners.TransferAccepted = null;
    },
    getTransfer: vi.fn(),
  };
  return {
    SupplyChain__factory: {
      connect: vi.fn(() => contract),
    },
    __mock: {
      getListener: (eventName?: string) =>
        eventName ? listeners[eventName] : listeners.TokenCreated,
      contract,
    },
  };
});

// @ts-expect-error test-only mock export provided via vi.mock above
import { __mock as factoryMock } from '../types/factories/SupplyChain__factory';

const mockTokenDetails = buildToken({
  id: 1,
  creator: '0x123',
  name: 'Wheat',
});

const mockTokenDetailsReceived = buildToken({
  id: 42,
  creator: '0xproducer',
  name: 'Corn',
  totalSupply: 50,
  features: '{"country":"USA"}',
  dateCreated: 1700000100,
  balance: 10,
});

describe('MyTokens', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    vi.mocked(contractModule.getUserTokensWithBalance).mockResolvedValue([]);
  });

  it('shows empty state if user owns no tokens', async () => {
    // Arrange: mock contract to return no tokens
    vi.mocked(contractModule.getUserTokens).mockResolvedValue([]);
    vi.mocked(contractModule.getUserTokensWithBalance).mockResolvedValue([]);

    render(<MyTokens userAddress="0x123" />);
    await waitFor(() => {
      expect(screen.getByText(/no tokens yet/i)).toBeInTheDocument();
    });
  });

  it('shows list of owned tokens with metadata', async () => {
    // Arrange: mock contract to return mockTokens
    vi.mocked(contractModule.getUserTokens).mockResolvedValue([1]);
    vi.mocked(contractModule.getUserTokensWithBalance).mockResolvedValue([1]);
    vi.mocked(contractModule.getTokenDetails).mockResolvedValue(mockTokenDetails);

    render(<MyTokens userAddress="0x123" />);
    await waitFor(() => {
      expect(screen.getByText(/Wheat/i)).toBeInTheDocument();
      expect(screen.getByText(/Spain/i)).toBeInTheDocument();
    });
  });

  it('updates UI in real time when TokenCreated event is emitted for user', async () => {
    // Arrange
    (window as any).ethereum = {};
    vi.mocked(contractModule.getUserTokens).mockResolvedValue([]);
    vi.mocked(contractModule.getUserTokensWithBalance).mockResolvedValue([]);
    vi.mocked(contractModule.getTokenDetails).mockResolvedValue(mockTokenDetails);

    render(<MyTokens userAddress="0x123" />);

    // Act: emit a TokenCreated event (TypeChain/ethers v6 style)
    const listener = factoryMock.getListener();
    expect(listener).toBeTruthy();
    await act(async () => {
      await listener!({ args: [1, '0x123'] });
    });

    // Assert: token is rendered
    await waitFor(() => {
      expect(screen.getByText(/Wheat/i)).toBeInTheDocument();
    });
  });

  it('does not update UI for TokenCreated events from other users', async () => {
    // Arrange
    (window as any).ethereum = {};
    vi.mocked(contractModule.getUserTokens).mockResolvedValue([]);
    vi.mocked(contractModule.getUserTokensWithBalance).mockResolvedValue([]);
    vi.mocked(contractModule.getTokenDetails).mockResolvedValue(mockTokenDetails);

    render(<MyTokens userAddress="0xABC" />);

    // Act: emit event with different creator
    const listener = factoryMock.getListener();
    expect(listener).toBeTruthy();
    await listener!({ args: [1, '0x123'] });

    // Assert: still empty state
    await waitFor(() => {
      expect(screen.getByText(/No tokens yet/i)).toBeInTheDocument();
    });
  });

  it('avoids duplicate appends when the same TokenCreated fires multiple times', async () => {
    // Arrange
    (window as any).ethereum = {};
    vi.mocked(contractModule.getUserTokens).mockResolvedValue([]);
    vi.mocked(contractModule.getUserTokensWithBalance).mockResolvedValue([]);
    vi.mocked(contractModule.getTokenDetails).mockResolvedValue(mockTokenDetails);

    render(<MyTokens userAddress="0x123" />);

    const listener = factoryMock.getListener();
    expect(listener).toBeTruthy();

    // Act: fire event twice
    await act(async () => {
      await listener!({ args: [1, '0x123'] });
    });
    await act(async () => {
      await listener!({ args: [1, '0x123'] });
    });

    // Assert: token appears only once
    await waitFor(() => {
      const items = screen.getAllByText(/Wheat/i);
      expect(items.length).toBe(1);
    });
  });

  // TransferAccepted event tests
  it('updates UI when TransferAccepted event fires for recipient', async () => {
    // Arrange
    (window as any).ethereum = {};
    vi.mocked(contractModule.getUserTokens).mockResolvedValue([]);
    vi.mocked(contractModule.getUserTokensWithBalance).mockResolvedValue([]);
    vi.mocked(contractModule.getTokenDetails).mockResolvedValue(mockTokenDetailsReceived);
    factoryMock.contract.getTransfer.mockResolvedValue({
      id: 1,
      transferId: 1,
      tokenId: 42,
      from: '0xproducer',
      to: '0xfactory',
      amount: 10,
      status: 'Accepted',
    });

    render(<MyTokens userAddress="0xfactory" />);

    // Wait for initial empty state
    await waitFor(() => {
      expect(screen.getByText(/no tokens yet/i)).toBeInTheDocument();
    });

    // Act: emit TransferAccepted event
    const listener = factoryMock.getListener('TransferAccepted');
    expect(listener).toBeTruthy();
    await act(async () => {
      await listener!({ args: { transferId: 1 } });
    });

    // Assert: token appears
    await waitFor(() => {
      expect(screen.getByText(/Corn/i)).toBeInTheDocument();
    });
  });

  it('ignores TransferAccepted events where recipient is not current user', async () => {
    // Arrange
    (window as any).ethereum = {};
    vi.mocked(contractModule.getUserTokens).mockResolvedValue([]);
    vi.mocked(contractModule.getUserTokensWithBalance).mockResolvedValue([]);
    factoryMock.contract.getTransfer.mockResolvedValue({
      id: 1,
      tokenId: 42,
      from: '0xproducer',
      to: '0xretailer', // Different user
      amount: 10,
      status: 'Accepted',
    });

    render(<MyTokens userAddress="0xfactory" />);

    // Act: emit TransferAccepted for transfer to different user
    const listener = factoryMock.getListener('TransferAccepted');
    expect(listener).toBeTruthy();
    await act(async () => {
      await listener!({ args: { transferId: 1 } });
    });

    // Assert: still empty state
    await waitFor(() => {
      expect(screen.getByText(/No tokens yet/i)).toBeInTheDocument();
    });
  });

  it('prevents duplicate tokens when TransferAccepted fires multiple times', async () => {
    // Arrange
    (window as any).ethereum = {};
    vi.mocked(contractModule.getUserTokens).mockResolvedValue([]);
    vi.mocked(contractModule.getUserTokensWithBalance).mockResolvedValue([]);
    vi.mocked(contractModule.getTokenDetails).mockResolvedValue(mockTokenDetailsReceived);
    factoryMock.contract.getTransfer.mockResolvedValue({
      id: 1,
      tokenId: 42,
      from: '0xproducer',
      to: '0xfactory',
      amount: 10,
      status: 'Accepted',
    });

    render(<MyTokens userAddress="0xfactory" />);

    const listener = factoryMock.getListener('TransferAccepted');
    expect(listener).toBeTruthy();

    // Act: fire event twice
    await act(async () => {
      await listener!({ args: { transferId: 1 } });
    });
    await act(async () => {
      await listener!({ args: { transferId: 1 } });
    });

    // Assert: token appears only once
    await waitFor(() => {
      const items = screen.getAllByText(/Corn/i);
      expect(items.length).toBe(1);
    });
  });

  it.skip('when accepting a transfer of an existing token, the balance is updated in real-time', async () => {
    // ARRANGE
    // 1. User already owns token ID 1 with balance 100
    vi.mocked(contractModule.getUserTokens).mockResolvedValue([1]);
    vi.mocked(contractModule.getUserTokens).mockResolvedValue([1]);
    vi.mocked(contractModule.getUserTokensWithBalance).mockResolvedValue([1]);

    const initialTokenDetails = {
      id: 1,
      creator: '0xproducer',
      name: 'Wheat',
      totalSupply: 200,
      features: '{"country":"Spain"}',
      parentId: 0,
      dateCreated: 1700000000,
      balance: 100, // Initial balance
    };

    const receivedTokenDetails = {
      id: 2,
      creator: '0xproducer',
      name: 'Corn',
      totalSupply: 50,
      features: '{"country":"USA"}',
      parentId: 0,
      dateCreated: 1700000100,
      balance: 50, // Received balance
    };

    // First call: initial fetch returns only the original token
    vi.mocked(contractModule.getTokenDetails).mockResolvedValueOnce(initialTokenDetails);

    // Render component and wait for initial load
    render(<MyTokens userAddress="0x123" />);
    await waitFor(() => {
      const balanceLabels = screen.getAllByText('Balance');
      expect(balanceLabels.length).toBe(1);
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    // ACT
    // 2. Mock getTransfer to return a transfer where user is recipient
    const mockTransfer = {
      transferId: 1,
      tokenId: 2, // New token received
      from: '0xproducer',
      to: '0x123', // Current user is recipient
      amount: 50,
      status: 2, // Accepted
    };
    factoryMock.contract.getTransfer.mockResolvedValue(mockTransfer);

    // 3. After transfer, getUserTokensWithBalance returns both tokens
    vi.mocked(contractModule.getUserTokensWithBalance).mockResolvedValue([1, 2]);
    // getTokenDetails returns details for the received token
    vi.mocked(contractModule.getTokenDetails).mockResolvedValueOnce(receivedTokenDetails);

    // 4. Simulate TransferAccepted event
    const listener = factoryMock.getListener('TransferAccepted');
    await act(async () => {
      await listener?.({ args: { transferId: 1 } });
    });

    // ASSERT
    // 5. Verify both tokens are shown in UI
    await waitFor(() => {
      const balanceLabels = screen.getAllByText('Balance');
      expect(balanceLabels.length).toBe(2);
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
    });
  });
});
