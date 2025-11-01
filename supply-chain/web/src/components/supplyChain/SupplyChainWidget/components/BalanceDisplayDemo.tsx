/**
 * BalanceDisplay Demo Component
 *
 * Demonstrates the premium BalanceDisplay component with sample data
 * Shows all the features and variations of the balance display
 * Perfect for testing and showcasing the implementation
 *
 * @author Expert AI Developer
 * @date October 2025
 */

import { BalanceDisplay } from './BalanceDisplay';
import type { BalanceState } from '../../../../types/supplyChainWidget';
import { UserRole } from '../../../../lib/enums';

// =====================================================================================
// DEMO DATA - REALISTIC SUPPLY CHAIN SCENARIOS
// =====================================================================================

const sampleBalances: BalanceState[] = [
  // Producer's raw material token
  {
    tokenId: 1n,
    tokenName: 'Algodón Orgánico Premium',
    owner: '0x1234567890123456789012345678901234567890',
    role: UserRole.Producer,
    totalBalance: 1000n,
    availableBalance: 750n,
    pendingOutgoing: 250n,
    pendingIncoming: 0n,
    isRawMaterial: true,
    processingHistory: [],
  },

  // Factory's processed product with activity
  {
    tokenId: 2n,
    tokenName: 'Tela de Algodón Procesada',
    owner: '0x2345678901234567890123456789012345678901',
    role: UserRole.Factory,
    totalBalance: 500n,
    availableBalance: 300n,
    pendingOutgoing: 150n,
    pendingIncoming: 100n,
    parentId: 1n,
    isRawMaterial: false,
    processingHistory: [
      {
        fromTokenId: 1n,
        amountConsumed: 400n,
        timestamp: Date.now() - 86400000, // 1 day ago
        processedBy: '0x2345678901234567890123456789012345678901',
      },
    ],
  },

  // Retailer's packaged product
  {
    tokenId: 3n,
    tokenName: 'Camisetas Premium Pack x10',
    owner: '0x3456789012345678901234567890123456789012',
    role: UserRole.Retailer,
    totalBalance: 100n,
    availableBalance: 85n,
    pendingOutgoing: 15n,
    pendingIncoming: 25n,
    parentId: 2n,
    isRawMaterial: false,
    processingHistory: [
      {
        fromTokenId: 2n,
        amountConsumed: 50n,
        timestamp: Date.now() - 43200000, // 12 hours ago
        processedBy: '0x3456789012345678901234567890123456789012',
      },
    ],
  },

  // High activity token - fully committed
  {
    tokenId: 4n,
    tokenName: 'Café Premium Grano Entero',
    owner: '0x4567890123456789012345678901234567890123',
    role: UserRole.Producer,
    totalBalance: 2000n,
    availableBalance: 0n, // Fully committed!
    pendingOutgoing: 2000n,
    pendingIncoming: 0n,
    isRawMaterial: true,
    processingHistory: [],
  },

  // Token with incoming transfers
  {
    tokenId: 5n,
    tokenName: 'Leche Orgánica Pasteurizada',
    owner: '0x5678901234567890123456789012345678901234',
    role: UserRole.Factory,
    totalBalance: 800n,
    availableBalance: 600n,
    pendingOutgoing: 200n,
    pendingIncoming: 400n, // Large incoming amount
    parentId: 0n,
    isRawMaterial: true,
    processingHistory: [],
  },
];

// =====================================================================================
// DEMO COMPONENT
// =====================================================================================

export function BalanceDisplayDemo() {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            BalanceDisplay Premium - Demo Showcase
          </h1>
          <p className="text-gray-600 text-lg">
            Comprehensive token balance breakdown with real-time calculations and visual indicators
          </p>
          <div className="mt-4 bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">✨ Key Features Demonstrated:</h3>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Dynamic balance calculations (Total, Available, Pending Out/In)</li>
              <li>• Visual progress bars showing balance distribution</li>
              <li>• Status indicators for fully committed tokens</li>
              <li>• Processing history for manufactured products</li>
              <li>• Responsive design with hover effects</li>
              <li>• Zero hardcoded values - all data calculated dynamically</li>
            </ul>
          </div>
        </div>

        {/* Full Size Display Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Full Display Mode</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sampleBalances.map((balance) => (
              <BalanceDisplay
                key={balance.tokenId.toString()}
                balance={balance}
                compact={false}
                showMetadata={true}
                className="hover:shadow-lg transition-shadow duration-300"
              />
            ))}
          </div>
        </div>

        {/* Compact Mode Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Compact Display Mode</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sampleBalances.slice(0, 3).map((balance) => (
              <BalanceDisplay
                key={`compact-${balance.tokenId.toString()}`}
                balance={balance}
                compact={true}
                showMetadata={false}
                className="border-l-4 border-blue-500"
              />
            ))}
          </div>
        </div>

        {/* Special Cases Showcase */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Special Cases & Edge Scenarios
          </h2>

          {/* Fully Committed Token */}
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-800 mb-2">Fully Committed Token</h3>
            <div className="max-w-md">
              <BalanceDisplay
                balance={sampleBalances[3]} // Café Premium - fully committed
                compact={false}
                showMetadata={true}
                className="border-2 border-amber-300"
              />
            </div>
          </div>

          {/* High Incoming Activity */}
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-800 mb-2">High Incoming Activity</h3>
            <div className="max-w-md">
              <BalanceDisplay
                balance={sampleBalances[4]} // Leche Orgánica - large incoming
                compact={false}
                showMetadata={true}
                className="border-2 border-blue-300"
              />
            </div>
          </div>
        </div>

        {/* Integration Guide */}
        <div className="bg-white p-6 rounded-lg border border-gray-300 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Integration Guide</h2>
          <div className="space-y-4 text-gray-700">
            <div>
              <h4 className="font-medium text-gray-900">Basic Usage:</h4>
              <pre className="bg-gray-100 p-2 rounded text-sm mt-1">
                {`<BalanceDisplay 
  balance={balanceState}
  compact={false}
  showMetadata={true}
/>`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium text-gray-900">With Custom Hook:</h4>
              <pre className="bg-gray-100 p-2 rounded text-sm mt-1">
                {`const { balance, isLoading, error } = useBalanceCalculation({
  tokenId: BigInt(123),
  enableRealTimeUpdates: true,
  includeProcessingHistory: true
});

{balance && <BalanceDisplay balance={balance} />}`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium text-gray-900">All Balances:</h4>
              <pre className="bg-gray-100 p-2 rounded text-sm mt-1">
                {`const { balances } = useAllBalances({ enableRealTimeUpdates: true });

{balances.map(balance => (
  <BalanceDisplay key={balance.tokenId} balance={balance} />
))}`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
