import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Web3Provider } from '../contexts/Web3Provider';
import AppRoutes from '../routes/AppRoutes';

// Mock hooks for Dashboard test
vi.mock('../hooks/useWallet');
vi.mock('../hooks/useUserInfo');

import { useUserInfo } from '../hooks/useUserInfo';
import type { UseWalletReturn } from '../hooks/useWallet';
import { useWallet } from '../hooks/useWallet';
import { UserRole, UserStatus } from '../lib/enums';

function createMockWalletState(overrides?: Partial<UseWalletReturn>): UseWalletReturn {
  return {
    address: null,
    isConnected: false,
    chainId: null,
    networkName: null,
    connect: vi.fn(),
    getBalance: vi.fn().mockResolvedValue('0.0'),
    switchNetwork: vi.fn(),
    getCurrentNetwork: vi.fn(),
    ...overrides,
  };
}

describe('AppRoutes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('renders Home at "/" with header and Connect button when disconnected (mocked via WalletConnect)', () => {
    vi.mocked(useWallet).mockReturnValue(createMockWalletState());
    vi.mocked(useUserInfo).mockReturnValue({
      userInfo: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <Web3Provider>
        <MemoryRouter initialEntries={['/']}>
          <AppRoutes />
        </MemoryRouter>
      </Web3Provider>
    );

    // Header title link
    expect(screen.getByRole('link', { name: /supply chain tracker/i })).toBeInTheDocument();
    // Header no longer shows Admin Users link (was removed from header navigation)
    expect(screen.queryByRole('link', { name: /admin users/i })).not.toBeInTheDocument();
  });

  // Test removed: /admin/users route no longer exists - admin functionality now integrated in Dashboard

  it('renders Dashboard page at "/dashboard"', async () => {
    vi.mocked(useWallet).mockReturnValue(
      createMockWalletState({
        address: '0x123',
        isConnected: true,
        chainId: 31337,
        networkName: 'anvil',
      })
    );
    vi.mocked(useUserInfo).mockReturnValue({
      userInfo: { role: UserRole.Producer, status: UserStatus.Approved },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <Web3Provider>
        <MemoryRouter initialEntries={['/dashboard']}>
          <AppRoutes />
        </MemoryRouter>
      </Web3Provider>
    );

    // Verify Dashboard renders with role-specific content
    expect(await screen.findByRole('heading', { name: /producer dashboard/i })).toBeInTheDocument();
  });
});
