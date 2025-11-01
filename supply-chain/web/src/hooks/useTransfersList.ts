import { ethers } from 'ethers';
import { useEffect, useMemo, useState } from 'react';
import { CONTRACT_CONFIG, NETWORK_CONFIG } from '../config/contracts';
import * as contract from '../lib/contract';
import { SupplyChain__factory } from '../types/factories/SupplyChain__factory';

export type TransfersMode = 'sender' | 'recipient';

export interface UseTransfersListParams {
  mode: TransfersMode;
  address: string | null;
  pageSize?: number;
  includeAllStatuses?: boolean; // when true, future implementation may use event sourcing
}

export interface TransfersListResult {
  items: Array<contract.PendingTransfer & { status?: 'Pending' | 'Accepted' | 'Rejected' }>;
  total: number;
  page: number;
  totalPages: number;
  setPage: (page: number) => void;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useTransfersList({
  mode,
  address,
  pageSize = 5,
  includeAllStatuses = false,
}: UseTransfersListParams): TransfersListResult {
  const [items, setItems] = useState<TransfersListResult['items']>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshFlag, setRefreshFlag] = useState(0);

  const offset = useMemo(() => (page - 1) * pageSize, [page, pageSize]);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!address) {
        setItems([]);
        setTotal(0);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        let items: TransfersListResult['items'];
        let total: number;

        if (includeAllStatuses) {
          // *** EVENT SOURCING STRATEGY: Query all transfer events ***
          const provider = new ethers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
          const contractInstance = SupplyChain__factory.connect(CONTRACT_CONFIG.address, provider);

          // 1) Fetch all TransferRequested events
          const requestFilter = (contractInstance as any).filters.TransferRequested();
          const logs: any[] = await (contractInstance as any).queryFilter(
            requestFilter,
            0,
            'latest'
          );

          // 2) Filter by participant based on mode
          const byAddr = logs.filter((ev: any) => {
            const a = ev?.args ?? {};
            const from = a.from ?? a[1];
            const to = a.to ?? a[2];
            if (!from && !to) return false;
            if (mode === 'sender') return String(from).toLowerCase() === address.toLowerCase();
            return String(to).toLowerCase() === address.toLowerCase();
          });

          // 3) Collect unique transfer IDs
          const idSet = new Set<number>();
          for (const ev of byAddr) {
            const a = ev?.args ?? {};
            const id = Number(a.transferId ?? a[0] ?? 0);
            if (id > 0) idSet.add(id);
          }

          const ids = Array.from(idSet);

          // 4) Fetch transfer details for each id and map
          const transfersRaw: TransfersListResult['items'] = await Promise.all(
            ids.map(async (id) => {
              try {
                const t: any = await (contractInstance as any).getTransfer(BigInt(id));
                const tokenId = Number(t.tokenId ?? t[3] ?? 0);
                let tokenName: string | null = null;
                try {
                  const tok = await (contractInstance as any).getToken(BigInt(tokenId));
                  tokenName = tok?.name ?? tok?.[2] ?? null;
                } catch {
                  // ignore token name failures
                }
                // Map status enum
                const statusNum = Number(t.status ?? t[6] ?? 0);
                const status: 'Pending' | 'Accepted' | 'Rejected' =
                  statusNum === 1 ? 'Accepted' : statusNum === 2 ? 'Rejected' : 'Pending';
                const fromAddr = String(t.from ?? t[1] ?? '');
                const toAddr = String(t.to ?? t[2] ?? '');
                const createdAt = Number(t.dateCreated ?? t[4] ?? 0);
                return {
                  id,
                  tokenId,
                  tokenName,
                  amount: Number(t.amount ?? t[5] ?? 0),
                  from: fromAddr,
                  to: toAddr,
                  status,
                  createdAt,
                };
              } catch {
                return null as unknown as TransfersListResult['items'][number];
              }
            })
          );

          const valid = transfersRaw.filter(Boolean);

          // 5) Sort by creation date desc and paginate client-side
          valid.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
          total = valid.length;
          items = valid.slice(offset, offset + pageSize);
        } else {
          // *** SC PAGINATED GETTER STRATEGY: Direct read for pending-only ***
          const result =
            mode === 'sender'
              ? await contract.getPendingBySender(address, offset, pageSize)
              : await contract.getPendingByRecipient(address, offset, pageSize);
          items = result.items as TransfersListResult['items'];
          total = result.total;
        }

        if (!mounted) return;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        if (total > 0 && page > totalPages) {
          setPage(totalPages);
          return;
        }
        setItems(items);
        setTotal(total);
      } catch (error: any) {
        if (mounted) {
          setError(error?.message || 'Failed to load transfers');
          setItems([]);
          setTotal(0);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void load();
    return () => {
      mounted = false;
    };
  }, [address, offset, pageSize, mode, refreshFlag, page, includeAllStatuses]);

  const refresh = () => setRefreshFlag((f) => f + 1);

  return { items, total, page, totalPages, setPage, loading, error, refresh };
}
