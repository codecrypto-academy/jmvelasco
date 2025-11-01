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

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to home if not connected', () => {
    // Mock window.location.href
    delete (window as any).location;
    (window as any).location = { href: '' };

    vi.mocked(useWallet).mockReturnValue(
      createMockWalletState({ address: null, isConnected: false })
    );
    vi.mocked(useUserInfo).mockReturnValue({
      userInfo: null,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<Dashboard />);

    // Should redirect to home
    expect(window.location.href).toBe('/');
  });

  it('shows loading state while fetching user info', () => {
    vi.mocked(useWallet).mockReturnValue(createMockWalletState());
    vi.mocked(useUserInfo).mockReturnValue({
      userInfo: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<Dashboard />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error if user has no role assigned', () => {
    vi.mocked(useWallet).mockReturnValue(createMockWalletState());
    vi.mocked(useUserInfo).mockReturnValue({
      userInfo: { role: null, status: null },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<Dashboard />);
    expect(screen.getByText(/no role assigned/i)).toBeInTheDocument();
  });

  it('blocks access when user status is Pending', () => {
    vi.mocked(useWallet).mockReturnValue(createMockWalletState());
    vi.mocked(useUserInfo).mockReturnValue({
      userInfo: { role: UserRole.Producer, status: UserStatus.Pending },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<Dashboard />);
    expect(screen.getByText(/your account is not approved yet/i)).toBeInTheDocument();
    expect(screen.getByText(/status: pending/i)).toBeInTheDocument();
    expect(screen.getByText(/return to home/i)).toBeInTheDocument();
  });

  it('blocks access when user status is Rejected', () => {
    vi.mocked(useWallet).mockReturnValue(createMockWalletState());
    vi.mocked(useUserInfo).mockReturnValue({
      userInfo: { role: UserRole.Factory, status: UserStatus.Rejected },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<Dashboard />);
    expect(screen.getByText(/your account is not approved yet/i)).toBeInTheDocument();
    expect(screen.getByText(/status: rejected/i)).toBeInTheDocument();
    expect(screen.getByText(/return to home/i)).toBeInTheDocument();
  });

  it('shows Producer dashboard with create raw material action', async () => {
    vi.mocked(useWallet).mockReturnValue(createMockWalletState());
    vi.mocked(useUserInfo).mockReturnValue({
      userInfo: { role: UserRole.Producer, status: UserStatus.Approved },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /producer dashboard/i })).toBeInTheDocument();
      expect(screen.getByText(/create raw material/i)).toBeInTheDocument();
      expect(screen.getByText(/transfer to factory/i)).toBeInTheDocument();
    });
  });

  it('shows Factory dashboard with process material action', async () => {
    vi.mocked(useWallet).mockReturnValue(createMockWalletState());
    vi.mocked(useUserInfo).mockReturnValue({
      userInfo: { role: UserRole.Factory, status: UserStatus.Approved },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /factory dashboard/i })).toBeInTheDocument();
      expect(screen.getByText(/process materials/i)).toBeInTheDocument();
      expect(screen.getByText(/transfer to retailer/i)).toBeInTheDocument();
    });
  });

  it('shows Retailer dashboard with package product action', async () => {
    vi.mocked(useWallet).mockReturnValue(createMockWalletState());
    vi.mocked(useUserInfo).mockReturnValue({
      userInfo: { role: UserRole.Retailer, status: UserStatus.Approved },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /retailer dashboard/i })).toBeInTheDocument();
      expect(screen.getByText(/package products/i)).toBeInTheDocument();
      expect(screen.getByText(/transfer to consumer/i)).toBeInTheDocument();
    });
  });

  it('shows Consumer dashboard with view traceability action', async () => {
    vi.mocked(useWallet).mockReturnValue(createMockWalletState());
    vi.mocked(useUserInfo).mockReturnValue({
      userInfo: { role: UserRole.Consumer, status: UserStatus.Approved },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /consumer dashboard/i })).toBeInTheDocument();
      expect(screen.getByText(/incoming transfers/i)).toBeInTheDocument();
      expect(screen.getByText(/products/i)).toBeInTheDocument();
      // Consumer should NOT see transfer option
      expect(screen.queryByText(/transfer to/i)).not.toBeInTheDocument();
    });
  });

  it('shows Admin dashboard with user management', async () => {
    vi.mocked(useWallet).mockReturnValue(createMockWalletState());
    vi.mocked(useUserInfo).mockReturnValue({
      userInfo: { role: UserRole.Admin, status: UserStatus.Approved },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /admin dashboard/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /user management/i })).toBeInTheDocument();
      expect(screen.getByText(/user management and status control/i)).toBeInTheDocument();
    });
  });

  it('shows tokens placeholder section', async () => {
    vi.mocked(useWallet).mockReturnValue(createMockWalletState());
    vi.mocked(useUserInfo).mockReturnValue({
      userInfo: { role: UserRole.Producer, status: UserStatus.Approved },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/raw materials/i)).toBeInTheDocument();
      expect(screen.getByText(/no tokens yet/i)).toBeInTheDocument();
    });
  });

  it('shows transfers placeholder section', async () => {
    vi.mocked(useWallet).mockReturnValue(createMockWalletState());
    vi.mocked(useUserInfo).mockReturnValue({
      userInfo: { role: UserRole.Factory, status: UserStatus.Approved },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<Dashboard />);
    await waitFor(() => {
      // Factory dashboard now shows two sections: Incoming and Outgoing Transfers
      expect(screen.getByRole('heading', { name: /incoming transfers/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /outgoing transfers/i })).toBeInTheDocument();
      expect(screen.getByText(/no pending transfers/i)).toBeInTheDocument();
      expect(screen.getByText(/no outgoing transfers yet\./i)).toBeInTheDocument();
    });
  });
});
