import { ethers } from 'ethers';
import { useEffect, useState } from 'react';
import { CONTRACT_CONFIG } from '../../config/contracts';
import { useTransfersList } from '../../hooks/useTransfersList';
import { useWallet } from '../../hooks/useWallet';
import { SupplyChain__factory } from '../../types/factories/SupplyChain__factory';
import Badge from '../ui/Badge';
import TransfersPagination from '../ui/TransfersPagination';

type Props = { showAllStatuses?: boolean };

export default function OutgoingTransfers({ showAllStatuses = false }: Props) {
  const { address } = useWallet();
  // Local tick to force a re-render on realtime events so mocked hooks in tests can update
  const [tick, setTick] = useState(0);
  const { items, total, page, totalPages, setPage, loading, error, refresh } = useTransfersList({
    mode: 'sender',
    address,
    pageSize: 5,
    includeAllStatuses: showAllStatuses,
  });

  // Realtime: refresh list when a new TransferRequested is emitted from this address
  useEffect(() => {
    if (typeof window === 'undefined' || !window.ethereum || !address) return;

    let provider: ethers.BrowserProvider | null = null;
    let contract: any = null;
    let requestedHandler: ((...args: any[]) => void) | null = null;
    let acceptedHandler: ((...args: any[]) => void) | null = null;
    let rejectedHandler: ((...args: any[]) => void) | null = null;
    let requestedFilter: any = null;
    let acceptedFilter: any = null;
    let rejectedFilter: any = null;

    async function setup() {
      try {
        provider = new ethers.BrowserProvider(window.ethereum);
        contract = SupplyChain__factory.connect(CONTRACT_CONFIG.address, provider);

        requestedHandler = (...eventArgs: any[]) => {
          // ethers v6 typed event object style
          if (eventArgs.length === 1 && eventArgs[0]?.args) {
            const a = eventArgs[0].args;
            const from = a?.from ?? a?.[1];
            if (from && address && String(from).toLowerCase() === address.toLowerCase()) {
              // Trigger a refresh; pagination and dedupe are handled by the hook/backend
              void Promise.resolve(refresh()).finally(() => {
                setTick((t) => t + 1);
              });
            }
          }
        };
        requestedFilter = contract.filters.TransferRequested();
        if (showAllStatuses) {
          acceptedHandler = (..._args: any[]) => {
            // Any acceptance affecting any of the sender's transfers should trigger a refresh
            void Promise.resolve(refresh()).finally(() => {
              setTick((t) => t + 1);
            });
          };
          rejectedHandler = (..._args: any[]) => {
            void Promise.resolve(refresh()).finally(() => {
              setTick((t) => t + 1);
            });
          };
          acceptedFilter = contract.filters.TransferAccepted?.() ?? 'TransferAccepted';
          rejectedFilter = contract.filters.TransferRejected?.() ?? 'TransferRejected';
        }
        contract.on(requestedFilter, requestedHandler);
        if (showAllStatuses && acceptedFilter && acceptedHandler) {
          contract.on(acceptedFilter, acceptedHandler);
        }
        if (showAllStatuses && rejectedFilter && rejectedHandler) {
          contract.on(rejectedFilter, rejectedHandler);
        }
      } catch (e) {
        console.error('Failed to setup TransferRequested listener:', e);
      }
    }

    void setup();

    return () => {
      if (contract) {
        try {
          if (typeof contract.off === 'function') {
            requestedHandler &&
              contract.off(requestedFilter ?? 'TransferRequested', requestedHandler);
            if (showAllStatuses) {
              acceptedHandler &&
                contract.off(acceptedFilter ?? 'TransferAccepted', acceptedHandler);
              rejectedHandler &&
                contract.off(rejectedFilter ?? 'TransferRejected', rejectedHandler);
            }
          } else if (typeof contract.removeListener === 'function') {
            requestedHandler &&
              contract.removeListener(requestedFilter ?? 'TransferRequested', requestedHandler);
            if (showAllStatuses) {
              acceptedHandler &&
                contract.removeListener(acceptedFilter ?? 'TransferAccepted', acceptedHandler);
              rejectedHandler &&
                contract.removeListener(rejectedFilter ?? 'TransferRejected', rejectedHandler);
            }
          } else if (typeof contract.removeAllListeners === 'function') {
            contract.removeAllListeners(requestedFilter ?? 'TransferRequested');
            if (showAllStatuses) {
              contract.removeAllListeners(acceptedFilter ?? 'TransferAccepted');
              contract.removeAllListeners(rejectedFilter ?? 'TransferRejected');
            }
          }
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [address, refresh, showAllStatuses]);

  // Status color feedback is now handled by the Badge component
  return (
    <section>
      <h2 className="text-xl font-semibold text-blue-400 mb-4">Outgoing Transfers</h2>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {loading && <div className="text-gray-500">Loading...</div>}
      {!loading && (
        <div>
          {items.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-500">
                {showAllStatuses
                  ? 'No outgoing transfers yet.'
                  : 'No pending transfers at the moment.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                      Token
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                      Amount
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                      Recipient
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((t: any) => (
                    <tr key={t.id}>
                      <td className="px-4 py-2 text-gray-600">
                        {t.tokenName || `Token #${t.tokenId}`}
                      </td>
                      <td className="px-4 py-2 text-gray-600">{t.amount}</td>
                      <td className="px-4 py-2 text-gray-600">{t.to}</td>
                      <td className="px-4 py-2 text-gray-600">
                        <Badge status={t.status as 'Pending' | 'Accepted' | 'Rejected'}>
                          {t.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <TransfersPagination
                page={page}
                totalPages={totalPages}
                total={total}
                pageSize={5}
                itemsInCurrentPage={items.length}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      )}
      {/* Hidden debug marker to ensure local tick is read (prevents unused-var lint) */}
      <span style={{ display: 'none' }}>{tick}</span>
    </section>
  );
}
