import React from 'react';
import type { TokenLineage, TimelineEntry } from '../../types/traceability';
import { LineageNode } from './LineageNode';

interface TimelineViewProps {
  lineage: TokenLineage[];
  timeline: TimelineEntry[];
  tokenId: number;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ lineage, timeline }) => {
  const timelineData = timeline || [];
  const lineageData = lineage || [];

  return (
    <div data-testid="timeline-view" className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Product Journey Timeline</h3>
        <div className="space-y-4">
          {timelineData.map((entry, index) => (
            <LineageNode key={index} entry={entry} />
          ))}
        </div>
      </div>

      {lineageData.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Supply Chain Lineage</h3>
          <div className="space-y-2">
            {lineageData.map((token) => (
              <div
                key={token.tokenId}
                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md"
              >
                <span className="font-mono text-sm">#{token.tokenId}</span>
                <span className="flex-1">{token.name}</span>
                <span className="text-sm text-gray-600">{token.creatorRole}</span>
                <span className="text-xs text-gray-500">
                  Balance: {token.currentBalance}/{token.totalSupply}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
