import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Home from '../pages/Home';

// Mock useWallet and contract helpers
vi.mock('../hooks/useWallet');
vi.mock('../lib/contract');

import type { UseWalletReturn } from '../hooks/useWallet';
import { useWallet } from '../hooks/useWallet';
import * as contract from '../lib/contract';
import { UserRole, UserStatus } from '../lib/enums';

// Helper to create mock wallet state with defaults
function createMockWalletState(overrides?: Partial<UseWalletReturn>): UseWalletReturn {
  return {
    address: null,
    isConnected: false,
    chainId: null,
    networkName: null,
    connect: vi.fn(),
    getBalance: vi.fn(),
    switchNetwork: vi.fn(),
    getCurrentNetwork: vi.fn(),
    ...overrides,
  };
}

// Helper to render with router context
function renderWithRouter(component: React.ReactElement) {
  return render(<MemoryRouter>{component}</MemoryRouter>);
}

describe('Home page registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows welcome message if not connected', () => {
    vi.mocked(useWallet).mockReturnValue(createMockWalletState());
    renderWithRouter(<Home />);
    // Robust: check for the welcome heading and intro text
    expect(
      screen.getByRole('heading', { name: /welcome to supply chain tracker/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/track, verify, and manage products/i)).toBeInTheDocument();
  });

  it('shows role request form if connected and no role', async () => {
    vi.mocked(useWallet).mockReturnValue(
      createMockWalletState({
        address: '0x123',
        isConnected: true,
        chainId: 31337,
        networkName: 'anvil',
      })
    );
    vi.mocked(contract.getUserInfo).mockResolvedValue({ role: null, status: null });

    renderWithRouter(<Home />);
    expect(await screen.findByLabelText(/select role/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request role/i })).toBeInTheDocument();
  });

  it('shows current user status if already requested', async () => {
    vi.mocked(useWallet).mockReturnValue(
      createMockWalletState({
        address: '0x123',
        isConnected: true,
        chainId: 31337,
        networkName: 'anvil',
      })
    );
    vi.mocked(contract.getUserInfo).mockResolvedValue({
      role: UserRole.Producer,
      status: UserStatus.Pending,
    });

    renderWithRouter(<Home />);
    // Robust: check for role badge and status chip by aria-label
    expect(await screen.findByLabelText(/role: producer/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status: pending/i)).toBeInTheDocument();
    // Also check for the correct icon (⏳) in status chip
    expect(screen.getByLabelText(/status: pending/i)).toHaveTextContent(/pending/i);
    expect(screen.getByLabelText(/status: pending/i)).toHaveTextContent(/⏳/);
  });

  it('shows dashboard link when user has a role', async () => {
    vi.mocked(useWallet).mockReturnValue(
      createMockWalletState({
        address: '0x123',
        isConnected: true,
        chainId: 31337,
        networkName: 'anvil',
      })
    );
    vi.mocked(contract.getUserInfo).mockResolvedValue({
      role: UserRole.Producer,
      status: UserStatus.Approved,
    });

    renderWithRouter(<Home />);
    // Robust: check for role badge and status chip by aria-label
    expect(await screen.findByLabelText(/role: producer/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status: approved/i)).toBeInTheDocument();
    // Check for correct icon (✅) in status chip
    expect(screen.getByLabelText(/status: approved/i)).toHaveTextContent(/approved/i);
    expect(screen.getByLabelText(/status: approved/i)).toHaveTextContent(/✅/);
    // CTA link
    const dashboardLink = screen.getByRole('link', { name: /go to dashboard/i });
    expect(dashboardLink).toBeInTheDocument();
    expect(dashboardLink).toHaveAttribute('href', '/dashboard');
  });

  it('shows error if contract call fails', async () => {
    vi.mocked(useWallet).mockReturnValue(
      createMockWalletState({
        address: '0x123',
        isConnected: true,
        chainId: 31337,
        networkName: 'anvil',
      })
    );
    vi.mocked(contract.getUserInfo).mockRejectedValue(new Error('Contract error'));

    renderWithRouter(<Home />);
    expect(await screen.findByText(/error/i)).toBeInTheDocument();
  });

  it('shows admin users normal home page with dashboard link', async () => {
    vi.mocked(useWallet).mockReturnValue(
      createMockWalletState({
        address: '0xADMIN',
        isConnected: true,
        chainId: 31337,
        networkName: 'anvil',
      })
    );
    vi.mocked(contract.getUserInfo).mockResolvedValue({
      role: UserRole.Admin,
      status: UserStatus.Approved,
    });

    renderWithRouter(<Home />);

    // Robust: check for role badge and status chip by aria-label
    expect(await screen.findByLabelText(/role: admin/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status: approved/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status: approved/i)).toHaveTextContent(/approved/i);
    expect(screen.getByLabelText(/status: approved/i)).toHaveTextContent(/✅/);
    expect(screen.getByRole('link', { name: /go to dashboard/i })).toBeInTheDocument();
  });
});
