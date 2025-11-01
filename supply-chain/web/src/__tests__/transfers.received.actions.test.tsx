import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import IncomingTransfers from '../components/tokenOps/IncomingTransfers';
import * as contract from '../lib/contract';
import { buildPendingReceived } from './utils/builders';

// Mocks
vi.mock('../lib/contract', () => ({
  getPendingByRecipient: vi.fn(),
  acceptTransfer: vi.fn(),
  rejectTransfer: vi.fn(),
}));
vi.mock('../hooks/useWallet', () => ({
  useWallet: () => ({ address: '0xfactory' }),
}));

describe('Transfers – Received Actions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('disables Accept/Reject buttons for non-Pending transfers', async () => {
    const items = [
      buildPendingReceived(1, {
        id: '1',
        tokenId: 10,
        tokenName: 'Raw Material A',
        amount: 50,
        from: '0xproducer',
        status: 'Accepted',
      }),
      buildPendingReceived(2, {
        id: '2',
        tokenId: 11,
        tokenName: 'Raw Material B',
        amount: 30,
        from: '0xproducer2',
        status: 'Rejected',
      }),
    ];
    (contract as any).getPendingByRecipient.mockResolvedValue({ items, total: 2 });

    render(<IncomingTransfers showAllStatuses={false} />);

    // Wait for first item to load
    await screen.findByText(/raw material a/i);

    for (const item of items) {
      const row = screen.getByText(new RegExp(String(item.tokenName), 'i')).closest('tr');
      const acceptBtn = row?.querySelector('button[name="accept"]') as HTMLButtonElement;
      const rejectBtn = row?.querySelector('button[name="reject"]') as HTMLButtonElement;
      expect(acceptBtn).toBeDisabled();
      expect(rejectBtn).toBeDisabled();
    }
  });

  it('accepts a transfer and updates UI', async () => {
    const initialItems = [
      buildPendingReceived(1, {
        id: '1',
        tokenId: 10,
        tokenName: 'Raw Material A',
        amount: 50,
        from: '0xproducer',
      }),
      buildPendingReceived(2, {
        id: '2',
        tokenId: 11,
        tokenName: 'Raw Material B',
        amount: 30,
        from: '0xproducer2',
      }),
    ];
    const afterAcceptItems = [
      buildPendingReceived(2, {
        id: '2',
        tokenId: 11,
        tokenName: 'Raw Material B',
        amount: 30,
        from: '0xproducer2',
      }),
    ];
    (contract as any).getPendingByRecipient
      .mockResolvedValueOnce({ items: initialItems, total: 2 })
      .mockResolvedValueOnce({ items: afterAcceptItems, total: 1 });
    (contract as any).acceptTransfer.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 0))
    );

    render(<IncomingTransfers showAllStatuses={false} />);

    expect(await screen.findByText(/raw material a/i)).toBeInTheDocument();

    // Click Accept on row A
    const rowA = screen.getByText(/raw material a/i).closest('tr')!;
    const acceptBtn = rowA.querySelector('button[name="accept"]') as HTMLButtonElement;
    expect(acceptBtn).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(acceptBtn);

    await waitFor(() => expect((contract as any).acceptTransfer).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.queryByText(/raw material a/i)).not.toBeInTheDocument());
    expect(screen.getByText(/raw material b/i)).toBeInTheDocument();
  });

  it('rejects a transfer and updates UI', async () => {
    const initialItems = [
      buildPendingReceived(3, {
        id: '3',
        tokenId: 12,
        tokenName: 'Raw Material C',
        amount: 20,
        from: '0xproducer3',
      }),
      buildPendingReceived(4, {
        id: '4',
        tokenId: 13,
        tokenName: 'Raw Material D',
        amount: 40,
        from: '0xproducer4',
      }),
    ];
    const afterRejectItems = [
      buildPendingReceived(4, {
        id: '4',
        tokenId: 13,
        tokenName: 'Raw Material D',
        amount: 40,
        from: '0xproducer4',
      }),
    ];
    (contract as any).getPendingByRecipient
      .mockResolvedValueOnce({ items: initialItems, total: 2 })
      .mockResolvedValueOnce({ items: afterRejectItems, total: 1 });
    (contract as any).rejectTransfer.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 0))
    );

    render(<IncomingTransfers showAllStatuses={false} />);

    expect(await screen.findByText(/raw material c/i)).toBeInTheDocument();
    const rowC = screen.getByText(/raw material c/i).closest('tr')!;
    const rejectBtn = rowC.querySelector('button[name="reject"]') as HTMLButtonElement;
    expect(rejectBtn).toBeInTheDocument();
    const user = userEvent.setup();
    await user.click(rejectBtn);

    await waitFor(() => expect((contract as any).rejectTransfer).toHaveBeenCalledWith(3));
    await waitFor(() => expect(screen.queryByText(/raw material c/i)).not.toBeInTheDocument());
    expect(screen.getByText(/raw material d/i)).toBeInTheDocument();
  });

  it('shows error message on accept failure', async () => {
    const initialItems = [
      buildPendingReceived(5, {
        id: '5',
        tokenId: 20,
        tokenName: 'Raw Material E',
        amount: 10,
        from: '0xproducer5',
      }),
    ];
    (contract as any).getPendingByRecipient.mockResolvedValue({ items: initialItems, total: 1 });
    (contract as any).acceptTransfer.mockRejectedValue(new Error('boom'));

    render(<IncomingTransfers showAllStatuses={false} />);

    const rowE = await screen.findByText(/raw material e/i);
    const acceptBtn = rowE
      .closest('tr')!
      .querySelector('button[name="accept"]') as HTMLButtonElement;
    const user = userEvent.setup();
    await user.click(acceptBtn);

    expect(await screen.findByText(/boom/i)).toBeInTheDocument();
    // List unchanged
    expect(screen.getByText(/raw material e/i)).toBeInTheDocument();
  });

  it('disables buttons while processing', async () => {
    const initialItems = [
      buildPendingReceived(6, {
        id: '6',
        tokenId: 21,
        tokenName: 'Raw Material F',
        amount: 15,
        from: '0xproducer6',
      }),
    ];
    (contract as any).getPendingByRecipient.mockResolvedValue({ items: initialItems, total: 1 });
    // Keep promise pending to observe disabled state
    let resolveFn: () => void;
    (contract as any).acceptTransfer.mockImplementation(
      () => new Promise<void>((resolve) => (resolveFn = () => resolve()))
    );

    render(<IncomingTransfers showAllStatuses={false} />);

    const user = userEvent.setup();
    const rowF = await screen.findByText(/raw material f/i);
    const acceptBtn = rowF
      .closest('tr')!
      .querySelector('button[name="accept"]') as HTMLButtonElement;
    expect(acceptBtn).toBeInTheDocument();
    expect(acceptBtn).not.toBeDisabled();

    await user.click(acceptBtn);
    expect(acceptBtn).toBeDisabled();

    // Now resolve and ensure cleanup happens
    resolveFn!();
    await waitFor(() => expect((contract as any).acceptTransfer).toHaveBeenCalledWith(6));
  });

  it('respects pagination after actions', async () => {
    // Page 1: 5 items of 6 total
    const page1Items = [1, 2, 3, 4, 5].map((i) =>
      buildPendingReceived(i, {
        id: String(i),
        tokenId: 100 + i,
        tokenName: `Item ${i}`,
        amount: 10,
        from: `0xprod${i}`,
      })
    );
    const page2Items = [
      buildPendingReceived(6, {
        id: '6',
        tokenId: 106,
        tokenName: 'Item 6',
        amount: 10,
        from: '0xprod6',
      }),
    ];

    (contract as any).getPendingByRecipient
      .mockResolvedValueOnce({ items: page1Items, total: 6 }) // initial load page 1
      .mockResolvedValueOnce({ items: page2Items, total: 6 }) // after clicking Next
      .mockResolvedValueOnce({ items: [], total: 5 }) // after accepting last item on page 2
      .mockResolvedValueOnce({ items: page1Items, total: 5 }); // after hook adjusts page back

    (contract as any).acceptTransfer.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 0))
    );

    render(<IncomingTransfers showAllStatuses={false} />);

    // We are at page 1
    expect(await screen.findByText(/item 1/i)).toBeInTheDocument();
    // Go to page 2
    const nextBtn = screen.getByRole('button', { name: /next/i });
    await userEvent.click(nextBtn);
    expect(await screen.findByText(/item 6/i)).toBeInTheDocument();

    // Accept the only item on page 2
    const row = screen.getByText(/item 6/i).closest('tr')!;
    const acceptBtn = row.querySelector('button[name="accept"]') as HTMLButtonElement;
    await userEvent.click(acceptBtn);

    // After accept, list should adjust back to page 1 showing items 1..5, total=5
    await waitFor(() => expect(screen.getByText(/item 1/i)).toBeInTheDocument());
    // Optional: check page label
    expect(screen.getByText(/page 1 /i)).toBeInTheDocument();
  });

  it('guards: only recipient can act', async () => {
    // Wallet mocked as 0xfactory globally; return an item addressed to someone else
    (contract as any).getPendingByRecipient.mockResolvedValue({
      items: [
        buildPendingReceived(7, {
          id: '7',
          tokenId: 130,
          tokenName: 'Alien Item',
          amount: 1,
          from: '0xprodX',
          to: '0xnotfactory',
        }),
      ],
      total: 1,
    });

    const PendingTransfersReceived = (await import('../components/tokenOps/IncomingTransfers'))
      .default;
    render(<PendingTransfersReceived showAllStatuses={false} />);

    // Row renders but no actions should be available
    expect(await screen.findByText(/alien item/i)).toBeInTheDocument();
    const row = screen.getByText(/alien item/i).closest('tr')!;
    expect(row.querySelector('button[name="accept"]')).toBeNull();
    expect(row.querySelector('button[name="reject"]')).toBeNull();
  });
});
