import type { ConservationRow } from '../../hooks/useAdminSupplyChain';
import { BadgeList } from '../ui/BadgeList';

interface AdminConservationAuditProps {
  conservationRows: ConservationRow[];
  isLoading: boolean;
  error: string | null;
}

export function AdminConservationAudit({
  conservationRows,
  isLoading,
  error,
}: AdminConservationAuditProps) {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-red-800 mb-2">
          Error en Auditoría de Conservación
        </h3>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  const getConservationStatus = (isConserved: boolean) => {
    return isConserved
      ? { text: 'Conservado', className: 'text-green-700 bg-green-100 border-green-200' }
      : { text: 'No Conservado', className: 'text-red-700 bg-red-100 border-red-200' };
  };

  const calculateConservationPercentage = (
    accountedBalance: number,
    processedAmount: number,
    totalSupply: number
  ) => {
    const totalAccounted = accountedBalance + processedAmount;
    return totalSupply > 0 ? Math.round((totalAccounted / totalSupply) * 100) : 0;
  };

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg shadow mb-6">
      <div className="px-8 py-5 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Auditoría de Conservación de Tokens</h3>
        <p className="text-sm text-gray-600 mt-1">
          Verifica que la suma de balances + procesados = supply total para cada token
        </p>
      </div>

      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Calculando conservación...</span>
          </div>
        ) : conservationRows.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No hay tokens para auditar</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Token
                </th>
                <th className="px-8 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Supply Total
                </th>
                <th className="px-8 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance Contabilizado
                </th>
                <th className="px-8 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad Procesada
                </th>
                <th className="px-8 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % Conservación
                </th>
                <th className="px-8 py-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-8 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Distribución
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {conservationRows.map((row, index) => {
                const conservationStatus = getConservationStatus(row.isConserved);
                const conservationPercentage = calculateConservationPercentage(
                  row.accountedBalance,
                  row.processedAmount,
                  row.totalSupply
                );

                return (
                  <tr
                    key={row.tokenName}
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${!row.isConserved ? 'border-l-4 border-red-400' : ''}`}
                  >
                    <td className="px-8 py-6 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{row.tokenName}</div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        {row.totalSupply.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-right">
                      <div className="text-sm text-gray-900">
                        {row.accountedBalance.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-right">
                      <div className="text-sm text-blue-600 font-medium">
                        {row.processedAmount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-right">
                      <div
                        className={`text-sm font-semibold ${conservationPercentage === 100 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {conservationPercentage}%
                      </div>
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${conservationStatus.className}`}
                      >
                        {conservationStatus.text}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <BadgeList data={row.distribution} type="distribution" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {!isLoading && conservationRows.length > 0 && (
        <div className="px-8 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between text-sm text-gray-600">
            <div>
              Total tokens auditados:{' '}
              <span className="font-semibold">{conservationRows.length}</span>
            </div>
            <div>
              Conservados:{' '}
              <span className="font-semibold text-green-600">
                {conservationRows.filter((row) => row.isConserved).length}
              </span>
              {' | '}
              No conservados:{' '}
              <span className="font-semibold text-red-600">
                {conservationRows.filter((row) => !row.isConserved).length}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
