import React from 'react';
import type { TimelineEntry } from '../../types/traceability';

interface LineageNodeProps {
  entry: TimelineEntry;
}

export const LineageNode: React.FC<LineageNodeProps> = ({ entry }) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="border-l-4 border-blue-500 pl-4 py-3 mb-4">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs text-gray-500 font-mono">{formatDate(entry.timestamp)}</span>
      </div>

      {entry.type === 'creation' && <CreationEvent entry={entry} formatAddress={formatAddress} />}

      {entry.type === 'transfer' && <TransferEvent entry={entry} formatAddress={formatAddress} />}

      {entry.type === 'transformation' && (
        <TransformationEvent entry={entry} formatAddress={formatAddress} />
      )}
    </div>
  );
};

interface EventProps {
  entry: TimelineEntry;
  formatAddress: (address: string) => string;
}

const CreationEvent: React.FC<EventProps> = ({ entry, formatAddress }) => (
  <div data-testid="creation-event">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-lg">🌱</span>
      <span className="font-medium text-gray-900">Created as "{entry.tokenInfo.name}"</span>
    </div>
    <div className="text-sm text-gray-600 space-y-1">
      <div className="flex items-center gap-2">
        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
          {entry.tokenInfo.creatorRole}
        </span>
        <span className="font-mono">{formatAddress(entry.tokenInfo.creator)}</span>
      </div>
      <div className="text-xs text-gray-500">
        Initial Stock: {entry.tokenInfo.totalSupply} units
      </div>
    </div>
  </div>
);

const TransferEvent: React.FC<EventProps> = ({ entry, formatAddress }) => (
  <div data-testid="transfer-event">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-lg">📦</span>
      <span className="font-medium text-gray-900">Transferred to {entry.transferInfo?.toRole}</span>
    </div>
    {entry.transferInfo && (
      <div className="text-sm text-gray-600 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {entry.transferInfo.fromRole}
            </span>
            <span className="font-mono">{formatAddress(entry.transferInfo.from)}</span>
          </div>
          <span className="text-gray-400">→</span>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
              {entry.transferInfo.toRole}
            </span>
            <span className="font-mono">{formatAddress(entry.transferInfo.to)}</span>
          </div>
        </div>
        <div className="flex justify-between text-xs">
          <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded">
            {entry.transferInfo.amount} units of{' '}
            {entry.transferInfo.tokenName || entry.tokenInfo.name} transferred
          </span>
          <span className="text-gray-500">Remaining: {entry.tokenInfo.currentBalance} units</span>
        </div>
      </div>
    )}
  </div>
);

const TransformationEvent: React.FC<EventProps> = ({ entry }) => (
  <div data-testid="transformation-event">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-lg">⚙️</span>
      <span className="font-medium text-gray-900">Processed into "{entry.tokenInfo.name}"</span>
    </div>
    {entry.parentToken && entry.stockConsumption && (
      <div className="text-sm text-gray-600 space-y-2">
        <div className="flex items-center justify-center gap-3 py-2">
          <div className="text-center">
            <div className="font-medium text-gray-700">
              {entry.parentToken.name} (#{entry.parentToken.tokenId})
            </div>
            <div className="text-xs text-gray-500">Source Material</div>
          </div>
          <span className="text-2xl text-gray-400">⚙️</span>
          <div className="text-center">
            <div className="font-medium text-gray-700">
              {entry.tokenInfo.name} (#{entry.tokenInfo.tokenId})
            </div>
            <div className="text-xs text-gray-500">Processed Product</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="bg-red-50 p-2 rounded">
            <span className="text-red-700 font-medium">Consumed:</span>
            <br />
            {entry.stockConsumption.consumedAmount} units
          </div>
          <div className="bg-green-50 p-2 rounded">
            <span className="text-green-700 font-medium">Produced:</span>
            <br />
            {entry.stockConsumption.producedAmount} units
          </div>
        </div>
      </div>
    )}
  </div>
);

export { CreationEvent, TransferEvent, TransformationEvent };
