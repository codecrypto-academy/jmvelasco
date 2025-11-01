/**
 * Retailer role data hook
 * Fetches and manages retailer-specific supply chain data
 */

import { useState, useEffect, useCallback } from 'react';
import { UserRole, TransferStatus } from '../../../../lib/enums';
import {
  // getUserTokens, // removed unused import
  getUserTokensWithBalance,
  getTokenDetails,
  getPendingByRecipient,
  getPendingBySender,
} from '../../../../lib/contract';
import type {
  RetailerWidgetData,
  UseRoleDataReturn,
  InventoryItem,
  SalesMetrics,
  SupplierRelation,
  IncomingTransfer,
  OutgoingTransfer,
} from '../config/types';

export function useRetailerData(
  address: `0x${string}` | null
): UseRoleDataReturn<RetailerWidgetData> {
  const [data, setData] = useState<RetailerWidgetData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRetailerData = useCallback(async () => {
    if (!address) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch user's owned tokens (inventory) - solo con balance > 0
      const tokenIds = await getUserTokensWithBalance(address);

      const inventory: InventoryItem[] = [];
      const supplierSet = new Set<string>();
      let totalSales = 0;

      for (const tokenId of tokenIds) {
        try {
          const tokenDetails = await getTokenDetails(tokenId, address);

          if (!tokenDetails) continue;

          // Simulate inventory data (in real implementation, this would come from contract)
          const receivedAt = new Date(Date.now() - Math.random() * 86400000 * 60); // Random within 60 days
          const unitsSold = BigInt(Math.floor((Math.random() * Number(tokenDetails.balance)) / 2));
          const availableForSale = BigInt(tokenDetails.balance) - unitsSold;

          totalSales += Number(unitsSold);
          supplierSet.add('0x0000000000000000000000000000000000000000'); // Placeholder factory

          inventory.push({
            tokenId: BigInt(tokenId),
            name: tokenDetails.name,
            currentStock: BigInt(tokenDetails.balance),
            receivedFrom: '0x0000000000000000000000000000000000000000' as `0x${string}`, // Placeholder
            receivedAt,
            unitsSold,
            availableForSale,
            averageSaleTime: Math.floor(Math.random() * 14) + 1, // 1-14 days
            profitMargin: Math.random() * 0.3 + 0.1, // 10-40%
          });
        } catch (tokenError) {
          console.warn(`Error processing token ${tokenId}:`, tokenError);
          continue;
        }
      }

      // Fetch pending transfers
      const pendingIncoming = await getPendingByRecipient(address, 0, 10);
      const pendingOutgoing = await getPendingBySender(address, 0, 10);

      // Transform pending transfers to our types
      const incomingTransfers: IncomingTransfer[] = pendingIncoming.items.map((transfer) => ({
        transferId: BigInt(transfer.id),
        tokenName: transfer.tokenName || 'Unknown Token',
        amount: BigInt(transfer.amount),
        fromAddress: transfer.from as `0x${string}`,
        fromRole: UserRole.Factory, // Assume factories supply retailers
        status: transfer.status as TransferStatus,
        requestedAt: new Date((transfer.createdAt || Date.now() / 1000) * 1000),
      }));

      const outgoingTransfers: OutgoingTransfer[] = pendingOutgoing.items.map((transfer) => ({
        transferId: BigInt(transfer.id),
        tokenName: transfer.tokenName || 'Unknown Token',
        amount: BigInt(transfer.amount),
        toAddress: transfer.to as `0x${string}`,
        toRole: UserRole.Consumer, // Assume retailers sell to consumers
        status: transfer.status as TransferStatus,
        requestedAt: new Date((transfer.createdAt || Date.now() / 1000) * 1000),
      }));

      // Calculate sales metrics
      const salesThisMonth = Math.floor(totalSales * 0.3); // Assume 30% this month
      const inventoryTurnover = inventory.length > 0 ? totalSales / inventory.length : 0;

      const salesMetrics: SalesMetrics = {
        totalSales,
        salesThisMonth,
        inventoryTurnover,
        averageOrderValue: totalSales > 0 ? (totalSales * 50) / totalSales : 0, // Mock $50 average
        topSellingProducts: inventory
          .sort((a, b) => Number(b.unitsSold) - Number(a.unitsSold))
          .slice(0, 3)
          .map((item) => ({ name: item.name, units: Number(item.unitsSold) })),
        revenueGrowth: Math.random() * 0.4 - 0.1, // -10% to +30% growth
      };

      // Create supplier relations
      const supplierRelations: SupplierRelation[] = Array.from(supplierSet).map((supplier) => ({
        factoryAddress: supplier as `0x${string}`,
        productsReceived: Math.floor(Math.random() * 10) + 1,
        lastDelivery: new Date(Date.now() - Math.random() * 86400000 * 30),
        reliability: Math.random() * 0.3 + 0.7, // 70-100% reliability
        avgDeliveryTime: Math.floor(Math.random() * 7) + 1, // 1-7 days
      }));

      const retailerData: RetailerWidgetData = {
        inventory,
        salesMetrics,
        supplierRelations,
        pendingIncoming: incomingTransfers,
        pendingOutgoing: outgoingTransfers,
        lastUpdated: new Date(),
      };

      setData(retailerData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch retailer data';
      setError(errorMessage);
      console.error('Retailer data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  const refresh = useCallback(() => {
    void fetchRetailerData();
  }, [fetchRetailerData]);

  useEffect(() => {
    void fetchRetailerData();
  }, [fetchRetailerData]);

  return {
    data,
    isLoading,
    error,
    refresh,
  };
}
