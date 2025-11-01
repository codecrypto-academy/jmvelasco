/**
 * Producer role data hook
 * Fetches and manages producer-specific supply chain data
 */

import { useState, useEffect, useCallback } from 'react';
import { UserRole, TransferStatus } from '../../../../lib/enums';
import {
  getUserTokens,
  getTokenDetails,
  getPendingTransfersBySender,
} from '../../../../lib/contract';
import type {
  ProducerWidgetData,
  UseRoleDataReturn,
  CreatedToken,
  ActiveTransfer,
} from '../config/types';

export function useProducerData(
  address: `0x${string}` | null
): UseRoleDataReturn<ProducerWidgetData> {
  const [data, setData] = useState<ProducerWidgetData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducerData = useCallback(async () => {
    if (!address) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch user's created tokens
      const tokenIds = await getUserTokens(address);

      const tokensCreated: CreatedToken[] = [];
      let totalProductionToDate = BigInt(0);

      for (const tokenId of tokenIds) {
        try {
          const tokenDetails = await getTokenDetails(tokenId, address);

          if (!tokenDetails) {
            continue;
          }

          // For producers, they should be the original creators (parentId = 0)
          if (tokenDetails.parentId === 0) {
            const currentStock = BigInt(tokenDetails.balance);
            const totalSupply = BigInt(tokenDetails.totalSupply);
            const transferredToDate = totalSupply - currentStock;

            const tokenData = {
              tokenId: BigInt(tokenId),
              name: tokenDetails.name,
              totalSupply,
              remainingWithProducer: currentStock,
              transferredToDate,
              createdAt: new Date(tokenDetails.dateCreated * 1000), // Convert timestamp to Date
            };

            tokensCreated.push(tokenData);

            totalProductionToDate += totalSupply;
          }
        } catch {
          continue;
        }
      }

      // Fetch pending transfers (outgoing from producer)
      const pendingTransfersData = await getPendingTransfersBySender(address);

      const pendingTransfers: ActiveTransfer[] = pendingTransfersData.map((transfer) => ({
        transferId: BigInt(transfer.id),
        tokenName: transfer.tokenName || `Token #${transfer.tokenId}`,
        amount: BigInt(transfer.amount),
        fromRole: UserRole.Producer,
        toRole: UserRole.Factory, // Producers typically send to Factory
        status: TransferStatus.Pending,
        requestedAt: new Date(transfer.createdAt ? transfer.createdAt * 1000 : Date.now()),
      }));

      // Sort tokens by creation date (newest first)
      tokensCreated.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const producerData: ProducerWidgetData = {
        tokensCreated,
        totalProductionToDate,
        pendingTransfers,
        lastUpdated: new Date(),
      };

      setData(producerData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch producer data';
      setError(errorMessage);
      console.error('Producer data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const refresh = useCallback(() => {
    void fetchProducerData();
  }, [fetchProducerData]);

  useEffect(() => {
    void fetchProducerData();
  }, [fetchProducerData]);

  return {
    data,
    isLoading,
    error,
    refresh,
  };
}
