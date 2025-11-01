import { beforeEach, describe, expect, it, vi } from 'vitest';
import { web3Service } from '../lib/web3';

// Mock ethers
vi.mock('ethers', () => ({
  ethers: {
    BrowserProvider: vi.fn(),
    Contract: vi.fn(),
    formatEther: vi.fn(),
    parseEther: vi.fn(),
    isAddress: vi.fn(),
  },
}));

// Mock window.ethereum
const mockEthereum = {
  request: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  isMetaMask: true,
};

Object.defineProperty(window, 'ethereum', {
  value: mockEthereum,
  writable: true,
});

describe('Web3 Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure a clean ethereum mock for every test and avoid order-dependence
    mockEthereum.request = vi.fn();
    mockEthereum.on = vi.fn();
    mockEthereum.removeListener = vi.fn();
    Object.defineProperty(window, 'ethereum', {
      value: mockEthereum,
      writable: true,
    });
  });

  describe('connectWallet', () => {
    it('should connect to MetaMask and return account info', async () => {
      // Reset ethereum mock for this test
      Object.defineProperty(window, 'ethereum', {
        value: mockEthereum,
        writable: true,
      });

      const mockAccounts = ['0x1234567890123456789012345678901234567890'];
      const mockChainId = '0x1';

      mockEthereum.request
        .mockResolvedValueOnce(mockAccounts) // eth_requestAccounts
        .mockResolvedValueOnce(mockChainId); // eth_chainId

      const result = await web3Service.connectWallet();

      expect(result).toEqual({
        address: mockAccounts[0],
        chainId: parseInt(mockChainId, 16),
        isConnected: true,
      });

      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'eth_requestAccounts',
      });
      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'eth_chainId',
      });
    });

    it('should throw error when MetaMask is not available', async () => {
      Object.defineProperty(window, 'ethereum', {
        value: undefined,
        writable: true,
      });

      await expect(web3Service.connectWallet()).rejects.toThrow('MetaMask is not installed');
    });

    it('should throw error when user rejects connection', async () => {
      // Reset ethereum mock for this test
      Object.defineProperty(window, 'ethereum', {
        value: mockEthereum,
        writable: true,
      });

      mockEthereum.request.mockRejectedValueOnce(new Error('User rejected the request'));

      await expect(web3Service.connectWallet()).rejects.toThrow('User rejected the request');
    });
  });

  describe('getBalance', () => {
    it('should return formatted balance for valid address', async () => {
      const mockAddress = '0x1234567890123456789012345678901234567890';
      const mockBalance = '1000000000000000000'; // 1 ETH in wei

      mockEthereum.request.mockResolvedValueOnce(mockBalance);

      const { ethers } = await import('ethers');
      (ethers.formatEther as any).mockReturnValue('1.0');
      (ethers.isAddress as any).mockReturnValue(true);

      const balance = await web3Service.getBalance(mockAddress);

      expect(balance).toBe('1.0');
      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'eth_getBalance',
        params: [mockAddress, 'latest'],
      });
      expect(ethers.formatEther).toHaveBeenCalledWith(mockBalance);
    });

    it('should throw error for invalid address', async () => {
      const { ethers } = await import('ethers');
      (ethers.isAddress as any).mockReturnValue(false);

      await expect(web3Service.getBalance('invalid-address')).rejects.toThrow(
        'Invalid Ethereum address'
      );
    });
  });

  describe('switchNetwork', () => {
    it('should switch to specified network', async () => {
      // Reset ethereum mock for this test
      Object.defineProperty(window, 'ethereum', {
        value: mockEthereum,
        writable: true,
      });

      const targetChainId = 1; // Mainnet
      const hexChainId = '0x1';

      mockEthereum.request.mockResolvedValueOnce(null);

      await web3Service.switchNetwork(targetChainId);

      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      });
    });

    it('should handle network switch rejection', async () => {
      // Reset ethereum mock for this test
      Object.defineProperty(window, 'ethereum', {
        value: mockEthereum,
        writable: true,
      });

      const targetChainId = 1;

      mockEthereum.request.mockRejectedValueOnce(new Error('User rejected the request'));

      await expect(web3Service.switchNetwork(targetChainId)).rejects.toThrow(
        'User rejected the request'
      );
    });
  });

  describe('getCurrentNetwork', () => {
    it('should return current network info', async () => {
      // Reset ethereum mock for this test
      Object.defineProperty(window, 'ethereum', {
        value: mockEthereum,
        writable: true,
      });

      const mockChainId = '0x1';

      mockEthereum.request.mockResolvedValueOnce(mockChainId);

      const networkInfo = await web3Service.getCurrentNetwork();

      expect(networkInfo).toEqual({
        chainId: 1,
        name: 'Ethereum Mainnet',
      });
      expect(mockEthereum.request).toHaveBeenCalledWith({
        method: 'eth_chainId',
      });
    });

    it('should return unknown network for unrecognized chain ID', async () => {
      // Reset ethereum mock for this test
      Object.defineProperty(window, 'ethereum', {
        value: mockEthereum,
        writable: true,
      });

      const mockChainId = '0x999'; // Unknown network

      mockEthereum.request.mockResolvedValueOnce(mockChainId);

      const networkInfo = await web3Service.getCurrentNetwork();

      expect(networkInfo).toEqual({
        chainId: 2457,
        name: 'Unknown Network',
      });
    });
  });

  describe('isMetaMaskAvailable', () => {
    it('should return true when MetaMask is available', () => {
      Object.defineProperty(window, 'ethereum', {
        value: { isMetaMask: true },
        writable: true,
      });

      expect(web3Service.isMetaMaskAvailable()).toBe(true);
    });

    it('should return false when MetaMask is not available', () => {
      Object.defineProperty(window, 'ethereum', {
        value: undefined,
        writable: true,
      });

      expect(web3Service.isMetaMaskAvailable()).toBe(false);
    });

    it('should return false when ethereum exists but is not MetaMask', () => {
      Object.defineProperty(window, 'ethereum', {
        value: { isMetaMask: false },
        writable: true,
      });

      expect(web3Service.isMetaMaskAvailable()).toBe(false);
    });
  });
});
