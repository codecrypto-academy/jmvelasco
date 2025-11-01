import { useState } from 'react';
import { GoToDashboard } from '../components/ui/GoToDashboard';
import Spinner from '../components/ui/Spiner';
import { useUserInfo } from '../hooks/useUserInfo';
import { useWallet } from '../hooks/useWallet';
import { requestUserRole } from '../lib/contract';
import { ROLES, STATUS_LABELS, UserRole, UserStatus } from '../lib/enums';

function isValidStatus(status: unknown): status is UserStatus {
  return Object.values(UserStatus).includes(status as UserStatus);
}

export default function Home() {
  const { address, isConnected } = useWallet();
  const { userInfo, loading, error, refetch } = useUserInfo(isConnected ? address : null);
  const [selectedRole, setSelectedRole] = useState<UserRole>(ROLES[0].value);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const handleRequestRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    setSubmitLoading(true);
    setSubmitError(null);
    try {
      await requestUserRole(address, selectedRole);
      await refetch();
    } catch (error) {
      console.error(error);
      setSubmitError('Error requesting role');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200">
        <div className="max-w-xl w-full mx-auto p-8 rounded-2xl shadow-lg bg-white/90 text-center">
          <h1 className="text-4xl font-extrabold text-blue-700 mb-4">
            Welcome to Supply Chain Tracker
          </h1>
          <p className="text-lg text-gray-700 mb-6">
            Track, verify, and manage products transparently across the entire supply chain. Connect
            your wallet to get started.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <Spinner />;
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="max-w-xl w-full mx-auto p-8 rounded-2xl shadow-lg bg-white/90 text-center">
          <p className="text-red-600 text-lg">Error: {error}</p>
        </div>
      </div>
    );
  }

  // Not registered: show role request dropdown
  if (!userInfo || !userInfo.role) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200">
        <div className="max-w-xl w-full mx-auto p-8 rounded-2xl shadow-lg bg-white/90 text-center">
          <h1 className="text-3xl font-bold text-blue-700 mb-4">Register your role</h1>
          <p className="text-gray-700 mb-6">
            Select your role in the supply chain to begin. This helps us tailor your dashboard and
            permissions.
          </p>
          <form onSubmit={handleRequestRole} className="flex flex-col items-center gap-4">
            <label htmlFor="role" className="block text-gray-700 font-medium">
              Choose your role
            </label>
            <select
              id="role"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              className="border border-gray-300 rounded px-4 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Select Role"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value} className="bg-white text-gray-900">
                  {r.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="w-full px-6 py-3 bg-green-600 text-white font-bold rounded-lg shadow hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              disabled={submitLoading}
            >
              {submitLoading ? 'Requesting...' : 'Request Role'}
            </button>
            {submitError && <p className="text-red-600 mt-2">{submitError}</p>}
          </form>
        </div>
      </div>
    );
  }

  // Registered and approved: show info and CTA with improved contrast and creative badges
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200">
      <div className="max-w-xl w-full mx-auto p-8 rounded-2xl shadow-lg bg-white/90 text-center">
        <h1 className="text-3xl font-bold text-blue-700 mb-4">Welcome back!</h1>
        <p className="text-lg text-gray-700 mb-2">Your account is registered and approved.</p>
        <div className="mb-4 flex flex-col items-center gap-2">
          <span className="font-semibold text-gray-800">Role:</span>
          <span
            className={`inline-flex items-center px-4 py-1 rounded-full text-base font-bold shadow-md border-2
              ${userInfo.role === 'Producer' ? 'bg-yellow-100 border-yellow-400 text-yellow-900' : ''}
              ${userInfo.role === 'Factory' ? 'bg-purple-100 border-purple-400 text-purple-900' : ''}
              ${userInfo.role === 'Retailer' ? 'bg-green-100 border-green-400 text-green-900' : ''}
              ${userInfo.role === 'Consumer' ? 'bg-blue-100 border-blue-400 text-blue-900' : ''}
              ${userInfo.role === 'Admin' ? 'bg-gray-200 border-gray-400 text-gray-900' : ''}
            `}
            aria-label={`Role: ${userInfo.role}`}
          >
            {userInfo.role}
            {userInfo.role === 'Producer' && <span className="ml-2">🌾</span>}
            {userInfo.role === 'Factory' && <span className="ml-2">🏭</span>}
            {userInfo.role === 'Retailer' && <span className="ml-2">🛒</span>}
            {userInfo.role === 'Consumer' && <span className="ml-2">👤</span>}
            {userInfo.role === 'Admin' && <span className="ml-2">🛡️</span>}
          </span>
        </div>
        <div className="mb-6 flex flex-col items-center gap-2">
          <span className="font-semibold text-gray-800">Status:</span>
          <span
            className={`inline-flex items-center px-4 py-1 rounded-full text-base font-semibold shadow border-2
              ${userInfo.status === 'Approved' ? 'bg-green-100 border-green-400 text-green-900' : ''}
              ${userInfo.status === 'Pending' ? 'bg-yellow-100 border-yellow-400 text-yellow-900' : ''}
              ${userInfo.status === 'Rejected' ? 'bg-red-100 border-red-400 text-red-900' : ''}
            `}
            aria-label={`Status: ${userInfo.status}`}
          >
            {isValidStatus(userInfo.status) ? STATUS_LABELS[userInfo.status] : 'Unknown'}
            {userInfo.status === 'Approved' && <span className="ml-2">✅</span>}
            {userInfo.status === 'Pending' && <span className="ml-2">⏳</span>}
            {userInfo.status === 'Rejected' && <span className="ml-2">❌</span>}
          </span>
        </div>
        <GoToDashboard className="w-full px-6 py-3 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 transition">
          Go to Dashboard
        </GoToDashboard>
      </div>
    </div>
  );
}
