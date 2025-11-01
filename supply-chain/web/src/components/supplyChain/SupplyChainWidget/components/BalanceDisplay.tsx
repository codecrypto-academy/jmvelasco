import { useMemo } from 'react';
import type { BalanceState } from '../../../../types/supplyChainWidget';

// =====================================================================================
// TYPE DEFINITIONS
// =====================================================================================

interface BalanceDisplayProps {
  readonly balance: BalanceState;
  readonly className?: string;
  readonly compact?: boolean;
  readonly showMetadata?: boolean;
}

interface BalanceItemProps {
  readonly label: string;
  readonly value: bigint;
  readonly icon: string;
  readonly colorScheme: 'available' | 'available-zero' | 'pending-out' | 'pending-in' | 'total';
  readonly compact?: boolean;
}

// =====================================================================================
// CONFIGURATION CONSTANTS
// =====================================================================================

const COLOR_SCHEMES = {
  available: {
    text: 'text-emerald-700',
    background: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: 'text-emerald-600',
  },
  'available-zero': {
    text: 'text-red-700',
    background: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600',
  },
  'pending-out': {
    text: 'text-amber-700',
    background: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-600',
  },
  'pending-in': {
    text: 'text-blue-700',
    background: 'bg-blue-50',
    border: 'border-blue-200',
    icon: 'text-blue-600',
  },
  total: {
    text: 'text-slate-800',
    background: 'bg-slate-50',
    border: 'border-slate-300',
    icon: 'text-slate-600',
  },
} as const;

const BALANCE_ICONS = {
  available: '✅',
  'available-zero': '🚫',
  'pending-out': '📤',
  'pending-in': '📥',
  total: '📊',
} as const;

// =====================================================================================
// UTILITY FUNCTIONS
// =====================================================================================

/**
 * Formats bigint values for display with proper locale formatting
 * Handles very large numbers gracefully
 */
function formatTokenAmount(amount: bigint): string {
  try {
    // Convert to number for amounts that fit in JS number range
    const numValue = Number(amount);
    if (numValue < Number.MAX_SAFE_INTEGER) {
      return numValue.toLocaleString();
    }
    // For very large numbers, use string representation
    return amount.toString();
  } catch {
    return amount.toString();
  }
}

/**
 * Calculates percentage of total for visual indicators
 * Returns 0 if total is 0 to avoid division by zero
 */
function calculatePercentage(amount: bigint, total: bigint): number {
  if (total === 0n) return 0;
  try {
    const percentage = (Number(amount) / Number(total)) * 100;
    return Math.min(100, Math.max(0, percentage));
  } catch {
    return 0;
  }
}

/**
 * Determines if balance has any activity (pending transfers)
 */
function hasBalanceActivity(balance: BalanceState): boolean {
  return balance.pendingOutgoing > 0n || balance.pendingIncoming > 0n;
}

// =====================================================================================
// SUB-COMPONENTS
// =====================================================================================

/**
 * Individual balance item with icon and value
 */
function BalanceItem({ label, value, icon, colorScheme, compact }: BalanceItemProps) {
  const colors = COLOR_SCHEMES[colorScheme];
  const formattedValue = formatTokenAmount(value);

  if (compact) {
    return (
      <div className="flex items-center justify-between">
        <span className={`text-sm ${colors.text} flex items-center gap-1`}>
          <span className={colors.icon}>{icon}</span>
          {label}:
        </span>
        <span className={`font-semibold text-sm ${colors.text}`}>{formattedValue}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between p-2 rounded-lg ${colors.background} ${colors.border} border`}
    >
      <div className="flex items-center gap-2">
        <span className={`text-lg ${colors.icon}`}>{icon}</span>
        <span className={`font-medium ${colors.text}`}>{label}</span>
      </div>
      <span className={`font-bold ${colors.text} text-right`}>{formattedValue}</span>
    </div>
  );
}

/**
 * Progress bar showing balance distribution
 */
function BalanceProgressBar({ balance }: { readonly balance: BalanceState }) {
  const totalBalance = balance.totalBalance;

  const percentages = useMemo(() => {
    if (totalBalance === 0n) {
      return { available: 0, pendingOut: 0, pendingIn: 0 };
    }

    return {
      available: calculatePercentage(balance.availableBalance, totalBalance),
      pendingOut: calculatePercentage(balance.pendingOutgoing, totalBalance),
      pendingIn: calculatePercentage(balance.pendingIncoming, totalBalance),
    };
  }, [balance, totalBalance]);

  // Don't show progress bar if no balance
  if (totalBalance === 0n) {
    return null;
  }

  return (
    <div className="mt-3">
      <div className="flex text-xs text-slate-600 mb-1 justify-between">
        <span>Distribution</span>
        <span>100%</span>
      </div>
      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
        <div className="flex h-full">
          {/* Available balance */}
          <div
            className="bg-emerald-500 transition-all duration-300"
            style={{ width: `${percentages.available}%` }}
            title={`Available: ${formatTokenAmount(balance.availableBalance)} (${percentages.available.toFixed(1)}%)`}
          />
          {/* Pending outgoing */}
          <div
            className="bg-amber-500 transition-all duration-300"
            style={{ width: `${percentages.pendingOut}%` }}
            title={`Pending Out: ${formatTokenAmount(balance.pendingOutgoing)} (${percentages.pendingOut.toFixed(1)}%)`}
          />
          {/* Pending incoming would extend beyond 100%, so we show it separately if needed */}
        </div>
      </div>
    </div>
  );
}

/**
 * Token metadata display (optional)
 */
function TokenMetadata({ balance }: { readonly balance: BalanceState }) {
  return (
    <div className="mt-3 pt-3 border-t border-slate-200">
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
        <div>
          <span className="font-medium">Token ID:</span> #{balance.tokenId.toString()}
        </div>
        <div>
          <span className="font-medium">Type:</span>{' '}
          {balance.isRawMaterial ? 'Raw Material' : 'Processed'}
        </div>
        {balance.parentId && (
          <div className="col-span-2">
            <span className="font-medium">Parent:</span> #{balance.parentId.toString()}
          </div>
        )}
        <div className="col-span-2">
          <span className="font-medium">Owner:</span> {balance.owner.slice(0, 8)}...
          {balance.owner.slice(-6)}
        </div>
      </div>
    </div>
  );
}

// =====================================================================================
// MAIN COMPONENT
// =====================================================================================

/**
 * Main BalanceDisplay component following UX specifications
 * Displays comprehensive token balance information with visual breakdown
 */
export function BalanceDisplay({
  balance,
  className = '',
  compact = false,
  showMetadata = false,
}: BalanceDisplayProps) {
  // Memoize calculations for performance
  const balanceInsights = useMemo(() => {
    const hasActivity = hasBalanceActivity(balance);
    const isFullyCommitted = balance.availableBalance === 0n && balance.totalBalance > 0n;
    const hasIncoming = balance.pendingIncoming > 0n;

    return {
      hasActivity,
      isFullyCommitted,
      hasIncoming,
    };
  }, [balance]);

  const baseClasses = compact
    ? 'bg-white p-3 rounded-lg border border-slate-200'
    : 'bg-gradient-to-br from-slate-50 to-white p-4 rounded-xl border border-slate-200 shadow-sm';
  const isAvailableZero = balance.availableBalance === 0n;

  return (
    <div className={`${baseClasses} ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🪙</span>
          <h4 className={`font-semibold text-slate-900 ${compact ? 'text-sm' : 'text-base'}`}>
            {balance.tokenName}
          </h4>
        </div>

        {/* Activity indicator */}
        {balanceInsights.hasActivity && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-blue-700 font-medium">Active</span>
          </div>
        )}
      </div>

      {/* Balance items */}
      <div className={`space-y-2 ${compact ? 'space-y-1' : ''}`}>
        {/* Total balance */}
        <BalanceItem
          label="Total Balance"
          value={balance.totalBalance}
          icon={BALANCE_ICONS.total}
          colorScheme="total"
          compact={compact}
        />

        {/* Available balance */}
        <BalanceItem
          label="Available"
          value={balance.availableBalance}
          icon={BALANCE_ICONS[isAvailableZero ? 'available-zero' : 'available']}
          colorScheme={isAvailableZero ? 'available-zero' : 'available'}
          compact={compact}
        />

        {/* Pending outgoing (only show if > 0) */}
        {balance.pendingOutgoing > 0n && (
          <BalanceItem
            label="Pending Out"
            value={balance.pendingOutgoing}
            icon={BALANCE_ICONS['pending-out']}
            colorScheme="pending-out"
            compact={compact}
          />
        )}

        {/* Pending incoming (only show if > 0) */}
        {balance.pendingIncoming > 0n && (
          <BalanceItem
            label="Incoming"
            value={balance.pendingIncoming}
            icon={BALANCE_ICONS['pending-in']}
            colorScheme="pending-in"
            compact={compact}
          />
        )}
      </div>

      {/* Progress bar (non-compact mode only) */}
      {!compact && <BalanceProgressBar balance={balance} />}

      {/* Status messages */}
      {balanceInsights.isFullyCommitted && (
        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-amber-600">⚠️</span>
            <span className="text-sm text-amber-800 font-medium">
              Fully committed - no available balance
            </span>
          </div>
        </div>
      )}

      {balanceInsights.hasIncoming && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-blue-600">📥</span>
            <span className="text-sm text-blue-800 font-medium">
              {formatTokenAmount(balance.pendingIncoming)} units incoming
            </span>
          </div>
        </div>
      )}

      {/* Optional metadata */}
      {showMetadata && <TokenMetadata balance={balance} />}
    </div>
  );
}
