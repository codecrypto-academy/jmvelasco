// Contract helpers for Home page registration logic
// These helpers centralize all contract interactions to avoid magic strings
// and ensure type safety across the application.
// The frontend should never use strings directly or interact with TypeChain.

import { ethers } from 'ethers';
import { CONTRACT_CONFIG, NETWORK_CONFIG } from '../config/contracts';
import { SupplyChain__factory } from '../types/factories/SupplyChain__factory';

// Constants for addresses
const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';
import {
  UserStatus as StatusEnum,
  UserRole as UserRoleEnum,
  type UserRole,
  type UserStatus,
} from './enums';

// UserInfo can contain any role string from the contract, including 'Admin'
export type UserInfo = { role: UserRole | null; status: UserStatus | null };

// Row used by Admin users listing
export type Users = {
  address: string;
  role: UserRole | null;
  status: UserStatus | null;
};

// --- Provider helpers: ensure correct network and provide fallbacks ---
async function ensureWalletOnCorrectNetwork(): Promise<void> {
  if (typeof window === 'undefined' || !window.ethereum) return;
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const net = await provider.getNetwork();
    const desired = BigInt(NETWORK_CONFIG.chainId);
    if (net.chainId !== desired) {
      // Try to switch; if not added, try to add it
      const hexChainId = '0x' + NETWORK_CONFIG.chainId.toString(16);
      try {
        await window.ethereum.request?.({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: hexChainId }],
        });
      } catch (error: any) {
        // 4902: Unrecognized chain; try to add
        if (error?.code === 4902) {
          await window.ethereum.request?.({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: hexChainId,
                chainName: NETWORK_CONFIG.name,
                rpcUrls: [NETWORK_CONFIG.rpcUrl],
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
              },
            ],
          });
        } else {
          throw error;
        }
      }
    }
  } catch {
    // Silent: we'll fallback to RPC provider for reads
  }
}

async function getReadProvider(): Promise<ethers.JsonRpcProvider> {
  // Always use direct JSON-RPC for READS to avoid wallet cached blockTag issues
  // (e.g., BlockOutOfRangeError when Anvil restarts and wallet still references old height)
  return new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
}

async function getSignerOnCorrectNetwork(): Promise<ethers.Signer> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('MetaMask not available');
  }
  await ensureWalletOnCorrectNetwork();
  const provider = new ethers.BrowserProvider(window.ethereum);
  return provider.getSigner();
}

/**
 * Get user information from the contract
 * @param address - Ethereum address of the user
 * @returns User information including role and status
 */
export async function getUserInfo(address: string): Promise<UserInfo> {
  try {
    // Get provider from window.ethereum
    const provider = await getReadProvider();
    const contract = SupplyChain__factory.connect(CONTRACT_CONFIG.address, provider);

    // Call getUserInfo from contract
    const user = await contract.getUserInfo(address);

    // Map contract status enum (0,1,2,3) to our status strings
    const statusMap: Record<number, UserStatus> = {
      0: StatusEnum.Pending,
      1: StatusEnum.Approved,
      2: StatusEnum.Rejected,
      // 3 would be Canceled but we don't have it in our enum yet
    };

    const rolesMap: Record<string, UserRole> = {
      Producer: UserRoleEnum.Producer,
      Factory: UserRoleEnum.Factory,
      Retailer: UserRoleEnum.Retailer,
      Consumer: UserRoleEnum.Consumer,
      Admin: UserRoleEnum.Admin,
    };

    return {
      role: rolesMap[user.role] || null,
      status: statusMap[Number(user.status)] || null,
    };
  } catch (error) {
    console.error('Error getting user info:', error);
    return { role: null, status: null };
  }
}

/**
 * Request a role for the current user
 * @param address - Ethereum address of the user
 * @param role - Role to request (must be a valid UserRole)
 * @returns Promise that resolves when the transaction is confirmed
 */
export async function requestUserRole(address: string, role: UserRole): Promise<void> {
  try {
    // address is intentionally unused because the contract uses msg.sender
    // Keep it in the signature to match existing call sites
    void address;
    const signer = await getSignerOnCorrectNetwork();
    const contract = SupplyChain__factory.connect(CONTRACT_CONFIG.address, signer);

    // Call requestUserRole from contract
    const tx = await contract.requestUserRole(role);
    await tx.wait();
  } catch (error) {
    console.error('Error requesting role:', error);
    throw error;
  }
}

/**
 * Request a token transfer to another address (initiates a pending transfer)
 * @param tokenId - ID of the token to transfer
 * @param to - Recipient address
 * @param amount - Amount to transfer
 */
export async function requestTransfer(tokenId: number, to: string, amount: number): Promise<void> {
  try {
    const signer = await getSignerOnCorrectNetwork();
    const contract = SupplyChain__factory.connect(CONTRACT_CONFIG.address, signer);

    const tx = await (contract as any).requestTransfer(tokenId, to, amount);
    await tx.wait();
  } catch (e) {
    console.error('Error requesting transfer:', e);
    throw e;
  }
}

/**
 * Admin: change status of a user
 * @param userAddress - target user address
 * @param newStatus - new status to set (Approved/Rejected/Pending)
 */
export async function changeStatusUser(userAddress: string, newStatus: UserStatus): Promise<void> {
  try {
    const signer = await getSignerOnCorrectNetwork();
    const contract = SupplyChain__factory.connect(CONTRACT_CONFIG.address, signer);

    const tx = await contract.changeStatusUser(userAddress, toContractStatus(newStatus));
    await tx.wait();
  } catch (error) {
    console.error('Error changing user status:', error);
    throw error;
  }
}

// Map frontend status string to contract enum value
function toContractStatus(status: UserStatus): number {
  switch (status) {
    case StatusEnum.Pending:
      return 0;
    case StatusEnum.Approved:
      return 1;
    case StatusEnum.Rejected:
      return 2;
    default:
      return 0;
  }
}

export async function getUsers(): Promise<Users[]> {
  try {
    if (typeof window === 'undefined' || !window.ethereum) return [];
    const provider = new ethers.BrowserProvider(window.ethereum);
    // Use signer so msg.sender is the connected account (must be admin)
    const signer = await provider.getSigner();
    const contract = SupplyChain__factory.connect(CONTRACT_CONFIG.address, signer);

    // Use getAllUsers from the contract and return ALL users with their current status/role
    const all: any[] = await (contract as any).getAllUsers();
    if (!all || !Array.isArray(all)) return [];

    const statusMap: Record<number, UserStatus> = {
      0: StatusEnum.Pending,
      1: StatusEnum.Approved,
      2: StatusEnum.Rejected,
      // 3: Canceled (not represented in frontend enum)
    };

    const mapped: Users[] = all.map((u: any) => ({
      address: String(u.userAddress ?? u[1] ?? ''),
      role: (u.role ?? u[2] ?? null) || null,
      status: statusMap[Number(u.status ?? u[3] ?? 0)] || null,
    }));

    return mapped; // no filtering: show all users so approved ones remain visible
  } catch (e) {
    console.error('Error getting users list:', e);
    return [];
  }
}

/**
 * Create a new token (mint raw material for Producer)
 * @param params - Token creation parameters
 * @returns Promise that resolves when token is created
 */
export async function createToken(params: {
  name: string;
  totalSupply: number;
  features: string;
  parentId: number;
}): Promise<void> {
  try {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('No ethereum provider found');
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = SupplyChain__factory.connect(CONTRACT_CONFIG.address, signer);

    // Call createToken on the contract
    const tx = await contract.createToken(
      params.name,
      params.totalSupply,
      params.features,
      params.parentId
    );

    // Wait for transaction to be mined
    await tx.wait();
  } catch (e) {
    console.error('Error creating token:', e);
    throw e;
  }
}

/**
 * Token details from contract
 */
export type TokenDetails = {
  id: number;
  creator: string;
  name: string;
  totalSupply: number;
  features: string;
  parentId: number;
  dateCreated: number;
  balance: number;
};

/**
 * Get all token IDs owned by a user
 * @param userAddress - Address of the user
 * @returns Array of token IDs
 */
export async function getUserTokens(userAddress: string): Promise<number[]> {
  try {
    const provider = await getReadProvider();
    const contract = SupplyChain__factory.connect(CONTRACT_CONFIG.address, provider);

    // Call getUserTokens from contract
    const tokenIds = await contract.getUserTokens(userAddress);

    // Convert BigInt to number
    return tokenIds.map((id: any) => Number(id));
  } catch (error) {
    console.error('Error getting user tokens:', error);
    return [];
  }
}

/**
 * Get user tokens based on actual balance (not just created tokens)
 * This scans all tokens and returns those where the user has balance > 0
 * @param userAddress - Ethereum address of the user
 * @returns Array of token IDs where user has balance > 0
 */
export async function getUserTokensWithBalance(userAddress: string): Promise<number[]> {
  try {
    const provider = await getReadProvider();
    const contract = SupplyChain__factory.connect(CONTRACT_CONFIG.address, provider);

    // Get all tokens from ID 1 to nextTokenId
    const nextId = Number(await contract.nextTokenId());
    const tokenIds: number[] = [];

    for (let id = 1; id < nextId; id++) {
      const balance = await contract.getTokenBalance(id, userAddress);
      if (Number(balance) > 0) {
        tokenIds.push(id);
      }
    }

    return tokenIds;
  } catch (error) {
    console.error('Error getting user tokens with balance:', error);
    return [];
  }
}

/**
 * Get token details by ID
 * @param tokenId - Token ID
 * @param userAddress - Address to check balance for
 * @returns Token details including balance for the user
 */
export async function getTokenDetails(
  tokenId: number,
  userAddress: string
): Promise<TokenDetails | null> {
  try {
    const provider = await getReadProvider();
    const contract = SupplyChain__factory.connect(CONTRACT_CONFIG.address, provider);

    // Get token info
    const token = await contract.getToken(tokenId);

    // Get balance for the user
    const balance = await contract.getTokenBalance(tokenId, userAddress);

    return {
      id: Number(token.id),
      creator: token.creator,
      name: token.name,
      totalSupply: Number(token.totalSupply),
      features: token.features,
      parentId: Number(token.parentId),
      dateCreated: Number(token.dateCreated),
      balance: Number(balance),
    };
  } catch (error) {
    console.error('Error getting token details:', error);
    return null;
  }
}

/**
 * Pending transfer data structure
 */
export type PendingTransfer = {
  id: string | number;
  tokenId: number;
  tokenName: string | null;
  amount: number;
  from: string;
  to: string;
  status: string;
  createdAt?: number;
};

/**
 * New paginated API: list pending transfers sent by an address
 * Returns items and total so the caller can paginate.
 */
export async function getPendingBySender(
  senderAddress: string,
  offset = 0,
  limit = 10
): Promise<{ items: PendingTransfer[]; total: number }> {
  try {
    const provider = await getReadProvider();
    const contract = SupplyChain__factory.connect(CONTRACT_CONFIG.address, provider);

    // Call contract method to get paginated pending transfers
    const result: any = await (contract as any).getPendingBySender(
      senderAddress,
      BigInt(offset),
      BigInt(limit)
    );

    // Ethers v6 can return either tuple [items, total] or object with named props
    const items = (result?.[0] ?? result?.items ?? []) as any[];
    const totalRaw = result?.[1] ?? result?.total ?? 0n;
    const total = Number(totalRaw);

    const mapped: PendingTransfer[] = await Promise.all(
      items.map(async (t: any) => {
        const tokenId = Number(t.tokenId ?? t[3] ?? 0);
        let tokenName: string | null = null;
        try {
          const token = await contract.getToken(tokenId);
          tokenName = token.name || null;
        } catch {
          // ignore
        }
        return {
          id: Number(t.id ?? t[0] ?? 0),
          tokenId,
          tokenName,
          amount: Number(t.amount ?? t[5] ?? 0),
          from: String(t.from ?? t[1] ?? ''),
          to: String(t.to ?? t[2] ?? ''),
          status: mapTransferStatus(Number(t.status ?? t[6] ?? 0)),
          createdAt: Number(t.dateCreated ?? t[4] ?? 0),
        };
      })
    );

    return { items: mapped, total };
  } catch (error) {
    console.error('Error getting paginated pending transfers (sender):', error);
    return { items: [], total: 0 };
  }
}

/**
 * New paginated API: list pending transfers to be received by an address
 */
export async function getPendingByRecipient(
  recipientAddress: string,
  offset = 0,
  limit = 10
): Promise<{ items: PendingTransfer[]; total: number }> {
  try {
    const provider = await getReadProvider();
    const contract = SupplyChain__factory.connect(CONTRACT_CONFIG.address, provider);

    const result: any = await (contract as any).getPendingByRecipient(
      recipientAddress,
      BigInt(offset),
      BigInt(limit)
    );

    const items = (result?.[0] ?? result?.items ?? []) as any[];
    const totalRaw = result?.[1] ?? result?.total ?? 0n;
    const total = Number(totalRaw);

    const mapped: PendingTransfer[] = await Promise.all(
      items.map(async (t: any) => {
        const tokenId = Number(t.tokenId ?? t[3] ?? 0);
        let tokenName: string | null = null;
        try {
          const token = await contract.getToken(tokenId);
          tokenName = token.name || null;
        } catch {
          // ignore
        }
        return {
          id: Number(t.id ?? t[0] ?? 0),
          tokenId,
          tokenName,
          amount: Number(t.amount ?? t[5] ?? 0),
          from: String(t.from ?? t[1] ?? ''),
          to: String(t.to ?? t[2] ?? ''),
          status: mapTransferStatus(Number(t.status ?? t[6] ?? 0)),
          createdAt: Number(t.dateCreated ?? t[4] ?? 0),
        };
      })
    );

    return { items: mapped, total };
  } catch (error) {
    console.error('Error getting paginated pending transfers (recipient):', error);
    return { items: [], total: 0 };
  }
}

/**
 * Accept a pending transfer by id
 */
export async function acceptTransfer(transferId: number): Promise<void> {
  try {
    const signer = await getSignerOnCorrectNetwork();
    const contract = SupplyChain__factory.connect(CONTRACT_CONFIG.address, signer);
    const tx = await (contract as any).acceptTransfer(BigInt(transferId));
    await tx.wait();
  } catch (e) {
    console.error('Error accepting transfer:', e);
    throw e;
  }
}

/**
 * Reject a pending transfer by id
 */
export async function rejectTransfer(transferId: number): Promise<void> {
  try {
    const signer = await getSignerOnCorrectNetwork();
    const contract = SupplyChain__factory.connect(CONTRACT_CONFIG.address, signer);
    const tx = await (contract as any).rejectTransfer(BigInt(transferId));
    await tx.wait();
  } catch (e) {
    console.error('Error rejecting transfer:', e);
    throw e;
  }
}

/**
 * Get pending transfers sent by a specific address
 * @param senderAddress - Address of the sender
 * @returns Array of pending transfers
 */
export async function getPendingTransfersBySender(
  senderAddress: string
): Promise<PendingTransfer[]> {
  try {
    if (typeof window === 'undefined' || !window.ethereum) {
      return [];
    }

    // Backward-compatible wrapper: fetch first page with a generous limit
    const { items } = await getPendingBySender(senderAddress, 0, 50);
    return items;
  } catch (error) {
    console.error('Error getting pending transfers:', error);
    return [];
  }
}

/**
 * Get pending outgoing transfers for a specific token and sender
 * @param tokenId - The token ID to check
 * @param senderAddress - The sender's address
 * @returns Array of pending transfer amounts
 */
export async function getPendingOutgoingTransfersByToken(
  tokenId: number,
  senderAddress: string
): Promise<PendingTransfer[]> {
  try {
    const provider = await getReadProvider();
    const contract = SupplyChain__factory.connect(CONTRACT_CONFIG.address, provider);

    // Get total number of transfers to iterate through
    const nextTransferId = Number(await (contract as any).nextTransferId());
    const pendingTransfers: PendingTransfer[] = [];

    // Iterate through all transfers and filter by criteria
    for (let id = 1; id < nextTransferId; id++) {
      try {
        const transfer = await (contract as any).getTransfer(id);

        // Filter for pending outgoing transfers of specific token
        if (
          Number(transfer.tokenId) === tokenId &&
          transfer.from.toLowerCase() === senderAddress.toLowerCase() &&
          Number(transfer.status) === 0 // 0 = Pending
        ) {
          // Get token name for display
          let tokenName = null;
          try {
            const token = await contract.getToken(Number(transfer.tokenId));
            tokenName = token.name;
          } catch {
            // If token fetch fails, continue without name
            tokenName = `Token #${transfer.tokenId}`;
          }

          pendingTransfers.push({
            id: Number(transfer.id),
            tokenId: Number(transfer.tokenId),
            tokenName,
            from: transfer.from,
            to: transfer.to,
            amount: Number(transfer.amount),
            status: 'Pending',
            createdAt: Number(transfer.dateCreated),
          });
        }
      } catch (error) {
        // Transfer might not exist or be inaccessible, skip
        continue;
      }
    }

    return pendingTransfers;
  } catch (error) {
    console.error('Error getting pending outgoing transfers:', error);
    return [];
  }
}

/**
 * Calculate available balance for a token (total balance - pending outgoing amounts)
 * @param tokenId - The token ID
 * @param userAddress - The user's address
 * @returns Available balance for transfer
 */
export async function getAvailableBalance(tokenId: number, userAddress: string): Promise<number> {
  try {
    const provider = await getReadProvider();
    const contract = SupplyChain__factory.connect(CONTRACT_CONFIG.address, provider);

    // 1. Get total balance from contract
    const totalBalance = Number(await contract.getTokenBalance(tokenId, userAddress));

    // 2. Get pending outgoing transfers for this token
    const pendingTransfers = await getPendingOutgoingTransfersByToken(tokenId, userAddress);

    // 3. Sum pending amounts
    const pendingAmount = pendingTransfers.reduce((sum, transfer) => sum + transfer.amount, 0);

    // 4. Calculate available balance with Math.max protection
    return Math.max(0, totalBalance - pendingAmount);
  } catch (error) {
    console.error('Error calculating available balance:', error);
    return 0;
  }
}

/**
 * Get tokens owned by user that have available balance > 0
 * @param userAddress - The user's address
 * @returns Array of token IDs with available balance
 */
export async function getUserTokensWithAvailableBalance(userAddress: string): Promise<number[]> {
  try {
    // First get all tokens with any balance > 0
    const allTokenIds = await getUserTokensWithBalance(userAddress);
    const availableTokenIds: number[] = [];

    // Check available balance for each token
    for (const tokenId of allTokenIds) {
      const availableBalance = await getAvailableBalance(tokenId, userAddress);
      if (availableBalance > 0) {
        availableTokenIds.push(tokenId);
      }
    }

    return availableTokenIds;
  } catch (error) {
    console.error('Error getting user tokens with available balance:', error);
    return [];
  }
}

/**
 * Map contract transfer status enum to string
 */
function mapTransferStatus(status: number): string {
  switch (status) {
    case 0:
      return 'Pending';
    case 1:
      return 'Accepted';
    case 2:
      return 'Rejected';
    default:
      return 'Unknown';
  }
}

// --- Traceability Helpers with Simple Caching ---

import { SimpleTraceabilityCache } from './traceabilityCache';
import type { TokenLineage, TransferHistoryEntry, TimelineEntry } from '../types/traceability';

// Global cache instance
const traceabilityCache = new SimpleTraceabilityCache();

/**
 * Obtiene el linaje completo de un token con caching básico
 * @param tokenId Token ID para trazar
 * @returns Array de tokens desde raw material hasta target token
 */
export async function getTokenLineage(tokenId: number): Promise<TokenLineage[]> {
  const cacheKey = SimpleTraceabilityCache.lineageKey(tokenId);

  // Try cache first
  const cached = traceabilityCache.get(cacheKey) as TokenLineage[] | null;
  if (cached) {
    return cached;
  }

  try {
    // Real contract implementation
    const lineage: TokenLineage[] = [];
    let currentTokenId = tokenId;
    let level = 0;

    // Build lineage by following parentId chain up to root (parentId = 0)
    while (currentTokenId > 0 && level < 10) {
      // Safety limit to prevent infinite loops
      // TODO: This function should receive userAddress as parameter instead of using empty address
      const tokenDetails = await getTokenDetails(
        currentTokenId,
        NULL_ADDRESS // Empty address for public token info only
      );

      if (!tokenDetails) {
        break; // Token not found or no access
      }

      // Get creator role info
      const creatorInfo = await getUserRoleInfo(tokenDetails.creator);

      const tokenLineage: TokenLineage = {
        tokenId: tokenDetails.id,
        parentId: tokenDetails.parentId,
        name: tokenDetails.name,
        creator: tokenDetails.creator,
        creatorRole: creatorInfo?.role || 'Unknown',
        createdAt: tokenDetails.dateCreated,
        level: level,
        currentBalance: tokenDetails.balance,
        totalSupply: tokenDetails.totalSupply,
        features: tokenDetails.features,
      };

      // Add to front of array (so we get chronological order: root -> leaf)
      lineage.unshift(tokenLineage);

      // Move to parent
      currentTokenId = tokenDetails.parentId;
      level++;

      // If we reached the root (parentId = 0), stop
      if (tokenDetails.parentId === 0) {
        break;
      }
    }

    // Remove the queried token itself from lineage (we only want ancestors)
    const ancestorsOnly = lineage.filter((token) => token.tokenId !== tokenId);

    traceabilityCache.set(cacheKey, ancestorsOnly);
    return ancestorsOnly;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error getting token lineage:', errorMsg);
    throw error;
  }
}

/**
 * Obtiene información de usuario con caching básico
 * @param userAddress Ethereum address
 * @returns User info incluyendo role
 */
export async function getUserRoleInfo(
  userAddress: string
): Promise<{ role: string; status: string }> {
  const cacheKey = SimpleTraceabilityCache.userKey(userAddress);

  // Try cache first
  const cached = traceabilityCache.get(cacheKey) as { role: string; status: string } | null;
  if (cached) {
    return cached;
  }

  try {
    // Real contract implementation
    const userInfo = await getUserInfo(userAddress);

    const result = {
      role: userInfo.role || 'Unknown',
      status: userInfo.status || 'Unknown',
    };

    traceabilityCache.set(cacheKey, result);
    return result;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    if (errorMsg.includes('User not registered') || userAddress === NULL_ADDRESS) {
      throw new Error('User not found');
    }
    throw error;
  }
}

/**
 * Obtiene historial cronológico de transferencias para un token
 * @param tokenId Token ID para obtener historial
 * @returns Array ordenado de transferencias por timestamp
 */
export async function getTokenTransferHistory(tokenId: number): Promise<TransferHistoryEntry[]> {
  const cacheKey = SimpleTraceabilityCache.transferHistoryKey(tokenId);

  // Try cache first
  const cached = traceabilityCache.get(cacheKey) as TransferHistoryEntry[] | null;
  if (cached) {
    return cached;
  }

  try {
    // Real contract implementation for transfer history
    const provider = await getReadProvider();
    const contract = SupplyChain__factory.connect(CONTRACT_CONFIG.address, provider);

    // Get total number of transfers to iterate through
    const nextTransferId = Number(await contract.nextTransferId());
    const transferHistory: TransferHistoryEntry[] = [];

    // Iterate through all transfers and filter by tokenId and status = Accepted (1)
    for (let id = 1; id < nextTransferId; id++) {
      try {
        const transfer = await contract.getTransfer(id);

        // Filter for accepted transfers of this specific token
        if (Number(transfer.tokenId) === tokenId && Number(transfer.status) === 1) {
          // Get role information for from and to addresses
          const [fromInfo, toInfo] = await Promise.all([
            getUserRoleInfo(transfer.from),
            getUserRoleInfo(transfer.to),
          ]);

          transferHistory.push({
            transferId: Number(transfer.id),
            tokenId: Number(transfer.tokenId),
            from: transfer.from,
            fromRole: fromInfo.role,
            to: transfer.to,
            toRole: toInfo.role,
            amount: Number(transfer.amount),
            timestamp: Number(transfer.dateCreated),
            status: 'Accepted', // We only include accepted transfers
          });
        }
      } catch {
        // Transfer might not exist or be inaccessible, skip
        continue;
      }
    }

    // Sort by timestamp (oldest first)
    transferHistory.sort((a, b) => a.timestamp - b.timestamp);

    traceabilityCache.set(cacheKey, transferHistory);
    return transferHistory;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error getting token transfer history:', errorMsg);
    throw error;
  }
}

/**
 * Construye timeline unificado combinando eventos de creación y transferencias
 * @param tokenId Token ID para construir timeline
 * @returns Array ordenado de eventos cronológicos
 */
export async function buildTokenTimeline(tokenId: number): Promise<TimelineEntry[]> {
  const cacheKey = SimpleTraceabilityCache.timelineKey(tokenId);

  // Try cache first
  const cached = traceabilityCache.get(cacheKey) as TimelineEntry[] | null;
  if (cached) {
    return cached;
  }

  try {
    // Get token details and transfers - need to provide a user address for getTokenDetails
    const provider = await getReadProvider();
    const contract = SupplyChain__factory.connect(CONTRACT_CONFIG.address, provider);
    const tokenData = await contract.getToken(tokenId);

    const tokenDetails = {
      id: Number(tokenData[0]),
      creator: tokenData[1],
      name: tokenData[2],
      totalSupply: Number(tokenData[3]),
      features: tokenData[4] || '',
      parentId: Number(tokenData[5]),
      dateCreated: Number(tokenData[6]),
      balance: Number(tokenData[3]), // Use totalSupply as fallback for balance
    };

    const lineage = await getTokenLineage(tokenId);

    const timeline: TimelineEntry[] = [];

    // First, add creation events for all tokens in the lineage (from oldest to newest)
    const allTokensInChain = [
      ...lineage,
      {
        tokenId: tokenDetails.id,
        parentId: tokenDetails.parentId || 0,
        name: tokenDetails.name,
        creator: tokenDetails.creator,
        creatorRole: (await getUserRoleInfo(tokenDetails.creator)).role,
        createdAt: tokenDetails.dateCreated || Date.now() / 1000,
        level: tokenDetails.parentId ? 1 : 0,
        currentBalance: tokenDetails.balance,
        totalSupply: tokenDetails.totalSupply,
        features: tokenDetails.features || '',
      },
    ];

    // Sort tokens by creation date to show chronological order
    allTokensInChain.sort((a, b) => a.createdAt - b.createdAt);

    // Add creation and transformation events for each token in chronological order
    for (const token of allTokensInChain) {
      // Add creation event
      timeline.push({
        type: 'creation',
        timestamp: token.createdAt,
        tokenInfo: token,
      });

      // Add transformation event if token has a parent
      if (token.parentId && token.parentId > 0) {
        const parentToken = allTokensInChain.find((t) => t.tokenId === token.parentId);
        if (parentToken) {
          timeline.push({
            type: 'transformation',
            timestamp: token.createdAt,
            tokenInfo: token,
            parentToken,
            stockConsumption: {
              consumedAmount: token.totalSupply, // Simplified: assumes 1:1 conversion
              producedAmount: token.totalSupply,
              consumedTokenId: token.parentId,
              producedTokenId: token.tokenId,
            },
          });
        }
      }
    }

    // Add all transfer events for all tokens in the chain
    for (const token of allTokensInChain) {
      try {
        const tokenTransfers = await getTokenTransferHistory(token.tokenId);
        for (const transfer of tokenTransfers) {
          timeline.push({
            type: 'transfer',
            timestamp: transfer.timestamp,
            tokenInfo: token,
            transferInfo: transfer,
          });
        }
      } catch (error) {
        // If we can't get transfer history, continue without it
        console.warn(`Could not get transfer history for token ${token.tokenId}:`, error);
      }
    }

    // Sort by timestamp
    timeline.sort((a, b) => a.timestamp - b.timestamp);

    // Cache and return
    traceabilityCache.set(cacheKey, timeline);
    return timeline;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Error building token timeline: ${errorMsg}`);
  }
}
