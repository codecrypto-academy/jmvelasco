import { useState } from 'react';
import { useTransfersList } from '../../hooks/useTransfersList';
import { useWallet } from '../../hooks/useWallet';
import * as contract from '../../lib/contract';
import Alert from '../ui/Alert';
import Badge from '../ui/Badge';
import TransfersPagination from '../ui/TransfersPagination';

type Props = { showAllStatuses?: boolean };

export default function IncomingTransfers({ showAllStatuses = true }: Props) {
  const { address } = useWallet();
  const { items, total, page, totalPages, setPage, loading, error, refresh } = useTransfersList({
    mode: 'recipient',
    address,
    pageSize: 5,
    includeAllStatuses: showAllStatuses,
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | string | null>(null);

  async function onAccept(id: number | string) {
    setActionError(null);
    try {
      setProcessingId(id);
      await (contract as any).acceptTransfer(Number(id));
      refresh();
    } catch (error: any) {
      setActionError(error?.message || 'Operation failed');
    } finally {
      setProcessingId(null);
    }
  }

  async function onReject(id: number | string) {
    setActionError(null);
    try {
      setProcessingId(id);
      await (contract as any).rejectTransfer(Number(id));
      refresh();
    } catch (error: any) {
      setActionError(error?.message || 'Operation failed');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <section>
      <h2 className="text-xl font-semibold text-blue-400 mb-4">Incoming Transfers</h2>
      {error && (
        <Alert kind="error" className="mb-2">
          {error}
        </Alert>
      )}
      {actionError && (
        <Alert kind="error" className="mb-2">
          {actionError}
        </Alert>
      )}
      {loading && <Alert kind="neutral">Loading...</Alert>}
      {!loading && (
        <div>
          {items.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-500">No pending transfers at the moment.</p>
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
                      Sender
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {items.map((t) => {
                    const canAct =
                      !!address && !!t.to && address.toLowerCase() === String(t.to).toLowerCase();
                    const isPending = t.status === 'Pending';
                    return (
                      <tr key={t.id}>
                        <td className="px-4 py-2 text-gray-600">
                          {t.tokenName || `Token #${t.tokenId}`}
                        </td>
                        <td className="px-4 py-2 text-gray-600">{t.amount}</td>
                        <td className="px-4 py-2 text-gray-600">{t.from}</td>
                        <td className="px-4 py-2 text-gray-600">
                          <Badge status={t.status as 'Pending' | 'Accepted' | 'Rejected'}>
                            {t.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-gray-600">
                          {canAct ? (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                name="accept"
                                className="px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded disabled:opacity-50 cursor-pointer"
                                disabled={processingId === t.id || !isPending}
                                onClick={() => onAccept(t.id)}
                              >
                                Accept
                              </button>
                              <button
                                type="button"
                                name="reject"
                                className="px-2 py-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded disabled:opacity-50 cursor-pointer"
                                disabled={processingId === t.id || !isPending}
                                onClick={() => onReject(t.id)}
                              >
                                Reject
                              </button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
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
    </section>
  );
}
