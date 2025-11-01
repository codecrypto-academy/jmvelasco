import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '../../hooks/useWallet';
import { useUserInfo } from '../../hooks/useUserInfo';
import { RoleBadge } from '../supplyChain/SupplyChainWidget/components/RoleBadge';

function shortAddress(addr: string) {
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

function formatBalance(balance: string): string {
  const num = parseFloat(balance);
  if (num === 0) return '0.00';
  if (num < 0.001) return '< 0.001';
  if (num < 1) return num.toFixed(4);
  if (num < 100) return num.toFixed(3);
  return num.toFixed(2);
}

export function WalletConnect() {
  const { address, isConnected, networkName, connect, getBalance } = useWallet();
  const { userInfo } = useUserInfo(address);
  const [balance, setBalance] = useState<string>('0.0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const onConnect = useCallback(async () => {
    await connect();
  }, [connect]);

  // Fetch balance when connected
  useEffect(() => {
    if (isConnected && address && getBalance) {
      setIsLoadingBalance(true);
      getBalance(address)
        .then((bal) => setBalance(bal))
        .catch(() => setBalance('0.0'))
        .finally(() => setIsLoadingBalance(false));
    } else {
      setBalance('0.0');
      setIsLoadingBalance(false);
    }
  }, [isConnected, address, getBalance]);

  if (!isConnected) {
    return (
      <button
        onClick={onConnect}
        className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 text-sm font-medium shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105"
      >
        <span className="flex items-center gap-2">
          <span>🔗</span>
          Connect Wallet
        </span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      {/* Network Badge - Cyber Theme */}
      <span className="px-3 py-1.5 bg-gradient-to-r from-slate-100 to-zinc-100 text-slate-800 border border-slate-300 rounded-lg font-medium shadow-sm">
        <span className="text-xs">⚡</span> {networkName ?? 'Unknown'}
      </span>

      {/* Balance Display - Electric Blue Theme */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-300 rounded-lg shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="text-cyan-700 font-medium">Balance:</span>
        </div>
        {isLoadingBalance ? (
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 border-2 border-cyan-300 border-t-cyan-600 rounded-full animate-spin"></div>
            <span className="text-cyan-700 font-mono text-xs">Loading...</span>
          </div>
        ) : (
          <span className="font-mono font-semibold text-cyan-800 bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
            {formatBalance(balance)} ETH
          </span>
        )}
      </div>

      {/* Address Display - Dark Tech Theme */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-slate-100 to-gray-100 border border-slate-300 rounded-lg shadow-sm">
        <span className="font-mono text-slate-700 font-medium">
          {address ? shortAddress(address) : ''}
        </span>
      </div>

      {/* Role Badge */}
      {userInfo?.role && <RoleBadge role={userInfo.role} size="sm" />}
    </div>
  );
}
