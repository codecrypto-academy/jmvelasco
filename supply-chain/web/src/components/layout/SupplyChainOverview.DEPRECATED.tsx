// import { useState } from 'react';
// import { Link } from 'react-router-dom';
// import { useSupplyChainOverview } from '../../hooks/useSupplyChainOverview';
// import { UserRole } from '../../lib/enums';

// const ROLE_COLORS: Record<UserRole, string> = {
//   [UserRole.Producer]: 'bg-green-100 text-green-800',
//   [UserRole.Factory]: 'bg-blue-100 text-blue-800',
//   [UserRole.Retailer]: 'bg-purple-100 text-purple-800',
//   [UserRole.Consumer]: 'bg-orange-100 text-orange-800',
//   [UserRole.Admin]: 'bg-gray-100 text-gray-800',
// };

// const LEVEL_ICONS = {
//   raw: '🌾',
//   processed: '🏭',
//   final: '📦',
// };

// const LEVEL_COLORS = {
//   raw: 'border-green-200 bg-green-50',
//   processed: 'border-blue-200 bg-blue-50',
//   final: 'border-purple-200 bg-purple-50',
// };

// export function SupplyChainOverview() {
//   const [isOpen, setIsOpen] = useState(false);
//   const { tokens, isLoading, error, totalTokens, totalSupply } = useSupplyChainOverview();

//   return (
//     <div className="relative">
//       {/* Trigger Button */}
//       <button
//         onClick={() => setIsOpen(!isOpen)}
//         className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer border border-gray-200"
//         aria-expanded={isOpen}
//         aria-haspopup="true"
//       >
//         <span>📊</span>
//         <span>Supply Chain</span>
//         <svg
//           className={`w-4 h-4 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}
//           fill="none"
//           stroke="currentColor"
//           viewBox="0 0 24 24"
//         >
//           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
//         </svg>
//       </button>

//       {/* Dropdown Panel */}
//       {isOpen && (
//         <div className="absolute right-0 mt-2 w-[600px] bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[80vh] overflow-y-auto">
//           {/* Header */}
//           <div className="p-4 border-b border-gray-200">
//             <div className="flex items-center justify-between">
//               <h3 className="text-lg font-semibold text-gray-900">Supply Chain Overview</h3>
//               <button
//                 onClick={() => setIsOpen(false)}
//                 className="text-gray-400 hover:text-gray-600 transition-colors"
//               >
//                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M6 18L18 6M6 6l12 12"
//                   />
//                 </svg>
//               </button>
//             </div>

//             {/* Summary Stats */}
//             <div className="mt-3 grid grid-cols-2 gap-4">
//               <div className="bg-gray-50 rounded p-3">
//                 <div className="text-sm text-gray-600">Total Tokens</div>
//                 <div className="text-xl font-semibold text-gray-900">{totalTokens}</div>
//               </div>
//               <div className="bg-gray-50 rounded p-3">
//                 <div className="text-sm text-gray-600">Total Supply</div>
//                 <div className="text-xl font-semibold text-gray-900">
//                   {totalSupply.toLocaleString()}
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Content */}
//           <div className="p-4">
//             {isLoading && (
//               <div className="text-center py-8">
//                 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
//                 <p className="text-gray-600">Loading supply chain data...</p>
//               </div>
//             )}

//             {error && (
//               <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
//                 <p className="text-red-800">{error}</p>
//               </div>
//             )}

//             {!isLoading && !error && tokens.length === 0 && (
//               <div className="text-center py-8">
//                 <div className="text-gray-600 text-4xl mb-3">📦</div>
//                 <p className="text-gray-700 font-medium">No tokens found in the supply chain.</p>
//               </div>
//             )}

//             {!isLoading && !error && tokens.length > 0 && (
//               <div className="space-y-4">
//                 {tokens.map((token) => (
//                   <div
//                     key={token.id}
//                     className={`border rounded-lg p-4 ${LEVEL_COLORS[token.level]}`}
//                   >
//                     {/* Token Header */}
//                     <div className="flex items-start justify-between mb-3">
//                       <div className="flex items-center space-x-2">
//                         <span className="text-2xl">{LEVEL_ICONS[token.level]}</span>
//                         <div>
//                           <h4 className="font-semibold text-gray-900">{token.name}</h4>
//                           <p className="text-sm text-gray-700 font-medium">
//                             Token #{token.id} • {token.level} • Supply:{' '}
//                             {token.totalSupply.toLocaleString()}
//                             {token.processedAmount > 0 && (
//                               <span className="text-orange-700">
//                                 • Processed: {token.processedAmount.toLocaleString()}
//                               </span>
//                             )}
//                           </p>
//                         </div>
//                       </div>

//                       {token.parentId > 0 && (
//                         <span className="text-xs text-gray-700 bg-white px-2 py-1 rounded border border-gray-200 font-medium">
//                           From Token #{token.parentId}
//                         </span>
//                       )}
//                     </div>

//                     {/* Balance Distribution */}
//                     {token.balances.length > 0 ? (
//                       <div className="space-y-2">
//                         <div className="text-sm font-medium text-gray-700 mb-2">
//                           Balance Distribution:
//                         </div>
//                         {token.balances.map((balance, index) => (
//                           <div
//                             key={index}
//                             className="flex items-center justify-between bg-white rounded px-3 py-2"
//                           >
//                             <div className="flex items-center space-x-2">
//                               <span
//                                 className={`inline-block px-2 py-1 rounded text-xs font-medium ${ROLE_COLORS[balance.role]}`}
//                               >
//                                 {balance.role}
//                               </span>
//                               <code className="text-xs bg-gray-800 text-gray-100 px-1 rounded font-medium">
//                                 {balance.address.slice(0, 6)}...{balance.address.slice(-4)}
//                               </code>
//                             </div>
//                             <div className="flex items-center space-x-2">
//                               <span className="font-medium">
//                                 {balance.balance.toLocaleString()}
//                               </span>
//                               <span className="text-sm text-gray-700 font-medium">
//                                 ({balance.percentage.toFixed(1)}%)
//                               </span>
//                             </div>
//                           </div>
//                         ))}
//                       </div>
//                     ) : (
//                       <div className="bg-white rounded px-3 py-2 text-center text-gray-700 text-sm font-medium border border-gray-200">
//                         No active balances
//                       </div>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>

//           {/* Footer */}
//           <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
//             <div className="flex items-center justify-between text-sm text-gray-700 mb-3">
//               <div className="flex items-center space-x-4">
//                 <div className="flex items-center space-x-1 font-medium">
//                   <span>🌾</span>
//                   <span>Raw Materials</span>
//                 </div>
//                 <div className="flex items-center space-x-1 font-medium">
//                   <span>🏭</span>
//                   <span>Processed</span>
//                 </div>
//                 <div className="flex items-center space-x-1 font-medium">
//                   <span>📦</span>
//                   <span>Final Products</span>
//                 </div>
//               </div>
//               <div className="text-right">
//                 <div>Auto-refreshes every 5s</div>
//               </div>
//             </div>
//             {/* CTA for detailed analysis */}
//             <div className="flex justify-center">
//               <Link
//                 to="/supply-chain-dashboard"
//                 onClick={() => setIsOpen(false)}
//                 className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
//               >
//                 <span>📊</span>
//                 <span>Ver Análisis Detallado</span>
//                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     strokeWidth={2}
//                     d="M13 7l5 5m0 0l-5 5m5-5H6"
//                   />
//                 </svg>
//               </Link>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Backdrop */}
//       {isOpen && (
//         <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />
//       )}
//     </div>
//   );
// }
