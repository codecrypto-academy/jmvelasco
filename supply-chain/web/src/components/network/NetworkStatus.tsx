import { useWallet } from '../../hooks/useWallet';

export function NetworkStatus() {
  const { chainId, networkName } = useWallet();
  return (
    <span className="text-xs text-gray-600">
      {networkName ?? 'Unknown'} {chainId ? `(chainId: ${chainId})` : ''}
    </span>
  );
}
