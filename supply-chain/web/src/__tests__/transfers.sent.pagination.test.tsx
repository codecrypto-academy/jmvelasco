import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { buildPendingSent } from './utils/builders';

// Mock the hook to return controlled pagination data
vi.mock('../hooks/useTransfersList', () => ({
  useTransfersList: vi.fn(),
}));

vi.mock('../hooks/useWallet', () => ({
  useWallet: () => ({ address: '0xproducer' }),
}));

describe('Transfers – Sent Pagination', () => {
  describe('with showAllStatuses (full pagination flow)', () => {
    it('pagination controls work correctly with showAllStatuses=true (7 items, 2 pages)', async () => {
      const { useTransfersList } = await import('../hooks/useTransfersList');

      // Mock page 1: first 5 items of 7 total
      const page1Items = [
        buildPendingSent(1, {
          tokenId: 101,
          tokenName: 'Item 1',
          amount: 10,
          to: '0xfactory',
          createdAt: 1000,
        }),
        buildPendingSent(2, {
          tokenId: 102,
          tokenName: 'Item 2',
          amount: 20,
          to: '0xfactory',
          status: 'Accepted',
          createdAt: 2000,
        }),
        buildPendingSent(3, {
          tokenId: 103,
          tokenName: 'Item 3',
          amount: 15,
          to: '0xfactory',
          status: 'Rejected',
          createdAt: 3000,
        }),
        buildPendingSent(4, {
          tokenId: 104,
          tokenName: 'Item 4',
          amount: 25,
          to: '0xfactory',
          createdAt: 4000,
        }),
        buildPendingSent(5, {
          tokenId: 105,
          tokenName: 'Item 5',
          amount: 30,
          to: '0xfactory',
          status: 'Accepted',
          createdAt: 5000,
        }),
      ];

      // Mock page 2: last 2 items of 7 total
      const page2Items = [
        buildPendingSent(6, {
          tokenId: 106,
          tokenName: 'Item 6',
          amount: 12,
          to: '0xfactory',
          createdAt: 6000,
        }),
        buildPendingSent(7, {
          tokenId: 107,
          tokenName: 'Item 7',
          amount: 18,
          to: '0xfactory',
          status: 'Rejected',
          createdAt: 7000,
        }),
      ];

      const mockSetPage = vi.fn();
      const mockRefresh = vi.fn();

      // Initial mock returns page 1
      (useTransfersList as any).mockReturnValue({
        items: page1Items,
        total: 7,
        page: 1,
        totalPages: 2,
        setPage: mockSetPage,
        loading: false,
        error: null,
        refresh: mockRefresh,
      });

      const PendingTransfersSent = (await import('../components/tokenOps/OutgoingTransfers'))
        .default;
      const { rerender } = render(<PendingTransfersSent showAllStatuses={true} />);

      // ===== PAGE 1 VALIDATION =====
      // Wait for items to appear
      expect(await screen.findByText(/item 1/i)).toBeInTheDocument();
      expect(screen.getByText(/item 2/i)).toBeInTheDocument();
      expect(screen.getByText(/item 5/i)).toBeInTheDocument();
      expect(screen.queryByText(/item 6/i)).not.toBeInTheDocument(); // Not on page 1

      // Validate counter shows "Showing 1–5 of 7"
      expect(screen.getByText(/showing 1–5 of 7/i)).toBeInTheDocument();

      // Validate page indicator shows "Page 1 / 2"
      expect(screen.getByText(/page 1 \/ 2/i)).toBeInTheDocument();

      // Validate Prev button is disabled
      const prevButton = screen.getByRole('button', { name: /prev/i });
      expect(prevButton).toBeDisabled();

      // Validate Next button is enabled
      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).not.toBeDisabled();

      // ===== CLICK NEXT =====
      const user = userEvent.setup();
      await user.click(nextButton);

      // Verify setPage was called with 2
      expect(mockSetPage).toHaveBeenCalledWith(2);

      // Mock now returns page 2
      (useTransfersList as any).mockReturnValue({
        items: page2Items,
        total: 7,
        page: 2,
        totalPages: 2,
        setPage: mockSetPage,
        loading: false,
        error: null,
        refresh: mockRefresh,
      });

      // Trigger re-render with new page
      rerender(<PendingTransfersSent showAllStatuses={true} />);

      // ===== PAGE 2 VALIDATION =====
      // Wait for new items to appear
      await waitFor(() => {
        expect(screen.queryByText(/item 1/i)).not.toBeInTheDocument();
      });
      expect(screen.getByText(/item 6/i)).toBeInTheDocument();
      expect(screen.getByText(/item 7/i)).toBeInTheDocument();

      // Validate counter shows "Showing 6–7 of 7"
      expect(screen.getByText(/showing 6–7 of 7/i)).toBeInTheDocument();

      // Validate page indicator shows "Page 2 / 2"
      expect(screen.getByText(/page 2 \/ 2/i)).toBeInTheDocument();

      // Validate Prev button is now enabled
      expect(prevButton).not.toBeDisabled();

      // Validate Next button is now disabled
      expect(nextButton).toBeDisabled();

      // ===== CLICK PREV =====
      await user.click(prevButton);

      // Verify setPage was called with 1
      expect(mockSetPage).toHaveBeenCalledWith(1);

      // Mock returns page 1 again
      (useTransfersList as any).mockReturnValue({
        items: page1Items,
        total: 7,
        page: 1,
        totalPages: 2,
        setPage: mockSetPage,
        loading: false,
        error: null,
        refresh: mockRefresh,
      });

      // Trigger re-render back to page 1
      rerender(<PendingTransfersSent showAllStatuses={true} />);

      // ===== BACK TO PAGE 1 VALIDATION =====
      await waitFor(() => {
        expect(screen.getByText(/item 1/i)).toBeInTheDocument();
      });
      expect(screen.getByText(/showing 1–5 of 7/i)).toBeInTheDocument();
      expect(screen.getByText(/page 1 \/ 2/i)).toBeInTheDocument();
      expect(prevButton).toBeDisabled();
      expect(nextButton).not.toBeDisabled();
    });

    it('handles edge case: exactly 5 items (single page)', async () => {
      const { useTransfersList } = await import('../hooks/useTransfersList');

      const items = [
        buildPendingSent(1, { tokenId: 101, tokenName: 'Item 1', amount: 10, to: '0xfactory' }),
        buildPendingSent(2, {
          tokenId: 102,
          tokenName: 'Item 2',
          amount: 20,
          to: '0xfactory',
          status: 'Accepted',
        }),
        buildPendingSent(3, {
          tokenId: 103,
          tokenName: 'Item 3',
          amount: 15,
          to: '0xfactory',
          status: 'Rejected',
        }),
        buildPendingSent(4, { tokenId: 104, tokenName: 'Item 4', amount: 25, to: '0xfactory' }),
        buildPendingSent(5, {
          tokenId: 105,
          tokenName: 'Item 5',
          amount: 30,
          to: '0xfactory',
          status: 'Accepted',
        }),
      ];

      (useTransfersList as any).mockReturnValue({
        items,
        total: 5,
        page: 1,
        totalPages: 1,
        setPage: vi.fn(),
        loading: false,
        error: null,
        refresh: vi.fn(),
      });

      const PendingTransfersSent = (await import('../components/tokenOps/OutgoingTransfers'))
        .default;
      render(<PendingTransfersSent showAllStatuses={true} />);

      // Validate counter shows "Showing 1–5 of 5"
      expect(await screen.findByText(/showing 1–5 of 5/i)).toBeInTheDocument();

      // Validate page indicator shows "Page 1 / 1"
      expect(screen.getByText(/page 1 \/ 1/i)).toBeInTheDocument();

      // Both buttons should be disabled
      expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    });

    it('handles edge case: 12 items (3 pages)', async () => {
      const { useTransfersList } = await import('../hooks/useTransfersList');

      const page1Items = Array.from({ length: 5 }, (_, i) =>
        buildPendingSent(i + 1, {
          tokenId: 101 + i,
          tokenName: `Item ${i + 1}`,
          amount: 10 + i,
          to: '0xfactory',
        })
      );

      (useTransfersList as any).mockReturnValue({
        items: page1Items,
        total: 12,
        page: 1,
        totalPages: 3,
        setPage: vi.fn(),
        loading: false,
        error: null,
        refresh: vi.fn(),
      });

      const PendingTransfersSent = (await import('../components/tokenOps/OutgoingTransfers'))
        .default;
      render(<PendingTransfersSent showAllStatuses={true} />);

      // Validate counter shows "Showing 1–5 of 12"
      expect(await screen.findByText(/showing 1–5 of 12/i)).toBeInTheDocument();

      // Validate page indicator shows "Page 1 / 3"
      expect(screen.getByText(/page 1 \/ 3/i)).toBeInTheDocument();

      // Next should be enabled for navigation
      expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
    });
  });

  describe('clickability and actionability', () => {
    it('clicking Next should advance the page indicators', async () => {
      const user = userEvent.setup();
      const { useTransfersList } = await import('../hooks/useTransfersList');

      // Page 1 of 2, 7 total items, 5 in current page
      const page1Items = [1, 2, 3, 4, 5].map((i) =>
        buildPendingSent(i, { tokenId: i, tokenName: `T${i}`, amount: i, to: '0xB' })
      );

      const page2Items = [6, 7].map((i) =>
        buildPendingSent(i, { tokenId: i, tokenName: `T${i}`, amount: i, to: '0xB' })
      );

      const mockSetPage = vi.fn();
      (useTransfersList as any).mockReturnValue({
        items: page1Items,
        total: 7,
        page: 1,
        totalPages: 2,
        setPage: mockSetPage,
        loading: false,
        error: null,
        refresh: vi.fn(),
      });

      const PendingTransfersSent = (await import('../components/tokenOps/OutgoingTransfers'))
        .default;

      const { rerender } = render(<PendingTransfersSent showAllStatuses={true} />);

      // Initial assertions
      expect(screen.getByText(/Showing 1–5 of 7/i)).toBeInTheDocument();
      expect(screen.getByText(/Page 1 \/ 2/i)).toBeInTheDocument();

      const nextBtn = screen.getByRole('button', { name: /next/i });
      expect(nextBtn).toBeEnabled();

      // Click Next
      await user.click(nextBtn);

      // Verify setPage was called with 2
      expect(mockSetPage).toHaveBeenCalledWith(2);

      // Update mock to return page 2 data
      (useTransfersList as any).mockReturnValue({
        items: page2Items,
        total: 7,
        page: 2,
        totalPages: 2,
        setPage: mockSetPage,
        loading: false,
        error: null,
        refresh: vi.fn(),
      });

      // Rerender component with updated state
      rerender(<PendingTransfersSent showAllStatuses={true} />);

      // Verify UI updated to page 2
      expect(screen.getByText(/Showing 6–7 of 7/i)).toBeInTheDocument();
      expect(screen.getByText(/Page 2 \/ 2/i)).toBeInTheDocument();
    });

    it('clicking Prev should go back to page 1 indicators', async () => {
      const user = userEvent.setup();
      const { useTransfersList } = await import('../hooks/useTransfersList');

      // Page 1 and Page 2 data
      const page1Items = [1, 2, 3, 4, 5].map((i) =>
        buildPendingSent(i, { tokenId: i, tokenName: `T${i}`, amount: i, to: '0xB' })
      );

      const page2Items = [6, 7].map((i) =>
        buildPendingSent(i, { tokenId: i, tokenName: `T${i}`, amount: i, to: '0xB' })
      );

      const mockSetPage = vi.fn();
      // Start on Page 2 of 2
      (useTransfersList as any).mockReturnValue({
        items: page2Items,
        total: 7,
        page: 2,
        totalPages: 2,
        setPage: mockSetPage,
        loading: false,
        error: null,
        refresh: vi.fn(),
      });

      const PendingTransfersSent = (await import('../components/tokenOps/OutgoingTransfers'))
        .default;

      const { rerender } = render(<PendingTransfersSent showAllStatuses={true} />);

      // Initial assertions (page 2)
      expect(screen.getByText(/Showing 6–7 of 7/i)).toBeInTheDocument();
      expect(screen.getByText(/Page 2 \/ 2/i)).toBeInTheDocument();

      const prevBtn = screen.getByRole('button', { name: /prev/i });
      expect(prevBtn).toBeEnabled();

      // Click Prev
      await user.click(prevBtn);

      // Verify setPage was called with 1
      expect(mockSetPage).toHaveBeenCalledWith(1);

      // Update mock to return page 1 data
      (useTransfersList as any).mockReturnValue({
        items: page1Items,
        total: 7,
        page: 1,
        totalPages: 2,
        setPage: mockSetPage,
        loading: false,
        error: null,
        refresh: vi.fn(),
      });

      // Rerender component with updated state
      rerender(<PendingTransfersSent showAllStatuses={true} />);

      // Verify UI updated back to page 1
      expect(screen.getByText(/Showing 1–5 of 7/i)).toBeInTheDocument();
      expect(screen.getByText(/Page 1 \/ 2/i)).toBeInTheDocument();
    });
  });

  describe('ux safeguards', () => {
    it('Prev/Next clicks do not submit enclosing forms (no page reload)', async () => {
      const onSubmit = vi.fn((e: any) => e.preventDefault());
      const { useTransfersList } = await import('../hooks/useTransfersList');

      // Provide a single-page worth of items with Next enabled by totalPages=2
      (useTransfersList as any).mockReturnValue({
        items: Array.from({ length: 5 }, (_, i) =>
          buildPendingSent(i + 1, {
            tokenId: 100 + i,
            tokenName: `Item ${i + 1}`,
            amount: 10 + i,
            to: '0xB',
          })
        ),
        total: 7,
        page: 1,
        totalPages: 2,
        setPage: vi.fn(),
        loading: false,
        error: null,
        refresh: vi.fn(),
      });

      const PendingTransfersSent = (await import('../components/tokenOps/OutgoingTransfers'))
        .default;

      render(
        <form onSubmit={onSubmit}>
          <PendingTransfersSent showAllStatuses={true} />
        </form>
      );

      // On page 1 of 2, Next should be enabled
      const nextBtn = screen.getByRole('button', { name: /next/i });
      expect(nextBtn).toBeEnabled();

      const user = userEvent.setup();
      await user.click(nextBtn);

      // Assert the enclosing form did not submit (click should not trigger page reload)
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });
});
