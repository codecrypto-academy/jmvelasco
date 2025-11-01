/**
 * Factory role data hook
 * Fetches and manages factory-specific supply chain data
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getUserTokens,
  getTokenDetails,
  getPendingTransfersBySender,
} from '../../../../lib/contract';
import type {
  FactoryWidgetData,
  UseRoleDataReturn,
  RawMaterial,
  ProcessedProduct,
} from '../config/types';

export function useFactoryData(
  address: `0x${string}` | null
): UseRoleDataReturn<FactoryWidgetData> {
  const [data, setData] = useState<FactoryWidgetData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFactoryData = useCallback(async () => {
    if (!address) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch user's tokens (both received raw materials and created processed products)
      const tokenIds = await getUserTokens(address);

      const rawMaterialsStock: RawMaterial[] = [];
      const processedProducts: ProcessedProduct[] = [];

      for (const tokenId of tokenIds) {
        try {
          const tokenDetails = await getTokenDetails(tokenId, address);

          if (!tokenDetails) continue;

          const currentStock = BigInt(tokenDetails.balance);

          // Raw materials are tokens received from producers (parentId = 0, but not created by factory)
          if (
            tokenDetails.parentId === 0 &&
            tokenDetails.creator.toLowerCase() !== address.toLowerCase()
          ) {
            rawMaterialsStock.push({
              tokenId: BigInt(tokenId),
              name: tokenDetails.name,
              currentStock,
              availableForProcessing: currentStock, // For now, assume all stock is available
              supplier: tokenDetails.creator as `0x${string}`,
              receivedAt: new Date(tokenDetails.dateCreated * 1000),
            });
          }

          // Processed products are tokens created by the factory (parentId > 0 and created by factory)
          if (
            tokenDetails.parentId > 0 &&
            tokenDetails.creator.toLowerCase() === address.toLowerCase()
          ) {
            // Get pending transfers to calculate pending amounts
            const pendingTransfers = await getPendingTransfersBySender(address);
            const pendingForThisToken = pendingTransfers
              .filter((transfer) => transfer.tokenId === tokenId)
              .reduce((sum, transfer) => sum + BigInt(transfer.amount), BigInt(0));

            // Mock parent material info (would need additional contract methods for real data)
            const parentMaterial = {
              name: `Raw Material Parent`, // Would need to fetch parent token details
              amountConsumed: BigInt(tokenDetails.totalSupply), // Simplified: assume 1:1 conversion
            };

            processedProducts.push({
              tokenId: BigInt(tokenId),
              name: tokenDetails.name,
              currentStock,
              pendingTransfers: pendingForThisToken,
              parentMaterial,
              processedAt: new Date(tokenDetails.dateCreated * 1000),
            });
          }
        } catch (tokenError) {
          console.warn(`Error processing token ${tokenId}:`, tokenError);
          continue;
        }
      }

      // Calculate processing efficiency ratio
      // Simplified: ratio of processed products to raw materials
      const processingEfficiencyRatio =
        rawMaterialsStock.length > 0 ? processedProducts.length / rawMaterialsStock.length : 0;

      // Sort by received/processed date (newest first)
      rawMaterialsStock.sort((a, b) => b.receivedAt.getTime() - a.receivedAt.getTime());
      processedProducts.sort((a, b) => b.processedAt.getTime() - a.processedAt.getTime());

      const factoryData: FactoryWidgetData = {
        rawMaterialsStock,
        processedProducts,
        processingEfficiencyRatio,
        lastUpdated: new Date(),
      };

      setData(factoryData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch factory data';
      setError(errorMessage);
      console.error('Factory data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const refresh = useCallback(() => {
    void fetchFactoryData();
  }, [fetchFactoryData]);

  useEffect(() => {
    void fetchFactoryData();
  }, [fetchFactoryData]);

  return {
    data,
    isLoading,
    error,
    refresh,
  };
}
