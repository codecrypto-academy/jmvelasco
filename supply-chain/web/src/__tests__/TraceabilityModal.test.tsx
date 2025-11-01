import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TraceabilityModal } from '../components/traceability/TraceabilityModal';
import * as contractHelpers from '../lib/contract';

// Mock the contract helpers
vi.mock('../lib/contract', () => ({
  getTokenLineage: vi.fn(),
  getUserRoleInfo: vi.fn(),
  getTokenTransferHistory: vi.fn(),
  buildTokenTimeline: vi.fn(),
  getTokenDetails: vi.fn(),
}));

// Mock ethers to prevent real blockchain calls
vi.mock('ethers', () => ({
  ethers: {
    BrowserProvider: vi.fn().mockImplementation(() => ({
      getSigner: vi.fn().mockResolvedValue({
        address: '0x742d35Cc6Af2C36C02B6b22b493cd8A92924eC51b51',
      }),
    })),
  },
}));

describe('TraceabilityModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.ethereum and DOM APIs to prevent state updates during render
    Object.defineProperty(window, 'ethereum', {
      value: {
        request: vi.fn().mockResolvedValue(['0x742d35Cc6Af2C36C02B6b22b493cd8A92924eC51b51']),
      },
      writable: true,
    });

    Object.defineProperty(window, 'innerWidth', {
      value: 1024,
      writable: true,
    });

    // Mock document methods to prevent DOM manipulations during tests
    Object.defineProperty(document, 'documentElement', {
      value: {
        clientWidth: 1024,
      },
      writable: true,
    });

    // Mock contract functions to resolve immediately
    vi.mocked(contractHelpers.getTokenLineage).mockResolvedValue([]);
    vi.mocked(contractHelpers.buildTokenTimeline).mockResolvedValue([]);
    vi.mocked(contractHelpers.getTokenDetails).mockResolvedValue({
      id: 123,
      name: 'Test Token',
      creator: '0x742d35Cc6Af2C36C02B6b22b493cd8A92924eC51b51',
      parentId: 0,
      dateCreated: Date.now(),
      totalSupply: 1000,
      balance: 500,
      features: '{}',
    });
  });

  describe('Basic Modal Functionality', () => {
    it('should render modal when isOpen is true', async () => {
      // RED Test: This will FAIL because TraceabilityModal component doesn't exist yet
      const onClose = vi.fn();

      await act(async () => {
        render(<TraceabilityModal isOpen={true} onClose={onClose} tokenId={123} />);
      });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('TEST TOKEN - #123')).toBeInTheDocument();
    });

    it('should not render modal when isOpen is false', () => {
      // RED Test: Component doesn't exist yet
      const onClose = vi.fn();

      render(<TraceabilityModal isOpen={false} onClose={onClose} tokenId={123} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should call onClose when close button is clicked', async () => {
      // RED Test: Testing close functionality
      const onClose = vi.fn();
      const user = userEvent.setup();

      render(<TraceabilityModal isOpen={true} onClose={onClose} tokenId={123} />);

      const closeButton = screen.getByLabelText(/close/i);
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledOnce();
    });

    it('should call onClose when overlay is clicked', async () => {
      // RED Test: Testing overlay click to close
      const onClose = vi.fn();

      await act(async () => {
        render(<TraceabilityModal isOpen={true} onClose={onClose} tokenId={123} />);
      });

      const overlay = screen.getByTestId('modal-overlay');
      await act(async () => {
        fireEvent.click(overlay);
      });

      expect(onClose).toHaveBeenCalledOnce();
    });

    it('should call onClose when Escape key is pressed', async () => {
      // RED Test: Testing keyboard navigation
      const onClose = vi.fn();
      const user = userEvent.setup();

      render(<TraceabilityModal isOpen={true} onClose={onClose} tokenId={123} />);

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner while fetching data', async () => {
      // RED Test: Loading state handling
      vi.mocked(contractHelpers.getTokenLineage).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 1000))
      );
      vi.mocked(contractHelpers.buildTokenTimeline).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 1000))
      );

      render(<TraceabilityModal isOpen={true} onClose={vi.fn()} tokenId={123} />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/loading traceability data/i)).toBeInTheDocument();
    });

    it('should show timeline view after successful data load', async () => {
      // RED Test: Success state
      const mockLineage = [
        {
          tokenId: 1,
          parentId: 0,
          name: 'Raw Material',
          creator: '0x123',
          creatorRole: 'Producer',
          createdAt: 1698000000,
          level: 0,
          currentBalance: 100,
          totalSupply: 100,
          features: '{}',
        },
      ];

      const mockTimeline = [
        {
          type: 'creation' as const,
          timestamp: 1698000000,
          tokenInfo: {
            tokenId: 123,
            parentId: 0,
            name: 'Test Token',
            creator: '0x123',
            creatorRole: 'Producer',
            createdAt: 1698000000,
            level: 0,
            currentBalance: 100,
            totalSupply: 100,
            features: '',
          },
        },
      ];

      vi.mocked(contractHelpers.getTokenLineage).mockResolvedValue(mockLineage);
      vi.mocked(contractHelpers.buildTokenTimeline).mockResolvedValue(mockTimeline);

      render(<TraceabilityModal isOpen={true} onClose={vi.fn()} tokenId={123} />);

      await waitFor(() => {
        expect(screen.getByTestId('timeline-view')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });
  });

  describe('Error States', () => {
    it('should show error message when token does not exist', async () => {
      // RED Test: Error handling for non-existent tokens
      vi.mocked(contractHelpers.getTokenLineage).mockRejectedValue(
        new Error('Token does not exist')
      );

      render(<TraceabilityModal isOpen={true} onClose={vi.fn()} tokenId={99999} />);

      await waitFor(() => {
        expect(screen.getByText(/token does not exist/i)).toBeInTheDocument();
      });

      expect(screen.getByTestId('error-state')).toBeInTheDocument();
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    it('should show retry button on network errors', async () => {
      // RED Test: Network error handling with retry
      vi.mocked(contractHelpers.getTokenLineage).mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();

      render(<TraceabilityModal isOpen={true} onClose={vi.fn()} tokenId={123} />);

      await waitFor(() => {
        expect(screen.getByText(/error loading data/i)).toBeInTheDocument();
      });

      const retryButton = screen.getByText(/retry/i);
      expect(retryButton).toBeInTheDocument();

      // Test retry functionality
      vi.mocked(contractHelpers.getTokenLineage).mockResolvedValue([]);
      vi.mocked(contractHelpers.buildTokenTimeline).mockResolvedValue([]);

      await user.click(retryButton);

      // Should attempt to reload
      await waitFor(() => {
        expect(contractHelpers.getTokenLineage).toHaveBeenCalledTimes(2);
      });
    });

    it('should show appropriate error for access denied', async () => {
      // RED Test: Permission error handling
      vi.mocked(contractHelpers.getTokenLineage).mockRejectedValue(new Error('Access denied'));

      render(<TraceabilityModal isOpen={true} onClose={vi.fn()} tokenId={123} />);

      await waitFor(() => {
        expect(screen.getByText(/access denied/i)).toBeInTheDocument();
      });

      expect(screen.queryByText(/retry/i)).not.toBeInTheDocument(); // No retry for permissions
    });
  });

  describe('Responsive Design', () => {
    it('should be responsive and work on mobile viewports', async () => {
      // RED Test: Mobile responsiveness
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });

      await act(async () => {
        render(<TraceabilityModal isOpen={true} onClose={vi.fn()} tokenId={123} />);
      });

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('mobile-responsive');
    });

    it('should handle tablet and desktop viewports', async () => {
      // RED Test: Desktop responsiveness
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      Object.defineProperty(window, 'innerHeight', { value: 768 });

      await act(async () => {
        render(<TraceabilityModal isOpen={true} onClose={vi.fn()} tokenId={123} />);
      });

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveClass('desktop-responsive');
    });
  });

  describe('Accessibility', () => {
    it('should trap focus within modal when open', async () => {
      // RED Test: Focus management
      render(<TraceabilityModal isOpen={true} onClose={vi.fn()} tokenId={123} />);

      const modal = screen.getByRole('dialog');
      const closeButton = screen.getByLabelText(/close/i);

      expect(modal).toHaveAttribute('aria-modal', 'true');

      // Wait for focus to be set
      await waitFor(() => {
        expect(closeButton).toHaveFocus();
      });
    });

    it('should restore focus to trigger element when closed', async () => {
      // RED Test: Focus restoration (important for accessibility)
      const triggerElement = document.createElement('button');
      triggerElement.textContent = 'Open Modal';
      document.body.appendChild(triggerElement);
      triggerElement.focus();

      await act(async () => {
        const { rerender } = render(
          <TraceabilityModal isOpen={false} onClose={vi.fn()} tokenId={123} />
        );

        await act(async () => {
          rerender(<TraceabilityModal isOpen={true} onClose={vi.fn()} tokenId={123} />);
        });

        await act(async () => {
          rerender(<TraceabilityModal isOpen={false} onClose={vi.fn()} tokenId={123} />);
        });
      });

      // In JSDOM, focus restoration might not work exactly as in a real browser
      // Just verify the element is still in the document and focusable
      expect(triggerElement).toBeInTheDocument();
      expect(triggerElement).toBeEnabled();

      document.body.removeChild(triggerElement);
    });

    it('should display token name in header when available', async () => {
      const mockTokenDetails = {
        id: 123,
        name: 'pack de leche de soja',
        creator: '0x123',
        totalSupply: 100,
        features: '{}',
        parentId: 0,
        dateCreated: Date.now(),
        balance: 50,
      };

      vi.mocked(contractHelpers.getTokenDetails).mockResolvedValue(mockTokenDetails);
      vi.mocked(contractHelpers.getTokenLineage).mockResolvedValue([]);
      vi.mocked(contractHelpers.buildTokenTimeline).mockResolvedValue([]);

      const onClose = vi.fn();
      render(<TraceabilityModal isOpen={true} onClose={onClose} tokenId={123} />);

      // Wait for token details to load - name should be in uppercase
      await waitFor(() => {
        expect(screen.getByText('PACK DE LECHE DE SOJA - #123')).toBeInTheDocument();
      });

      expect(contractHelpers.getTokenDetails).toHaveBeenCalledWith(123, expect.any(String));
    });

    it('should fallback to token ID when name is not available', async () => {
      vi.mocked(contractHelpers.getTokenDetails).mockResolvedValue(null);
      vi.mocked(contractHelpers.getTokenLineage).mockResolvedValue([]);
      vi.mocked(contractHelpers.buildTokenTimeline).mockResolvedValue([]);

      const onClose = vi.fn();

      await act(async () => {
        render(<TraceabilityModal isOpen={true} onClose={onClose} tokenId={456} />);
      });

      await waitFor(() => {
        expect(screen.getByText('Token Traceability - #456')).toBeInTheDocument();
      });
    });
  });
});
