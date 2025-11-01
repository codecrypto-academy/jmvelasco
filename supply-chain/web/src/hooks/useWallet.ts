import { ethers } from 'ethers';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWeb3 } from '../contexts/Web3Provider';
import { web3Service, type NetworkInfo } from '../lib/web3';

// Tipos específicos del hook useWallet
export interface WalletState {
  address: string | null;
  isConnected: boolean;
  chainId: number | null;
  networkName: string | null;
}

export interface WalletActions {
  connect: () => Promise<void>;
  getBalance: (address?: string) => Promise<string>;
  switchNetwork: (chainId: number) => Promise<void>;
  getCurrentNetwork: () => Promise<NetworkInfo>;
}

export interface UseWalletReturn extends WalletState, WalletActions {}

export function useWallet(): UseWalletReturn {
  const { address, connect } = useWeb3();
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);

  const isConnected = !!address;
  const chainId = networkInfo?.chainId ?? null;
  const networkName = networkInfo?.name ?? null;

  // Fetch network info when connected
  useEffect(() => {
    if (isConnected) {
      web3Service
        .getCurrentNetwork()
        .then(setNetworkInfo)
        .catch(() => setNetworkInfo(null));
    } else {
      setNetworkInfo(null);
    }
  }, [isConnected]);

  const getBalance = useCallback(
    async (addr?: string): Promise<string> => {
      try {
        const target = addr ?? address;
        if (!target) return '0.0';

        // Validate Ethereum address format
        if (!ethers.isAddress(target)) {
          throw new Error(`Invalid Ethereum address: ${target}`);
        }

        return await web3Service.getBalance(target);
      } catch (error) {
        throw new Error(
          `Failed to get balance: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
    [address]
  );

  const switchNetwork = useCallback(async (chainId: number): Promise<void> => {
    try {
      // Validate chainId is a positive integer
      if (!Number.isInteger(chainId) || chainId <= 0) {
        throw new Error(`Invalid chain ID: ${chainId}. Must be a positive integer.`);
      }

      await web3Service.switchNetwork(chainId);
      // Refresh network info after successful switch
      const newNetworkInfo = await web3Service.getCurrentNetwork();
      setNetworkInfo(newNetworkInfo);
    } catch (error) {
      throw new Error(
        `Failed to switch network: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }, []);

  const getCurrentNetwork = useCallback(async (): Promise<NetworkInfo> => {
    try {
      return await web3Service.getCurrentNetwork();
    } catch (error) {
      throw new Error(
        `Failed to get network info: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }, []);

  return useMemo(
    () => ({
      address,
      isConnected,
      chainId,
      networkName,
      connect,
      getBalance,
      switchNetwork,
      getCurrentNetwork,
    }),
    [
      address,
      isConnected,
      chainId,
      networkName,
      connect,
      getBalance,
      switchNetwork,
      getCurrentNetwork,
    ]
  );
}
