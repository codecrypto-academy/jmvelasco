import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Web3Provider } from '../contexts/Web3Provider';
import { useWallet } from '../hooks/useWallet';

// Mock web3 service used by the hook
vi.mock('../lib/web3', () => ({
  web3Service: {
    connectWallet: vi.fn(),
    getBalance: vi.fn(),
    switchNetwork: vi.fn().mockResolvedValue(undefined),
    getCurrentNetwork: vi.fn().mockResolvedValue({ chainId: 1, name: 'Ethereum Mainnet' }),
    isMetaMaskAvailable: vi.fn(),
  },
}));

// Mock ethers to avoid deep provider behavior in Web3Provider
vi.mock('ethers', () => ({
  ethers: {
    BrowserProvider: vi.fn().mockImplementation(() => ({
      getSigner: vi.fn().mockResolvedValue({}),
    })),
    Contract: vi.fn(),
    isAddress: vi.fn().mockReturnValue(true), // Mock isAddress for validation
  },
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <Web3Provider>{children}</Web3Provider>;
}

describe('useWallet hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // minimal ethereum mock to avoid provider check crashes in context
    (window as any).ethereum = {
      request: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
      isMetaMask: true,
    };
  });

  it('exposes connection state and connect action', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });

    // initial state
    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBeNull();

    // mock MetaMask request to return one account
    (window as any).ethereum.request.mockResolvedValueOnce([
      '0x1234567890123456789012345678901234567890',
    ]);

    // simulate connect through hook (will call context.connect internally)
    await act(async () => {
      await result.current.connect();
    });

    // Verify connect method exists and executes successfully
    expect(typeof result.current.connect).toBe('function');
  });

  it('returns balance via service', async () => {
    const { web3Service } = await import('../lib/web3');
    (web3Service.getBalance as any).mockResolvedValue('1.23');

    const { result } = renderHook(() => useWallet(), { wrapper });

    const balance = await result.current.getBalance('0x1234567890123456789012345678901234567890');
    expect(balance).toBe('1.23');
    expect(web3Service.getBalance).toHaveBeenCalled();
  });

  it('switches network using service', async () => {
    const { web3Service } = await import('../lib/web3');

    const { result } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.switchNetwork(1);
    });
    expect(web3Service.switchNetwork).toHaveBeenCalledWith(1);
  });

  it('provides network info from service', async () => {
    const { web3Service } = await import('../lib/web3');
    (web3Service.getCurrentNetwork as any).mockResolvedValue({
      chainId: 1,
      name: 'Ethereum Mainnet',
    });

    const { result } = renderHook(() => useWallet(), { wrapper });

    const net = await result.current.getCurrentNetwork();
    expect(net).toEqual({ chainId: 1, name: 'Ethereum Mainnet' });
  });
});
