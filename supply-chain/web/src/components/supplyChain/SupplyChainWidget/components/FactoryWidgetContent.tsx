import type { FactoryWidgetData } from '../config/types';

interface FactorySectionProps {
  data: FactoryWidgetData;
}

export const FactorySection = ({ data }: FactorySectionProps) => {
  return (
    <div className="space-y-4">
      <div className="bg-green-50 p-4 rounded-lg border-l-4 border-green-400">
        <h3 className="text-lg font-bold text-green-800 mb-2">Panel Fábrica</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-green-700 font-semibold">Mat. Primas:</span>
            <div className="font-bold text-xl text-green-900">{data.rawMaterialsStock.length}</div>
          </div>
          <div>
            <span className="text-green-700 font-semibold">Productos:</span>
            <div className="font-bold text-xl text-green-900">{data.processedProducts.length}</div>
          </div>
          <div>
            <span className="text-green-700 font-semibold">Eficiencia:</span>
            <div className="font-bold text-xl text-green-900">
              {(data.processingEfficiencyRatio * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-3">Materias Primas</h4>
          <div className="space-y-2">
            {data.rawMaterialsStock.map((material) => (
              <div
                key={material.tokenId.toString()}
                className="bg-gray-50 p-3 rounded-lg border border-gray-200"
              >
                <h5 className="font-semibold text-gray-900">{material.name}</h5>
                <div className="text-sm space-y-1 text-gray-800">
                  <div>
                    Stock:{' '}
                    <span className="font-bold text-gray-900">
                      {material.currentStock.toString()}
                    </span>
                  </div>
                  <div>
                    Disponible:{' '}
                    <span className="font-bold text-green-700">
                      {material.availableForProcessing.toString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-700 font-medium">
                    Proveedor: {material.supplier.slice(0, 8)}...
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Productos Procesados</h4>
          <div className="space-y-2">
            {data.processedProducts.map((product) => (
              <div
                key={product.tokenId.toString()}
                className="bg-gray-50 p-3 rounded-lg border border-gray-200"
              >
                <h5 className="font-semibold text-gray-900">{product.name}</h5>
                <div className="text-sm space-y-1 text-gray-800">
                  <div>
                    Stock:{' '}
                    <span className="font-bold text-gray-900">
                      {product.currentStock.toString()}
                    </span>
                  </div>
                  <div>
                    Pendiente:{' '}
                    <span className="font-bold text-amber-700">
                      {product.pendingTransfers.toString()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-700 font-medium">
                    Consumió: {product.parentMaterial.amountConsumed.toString()} de{' '}
                    {product.parentMaterial.name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
