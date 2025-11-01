import type { AdminTokenRow } from '../../hooks/useAdminSupplyChain';
import { BadgeList } from '../ui/BadgeList';

interface AdminTokensOverviewProps {
  tokenRows: AdminTokenRow[];
  isLoading: boolean;
  error: string | null;
}

export function AdminTokensOverview({ tokenRows, isLoading, error }: AdminTokensOverviewProps) {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Error en Status de Tokens por Usuario
        </h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg shadow mb-6">
      <div className="px-8 py-5 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Status de Tokens por Usuario</h3>
        <p className="text-sm text-gray-600 mt-1">
          Vista detallada de todos los balances de tokens por usuario activo
        </p>
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Cargando datos de blockchain...</span>
          </div>
        ) : tokenRows.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No hay tokens activos en el sistema</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Token ID
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre Token
                </th>
                <th className="px-8 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance Actual
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notas
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tokenRows.map((row, index) => (
                <tr
                  key={`${row.userAddress}-${row.tokenId}`}
                  className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="text-sm font-mono text-gray-900">
                      {formatAddress(row.userAddress)}
                    </div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(row.userRole)}`}
                    >
                      {row.userRole}
                    </span>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-mono">#{row.tokenId}</div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{row.tokenName}</div>
                  </td>
                  <td className="px-8 py-6 whitespace-nowrap text-right">
                    <div className="text-sm font-semibold text-gray-900">
                      {row.currentBalance.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <BadgeList data={row.notes} type="notes" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {!isLoading && tokenRows.length > 0 && (
        <div className="px-8 py-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Total: <span className="font-semibold">{tokenRows.length}</span> entradas de tokens
            activos
          </div>
        </div>
      )}
    </div>
  );
}
