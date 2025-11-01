import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoleActions } from '../components/tokenOps/RoleActions';
import { Web3Provider } from '../contexts/Web3Provider';
import { UserStatus, UserRole } from '../lib/enums';

// Mock all the contract helpers
vi.mock('../lib/contract.ts', () => ({
  getUserTokensWithBalance: vi.fn().mockResolvedValue([1, 2]),
  getTokenDetails: vi.fn().mockResolvedValue({
    id: 1,
    name: 'Mock Token',
    totalSupply: 100,
    balance: 50,
    creator: '0x123',
    parentId: 0,
    dateCreated: Date.now(),
    features: '{}',
  }),
  createToken: vi.fn().mockResolvedValue(true),
  requestTransfer: vi.fn().mockResolvedValue(true),
  getUserTokensWithAvailableBalance: vi.fn().mockResolvedValue([1, 2]),
}));

// Mock Web3Provider context
const mockWeb3Context = {
  address: '0x123...abc',
  balance: '1.5',
  network: { name: 'Localhost', chainId: 31337 },
  connect: vi.fn(),
  disconnect: vi.fn(),
  switchNetwork: vi.fn(),
};

// Mock wallet hook
vi.mock('../hooks/useWallet.ts', () => ({
  useWallet: () => mockWeb3Context,
}));

// Mock user info hook
const mockUserInfo = {
  role: 'Consumer',
  status: UserStatus.Approved,
  isLoading: false,
  error: null,
};

vi.mock('../hooks/useUserInfo.ts', () => ({
  useUserInfo: () => mockUserInfo,
}));

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <Web3Provider>{children}</Web3Provider>
);

describe('Consumer ActionCard Removal', () => {
  it('should not render any ActionCards for Consumer role', () => {
    // This test validates ADR 008: Consumer dashboard is 100% MyTokens-centric
    // Consumer should have NO ActionCards, only MyTokens with modal integration

    render(
      <TestWrapper>
        <RoleActions role={UserRole.Consumer} />
      </TestWrapper>
    );

    // Consumer should not see any ActionCards
    expect(screen.queryByText(/Create/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Transfer/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Process/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Package/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Check/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Trace/)).not.toBeInTheDocument();

    // Should not render any ActionCard components
    expect(screen.queryByTestId(/action-card/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();

    // Consumer section should be empty or not present in RoleActions
    expect(screen.queryByText(/Consumer Actions/)).not.toBeInTheDocument();
  });

  it('should still render ActionCards for other roles (validation test)', () => {
    // Validation: Producer should still have ActionCards (ensure we don't break other roles)

    render(
      <TestWrapper>
        <RoleActions role={UserRole.Producer} />
      </TestWrapper>
    );

    // Producer should still have ActionCards
    expect(screen.getByText(/Create Raw Material/)).toBeInTheDocument();
    expect(screen.getByText(/Transfer to Factory/)).toBeInTheDocument();
  });
});
