import { useWeb3 } from '../../../contexts/Web3Provider';
import { useSupplyChainOverviewPremium } from './hooks/useSupplyChainOverviewPremium';
import { useUserInfo } from '../../../hooks/useUserInfo';
import { UserRole } from '../../../lib/enums';
import { BalanceSection } from './components/BalanceSection';
import { FactorySection } from './components/FactoryWidgetContent';
import { ProducerSection } from './components/ProducerWidgetContent';

export const SupplyChainOverview = () => {
  const { address } = useWeb3();
  const { userInfo } = useUserInfo(address);
  const { isLoading, error, lastUpdated, producerData, factoryData, refreshData } =
    useSupplyChainOverviewPremium();

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          <div className="h-8 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-24 bg-gray-200 rounded"></div>
            <div className="h-24 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-300 p-4 rounded-lg">
        <h3 className="font-bold text-red-900 mb-2">Error al cargar datos</h3>
        <p className="text-red-800 mb-3 font-medium">{error}</p>
        <button
          onClick={refreshData}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition-colors shadow-sm"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // No user info
  if (!userInfo) {
    return (
      <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-lg">
        <h3 className="font-bold text-yellow-900 mb-2">Usuario no registrado</h3>
        <p className="text-yellow-800 font-medium">
          Necesitas registrarte para ver los datos de la cadena de suministro.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg border shadow-sm">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Resumen de Cadena de Suministro</h2>
          <p className="text-sm text-gray-700 font-medium">
            Datos dinámicos • Rol: {userInfo.role} • Última actualización:{' '}
            {new Date(lastUpdated).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={refreshData}
            className="ml-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors shadow-sm"
          >
            Actualizar
          </button>
        </div>
      </div>

      {(userInfo.role === UserRole.Producer || userInfo.role === UserRole.Factory) && (
        <BalanceSection userRole={userInfo.role} />
      )}

      {userInfo.role === UserRole.Producer && producerData && (
        <ProducerSection
          data={{
            ...producerData,
            lastUpdated: new Date(lastUpdated),
            tokensCreated: producerData.tokensCreated.map((token) => ({
              ...token,
              createdAt: new Date(lastUpdated), // Using lastUpdated as fallback for createdAt
            })),
            pendingTransfers: producerData.pendingTransfers.map((transfer) => ({
              ...transfer,
              requestedAt: new Date(lastUpdated), // Using lastUpdated as fallback for requestedAt
            })),
          }}
        />
      )}

      {userInfo.role === UserRole.Factory && factoryData && (
        <FactorySection
          data={{
            ...factoryData,
            lastUpdated: new Date(lastUpdated),
            rawMaterialsStock: factoryData.rawMaterialsStock.map((material) => ({
              ...material,
              supplier: material.supplier as `0x${string}`,
              receivedAt: new Date(lastUpdated), // Using lastUpdated as fallback for receivedAt
            })),
            processedProducts: factoryData.processedProducts.map((product) => ({
              ...product,
              processedAt: new Date(lastUpdated), // Using lastUpdated as fallback for processedAt
            })),
          }}
        />
      )}
    </div>
  );
};
