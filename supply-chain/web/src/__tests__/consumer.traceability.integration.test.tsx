import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '../pages/Dashboard';
import * as contractHelpers from '../lib/contract';
import * as useUserInfoHook from '../hooks/useUserInfo';
import * as useWalletHook from '../hooks/useWallet';
import { UserRole, UserStatus } from '../lib/enums';

interface TraceabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenId: number;
}

// Mock the TraceabilityModal component
vi.mock('../components/traceability/TraceabilityModal', () => ({
  TraceabilityModal: ({ isOpen, onClose, tokenId }: TraceabilityModalProps) =>
    isOpen ? (
      <div data-testid="traceability-modal">
        <div># {tokenId}</div>
        <button onClick={onClose} data-testid="close-modal">
          Close Modal
        </button>
      </div>
    ) : null,
}));

// Mock contract helpers
vi.mock('../lib/contract', () => ({
  getUserTokens: vi.fn(),
  getUserTokensWithBalance: vi.fn(),
  getTokenDetails: vi.fn(),
  getTokenLineage: vi.fn(),
  buildTokenTimeline: vi.fn(),
}));

// Mock hooks
vi.mock('../hooks/useUserInfo');
vi.mock('../hooks/useWallet');
vi.mock('../hooks/useContractEvent', () => ({
  useContractEvent: vi.fn(),
}));

// Mock tokens helper
vi.mock('../lib/tokens', () => ({
  mergeTokenDetails: vi.fn((prev, details) =>
    Array.isArray(details) ? [...prev, ...details] : [...prev, details]
  ),
}));

// Mock ethers and contract factory
vi.mock('ethers', () => ({
  ethers: {
    BrowserProvider: vi.fn(),
  },
}));

vi.mock('../types/factories/SupplyChain__factory', () => ({
  SupplyChain__factory: {
    connect: vi.fn(),
  },
}));

describe('Consumer Dashboard - TraceabilityModal Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default wallet mock
    vi.mocked(useWalletHook.useWallet).mockReturnValue({
      address: '0x123abc',
      isConnected: true,
      chainId: 31337,
      networkName: 'localhost',
      connect: vi.fn(),
      getBalance: vi.fn(),
      switchNetwork: vi.fn(),
      getCurrentNetwork: vi.fn(),
    });

    // Default user info mock - Consumer role
    vi.mocked(useUserInfoHook.useUserInfo).mockReturnValue({
      userInfo: {
        role: UserRole.Consumer,
        status: UserStatus.Approved,
      },
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    // Mock contract functions
    vi.mocked(contractHelpers.getUserTokens).mockResolvedValue([123]);
    vi.mocked(contractHelpers.getUserTokensWithBalance).mockResolvedValue([123]);
    vi.mocked(contractHelpers.getTokenDetails).mockResolvedValue({
      id: 123,
      creator: '0x123abc',
      name: 'Organic Tomatoes',
      balance: 5,
      totalSupply: 10,
      parentId: 0,
      dateCreated: 1698000000,
      features: '{"content": "Fresh tomatoes", "country": "Spain"}',
    });
    vi.mocked(contractHelpers.getTokenLineage).mockResolvedValue([]);
    vi.mocked(contractHelpers.buildTokenTimeline).mockResolvedValue([]);
  });

  describe('Consumer MyTokens Integration', () => {
    it('should render Consumer dashboard with MyTokens cards clickable for traceability', async () => {
      // RED Test: Consumer dashboard should show clickable token cards for traceability
      render(<Dashboard />);

      // Wait for Consumer dashboard to load
      await waitFor(() => {
        expect(screen.getByText('Consumer Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Products')).toBeInTheDocument();
      });

      // Should show token cards
      await waitFor(() => {
        expect(screen.getAllByText('Organic Tomatoes').length).toBeGreaterThan(0);
      });

      // Token cards should have dedicated trace button for Consumer
      await waitFor(() => {
        expect(screen.getAllByText('Trace Product Journey').length).toBeGreaterThan(0);
      });
    });

    it('should open TraceabilityModal when Consumer clicks on a token card', async () => {
      // RED Test: Clicking token card should open traceability modal
      const user = userEvent.setup();

      render(<Dashboard />);

      // Wait for token to be loaded
      await waitFor(() => {
        expect(screen.getAllByText('Organic Tomatoes').length).toBeGreaterThan(0);
      });

      // Click on trace button
      const traceButtons = screen.getAllByText('Trace Product Journey');
      await user.click(traceButtons[0]);

      // Should open traceability modal
      expect(screen.getByTestId('traceability-modal')).toBeInTheDocument();
      expect(screen.getAllByText('#123')[0]).toBeInTheDocument();
    });

    it('should close TraceabilityModal when close button is clicked', async () => {
      // RED Test: Modal close functionality
      const user = userEvent.setup();

      render(<Dashboard />);

      // Open modal by clicking trace button
      await waitFor(() => {
        expect(screen.getAllByText('Organic Tomatoes').length).toBeGreaterThan(0);
      });

      const traceButton = screen.getAllByText('Trace Product Journey')[0];
      await user.click(traceButton);

      // Modal should be open
      expect(screen.getByTestId('traceability-modal')).toBeInTheDocument();
      expect(screen.getAllByText('Trace Product Journey')[0]).toBeInTheDocument();
      expect(screen.getAllByText('#123')[0]).toBeInTheDocument();

      // Click close button
      const closeButton = screen.getByTestId('close-modal');
      await user.click(closeButton);

      // Modal should be closed
      expect(screen.queryByTestId('traceability-modal')).not.toBeInTheDocument();
    });

    it('should pass correct tokenId to TraceabilityModal', async () => {
      // RED Test: Correct token ID passed to modal
      const user = userEvent.setup();

      // Mock different token
      vi.mocked(contractHelpers.getTokenDetails).mockResolvedValue({
        id: 456,
        creator: '0x456def',
        name: 'Premium Olive Oil',
        balance: 3,
        totalSupply: 5,
        parentId: 123,
        dateCreated: 1698000000,
        features: '{"content": "Extra virgin olive oil", "country": "Italy"}',
      });

      render(<Dashboard />);

      // Wait for token to be loaded
      await waitFor(() => {
        expect(screen.getAllByText('Premium Olive Oil').length).toBeGreaterThan(0);
      });

      // Click on token card
      const traceButton = screen.getAllByText('Trace Product Journey')[1];
      await user.click(traceButton);

      // Should pass correct token ID (badge format)
      expect(screen.getAllByText('#456').length).toBeGreaterThan(0);
    });
  });

  describe('Consumer Role Validation', () => {
    it('should only show traceability for Consumer role', async () => {
      // RED Test: Other roles should not see traceability modal functionality
      vi.mocked(useUserInfoHook.useUserInfo).mockReturnValue({
        userInfo: {
          role: UserRole.Producer,
          status: UserStatus.Approved,
        },
        loading: false,
        error: null,
        refetch: vi.fn(),
      });

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Producer Dashboard')).toBeInTheDocument();
      });

      // Producer should not have clickable traceability cards
      await waitFor(() => {
        expect(screen.getAllByText('Organic Tomatoes').length).toBeGreaterThan(0);
      });

      // Producer should not see trace buttons
      expect(screen.queryByText('Trace Product Journey')).not.toBeInTheDocument();
    });

    it('should show Consumer-only section layout', async () => {
      // RED Test: Consumer dashboard layout validation
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getByText('Consumer Dashboard')).toBeInTheDocument();
      });

      // Should show Products section
      expect(screen.getByText('Products')).toBeInTheDocument();

      // Should NOT show RoleActions (Quick Actions section)
      expect(screen.queryByText('Quick Actions')).not.toBeInTheDocument();

      // Should show IncomingTransfers but not OutgoingTransfers
      expect(screen.getByText('Incoming Transfers')).toBeInTheDocument();
      expect(screen.queryByText('Outgoing Transfers')).not.toBeInTheDocument();
    });
  });

  describe('Modal State Management', () => {
    it('should manage modal state independently for multiple tokens', async () => {
      // RED Test: Multiple token cards with independent modal states
      const user = userEvent.setup();

      // Mock multiple tokens
      vi.mocked(contractHelpers.getUserTokens).mockResolvedValue([123, 456]);
      vi.mocked(contractHelpers.getTokenDetails)
        .mockResolvedValueOnce({
          id: 123,
          creator: '0x123abc',
          name: 'Organic Tomatoes',
          balance: 5,
          totalSupply: 10,
          parentId: 0,
          dateCreated: 1698000000,
          features: '{"content": "Fresh tomatoes"}',
        })
        .mockResolvedValueOnce({
          id: 456,
          creator: '0x456def',
          name: 'Premium Olive Oil',
          balance: 3,
          totalSupply: 5,
          parentId: 123,
          dateCreated: 1698000000,
          features: '{"content": "Extra virgin olive oil"}',
        });

      render(<Dashboard />);

      // Wait for both tokens to load
      await waitFor(() => {
        expect(screen.getAllByText('Organic Tomatoes').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Premium Olive Oil').length).toBeGreaterThan(0);
      });

      // Click first token
      const firstTraceButton = screen.getAllByText('Trace Product Journey')[0];
      await user.click(firstTraceButton);

      // Should show modal for first token
      expect(screen.getAllByText('#123').length).toBeGreaterThan(0);

      // Close modal
      await user.click(screen.getByTestId('close-modal'));

      // Click second token
      const secondTraceButton = screen.getAllByText('Trace Product Journey')[1];
      await user.click(secondTraceButton);

      // Should show modal for second token
      expect(screen.getAllByText('#456').length).toBeGreaterThan(0);
    });

    it('should handle modal errors gracefully', async () => {
      // RED Test: Error handling in modal opening
      const user = userEvent.setup();

      // Mock contract helpers to throw error
      vi.mocked(contractHelpers.getTokenLineage).mockRejectedValue(new Error('Network error'));

      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getAllByText('Organic Tomatoes').length).toBeGreaterThan(0);
      });

      // Clicking should still open modal (error handling is internal to modal)
      const traceButton = screen.getAllByText('Trace Product Journey')[0];
      await user.click(traceButton);

      expect(screen.getByTestId('traceability-modal')).toBeInTheDocument();
      expect(screen.getAllByText('Trace Product Journey').length).toBeGreaterThan(0);
    });
  });

  describe('Consumer UX Enhancements', () => {
    it('should show visual feedback on token card hover for traceability', async () => {
      // RED Test: UX improvements for Consumer interaction
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getAllByText('Organic Tomatoes').length).toBeGreaterThan(0);
      });

      // Should have trace button with hover effects for Consumer role
      const traceButtons = screen.getAllByRole('button', { name: /trace product journey/i });
      expect(traceButtons[0]).toHaveClass('hover:from-blue-700');
      expect(traceButtons[0]).toHaveClass('transition-all');
    });

    it('should display traceability hint for Consumer token cards', async () => {
      // RED Test: User guidance for traceability feature
      render(<Dashboard />);

      await waitFor(() => {
        expect(screen.getAllByText('Organic Tomatoes').length).toBeGreaterThan(0);
      });

      // Should show trace button instead of text hint (per analysis update)
      expect(screen.getAllByText('Trace Product Journey')[0]).toBeInTheDocument();
    });
  });
});
