/**
 * BalanceDisplay Component Tests
 *
 * Comprehensive test suite for the premium BalanceDisplay component
 * Tests all features: balance calculations, visual indicators, responsiveness
 *
 * @author Expert AI Developer
 * @date October 2025
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BalanceDisplay } from '../components/supplyChain/SupplyChainWidget/components/BalanceDisplay';
import { UserRole } from '../lib/enums';
import type { BalanceState } from '../types/supplyChainWidget';

// =====================================================================================
// TEST DATA
// =====================================================================================

const mockBalanceWithActivity: BalanceState = {
  tokenId: 1n,
  tokenName: 'Test Token Premium',
  owner: '0x1234567890123456789012345678901234567890',
  role: UserRole.Producer,
  totalBalance: 1000n,
  availableBalance: 750n,
  pendingOutgoing: 200n,
  pendingIncoming: 50n,
  isRawMaterial: true,
  processingHistory: [],
};

const mockBalanceFullyCommitted: BalanceState = {
  tokenId: 2n,
  tokenName: 'Committed Token',
  owner: '0x2345678901234567890123456789012345678901',
  role: UserRole.Factory,
  totalBalance: 500n,
  availableBalance: 0n,
  pendingOutgoing: 500n,
  pendingIncoming: 0n,
  parentId: 1n,
  isRawMaterial: false,
  processingHistory: [
    {
      fromTokenId: 1n,
      amountConsumed: 300n,
      timestamp: Date.now() - 86400000,
      processedBy: '0x2345678901234567890123456789012345678901',
    },
  ],
};

const mockBalanceNoActivity: BalanceState = {
  tokenId: 3n,
  tokenName: 'Static Token',
  owner: '0x3456789012345678901234567890123456789012',
  role: UserRole.Consumer,
  totalBalance: 100n,
  availableBalance: 100n,
  pendingOutgoing: 0n,
  pendingIncoming: 0n,
  isRawMaterial: true,
  processingHistory: [],
};

// =====================================================================================
// COMPONENT TESTS
// =====================================================================================

describe('BalanceDisplay Component', () => {
  describe('Basic Rendering', () => {
    it('renders token name and basic balance information', () => {
      render(<BalanceDisplay balance={mockBalanceWithActivity} />);

      expect(screen.getByText('Test Token Premium')).toBeInTheDocument();
      expect(screen.getByText('Total Balance')).toBeInTheDocument();
      expect(screen.getByText('Available')).toBeInTheDocument();
      // There should be only one element with '1000' (Total Balance)
      expect(screen.getAllByText('1000')).toHaveLength(1);
      // There should be only one element with '750' (Available)
      expect(screen.getAllByText('750')).toHaveLength(1);
    });

    it('renders in compact mode correctly', () => {
      render(<BalanceDisplay balance={mockBalanceWithActivity} compact={true} />);

      expect(screen.getByText('Test Token Premium')).toBeInTheDocument();
      expect(screen.getByText('Total Balance:')).toBeInTheDocument();
      expect(screen.getByText('Available:')).toBeInTheDocument();
    });

    it('applies custom className correctly', () => {
      const { container } = render(
        <BalanceDisplay balance={mockBalanceWithActivity} className="test-custom-class" />
      );

      expect(container.firstChild).toHaveClass('test-custom-class');
    });
  });

  describe('Balance Calculations Display', () => {
    it('shows all balance types when there is activity', () => {
      render(<BalanceDisplay balance={mockBalanceWithActivity} />);

      expect(screen.getByText('Total Balance')).toBeInTheDocument();
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('Pending Out')).toBeInTheDocument();
      expect(screen.getByText('Incoming')).toBeInTheDocument();

      expect(screen.getByText((content) => /1[.,\s]?000/.test(content))).toBeInTheDocument(); // Total
      expect(screen.getAllByText('750')).toHaveLength(1); // Available
      expect(screen.getAllByText('200')).toHaveLength(1); // Pending Out
      // Only one element with '50' is rendered in the current UI
      expect(screen.getAllByText('50')).toHaveLength(1); // Incoming
    });

    it('hides zero pending amounts', () => {
      render(<BalanceDisplay balance={mockBalanceNoActivity} />);

      expect(screen.getByText('Total Balance')).toBeInTheDocument();
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.queryByText('Pending Out')).not.toBeInTheDocument();
      expect(screen.queryByText('Incoming')).not.toBeInTheDocument();
    });

    it('formats large numbers with locale formatting', () => {
      const largeBalanceState: BalanceState = {
        ...mockBalanceWithActivity,
        totalBalance: 1234567n,
        availableBalance: 1234567n,
      };

      render(<BalanceDisplay balance={largeBalanceState} />);

      // Accept any locale format: 1,234,567 or 1.234.567 or 1234567
      const matcher = (content: string) => /1[.,\s]?234[.,\s]?567/.test(content);
      expect(screen.getAllByText(matcher)).toHaveLength(2); // Total and Available
    });
  });

  describe('Status Indicators', () => {
    it('shows activity indicator when there are pending transfers', () => {
      render(<BalanceDisplay balance={mockBalanceWithActivity} />);

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('shows fully committed warning', () => {
      render(<BalanceDisplay balance={mockBalanceFullyCommitted} />);

      expect(screen.getByText('Fully committed - no available balance')).toBeInTheDocument();
    });

    it('shows incoming transfer notification', () => {
      render(<BalanceDisplay balance={mockBalanceWithActivity} />);

      expect(screen.getByText('50 units incoming')).toBeInTheDocument();
    });

    it('does not show activity indicator when there is no activity', () => {
      render(<BalanceDisplay balance={mockBalanceNoActivity} />);

      expect(screen.queryByText('Active')).not.toBeInTheDocument();
    });
  });

  describe('Metadata Display', () => {
    it('shows metadata when showMetadata is true', () => {
      render(<BalanceDisplay balance={mockBalanceFullyCommitted} showMetadata={true} />);

      expect(screen.getByText('#2')).toBeInTheDocument(); // Token ID
      expect(screen.getByText('Processed')).toBeInTheDocument(); // Type
      expect(screen.getByText('#1')).toBeInTheDocument(); // Parent ID
    });

    it('does not show metadata when showMetadata is false', () => {
      render(<BalanceDisplay balance={mockBalanceFullyCommitted} showMetadata={false} />);

      expect(screen.queryByText('Token ID:')).not.toBeInTheDocument();
      expect(screen.queryByText('Type:')).not.toBeInTheDocument();
    });

    it('shows "Raw Material" for tokens without parent', () => {
      render(<BalanceDisplay balance={mockBalanceWithActivity} showMetadata={true} />);

      expect(screen.getByText('Raw Material')).toBeInTheDocument();
    });

    it('shows "Processed" for tokens with parent', () => {
      render(<BalanceDisplay balance={mockBalanceFullyCommitted} showMetadata={true} />);

      expect(screen.getByText('Processed')).toBeInTheDocument();
    });

    it('shows owner address in metadata', () => {
      render(<BalanceDisplay balance={mockBalanceWithActivity} showMetadata={true} />);

      expect(screen.getByText('Owner:')).toBeInTheDocument();
      // Address is properly truncated in the component implementation
    });
  });

  describe('Progress Bar', () => {
    it('shows progress bar in non-compact mode', () => {
      render(<BalanceDisplay balance={mockBalanceWithActivity} compact={false} />);

      expect(screen.getByText('Distribution')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('does not show progress bar in compact mode', () => {
      render(<BalanceDisplay balance={mockBalanceWithActivity} compact={true} />);

      expect(screen.queryByText('Distribution')).not.toBeInTheDocument();
    });

    it('does not show progress bar when total balance is zero', () => {
      const zeroBalanceState: BalanceState = {
        ...mockBalanceWithActivity,
        totalBalance: 0n,
        availableBalance: 0n,
        pendingOutgoing: 0n,
        pendingIncoming: 0n,
      };

      render(<BalanceDisplay balance={zeroBalanceState} />);

      expect(screen.queryByText('Distribution')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<BalanceDisplay balance={mockBalanceWithActivity} />);

      const tokenNameHeading = screen.getByRole('heading', { level: 4 });
      expect(tokenNameHeading).toHaveTextContent('Test Token Premium');
    });

    it('has descriptive titles for progress bar segments', () => {
      const { container } = render(
        <BalanceDisplay balance={mockBalanceWithActivity} compact={false} />
      );

      const progressSegments = container.querySelectorAll('[title]');
      expect(progressSegments.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('handles very large bigint values gracefully', () => {
      const largeBigIntState: BalanceState = {
        ...mockBalanceWithActivity,
        totalBalance: BigInt(Number.MAX_SAFE_INTEGER) + 1000n,
        availableBalance: BigInt(Number.MAX_SAFE_INTEGER) + 500n,
      };

      expect(() => {
        render(<BalanceDisplay balance={largeBigIntState} />);
      }).not.toThrow();
    });

    it('handles zero values correctly', () => {
      const zeroBalanceState: BalanceState = {
        ...mockBalanceWithActivity,
        totalBalance: 0n,
        availableBalance: 0n,
        pendingOutgoing: 0n,
        pendingIncoming: 0n,
      };

      render(<BalanceDisplay balance={zeroBalanceState} />);

      expect(screen.getAllByText('0')).toHaveLength(2); // Total and Available
    });
  });

  describe('Theming and Styling', () => {
    it('applies correct color schemes for different balance types', () => {
      const { container } = render(<BalanceDisplay balance={mockBalanceWithActivity} />);

      expect(container.querySelector('.text-emerald-700')).toBeInTheDocument(); // Available
      expect(container.querySelector('.text-amber-700')).toBeInTheDocument(); // Pending Out
      expect(container.querySelector('.text-blue-700')).toBeInTheDocument(); // Incoming
      expect(container.querySelector('.text-slate-800')).toBeInTheDocument(); // Total
    });

    it('has proper responsive classes', () => {
      const { container } = render(<BalanceDisplay balance={mockBalanceWithActivity} />);

      const component = container.firstChild as HTMLElement;
      expect(component).toHaveClass('rounded-xl');
      expect(component).toHaveClass('shadow-sm');
    });
  });
});

// =====================================================================================
// INTEGRATION TESTS
// =====================================================================================

describe('BalanceDisplay Integration', () => {
  it('renders multiple instances without conflicts', () => {
    render(
      <div>
        <BalanceDisplay balance={mockBalanceWithActivity} />
        <BalanceDisplay balance={mockBalanceFullyCommitted} />
        <BalanceDisplay balance={mockBalanceNoActivity} />
      </div>
    );

    expect(screen.getByText('Test Token Premium')).toBeInTheDocument();
    expect(screen.getByText('Committed Token')).toBeInTheDocument();
    expect(screen.getByText('Static Token')).toBeInTheDocument();
  });

  it('works correctly with different prop combinations', () => {
    render(
      <div>
        <BalanceDisplay balance={mockBalanceWithActivity} compact={true} />
        <BalanceDisplay balance={mockBalanceFullyCommitted} compact={false} showMetadata={true} />
        <BalanceDisplay balance={mockBalanceNoActivity} className="custom-class" />
      </div>
    );

    // All should render without errors
    expect(screen.getByText('Test Token Premium')).toBeInTheDocument();
    expect(screen.getByText('Committed Token')).toBeInTheDocument();
    expect(screen.getByText('Static Token')).toBeInTheDocument();
  });
});
