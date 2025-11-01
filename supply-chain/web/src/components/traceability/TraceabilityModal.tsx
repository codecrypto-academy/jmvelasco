import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  getTokenLineage,
  buildTokenTimeline,
  getTokenDetails,
  type TokenDetails,
} from '../../lib/contract';
import type { TokenLineage, TimelineEntry } from '../../types/traceability';
import { TimelineView } from './TimelineView';

interface TraceabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenId: number;
}

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

interface TraceabilityData {
  lineage: TokenLineage[];
  timeline: TimelineEntry[];
}

interface ErrorState {
  message: string;
  canRetry: boolean;
}

export const TraceabilityModal: React.FC<TraceabilityModalProps> = ({
  isOpen,
  onClose,
  tokenId,
}) => {
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const [data, setData] = useState<TraceabilityData | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [tokenDetails, setTokenDetails] = useState<TokenDetails | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const loadTraceabilityData = useCallback(async () => {
    if (!isOpen || !tokenId) return;

    setLoadingState('loading');
    setError(null);

    try {
      // Get current user address for token details
      const userAddress = window.ethereum
        ? (await new (await import('ethers')).ethers.BrowserProvider(window.ethereum).getSigner())
            .address
        : '0x0000000000000000000000000000000000000000';

      const [lineage, timeline, details] = await Promise.all([
        getTokenLineage(tokenId),
        buildTokenTimeline(tokenId),
        getTokenDetails(tokenId, userAddress),
      ]);

      setData({ lineage, timeline });
      setTokenDetails(details);
      setLoadingState('success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      let canRetry = true;
      if (errorMessage.includes('Token does not exist') || errorMessage.includes('Access denied')) {
        canRetry = false;
      }

      setError({
        message: errorMessage,
        canRetry,
      });
      setLoadingState('error');
    }
  }, [isOpen, tokenId]);

  useEffect(() => {
    if (isOpen && tokenId) {
      loadTraceabilityData();
    }
  }, [isOpen, tokenId, loadTraceabilityData]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      // Disable body scroll when modal is open
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;

      // Calculate scrollbar width to prevent layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      document.addEventListener('keydown', handleKeyDown);

      // Focus management - focus the close button when modal opens
      if (closeButtonRef.current) {
        closeButtonRef.current.focus();
      }

      return () => {
        // Restore original body scroll
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  const handleRetry = () => {
    loadTraceabilityData();
  };

  if (!isOpen) {
    return null;
  }

  const isResponsive = window.innerWidth < 768;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      data-testid="modal-overlay"
      onClick={handleOverlayClick}
    >
      <div
        className={`
          relative bg-white rounded-lg shadow-xl max-h-[90vh] flex flex-col
          ${
            isResponsive
              ? 'w-full h-full m-4 mobile-responsive'
              : 'w-full max-w-6xl mx-4 desktop-responsive'
          }
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="traceability-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <h2 id="traceability-title" className="text-lg font-semibold text-gray-900">
            {tokenDetails?.name
              ? `${tokenDetails.name.toUpperCase()} - #${tokenId}`
              : `Token Traceability - #${tokenId}`}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {loadingState === 'loading' && (
            <div
              className="flex flex-col items-center justify-center py-12"
              data-testid="loading-spinner"
            >
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading traceability data...</p>
            </div>
          )}

          {loadingState === 'error' && (
            <div
              className="flex flex-col items-center justify-center py-12"
              data-testid="error-state"
            >
              <div className="text-red-600 mb-4">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {error?.message.includes('Token does not exist')
                  ? 'Token Not Found'
                  : error?.message.includes('Access denied')
                    ? 'Access Denied'
                    : 'Error Loading Data'}
              </h3>

              <p className="text-gray-600 text-center mb-4">
                {error?.message.includes('Token does not exist')
                  ? 'The requested token does not exist or has been deleted.'
                  : error?.message.includes('Access denied')
                    ? "You do not have permission to view this token's traceability."
                    : 'There was an error loading the traceability data. Please try again.'}
              </p>

              {error?.canRetry && (
                <button
                  onClick={handleRetry}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {loadingState === 'success' && data && (
            <TimelineView lineage={data.lineage} timeline={data.timeline} tokenId={tokenId} />
          )}
        </div>
      </div>
    </div>
  );
};
