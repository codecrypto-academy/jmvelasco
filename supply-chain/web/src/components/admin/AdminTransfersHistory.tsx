import type { TransferHistoryRow } from '../../hooks/useAdminSupplyChain';

interface AdminTransfersHistoryProps {
  transferRows: TransferHistoryRow[];
  isLoading: boolean;
  error: string | null;
}

export function AdminTransfersHistory({
  transferRows,
  isLoading,
  error,
}: AdminTransfersHistoryProps) {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Error en Historial de Transferencias
        </h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'Producer':
        return 'text-green-700 bg-green-50';
      case 'Factory':
        return 'text-blue-700 bg-blue-50';
      case 'Retailer':
        return 'text-purple-700 bg-purple-50';
      case 'Consumer':
        return 'text-orange-700 bg-orange-50';
      case 'Admin':
        return 'text-red-700 bg-red-50';
      default:
        return 'text-gray-700 bg-gray-50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'text-yellow-800 bg-yellow-100 border-yellow-200';
      case 'Accepted':
        return 'text-green-800 bg-green-100 border-green-200';
      case 'Rejected':
        return 'text-red-800 bg-red-100 border-red-200';
      default:
        return 'text-gray-800 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Pending':
        return '🟡';
      case 'Accepted':
        return '✅';
      case 'Rejected':
        return '❌';
      default:
        return '❓';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Historial Completo de Transferencias
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Registro cronológico de todas las transferencias del sistema (más recientes primero)
        </p>
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Cargando historial...</span>
          </div>
        ) : transferRows.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No hay transferencias registradas</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID Transfer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Desde (Remitente)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hacia (Destinatario)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Token
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transferRows.map((row, index) => (
                <tr key={row.transferId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono font-medium text-gray-900">
                      #{row.transferId}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      <div className="text-sm font-mono text-gray-900">
                        {formatAddress(row.fromAddress)}
                      </div>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(row.fromRole)}`}
                      >
                        {row.fromRole}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col space-y-1">
                      <div className="text-sm font-mono text-gray-900">
                        {formatAddress(row.toAddress)}
                      </div>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(row.toRole)}`}
                      >
                        {row.toRole}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{row.tokenName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {row.amount.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span
                      className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(row.status)}`}
                    >
                      <span className="mr-1">{getStatusIcon(row.status)}</span>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(row.dateCreated)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!isLoading && transferRows.length > 0 && (
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between text-sm text-gray-600">
            <div>
              Total transferencias: <span className="font-semibold">{transferRows.length}</span>
            </div>
            <div className="flex space-x-4">
              <div>
                ✅ Aceptadas:{' '}
                <span className="font-semibold text-green-600">
                  {transferRows.filter((row) => row.status === 'Accepted').length}
                </span>
              </div>
              <div>
                🟡 Pendientes:{' '}
                <span className="font-semibold text-yellow-600">
                  {transferRows.filter((row) => row.status === 'Pending').length}
                </span>
              </div>
              <div>
                ❌ Rechazadas:{' '}
                <span className="font-semibold text-red-600">
                  {transferRows.filter((row) => row.status === 'Rejected').length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
