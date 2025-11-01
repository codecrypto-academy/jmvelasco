import { useEffect, useState } from 'react';
import { UserManagement } from '../components/admin/UserManagement';
import { AdminTokensOverview } from '../components/admin/AdminTokensOverview';
import { AdminConservationAudit } from '../components/admin/AdminConservationAudit';
import { AdminTransfersHistory } from '../components/admin/AdminTransfersHistory';
import IncomingTransfers from '../components/tokenOps/IncomingTransfers';
import MyTokens from '../components/tokenOps/MyTokens';
import OutgoingTransfers from '../components/tokenOps/OutgoingTransfers';
import { RoleActions } from '../components/tokenOps/RoleActions';
import { TraceabilityModal } from '../components/traceability/TraceabilityModal';
import Spinner from '../components/ui/Spiner';
import { useUserInfo } from '../hooks/useUserInfo';
import { useWallet } from '../hooks/useWallet';
import { useAdminSupplyChain } from '../hooks/useAdminSupplyChain';
import { UserRole, UserStatus } from '../lib/enums';

export default function Dashboard() {
  const { address, isConnected } = useWallet();
  const { userInfo, loading, error } = useUserInfo(isConnected ? address : null);

  // Admin supply chain data (always called to comply with Rules of Hooks)
  const isAdmin = userInfo?.role === UserRole.Admin;
  const {
    data: adminData,
    isLoading: adminLoading,
    error: adminError,
  } = useAdminSupplyChain(isAdmin);

  // State for TraceabilityModal (Consumer-only)
  const [isTraceabilityModalOpen, setIsTraceabilityModalOpen] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);

  // Handler for opening traceability modal (Consumer-only)
  const handleOpenTraceability = (tokenId: number) => {
    if (role === UserRole.Consumer) {
      setSelectedTokenId(tokenId);
      setIsTraceabilityModalOpen(true);
    }
  };

  // Handler for closing traceability modal
  const handleCloseTraceability = () => {
    setIsTraceabilityModalOpen(false);
    setSelectedTokenId(null);
  };

  // Redirect to home if not connected
  useEffect(() => {
    if (!isConnected) {
      window.location.href = '/';
    }
  }, [isConnected]);

  if (!isConnected) {
    return null; // Will redirect, so render nothing
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Spinner />
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error loading dashboard: {error}</p>
      </div>
    );
  }

  // No role assigned
  if (!userInfo || !userInfo.role) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No role assigned. Please request a role from the home page.</p>
      </div>
    );
  }

  // User not approved - redirect to home
  if (userInfo.status !== UserStatus.Approved) {
    return (
      <div className="text-center py-8">
        <p className="text-yellow-600 mb-4">
          Your account is not approved yet. Please wait for admin approval.
        </p>
        <p className="text-sm text-gray-500">Status: {userInfo.status || 'Unknown'}</p>
        <button
          onClick={() => (window.location.href = '/')}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
        >
          Return to Home
        </button>
      </div>
    );
  }

  const role = userInfo.role;

  // Helper function to get role-specific section titles
  const getSectionTitle = (role: UserRole): string => {
    switch (role) {
      case UserRole.Producer:
        return 'Raw Materials';
      case UserRole.Factory:
        return 'Production';
      case UserRole.Retailer:
        return 'Inventory';
      case UserRole.Consumer:
        return 'Products';
      default:
        return 'Assets'; // fallback
    }
  };

  // Admin Dashboard: User management + Supply Chain Audit
  if (role === UserRole.Admin) {
    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-blue-200">Admin Dashboard</h1>

        {/* User Management Section */}
        <section>
          <UserManagement />
        </section>

        {/* Supply Chain Audit Section */}
        <section className="space-y-6">
          <div className="border-t border-gray-300 pt-6">
            <h2 className="text-2xl font-semibold text-blue-300 mb-6">Auditoría de Supply Chain</h2>

            {/* Token Status by User */}
            <AdminTokensOverview
              tokenRows={adminData?.tokenRows || []}
              isLoading={adminLoading}
              error={adminError}
            />

            {/* Conservation Audit */}
            <AdminConservationAudit
              conservationRows={adminData?.conservationRows || []}
              isLoading={adminLoading}
              error={adminError}
            />

            {/* Transfer History */}
            <AdminTransfersHistory
              transferRows={adminData?.transferRows || []}
              isLoading={adminLoading}
              error={adminError}
            />
          </div>
        </section>
      </div>
    );
  }

  // Consumer Dashboard: Only transfers and products with traceability
  if (role === UserRole.Consumer) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-blue-200">Consumer Dashboard</h1>

        <section>
          <IncomingTransfers />
        </section>

        <section>
          <h2 className="text-xl font-semibold text-blue-400 mb-4">{getSectionTitle(role)}</h2>
          {address ? (
            <MyTokens
              userAddress={address}
              onTokenClick={handleOpenTraceability}
              isClickable={true}
            />
          ) : (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <p className="text-gray-500">Connect your wallet to see your products.</p>
            </div>
          )}
        </section>

        {/* TraceabilityModal for Consumer */}
        {selectedTokenId && (
          <TraceabilityModal
            isOpen={isTraceabilityModalOpen}
            onClose={handleCloseTraceability}
            tokenId={selectedTokenId}
          />
        )}
      </div>
    );
  }

  // Producer/Factory/Retailer Dashboard: Actions, Tokens, and Transfers
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-blue-200">{role} Dashboard</h1>

      {/* Quick Actions */}
      <section>
        <RoleActions role={role} />
      </section>

      {/* My Tokens Section */}
      <section>
        <h2 className="text-xl font-semibold text-blue-400 mb-4">{getSectionTitle(role)}</h2>
        {address ? (
          <MyTokens userAddress={address} />
        ) : (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <p className="text-gray-500">Connect your wallet to see your tokens.</p>
          </div>
        )}
      </section>

      {/* Transfers Section */}
      <section className="space-y-6">
        {role === UserRole.Producer ? (
          <OutgoingTransfers showAllStatuses={true} />
        ) : (
          <>
            <IncomingTransfers />
            <OutgoingTransfers showAllStatuses={true} />
          </>
        )}
      </section>
    </div>
  );
}
