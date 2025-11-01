import type { ProducerWidgetData } from '../config/types';
import { TransferPipeline } from './TransferPipeline';

interface ProducerSectionProps {
  data: ProducerWidgetData;
}

export const ProducerSection = ({ data }: ProducerSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-400">
        <h3 className="text-lg font-bold text-blue-800 mb-2">Panel Productor</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-blue-700 font-semibold">Tokens Creados:</span>
            <div className="font-bold text-xl text-blue-900">{data.tokensCreated.length}</div>
          </div>
          <div>
            <span className="text-blue-700 font-semibold">Producción Total:</span>
            <div className="font-bold text-xl text-blue-900">
              {data.totalProductionToDate.toString()}
            </div>
          </div>
          <div>
            <span className="text-blue-700 font-semibold">Transferencias Pendientes:</span>
            <div className="font-bold text-xl text-blue-900">{data.pendingTransfers.length}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold mb-3">Tokens Creados</h4>
          <div className="space-y-2">
            {data.tokensCreated.map((token) => {
              return (
                <div
                  key={token.tokenId.toString()}
                  className="bg-gray-50 p-3 rounded-lg border border-gray-200"
                >
                  <h5 className="font-semibold text-gray-900">{token.name}</h5>
                  <div className="text-sm space-y-1 text-gray-800">
                    <div>
                      Producido:{' '}
                      <span className="font-bold text-gray-900">
                        {token.totalSupply.toString()}
                      </span>
                    </div>
                    <div>
                      Disponible:{' '}
                      <span className="font-bold text-green-700">
                        {token.remainingWithProducer.toString()}
                      </span>
                    </div>
                    <div>
                      Transferido:{' '}
                      <span className="font-bold text-blue-700">
                        {token.transferredToDate.toString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <TransferPipeline
          transfers={[...data.pendingTransfers]}
          title="Transferencias Pendientes"
        />
      </div>
    </div>
  );
};
