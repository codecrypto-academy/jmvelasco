import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// We'll mock the useWallet hook to control connection state
vi.mock('../hooks/useWallet', () => ({
  useWallet: vi.fn(),
}));

// Mock the useWeb3 hook that SupplyChainWidget uses
vi.mock('../contexts/Web3Provider', () => ({
  useWeb3: vi.fn(),
}));

// Mock useUserInfo hook that SupplyChainWidget uses
vi.mock('../hooks/useUserInfo', () => ({
  useUserInfo: vi.fn(),
}));

// Import after mock definition
import Header from '../components/layout/Header';
import { useWallet } from '../hooks/useWallet';
import { useWeb3 } from '../contexts/Web3Provider';
import { useUserInfo } from '../hooks/useUserInfo';

describe('Layout/Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Connect button when wallet is disconnected', () => {
    // Mock useWallet hook
    (useWallet as ReturnType<typeof vi.fn>).mockReturnValue({
      address: null,
      isConnected: false,
      chainId: null,
      networkName: null,
      connect: vi.fn(),
    });

    // Mock useWeb3 hook that SupplyChainWidget needs
    (useWeb3 as ReturnType<typeof vi.fn>).mockReturnValue({
      address: null,
      chainId: null,
      networkName: null,
    });

    // Mock useUserInfo hook that SupplyChainWidget needs
    (useUserInfo as ReturnType<typeof vi.fn>).mockReturnValue({
      userInfo: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /supply chain tracker/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
  });
});
