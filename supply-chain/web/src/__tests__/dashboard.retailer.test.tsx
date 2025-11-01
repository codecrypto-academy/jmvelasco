import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Dashboard from '../pages/Dashboard';

// Mock hooks
vi.mock('../hooks/useWallet');
vi.mock('../hooks/useUserInfo');

import { useUserInfo } from '../hooks/useUserInfo';
import type { UseWalletReturn } from '../hooks/useWallet';
import { useWallet } from '../hooks/useWallet';
import { UserRole, UserStatus } from '../lib/enums';

function createMockWalletState(overrides?: Partial<UseWalletReturn>): UseWalletReturn {
  return {
    address: '0x123',
    isConnected: true,
    chainId: 31337,
    networkName: 'anvil',
    connect: vi.fn(),
    getBalance: vi.fn(),
    switchNetwork: vi.fn(),
    getCurrentNetwork: vi.fn(),
    ...overrides,
  };
}

describe('Dashboard - Retailer role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Retailer dashboard with correct ActionCards and sections', async () => {
    vi.mocked(useWallet).mockReturnValue(createMockWalletState());
    vi.mocked(useUserInfo).mockReturnValue({
      userInfo: { role: UserRole.Retailer, status: UserStatus.Approved },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<Dashboard />);

    // Check for Retailer dashboard heading
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /retailer dashboard/i })).toBeInTheDocument();
    });

    // Check for ActionCards by title
    expect(screen.getByText('Package Products')).toBeInTheDocument();
    expect(screen.getByText('Create retail packages from received products')).toBeInTheDocument();
    expect(screen.getByText('Transfer to Consumer')).toBeInTheDocument();
    expect(screen.getByText('Sell products to end consumers')).toBeInTheDocument();

    // Check for Inventory section (Retailer role)
    expect(screen.getByText(/inventory/i)).toBeInTheDocument();

    // Check for Outgoing Transfers section
    expect(screen.getByRole('heading', { name: /incoming transfers/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /outgoing transfers/i })).toBeInTheDocument();
  });
});
