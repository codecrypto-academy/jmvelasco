import { useEffect, useState } from 'react';
import { GoToDashboard } from '../ui/GoToDashboard';
import { useUserInfo } from '../../hooks/useUserInfo';
import { useWallet } from '../../hooks/useWallet';
import { changeStatusUser, getUsers, type Users } from '../../lib/contract';
import { UserRole, UserStatus } from '../../lib/enums';
import ActionCard from '../ui/ActionCard';

export function UserManagement() {
  const { address } = useWallet();
  const { userInfo } = useUserInfo(address);
  const isAdmin = userInfo?.role === 'Admin';

  const [users, setUsers] = useState<Users[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await getUsers();
      setUsers(list);
    } catch (error) {
      console.error(error);
      setError('Error cargando usuarios pendientes');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (targetAddress: string) => {
    setLoading(true);
    setError(null);
    try {
      await changeStatusUser(targetAddress, UserStatus.Approved);
      await fetchRows();
    } catch (error) {
      console.error(error);
      setError('Error al actualizar estado');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (targetAddress: string) => {
    setLoading(true);
    setError(null);
    try {
      await changeStatusUser(targetAddress, UserStatus.Rejected);
      await fetchRows();
    } catch (error) {
      console.error(error);
      setError('Error al actualizar estado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchRows();
  }, [isAdmin]); // fetchRows is stable, no need to include

  if (!isAdmin) {
    return (
      <section>
        <h2 className="text-2xl font-semibold">Users</h2>
        <p className="mt-2 text-gray-600">Acceso restringido a administradores.</p>
        <GoToDashboard />
      </section>
    );
  }

  const nonAdminUsers = users.filter((u) => u.role !== UserRole.Admin);
  return (
    <ActionCard
      title="User Management"
      description="User management and status control."
      icon={'👥'}
    >
      <div className="mt-6 max-w-4xl">
        {loading && <p className="text-gray-500">Loading…</p>}
        {!loading && users.length === 0 && <p className="text-gray-500">No users found.</p>}
        {!loading && users.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                    Address
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Role</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                    Status
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {nonAdminUsers.map((r) => (
                  <tr key={r.address}>
                    <td className="px-4 py-2 text-gray-600 font-mono text-xs break-all">
                      {r.address}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{r.role ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-600">{r.status ?? '—'}</td>
                    <td className="px-4 py-2 text-gray-600">
                      <div className="flex gap-2">
                        <button
                          className="px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded disabled:opacity-50 cursor-pointer"
                          onClick={() => handleApprove(r.address)}
                          disabled={loading || r.status === UserStatus.Approved}
                        >
                          Approve
                        </button>
                        <button
                          className="px-2 py-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded disabled:opacity-50 cursor-pointer"
                          onClick={() => handleReject(r.address)}
                          disabled={loading || r.status === UserStatus.Rejected}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}
      </div>
    </ActionCard>
  );
}
