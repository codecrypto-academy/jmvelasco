/**
 * Consumer role data hook
 * Fetches and manages consumer-specific supply chain data
 */

import { useState, useEffect, useCallback } from 'react';
import { UserRole } from '../../../../lib/enums';
import { getUserTokens, getTokenDetails } from '../../../../lib/contract';
import type {
  ConsumerWidgetData,
  UseRoleDataReturn,
  PurchaseRecord,
  TraceabilityStep,
} from '../config/types';

export function useConsumerData(
  address: `0x${string}` | null
): UseRoleDataReturn<ConsumerWidgetData> {
  const [data, setData] = useState<ConsumerWidgetData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConsumerData = useCallback(async () => {
    if (!address) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch user's owned tokens (purchases)
      const tokenIds = await getUserTokens(address);

      const purchases: PurchaseRecord[] = [];
      let activePurchases = 0;
      const retailerSet = new Set<string>();
      let totalTraceabilitySteps = 0;

      for (const tokenId of tokenIds) {
        try {
          const tokenDetails = await getTokenDetails(tokenId, address);

          if (!tokenDetails) continue;

          // For now, create a simplified traceability chain
          // In a real implementation, we would need additional contract methods
          const traceabilityChain: TraceabilityStep[] = [];

          // Add consumer step (current ownership)
          traceabilityChain.push({
            role: UserRole.Consumer,
            address: address,
            timestamp: new Date(), // We don't have purchase timestamp in current API
            action: 'Purchased',
          });

          // Simulate some parent chain steps (this would need real implementation)
          if (tokenDetails.parentId > 0) {
            traceabilityChain.unshift({
              role: UserRole.Factory,
              address: '0x0000000000000000000000000000000000000000' as `0x${string}`, // Placeholder
              timestamp: new Date(Date.now() - 86400000), // 1 day ago
              action: 'Processed',
            });

            traceabilityChain.unshift({
              role: UserRole.Producer,
              address: '0x0000000000000000000000000000000000000000' as `0x${string}`, // Placeholder
              timestamp: new Date(Date.now() - 172800000), // 2 days ago
              action: 'Created',
            });
          }

          activePurchases++;
          retailerSet.add('0x0000000000000000000000000000000000000000'); // Placeholder retailer
          totalTraceabilitySteps += traceabilityChain.length;

          purchases.push({
            tokenId: BigInt(tokenId),
            name: tokenDetails.name,
            purchaseDate: new Date(Date.now() - Math.random() * 86400000 * 30), // Random date within 30 days
            retailerAddress: '0x0000000000000000000000000000000000000000' as `0x${string}`, // Placeholder
            status: 'active',
            traceabilityChain,
            verificationStatus: 'verified',
          });
        } catch (tokenError) {
          console.warn(`Error processing token ${tokenId}:`, tokenError);
          continue;
        }
      }

      // Sort purchases by date (newest first)
      purchases.sort((a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime());

      const consumerData: ConsumerWidgetData = {
        purchases,
        totalPurchases: purchases.length,
        activePurchases,
        consumedPurchases: 0, // For now, assume all are active
        uniqueRetailers: retailerSet.size,
        traceabilityAverage: purchases.length > 0 ? totalTraceabilitySteps / purchases.length : 0,
        lastUpdated: new Date(),
      };

      setData(consumerData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch consumer data';
      setError(errorMessage);
      console.error('Consumer data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const refresh = useCallback(() => {
    void fetchConsumerData();
  }, [fetchConsumerData]);

  useEffect(() => {
    void fetchConsumerData();
  }, [fetchConsumerData]);

  return {
    data,
    isLoading,
    error,
    refresh,
  };
}
