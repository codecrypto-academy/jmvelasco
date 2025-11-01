import { UserRole } from '../../../../lib/enums';
import { useAllBalances } from '../hooks/useBalanceCalculation';
import { BalanceDisplay } from './BalanceDisplay';

interface BalanceSectionProps {
  userRole: UserRole;
}

export const BalanceSection = ({ userRole }: BalanceSectionProps) => {
  const { balances, isLoading, error } = useAllBalances({
    enableRealTimeUpdates: true,
    includeProcessingHistory: false,
  });

  if (isLoading) {
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">Balances de Tokens</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 h-32 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 bg-red-50 border border-red-300 p-4 rounded-lg">
        <h3 className="font-semibold text-red-900 mb-2">Error al cargar balances</h3>
        <p className="text-red-800 text-sm">{error}</p>
      </div>
    );
  }

  if (!balances.length) {
    return (
      <div className="mb-6 bg-gray-50 border border-gray-300 p-4 rounded-lg">
        <h3 className="font-semibold text-gray-900 mb-2">Sin Tokens</h3>
        <p className="text-gray-700 text-sm">
          {userRole === UserRole.Producer && 'Crea tus primeros tokens de materias primas.'}
          {userRole === UserRole.Factory && 'Recibe materias primas para comenzar a procesar.'}
          {userRole === UserRole.Retailer && 'Recibe productos de las fábricas.'}
          {userRole === UserRole.Consumer && 'Compra productos de los retailers.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Balances de Tokens</h3>
        <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
          {balances.length} {balances.length === 1 ? 'Token' : 'Tokens'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {balances.map((balance) => (
          <BalanceDisplay
            key={balance.tokenId.toString()}
            balance={balance}
            compact={false}
            showMetadata={true}
            className="hover:shadow-md transition-shadow duration-200"
          />
        ))}
      </div>
    </div>
  );
};
