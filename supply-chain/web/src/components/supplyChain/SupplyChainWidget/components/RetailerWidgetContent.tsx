/**
 * Retailer Role Widget Component
 * Displays inventory, sales metrics, and supplier relations
 */

import { useRetailerData } from '../hooks/useRetailerData';

interface RetailerWidgetContentProps {
  readonly address: `0x${string}`;
}

export function RetailerWidgetContent({ address }: RetailerWidgetContentProps) {
  const { data, isLoading, error } = useRetailerData(address);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-violet-600 border-t-transparent mx-auto mb-3"></div>
        <p className="text-violet-700 font-medium">Cargando datos del minorista...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-3xl mb-3">⚠️</div>
        <p className="text-red-700 font-medium">Error: {error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">💎</div>
        <p className="text-slate-700 font-medium">No hay datos disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Inventory Summary */}
      {data.inventory.length > 0 && (
        <div>
          <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <span>📦</span>
            Inventario Actual
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {data.inventory.slice(0, 5).map((item, index) => (
              <div
                key={`${item.tokenId}-${index}`}
                className="flex items-center justify-between p-3 bg-white border border-violet-100 rounded-lg hover:border-violet-200 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium text-slate-800">{item.name}</div>
                  <div className="text-xs text-slate-500">
                    Recibido: {item.receivedAt.toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-violet-700">
                    Stock: {item.currentStock.toString()}
                  </div>
                  <div className="text-xs text-slate-500">
                    Disponible: {item.availableForSale.toString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Transfers */}
      {(data.pendingIncoming.length > 0 || data.pendingOutgoing.length > 0) && (
        <div>
          <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <span>🔄</span>
            Transferencias Pendientes
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {data.pendingIncoming.slice(0, 3).map((transfer, index) => (
              <div
                key={`incoming-${transfer.transferId}-${index}`}
                className="flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded text-sm"
              >
                <div className="text-blue-900 font-medium">Entrante:</div>
                <div className="text-blue-700 font-medium">{transfer.tokenName}</div>
                <div className="text-blue-600 text-xs">{transfer.amount.toString()} unidades</div>
              </div>
            ))}
            {data.pendingOutgoing.slice(0, 3).map((transfer, index) => (
              <div
                key={`outgoing-${transfer.transferId}-${index}`}
                className="flex items-center justify-between p-2 bg-orange-50 border border-orange-200 rounded text-sm"
              >
                <div>
                  <span className="text-orange-700 font-medium">Saliente:</span>{' '}
                  {transfer.tokenName}
                </div>
                <div className="text-orange-600 text-xs">{transfer.amount.toString()} unidades</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {data.inventory.length === 0 &&
        data.pendingIncoming.length === 0 &&
        data.pendingOutgoing.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🏪</div>
            <p className="text-slate-700 font-medium">No tienes inventario aún</p>
            <p className="text-slate-500 text-sm mt-1">
              Tu inventario y ventas aparecerán aquí una vez que recibas productos
            </p>
          </div>
        )}
    </div>
  );
}
