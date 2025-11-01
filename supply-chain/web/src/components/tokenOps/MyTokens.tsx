import { ethers } from 'ethers';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CONTRACT_CONFIG } from '../../config/contracts';
import { useContractEvent } from '../../hooks/useContractEvent';
import {
  getTokenDetails,
  getUserTokens,
  getUserTokensWithBalance,
  type TokenDetails,
} from '../../lib/contract';
import { mergeTokenDetails } from '../../lib/tokens';
import { SupplyChain__factory } from '../../types/factories/SupplyChain__factory';

interface MyTokensProps {
  userAddress: string;
  onTokenClick?: (tokenId: number) => void;
  isClickable?: boolean;
}

export default function MyTokens({
  userAddress,
  onTokenClick,
  isClickable = false,
}: MyTokensProps) {
  const [tokens, setTokens] = useState<TokenDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track seen token IDs to avoid duplicates from repeated events/StrictMode
  const seenIdsRef = useRef<Set<string>>(new Set());

  // Fetch owned tokens on mount
  useEffect(() => {
    let mounted = true;
    if (!userAddress) {
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    async function fetchTokens() {
      try {
        if (!mounted) return;
        setLoading(true);
        setError(null);

        const tokenIds: number[] = await getUserTokensWithBalance(userAddress);
        const userTokenIds = await getUserTokens(userAddress);

        if (!mounted) return;
        // Fetch details for each token
        const details = await Promise.all(
          [...tokenIds, ...userTokenIds].map((id) => getTokenDetails(id, userAddress))
        );
        if (!mounted) return;

        // Filter out nulls and merge with any tokens already appended via events
        const nonNull = details.filter((t): t is TokenDetails => t !== null);
        setTokens((prev) => mergeTokenDetails(prev, nonNull));
        // Seed/extend seen IDs set
        seenIdsRef.current = new Set([
          ...Array.from(seenIdsRef.current),
          ...nonNull.map((t) => String(t.id)),
        ]);
      } catch (e) {
        console.error('Error fetching tokens:', e);
        if (mounted) setError('Failed to load tokens');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchTokens();
    return () => {
      mounted = false;
    };
  }, [userAddress]);

  // Handler for TokenCreated events
  const handleTokenCreated = useCallback(
    async (event: any) => {
      // ethers v6: event object with .args
      let tokenId, creator;
      if (event?.args) {
        const a = event.args;
        tokenId = a?.tokenId ?? a?.id ?? a?.[0];
        creator = a?.creator ?? a?.owner ?? a?.[1];
      } else {
        return;
      }

      if (creator && creator.toLowerCase() === userAddress.toLowerCase()) {
        const idStr = tokenId?.toString ? tokenId.toString() : String(tokenId);
        if (seenIdsRef.current.has(idStr)) {
          return;
        }

        try {
          const details = await getTokenDetails(Number(tokenId), userAddress);
          if (details) {
            seenIdsRef.current.add(String(details.id));
            setTokens((prev) => {
              if (prev.some((t) => String(t.id) === String(details.id))) return prev;
              return [...prev, details];
            });
          }
        } catch (e) {
          console.error('Error handling TokenCreated event:', e);
        }
      }
    },
    [userAddress]
  );

  // Handler for TransferAccepted events
  const handleTransferAccepted = useCallback(
    async (event: any) => {
      // ethers v6: event object with .args
      let transferId;
      if (event?.args) {
        const a = event.args;
        transferId = a?.transferId ?? a?.[0];
      } else {
        return;
      }

      try {
        // Need to get contract instance to call getTransfer
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = SupplyChain__factory.connect(CONTRACT_CONFIG.address, provider);
        const transfer = await contract.getTransfer(transferId);

        // Check if current user is recipient
        if (!transfer.to || transfer.to.toLowerCase() !== userAddress.toLowerCase()) {
          return;
        }

        // Fetch token details with updated balance
        const tokenIdNum = Number(transfer.tokenId);

        // Always fetch fresh details for TransferAccepted events
        // (balance may have changed for existing tokens)
        const details = await getTokenDetails(tokenIdNum, userAddress);
        if (details) {
          seenIdsRef.current.add(String(details.id));

          // Use helper to merge/overwrite with fresh details (includes updated balance)
          setTokens((prev) => mergeTokenDetails(prev, details));
        }
      } catch (e) {
        console.error('Error handling TransferAccepted event:', e);
      }
    },
    [userAddress]
  );

  // Listen to TokenCreated events using the hook
  useContractEvent('TokenCreated', handleTokenCreated, [handleTokenCreated]);

  // Listen to TransferAccepted events using the hook
  useContractEvent('TransferAccepted', handleTransferAccepted, [handleTransferAccepted]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Loading tokens...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No tokens yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {tokens.map((token) => {
        let parsedFeatures: Record<string, unknown> = {};
        try {
          parsedFeatures = JSON.parse(token.features);
        } catch {
          // ignore parse errors
        }

        const handleTraceClick = () => {
          if (isClickable && onTokenClick) {
            onTokenClick(token.id);
          }
        };

        const isZeroBalance = token.balance === 0;
        return (
          <div
            key={token.id}
            className={`border rounded-xl p-5 min-w-0 flex flex-col transition-all duration-300
              ${
                isZeroBalance
                  ? 'border-dashed border-gray-300 bg-gray-50 opacity-70 cursor-not-allowed'
                  : 'border-gray-200 bg-white shadow-sm hover:shadow-lg hover:border-gray-300'
              }
            `}
            title={
              isZeroBalance
                ? 'Este token tiene balance 0. No disponible para transferencias.'
                : undefined
            }
          >
            {/* Header with token name and ID badge */}
            <div className="flex items-start justify-between mb-4">
              <h3
                className={`text-xl font-bold truncate flex-1 mr-2 ${isZeroBalance ? 'text-gray-400' : 'text-gray-900'}`}
                title={token.name}
              >
                {isZeroBalance ? (
                  <span className="mr-1" aria-label="Sin balance">
                    🚫
                  </span>
                ) : null}
                {token.name}
              </h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 shrink-0">
                #{token.id}
              </span>
            </div>

            {/* Main metrics in organized grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className={`rounded-lg p-3 ${isZeroBalance ? 'bg-gray-100' : 'bg-gray-50'}`}>
                <dt
                  className={`text-xs font-medium uppercase tracking-wider ${isZeroBalance ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  Balance
                </dt>
                <dd
                  className={`text-lg font-bold mt-1 ${isZeroBalance ? 'text-gray-400' : 'text-gray-900'}`}
                >
                  {token.balance.toLocaleString()}
                  {isZeroBalance ? (
                    <span className="ml-2 text-xs text-gray-400">(Sin stock)</span>
                  ) : null}
                </dd>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Supply
                </dt>
                <dd className="text-lg font-bold text-gray-900 mt-1">
                  {token.totalSupply.toLocaleString()}
                </dd>
              </div>
            </div>

            {/* Lineage indicator */}
            <div className="mb-4">
              <div className="flex items-center text-sm">
                <span className="text-gray-500 font-medium mr-2">Origin:</span>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                    token.parentId === 0
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {token.parentId === 0 ? '🌱 Raw Material' : `📦 Derived from #${token.parentId}`}
                </span>
              </div>
            </div>

            {/* Additional features */}
            {(typeof parsedFeatures.content === 'string' ||
              typeof parsedFeatures.country === 'string' ||
              typeof parsedFeatures.type === 'string') && (
              <div className="space-y-2 mb-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Details
                </h4>
                <div className="space-y-1.5">
                  {typeof parsedFeatures.type === 'string' && (
                    <div className="flex items-center text-sm">
                      <span className="text-gray-500 w-16">Type:</span>
                      <span className="text-gray-900 font-medium">{parsedFeatures.type}</span>
                    </div>
                  )}
                  {typeof parsedFeatures.content === 'string' && (
                    <div className="text-sm">
                      <span className="text-gray-900 font-medium">{parsedFeatures.content}</span>
                    </div>
                  )}
                  {typeof parsedFeatures.country === 'string' && (
                    <div className="flex items-center text-sm">
                      <span className="text-gray-500 w-16">Country:</span>
                      <span className="text-gray-900 font-medium">{parsedFeatures.country}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Only show trace button for Consumer role per analysis */}
            {isClickable && (
              <div className="mt-auto pt-4 border-t border-gray-100">
                <button
                  onClick={handleTraceClick}
                  className="w-full group relative overflow-hidden px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium shadow-sm hover:shadow-md hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!onTokenClick}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <span className="text-lg">🔍</span>
                    <span className="text-sm font-semibold">Trace Product Journey</span>
                  </div>
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
