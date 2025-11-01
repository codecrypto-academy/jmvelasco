/**
 * TypeScript interfaces for traceability functionality
 */

export interface TokenLineage {
  tokenId: number;
  parentId: number;
  name: string;
  creator: string;
  creatorRole: string;
  createdAt: number;
  level: number; // 0=raw material, 1=processed, 2=packaged, etc.
  currentBalance: number;
  totalSupply: number;
  features: string; // JSON metadata
}

export interface TransferHistoryEntry {
  transferId: number;
  tokenId: number;
  tokenName?: string; // Name of the transferred token
  from: string;
  fromRole: string;
  to: string;
  toRole: string;
  amount: number;
  timestamp: number;
  status: 'Pending' | 'Accepted' | 'Rejected';
  isCurrentOwner?: boolean; // Flag for consumer's received transfer
}

export interface TimelineEntry {
  type: 'creation' | 'transfer' | 'transformation';
  timestamp: number;
  tokenInfo: TokenLineage;
  transferInfo?: TransferHistoryEntry;
  parentToken?: TokenLineage; // For transformations
  stockConsumption?: {
    consumedAmount: number;
    producedAmount: number;
    consumedTokenId: number;
    producedTokenId: number;
  };
}

export interface TraceabilityData {
  targetToken: TokenLineage;
  timeline: TimelineEntry[];
  totalSteps: number;
  rootMaterial: TokenLineage; // Original raw material
  supplyChainPath: string[]; // Array of roles in order
}
