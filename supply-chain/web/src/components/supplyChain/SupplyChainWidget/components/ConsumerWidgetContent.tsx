import { useConsumerData } from '../hooks/useConsumerData';

interface ConsumerWidgetContentProps {
  readonly address: `0x${string}`;
}

export function ConsumerWidgetContent({ address }: ConsumerWidgetContentProps) {
  const { data, isLoading, error } = useConsumerData(address);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-amber-600 border-t-transparent mx-auto mb-3"></div>
        <p className="text-amber-700 font-medium">Cargando datos del consumidor...</p>
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
        <div className="text-4xl mb-3">🔮</div>
        <p className="text-slate-700 font-medium">No hay datos disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Consumer Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-200">
          <div className="text-amber-800 text-sm font-medium">Total Compras</div>
          <div className="text-amber-900 text-lg font-bold">{data.totalPurchases}</div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-200">
          <div className="text-amber-800 text-sm font-medium">Tiendas Únicas</div>
          <div className="text-amber-900 text-lg font-bold">{data.uniqueRetailers}</div>
        </div>
      </div>

      {/* Recent Purchases */}
      {data.purchases.length > 0 && (
        <div>
          <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
            <span>🛒</span>
            Compras Recientes
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {data.purchases.slice(0, 5).map((purchase, index) => (
              <div
                key={`${purchase.tokenId}-${index}`}
                className="flex items-center justify-between p-3 bg-white border border-amber-100 rounded-lg hover:border-amber-200 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium text-slate-800">{purchase.name}</div>
                  <div className="text-xs text-slate-500">
                    {purchase.purchaseDate.toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-amber-700">
                    Token #{purchase.tokenId.toString()}
                  </div>
                  <div className="text-xs text-slate-500">
                    {purchase.verificationStatus === 'verified' ? '✅ Verificado' : '⏳ Pendiente'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Traceability Status */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200">
        <h4 className="font-semibold text-emerald-800 mb-2 flex items-center gap-2">
          <span>🔍</span>
          Trazabilidad
        </h4>
        <div className="text-sm text-emerald-700">
          <div>
            Promedio de trazabilidad:{' '}
            <span className="font-bold">{Math.round(data.traceabilityAverage * 100)}%</span>
          </div>
          <div className="mt-1 text-xs text-emerald-600">
            Productos con cadena completa disponible
          </div>
        </div>
      </div>

      {/* Empty State */}
      {data.purchases.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🛍️</div>
          <p className="text-slate-700 font-medium">No tienes compras aún</p>
          <p className="text-slate-500 text-sm mt-1">
            Tus compras aparecerán aquí una vez que realices transacciones
          </p>
        </div>
      )}
    </div>
  );
}
