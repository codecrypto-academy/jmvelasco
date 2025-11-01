import { useEffect, useState } from 'react';
import type { UserInfo } from '../lib/contract';
import { getUserInfo } from '../lib/contract';

export function useUserInfo(address: string | null) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserInfo = async () => {
    if (!address) {
      setUserInfo(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const info = await getUserInfo(address);
      setUserInfo(info);
    } catch {
      setError('Error loading user info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  return { userInfo, loading, error, refetch: fetchUserInfo };
}
