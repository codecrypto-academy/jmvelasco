// =====================================================================================
// TRANSFER PIPELINE DISPLAY
// =====================================================================================

import type { ActiveTransfer } from '../config/types';

interface TransferPipelineProps {
  transfers: ActiveTransfer[];
  title: string;
}

export const TransferPipeline = ({ transfers, title }: TransferPipelineProps) => {
  if (transfers.length === 0) {
    return (
      <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
        <h4 className="font-semibold text-gray-800 mb-2">{title}</h4>
        <p className="text-sm text-gray-700">Sin transferencias pendientes</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
      <h4 className="font-semibold text-gray-800 mb-2">{title}</h4>
      <div className="space-y-2">
        {transfers.map((transfer) => (
          <div
            key={transfer.transferId.toString()}
            className="bg-white p-2 rounded border border-gray-200 shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="font-medium text-gray-900">{transfer.tokenName}</span>
                <div className="text-xs text-gray-700 font-medium">
                  {transfer.fromRole} → {transfer.toRole}
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-900">{transfer.amount.toString()}</div>
                <div className="text-xs text-gray-700 font-medium">{transfer.status}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
