/**
 * Type definitions for the modular Supply Chain Widget system
 */

import type { UserRole, TransferStatus } from '../../../../lib/enums';

// =====================================================================================
// BASE WIDGET INTERFACES
// =====================================================================================

export interface BaseWidgetData {
  readonly lastUpdated: Date;
}

export interface RealtimeEvent {
  readonly type: 'token_created' | 'transfer_created' | 'transfer_accepted' | 'transfer_rejected';
  readonly timestamp: Date;
  readonly tokenId?: string;
  readonly amount?: number;
  readonly fromAddress?: string;
  readonly toAddress?: string;
}

export interface MetricItem {
  readonly label: string;
  readonly value: string | number;
  readonly icon?: string;
  readonly colorScheme: 'primary' | 'success' | 'warning' | 'info' | 'neutral';
}

export interface ContentSection {
  readonly id: string;
  readonly title: string;
  readonly type: 'inventory' | 'transfers' | 'metrics' | 'traceability' | 'sales';
  readonly data: unknown;
  readonly isCollapsible?: boolean;
  readonly defaultCollapsed?: boolean;
}

// =====================================================================================
// CONSUMER INTERFACES
// =====================================================================================

export interface ConsumerWidgetData extends BaseWidgetData {
  readonly purchases: readonly PurchaseRecord[];
  readonly totalPurchases: number;
  readonly activePurchases: number;
  readonly consumedPurchases: number;
  readonly uniqueRetailers: number;
  readonly traceabilityAverage: number;
}

export interface PurchaseRecord {
  readonly tokenId: bigint;
  readonly name: string;
  readonly purchaseDate: Date;
  readonly retailerAddress: `0x${string}`;
  readonly status: 'active' | 'consumed';
  readonly traceabilityChain: readonly TraceabilityStep[];
  readonly verificationStatus: 'verified' | 'pending' | 'failed';
}

export interface TraceabilityStep {
  readonly role: UserRole;
  readonly address: `0x${string}`;
  readonly timestamp: Date;
  readonly action: string;
  readonly metadata?: Record<string, unknown>;
}

// =====================================================================================
// RETAILER INTERFACES
// =====================================================================================

export interface RetailerWidgetData extends BaseWidgetData {
  readonly inventory: readonly InventoryItem[];
  readonly salesMetrics: SalesMetrics;
  readonly supplierRelations: readonly SupplierRelation[];
  readonly pendingIncoming: readonly IncomingTransfer[];
  readonly pendingOutgoing: readonly OutgoingTransfer[];
}

export interface InventoryItem {
  readonly tokenId: bigint;
  readonly name: string;
  readonly currentStock: bigint;
  readonly receivedFrom: `0x${string}`;
  readonly receivedAt: Date;
  readonly unitsSold: bigint;
  readonly availableForSale: bigint;
  readonly averageSaleTime: number; // days
  readonly profitMargin?: number;
}

export interface SalesMetrics {
  readonly totalSales: number;
  readonly salesThisMonth: number;
  readonly inventoryTurnover: number;
  readonly averageOrderValue: number;
  readonly topSellingProducts: ReadonlyArray<{ readonly name: string; readonly units: number }>;
  readonly revenueGrowth: number; // percentage
}

export interface SupplierRelation {
  readonly factoryAddress: `0x${string}`;
  readonly productsReceived: number;
  readonly lastDelivery: Date;
  readonly reliability: number; // 0-1 score
  readonly avgDeliveryTime: number; // days
}

export interface IncomingTransfer {
  readonly transferId: bigint;
  readonly tokenName: string;
  readonly amount: bigint;
  readonly fromAddress: `0x${string}`;
  readonly fromRole: UserRole;
  readonly status: TransferStatus;
  readonly requestedAt: Date;
}

export interface OutgoingTransfer {
  readonly transferId: bigint;
  readonly tokenName: string;
  readonly amount: bigint;
  readonly toAddress: `0x${string}`;
  readonly toRole: UserRole;
  readonly status: TransferStatus;
  readonly requestedAt: Date;
}

// =====================================================================================
// EXISTING ROLE INTERFACES (Re-exported from current system)
// =====================================================================================

export interface ProducerWidgetData extends BaseWidgetData {
  readonly tokensCreated: readonly CreatedToken[];
  readonly totalProductionToDate: bigint;
  readonly pendingTransfers: readonly ActiveTransfer[];
}

export interface FactoryWidgetData extends BaseWidgetData {
  readonly rawMaterialsStock: readonly RawMaterial[];
  readonly processedProducts: readonly ProcessedProduct[];
  readonly processingEfficiencyRatio: number;
}

export interface CreatedToken {
  readonly tokenId: bigint;
  readonly name: string;
  readonly totalSupply: bigint;
  readonly remainingWithProducer: bigint;
  readonly transferredToDate: bigint;
  readonly createdAt: Date;
}

export interface ActiveTransfer {
  readonly transferId: bigint;
  readonly tokenName: string;
  readonly amount: bigint;
  readonly fromRole: UserRole;
  readonly toRole: UserRole;
  readonly status: TransferStatus;
  readonly requestedAt: Date;
}

export interface RawMaterial {
  readonly tokenId: bigint;
  readonly name: string;
  readonly currentStock: bigint;
  readonly availableForProcessing: bigint;
  readonly supplier: `0x${string}`;
  readonly receivedAt: Date;
}

export interface ProcessedProduct {
  readonly tokenId: bigint;
  readonly name: string;
  readonly currentStock: bigint;
  readonly pendingTransfers: bigint;
  readonly parentMaterial: {
    readonly name: string;
    readonly amountConsumed: bigint;
  };
  readonly processedAt: Date;
}

// =====================================================================================
// WIDGET CONFIGURATION INTERFACES
// =====================================================================================

export interface RoleConfig {
  readonly colorScheme: ColorScheme;
  readonly title: string;
  readonly metricsLayout: 'standard' | 'efficiency' | 'inventory' | 'purchases' | 'system';
  readonly contentSections: readonly string[];
  readonly hasSpecialFeatures: boolean;
  readonly maxDisplayItems: number;
}

export interface ColorScheme {
  readonly name: string;
  readonly background: string;
  readonly border: string;
  readonly text: {
    readonly primary: string;
    readonly secondary: string;
    readonly accent: string;
  };
  readonly badge: {
    readonly background: string;
    readonly text: string;
  };
}

// =====================================================================================
// HOOK RETURN TYPES
// =====================================================================================

export interface UseRoleDataReturn<T extends BaseWidgetData> {
  readonly data: T | null;
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refresh: () => void;
}

// =====================================================================================
// UNION TYPES FOR GENERIC HANDLING
// =====================================================================================

export type RoleSpecificData =
  | ProducerWidgetData
  | FactoryWidgetData
  | RetailerWidgetData
  | ConsumerWidgetData;

export type AllRoleData = {
  readonly [UserRole.Producer]: ProducerWidgetData;
  readonly [UserRole.Factory]: FactoryWidgetData;
  readonly [UserRole.Retailer]: RetailerWidgetData;
  readonly [UserRole.Consumer]: ConsumerWidgetData;
  readonly [UserRole.Admin]: ProducerWidgetData; // Admin gets producer-like view for now
};
