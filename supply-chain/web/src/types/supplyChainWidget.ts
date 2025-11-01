import { UserRole, TransferStatus } from '../lib/enums';

// =====================================================================================
// 1. BALANCE STATE INTERFACES
// =====================================================================================

/**
 * Represents the complete balance state of a token for a user
 * Includes available, pending, and metadata information
 */
export interface BalanceState {
  tokenId: bigint;
  tokenName: string;
  owner: string;
  role: UserRole;

  // Balance States - calculated dynamically
  totalBalance: bigint; // Current balance from contract
  availableBalance: bigint; // Balance - pendingOutgoing
  pendingOutgoing: bigint; // Amount in pending outgoing transfers
  pendingIncoming: bigint; // Amount in pending incoming transfers

  // Token Metadata - from contract
  parentId?: bigint;
  isRawMaterial: boolean;
  processingHistory: ProcessingEvent[];
}

/**
 * Historical processing event when a token was created from another
 */
export interface ProcessingEvent {
  fromTokenId: bigint;
  amountConsumed: bigint;
  timestamp: number;
  processedBy: string;
}

// =====================================================================================
// 2. TRANSFER STATE INTERFACES
// =====================================================================================

/**
 * Active transfer with enhanced UI information
 * All data sourced from contract events and state
 */
export interface ActiveTransfer {
  transferId: bigint;
  tokenId: bigint;
  tokenName: string;
  from: string;
  fromRole: UserRole;
  to: string;
  toRole: UserRole;
  amount: bigint;
  status: TransferStatus;
  timestamp: number;

  // UI Enhancement - calculated dynamically
  estimatedProcessingTime?: number;
  isOverdue?: boolean;
}

// =====================================================================================
// 3. ROLE-SPECIFIC DATA INTERFACES
// =====================================================================================

/**
 * Producer Dashboard Widget Data
 * All metrics calculated from contract state and events
 */
export interface ProducerWidgetData {
  // Raw Materials Created - from TokenCreated events filtered by creator
  tokensCreated: {
    tokenId: bigint;
    name: string;
    totalSupply: bigint;
    remainingWithProducer: bigint; // Dynamic balance calculation
    transferredToDate: bigint; // Sum of accepted transfers
  }[];

  // Outgoing Transfer Pipeline - from transfer events
  pendingTransfers: ActiveTransfer[];
  rejectedTransfers: ActiveTransfer[];

  // Performance Metrics - calculated from historical data
  totalProductionToDate: bigint;
  activeFactoryConnections: string[];
  avgTransferAcceptanceRate: number;
}

/**
 * Factory Dashboard Widget Data
 * Inventory and processing information calculated dynamically
 */
export interface FactoryWidgetData {
  // Raw Materials Inventory - from received transfers
  rawMaterialsStock: {
    tokenId: bigint;
    name: string;
    currentStock: bigint; // Current balance
    reservedForProduction: bigint; // Amount in pending processing
    availableForProcessing: bigint; // currentStock - reserved
    supplier: string; // Original Producer address
  }[];

  // Processed Products - tokens created by this factory
  processedProducts: {
    tokenId: bigint;
    name: string;
    currentStock: bigint;
    pendingTransfers: bigint; // Amount in pending outgoing transfers
    parentMaterial: {
      tokenId: bigint;
      name: string;
      amountConsumed: bigint;
    };
  }[];

  // Production Pipeline - active transfers
  incomingRawMaterials: ActiveTransfer[];
  outgoingProducts: ActiveTransfer[];

  // Processing Efficiency - calculated from historical processing events
  totalRawMaterialsProcessed: bigint;
  totalProductsCreated: bigint;
  processingEfficiencyRatio: number;
}

/**
 * Retailer Dashboard Widget Data
 * Products and sales information calculated dynamically
 */
export interface RetailerWidgetData {
  // Products Inventory - received from factories
  productsInventory: {
    tokenId: bigint;
    name: string;
    currentStock: bigint;
    packaged: bigint; // Amount converted to retail products
    availableForSale: bigint; // currentStock - pendingTransfers
    supplier: string; // Factory address
  }[];

  // Packaged Retail Products - created by retailer
  retailProducts: {
    tokenId: bigint;
    name: string;
    currentStock: bigint;
    soldToConsumers: bigint; // Amount transferred to consumers
    parentProduct: {
      tokenId: bigint;
      name: string;
      amountConsumed: bigint;
    };
  }[];

  // Sales Pipeline - active transfers
  incomingProducts: ActiveTransfer[];
  consumerSales: ActiveTransfer[];

  // Sales Performance - calculated from transfer history
  totalProductsReceived: bigint;
  totalConsumerSales: bigint;
  salesConversionRate: number;
}

/**
 * Consumer Dashboard Widget Data
 * Purchase history and traceability information
 */
export interface ConsumerWidgetData {
  // Purchased Products - received transfers
  purchasedProducts: {
    tokenId: bigint;
    name: string;
    ownedQuantity: bigint; // Current balance
    purchaseDate: number; // Transfer accepted timestamp
    seller: string; // Retailer address
    traceabilityAvailable: boolean; // Has parent chain
  }[];

  // Purchase History - transfer timeline
  incomingProducts: ActiveTransfer[];
  purchaseHistory: ActiveTransfer[];

  // Traceability Summary - calculated from owned tokens
  totalProductsOwned: number;
  uniqueProductTypes: number;
  traceableProducts: number;
}

/**
 * Admin Dashboard Widget Data
 * System-wide statistics and health metrics
 */
export interface AdminWidgetData {
  // System Overview - from global contract state
  systemStats: {
    totalUsers: number;
    pendingApprovals: number;
    totalTokensCreated: number;
    totalTransfersProcessed: number;
    activeTransfers: number;
  };

  // Supply Chain Flow - aggregated token creation
  supplyChainFlow: {
    rawMaterialsCreated: bigint;
    processedProducts: bigint;
    retailPackages: bigint;
    consumerPurchases: bigint;
  };

  // Network Activity - recent contract events
  recentActivity: {
    type:
      | 'token_created'
      | 'transfer_requested'
      | 'transfer_accepted'
      | 'transfer_rejected'
      | 'user_registered';
    details: string;
    timestamp: number;
    participant: string;
  }[];

  // System Health - calculated performance metrics
  systemHealth: {
    avgTransferProcessingTime: number;
    transferSuccessRate: number;
    activeParticipants: number;
    networkCongestion: 'low' | 'medium' | 'high';
  };
}

// =====================================================================================
// 4. GLOBAL STATE INTERFACES
// =====================================================================================

/**
 * Complete Supply Chain Overview State
 * Comprehensive system state with role-specific data
 */
export interface SupplyChainOverviewState {
  // Loading and Error States
  isLoading: boolean;
  error: string | null;
  lastUpdated: number;

  // Role-specific Data - populated based on current user role
  producerData?: ProducerWidgetData;
  factoryData?: FactoryWidgetData;
  retailerData?: RetailerWidgetData;
  consumerData?: ConsumerWidgetData;
  adminData?: AdminWidgetData;

  // Cross-role Analytics - system-wide insights
  globalSupplyChainState: {
    totalTokenTypes: number;
    totalActiveTransfers: number;
    supplyChainEfficiency: number;
    bottlenecks: BottleneckAnalysis[];
  };
}

/**
 * Bottleneck analysis for supply chain optimization
 */
export interface BottleneckAnalysis {
  role: UserRole;
  address: string;
  pendingIncoming: number;
  pendingOutgoing: number;
  avgProcessingTime: number;
  isBottleneck: boolean;
}

/**
 * Real-time event for live updates
 */
export interface RealtimeEvent {
  type: 'transfer_created' | 'transfer_accepted' | 'transfer_rejected' | 'token_created';
  tokenId?: bigint;
  transferId?: bigint;
  from?: string;
  to?: string;
  amount?: bigint;
  timestamp: number;
}

// =====================================================================================
// 5. COMPONENT PROPS INTERFACES
// =====================================================================================

/**
 * Props for the premium supply chain widget component
 */
export interface SupplyChainWidgetPremiumProps {
  className?: string;
  enableRealTimeUpdates?: boolean;
  showDetailedBalances?: boolean;
  showTransferPipeline?: boolean;
  showPerformanceMetrics?: boolean;
  compactMode?: boolean;
}

/**
 * Props for balance display components
 */
export interface BalanceDisplayProps {
  tokenName: string;
  totalBalance: bigint;
  availableBalance: bigint;
  pendingOut?: bigint;
  pendingIn?: bigint;
  className?: string;
}

/**
 * Props for transfer pipeline components
 */
export interface TransferPipelineProps {
  transfers: ActiveTransfer[];
  direction: 'incoming' | 'outgoing';
  className?: string;
}

/**
 * Props for real-time indicator component
 */
export interface RealTimeIndicatorProps {
  isConnected: boolean;
  className?: string;
}
