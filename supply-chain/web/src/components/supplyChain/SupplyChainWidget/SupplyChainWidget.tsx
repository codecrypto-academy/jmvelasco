import { useState } from 'react';
import { useWeb3 } from '../../../contexts/Web3Provider';
import { useUserInfo } from '../../../hooks/useUserInfo';
import { UserRole } from '../../../lib/enums';
import { SupplyChainOverview } from './SupplyChainOverview';
import { BalanceSection } from './components/BalanceSection';
import { RetailerWidgetContent } from './components/RetailerWidgetContent';
import { getRoleConfig, getRoleIcon } from './config/roleConfigs';

interface SupplyChainWidgetProps {
  readonly onClose?: () => void;
}

export function SupplyChainWidget({ onClose }: SupplyChainWidgetProps) {
  const { address } = useWeb3();
  const { userInfo, loading } = useUserInfo(address);
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  // Get role configuration for dropdown content only
  const config = userInfo?.role ? getRoleConfig(userInfo.role) : null;
  // Fixed icon and color for widget button (not role-dependent)
  const widgetIcon = '🔗';

  return (
    <div className="relative">
      {/* Trigger Button - Fixed styling independent of role */}
      <button
        onClick={handleToggle}
        className="inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 bg-gradient-to-r from-slate-100 to-zinc-100 border border-slate-300 text-slate-800 hover:from-slate-200 hover:to-zinc-200"
      >
        <span>{widgetIcon}</span>
        <span>Supply Chain</span>
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <>
          {/* Invisible backdrop to close on click outside */}
          <div className="fixed inset-0 z-40" onClick={handleClose} />

          <div className="absolute right-0 mt-2 min-w-80 max-w-4xl w-max max-h-[85vh] overflow-y-auto bg-white rounded-xl shadow-2xl border border-slate-200 z-50 backdrop-blur-sm">
            {/* Header - Dynamic themed based on role */}
            <div
              className={`flex items-center justify-between p-4 border-b border-slate-200 ${config ? config.colorScheme.background : 'bg-gradient-to-r from-slate-50 to-zinc-50'} rounded-t-xl`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-xl filter drop-shadow-sm">
                  {userInfo?.role ? getRoleIcon(userInfo.role) : widgetIcon}
                </span>
                <h3
                  className={`font-bold ${config ? config.colorScheme.text.primary : 'text-slate-900'} tracking-tight`}
                >
                  {`${userInfo?.role} Overview`}
                </h3>
                <div className="w-2 h-2 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full animate-pulse"></div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/50 rounded-lg transition-all duration-200 hover:shadow-md"
              >
                <svg
                  className="w-4 h-4 text-slate-600 hover:text-slate-800"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
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
            <div className="p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="relative mx-auto mb-6 w-12 h-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-cyan-600"></div>
                    <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border-2 border-cyan-400 opacity-20"></div>
                  </div>
                  <p className="text-slate-700 font-medium tracking-wide">
                    Sincronizando blockchain...
                  </p>
                </div>
              ) : !address ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4 filter drop-shadow-md">🔗</div>
                  <p className="text-slate-700 font-semibold tracking-wide">Conecta tu wallet</p>
                  <p className="text-slate-500 text-sm mt-2">
                    Necesario para acceder al supply chain
                  </p>
                </div>
              ) : !userInfo ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4 filter drop-shadow-md">�️</div>
                  <p className="text-slate-700 font-semibold tracking-wide">
                    Usuario no registrado
                  </p>
                  <p className="text-slate-500 text-sm mt-2">Regístrate para acceder al sistema</p>
                </div>
              ) : (
                <>
                  {userInfo.role === UserRole.Consumer && (
                    <BalanceSection userRole={userInfo.role} />
                  )}
                  {userInfo.role === UserRole.Retailer && (
                    <>
                      <BalanceSection userRole={userInfo.role} />
                      <RetailerWidgetContent address={address as `0x${string}`} />
                    </>
                  )}
                  {(userInfo.role === UserRole.Producer ||
                    userInfo.role === UserRole.Factory ||
                    userInfo.role === UserRole.Admin) && <SupplyChainOverview />}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
