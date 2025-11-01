import { ethers } from 'ethers';
import { NETWORK_NAMES } from '../config/networks';

// Types
export interface WalletConnection {
  address: string;
  chainId: number;
  isConnected: boolean;
}

export interface NetworkInfo {
  chainId: number;
  name: string;
}

// Web3 Service Class
// Minimal EIP-1193 provider shape
type Eip1193RequestArgs = {
  method: string;
  params?: unknown[] | Record<string, unknown>;
};

interface Eip1193Provider {
  request: (args: Eip1193RequestArgs) => Promise<any>;
  on?: (event: string, listener: (...args: any[]) => void) => void;
  removeListener?: (event: string, listener: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
}

const ERRORS = {
  METAMASK_NOT_INSTALLED: 'MetaMask is not installed',
  METAMASK_NOT_AVAILABLE: 'MetaMask is not installed', // normalize to one message
  INVALID_ADDRESS: 'Invalid Ethereum address',
  CONNECT_FAILED: 'Failed to connect wallet',
  BALANCE_FAILED: 'Failed to get balance',
  SWITCH_NETWORK_FAILED: 'Failed to switch network',
  NETWORK_INFO_FAILED: 'Failed to get network info',
} as const;

// Helpers
function getEthereum(): Eip1193Provider {
  const eth = (globalThis as any)?.window?.ethereum ?? (globalThis as any)?.ethereum;
  if (!eth) throw new Error(ERRORS.METAMASK_NOT_INSTALLED);
  return eth as Eip1193Provider;
}

function ensureMetaMask(eth: Eip1193Provider) {
  if (!eth?.isMetaMask) throw new Error(ERRORS.METAMASK_NOT_INSTALLED);
}

function toHexChainId(chainId: number): string {
  // Manual, test-friendly conversion to 0x-prefixed hex
  return `0x${Number(chainId).toString(16)}`;
}

function parseChainId(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('0x') || trimmed.startsWith('0X')) {
      return parseInt(trimmed, 16);
    }
    const n = parseInt(trimmed, 10);
    return Number.isNaN(n) ? Number.NaN : n;
  }
  return Number.NaN;
}

class Web3Service {
  /**
   * Check if MetaMask is available
   */
  isMetaMaskAvailable(): boolean {
    try {
      const eth = getEthereum();
      return !!eth?.isMetaMask;
    } catch {
      return false;
    }
  }

  /**
   * Connect to MetaMask wallet
   */
  async connectWallet(): Promise<WalletConnection> {
    const ethereum = getEthereum();
    ensureMetaMask(ethereum);

    try {
      // Request accounts
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });

      // Get chain ID
      const chainId = await ethereum.request({
        method: 'eth_chainId',
      });

      return {
        address: accounts[0],
        chainId: parseChainId(chainId),
        isConnected: true,
      };
    } catch (error: any) {
      // Normalize user rejection (EIP-1193 userRejectedRequest = 4001)
      if (error?.code === 4001) throw new Error('User rejected the request');
      throw new Error(error?.message || ERRORS.CONNECT_FAILED);
    }
  }

  /**
   * Get balance for an address
   */
  async getBalance(address: string): Promise<string> {
    if (!ethers.isAddress(address)) {
      throw new Error(ERRORS.INVALID_ADDRESS);
    }

    const ethereum = getEthereum();

    try {
      const balance = await ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });

      return ethers.formatEther(balance);
    } catch (error: any) {
      throw new Error(error?.message || ERRORS.BALANCE_FAILED);
    }
  }

  /**
   * Switch to a different network
   */
  async switchNetwork(chainId: number): Promise<void> {
    const ethereum = getEthereum();
    ensureMetaMask(ethereum);
    const hexChainId = toHexChainId(chainId);

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }],
      });
    } catch (error: any) {
      if (error?.code === 4001) throw new Error('User rejected the request');
      throw new Error(error?.message || ERRORS.SWITCH_NETWORK_FAILED);
    }
  }

  /**
   * Get current network information
   */
  async getCurrentNetwork(): Promise<NetworkInfo> {
    const ethereum = getEthereum();

    try {
      const chainId = await ethereum.request({
        method: 'eth_chainId',
      });

      const numericChainId = parseChainId(chainId);
      const name = NETWORK_NAMES[numericChainId] || 'Unknown Network';

      return {
        chainId: numericChainId,
        name,
      };
    } catch (error: any) {
      throw new Error(error?.message || ERRORS.NETWORK_INFO_FAILED);
    }
  }
}

// Export singleton instance
export const web3Service = new Web3Service();
