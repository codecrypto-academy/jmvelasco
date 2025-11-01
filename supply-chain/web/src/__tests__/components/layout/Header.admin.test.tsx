it('should hide Supply Chain Widget when wallet is disconnected', () => {
  // Setup disconnected wallet
  (useWallet as ReturnType<typeof vi.fn>).mockReturnValue({
    isConnected: false,
    address: null,
    connect: vi.fn(),
    disconnect: vi.fn(),
    balance: '0',
    network: { name: 'localhost', chainId: 31337 },
  });
  (useWeb3 as ReturnType<typeof vi.fn>).mockReturnValue({
    address: null,
    isConnected: false,
  });
  (useUserInfo as ReturnType<typeof vi.fn>).mockReturnValue({
    userInfo: null,
    loading: false,
  });

  render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  );

  // Should NOT find Supply Chain button
  expect(screen.queryByText('Supply Chain')).not.toBeInTheDocument();
  // Should still show header title
  expect(screen.getByText('Supply Chain Tracker')).toBeInTheDocument();
});
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Header from '../../../components/layout/Header';
import { UserRole } from '../../../lib/enums';

// Mock the hooks
vi.mock('../../../contexts/Web3Provider', () => ({
  useWeb3: vi.fn(),
}));

vi.mock('../../../hooks/useUserInfo', () => ({
  useUserInfo: vi.fn(),
}));

vi.mock('../../../hooks/useWallet', () => ({
  useWallet: vi.fn(),
}));

// Import after mocks
import { useWeb3 } from '../../../contexts/Web3Provider';
import { useUserInfo } from '../../../hooks/useUserInfo';
import { useWallet } from '../../../hooks/useWallet';

describe('Header - Admin Supply Chain Widget Visibility', () => {
  const mockUseWallet = useWallet as ReturnType<typeof vi.fn>;
  const mockUseWeb3 = useWeb3 as ReturnType<typeof vi.fn>;
  const mockUseUserInfo = useUserInfo as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default wallet setup
    mockUseWallet.mockReturnValue({
      isConnected: true,
      address: '0x123',
      connect: vi.fn(),
      disconnect: vi.fn(),
      balance: '1.5',
      network: { name: 'localhost', chainId: 31337 },
    });

    // Default Web3 setup
    mockUseWeb3.mockReturnValue({
      address: '0x123',
      isConnected: true,
    });
  });

  it('should hide Supply Chain Widget for Admin role', () => {
    // Setup Admin user
    mockUseUserInfo.mockReturnValue({
      userInfo: {
        role: UserRole.Admin,
        isApproved: true,
        address: '0x123',
      },
      loading: false,
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    // Should NOT find Supply Chain button
    expect(screen.queryByText('Supply Chain')).not.toBeInTheDocument();

    // Should still show other header elements
    expect(screen.getByText('Supply Chain Tracker')).toBeInTheDocument();
    expect(screen.getByText('Balance:')).toBeInTheDocument(); // From WalletConnect
  });

  it('should show Supply Chain Widget for Producer role', () => {
    // Setup Producer user
    mockUseUserInfo.mockReturnValue({
      userInfo: {
        role: UserRole.Producer,
        isApproved: true,
        address: '0x123',
      },
      loading: false,
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    // Should find Supply Chain button
    expect(screen.getByText('Supply Chain')).toBeInTheDocument();

    // Should show other header elements
    expect(screen.getByText('Supply Chain Tracker')).toBeInTheDocument();
    expect(screen.getByText('Balance:')).toBeInTheDocument();
  });

  it('should show Supply Chain Widget for Factory role', () => {
    // Setup Factory user
    mockUseUserInfo.mockReturnValue({
      userInfo: {
        role: UserRole.Factory,
        isApproved: true,
        address: '0x123',
      },
      loading: false,
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    // Should find Supply Chain button
    expect(screen.getByText('Supply Chain')).toBeInTheDocument();
  });

  it('should show Supply Chain Widget for Retailer role', () => {
    // Setup Retailer user
    mockUseUserInfo.mockReturnValue({
      userInfo: {
        role: UserRole.Retailer,
        isApproved: true,
        address: '0x123',
      },
      loading: false,
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    // Should find Supply Chain button
    expect(screen.getByText('Supply Chain')).toBeInTheDocument();
  });

  it('should show Supply Chain Widget for Consumer role', () => {
    // Setup Consumer user
    mockUseUserInfo.mockReturnValue({
      userInfo: {
        role: UserRole.Consumer,
        isApproved: true,
        address: '0x123',
      },
      loading: false,
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    // Should find Supply Chain button
    expect(screen.getByText('Supply Chain')).toBeInTheDocument();
  });

  it('should show Supply Chain Widget when no user info is available', () => {
    // Setup no user info
    mockUseUserInfo.mockReturnValue({
      userInfo: null,
      loading: false,
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    // Should find Supply Chain button (default behavior)
    expect(screen.getByText('Supply Chain')).toBeInTheDocument();
  });

  it('should show Supply Chain Widget when user info is loading', () => {
    // Setup loading state
    mockUseUserInfo.mockReturnValue({
      userInfo: null,
      loading: true,
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    // Should find Supply Chain button (default behavior)
    expect(screen.getByText('Supply Chain')).toBeInTheDocument();
  });
});
