import { useState, useEffect, useCallback, useMemo } from 'react';
import { ethers } from 'ethers';
import { UserRole } from '../../../../lib/enums';
import { CONTRACT_CONFIG } from '../../../../config/contracts';

export interface UserBalance {
  address: string;
  role: UserRole;
  balance: number;
  percentage: number;
}

export interface TokenOverview {
  id: number;
  name: string;
  symbol: string;
  totalSupply: number;
  parentId: number;
  level: 'raw' | 'processed' | 'final';
  balances: UserBalance[];
  processedAmount: number; // Amount converted to derived tokens
}

export interface SupplyChainOverviewData {
  tokens: TokenOverview[];
  isLoading: boolean;
  error: string | null;
  totalTokens: number;
  totalSupply: number;
}

// Known addresses for the demo (from manual testing guide)
const KNOWN_ADDRESSES = {
  admin: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
  producer: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
  factory: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
  retailer: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
  consumer: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
};

const ADDRESS_TO_ROLE: Record<string, UserRole> = {
  [KNOWN_ADDRESSES.producer]: UserRole.Producer,
  [KNOWN_ADDRESSES.factory]: UserRole.Factory,
  [KNOWN_ADDRESSES.retailer]: UserRole.Retailer,
  [KNOWN_ADDRESSES.consumer]: UserRole.Consumer,
  [KNOWN_ADDRESSES.admin]: UserRole.Admin,
};

export function useSupplyChainOverview(): SupplyChainOverviewData {
  const [tokens, setTokens] = useState<TokenOverview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const determineTokenLevel = useCallback(
    (
      token: { parentId: number; id: number },
      allTokens: TokenOverview[]
    ): 'raw' | 'processed' | 'final' => {
      if (token.parentId === 0) return 'raw';

      // Check if this token has children (is used as parent by other tokens)
      const hasChildren = allTokens.some((t) => t.parentId === token.id);
      return hasChildren ? 'processed' : 'final';
    },
    []
  );

  const calculateProcessedAmount = useCallback(
    (tokenId: number, allTokens: TokenOverview[]): number => {
      return allTokens
        .filter((t) => t.parentId === tokenId)
        .reduce((sum, t) => sum + t.totalSupply, 0);
    },
    []
  );

  const fetchSupplyChainData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Create read-only provider
      const provider = new ethers.JsonRpcProvider('http://localhost:8545');
      const contract = new ethers.Contract(CONTRACT_CONFIG.address, CONTRACT_CONFIG.abi, provider);

      const tokenOverviews: TokenOverview[] = [];

      // Get next token ID to know how many tokens exist
      const nextId = Number(await contract.nextTokenId());

      // Fetch all tokens from ID 1 to nextId-1
      for (let tokenId = 1; tokenId < nextId; tokenId++) {
        try {
          const tokenInfo = await contract.getToken(tokenId);

          // Get balances for all known addresses
          const balances: UserBalance[] = [];

          for (const [address, role] of Object.entries(ADDRESS_TO_ROLE)) {
            try {
              const balance = await contract.getTokenBalance(tokenId, address);
              const balanceNum = Number(balance);

              if (balanceNum > 0) {
                balances.push({
                  address,
                  role,
                  balance: balanceNum,
                  percentage: 0, // Will calculate after we have total
                });
              }
            } catch {
              // Balance might be 0 or user doesn't exist, continue
            }
          }

          // Calculate percentages
          const totalSupply = Number(tokenInfo.totalSupply);
          balances.forEach((balance) => {
            balance.percentage = totalSupply > 0 ? (balance.balance / totalSupply) * 100 : 0;
          });

          tokenOverviews.push({
            id: Number(tokenInfo.id),
            name: tokenInfo.name,
            symbol: '', // Contract doesn't have symbol field
            totalSupply,
            parentId: Number(tokenInfo.parentId),
            level: 'raw', // Will be determined later
            balances: balances.sort((a, b) => b.balance - a.balance), // Sort by balance desc
            processedAmount: 0, // Will be calculated later
          });
        } catch {
          // Token doesn't exist, continue
        }
      }

      // Determine levels and processed amounts
      tokenOverviews.forEach((token) => {
        token.level = determineTokenLevel(token, tokenOverviews);
        token.processedAmount = calculateProcessedAmount(token.id, tokenOverviews);
      });

      // Sort by level (raw first, then processed, then final) and by ID
      const levelOrder = { raw: 0, processed: 1, final: 2 };
      tokenOverviews.sort((a, b) => {
        const levelDiff = levelOrder[a.level] - levelOrder[b.level];
        return levelDiff !== 0 ? levelDiff : a.id - b.id;
      });

      setTokens(tokenOverviews);
    } catch (err) {
      console.error('Error fetching supply chain data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load supply chain data');
    } finally {
      setIsLoading(false);
    }
  }, [determineTokenLevel, calculateProcessedAmount]);

  // Initial load
  useEffect(() => {
    fetchSupplyChainData();
  }, [fetchSupplyChainData]);

  // Refresh data every 5 seconds for real-time updates
  useEffect(() => {
    const intervalId = setInterval(fetchSupplyChainData, 5000);
    return () => clearInterval(intervalId);
  }, [fetchSupplyChainData]);

  const totalTokens = tokens.length;
  const totalSupply = tokens.reduce((sum, token) => sum + token.totalSupply, 0);

  return useMemo(
    () => ({
      tokens,
      isLoading,
      error,
      totalTokens,
      totalSupply,
    }),
    [tokens, isLoading, error, totalTokens, totalSupply]
  );
}
