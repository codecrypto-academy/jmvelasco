import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import IncomingTransfers from '../components/tokenOps/IncomingTransfers';
import * as contract from '../lib/contract';
import { buildPendingReceived, buildPendingSent } from './utils/builders';

// Mocks
vi.mock('../lib/contract', () => ({
  getPendingByRecipient: vi.fn(),
  getPendingBySender: vi.fn(),
}));
vi.mock('../hooks/useWallet', () => ({
  useWallet: () => ({ address: '0xfactory' }),
}));

describe('Transfers – Received List', () => {
  it('lists transfers with all statuses (Pending, Accepted, Rejected)', async () => {
    const mockItems = [
      buildPendingReceived(1, {
        tokenId: 10,
        tokenName: 'Raw Material A',
        amount: 50,
        from: '0xproducer',
        status: 'Pending',
      }),
      buildPendingReceived(2, {
        tokenId: 11,
        tokenName: 'Raw Material B',
        amount: 30,
        from: '0xproducer2',
        status: 'Accepted',
      }),
      buildPendingReceived(3, {
        tokenId: 12,
        tokenName: 'Raw Material C',
        amount: 20,
        from: '0xproducer3',
        status: 'Rejected',
      }),
    ];
    (contract as any).getPendingByRecipient.mockResolvedValue({ items: mockItems, total: 3 });

    render(<IncomingTransfers showAllStatuses={false} />);

    expect(await screen.findByText(/raw material a/i)).toBeInTheDocument();
    expect(screen.getByText(/raw material b/i)).toBeInTheDocument();
    expect(screen.getByText(/raw material c/i)).toBeInTheDocument();

    expect(screen.getByTestId('badge-status-Pending')).toBeInTheDocument();
    expect(screen.getByTestId('badge-status-Accepted')).toBeInTheDocument();
    expect(screen.getByTestId('badge-status-Rejected')).toBeInTheDocument();
  });

  it('factory sees both received and sent lists without interference', async () => {
    // Incoming (recipient): 2 pages
    const incPage1 = [1, 2, 3, 4, 5].map((i) =>
      buildPendingReceived(i, {
        tokenId: 200 + i,
        tokenName: `R${i}`,
        amount: 10,
        from: `0xprod${i}`,
      })
    );
    const incPage2 = [
      buildPendingReceived(6, { tokenId: 206, tokenName: 'R6', amount: 10, from: '0xprod6' }),
    ];
    (contract as any).getPendingByRecipient
      .mockResolvedValueOnce({ items: incPage1, total: 6 })
      .mockResolvedValueOnce({ items: incPage2, total: 6 });

    // Sent (sender): single page
    const sentItems = [
      buildPendingSent(1, { id: 's1', tokenId: 300, tokenName: 'S1', amount: 5, to: '0xret' }),
      buildPendingSent(2, { id: 's2', tokenId: 301, tokenName: 'S2', amount: 7, to: '0xret2' }),
    ];
    (contract as any).getPendingBySender.mockResolvedValue({ items: sentItems, total: 2 });

    const PendingTransfersReceived = IncomingTransfers;
    const PendingTransfersSent = (await import('../components/tokenOps/OutgoingTransfers')).default;

    render(
      <div>
        <PendingTransfersReceived showAllStatuses={false} />
        <PendingTransfersSent />
      </div>
    );

    // Both lists show their first pages
    expect(await screen.findByText(/r1/i)).toBeInTheDocument();
    expect(screen.getByText(/s1/i)).toBeInTheDocument();

    // Find Next button within Incoming section and click
    const incomingSection = screen
      .getByRole('heading', { name: /incoming transfers/i })
      .closest('section')!;
    const incomingNext = within(incomingSection).getByRole('button', { name: /next/i });
    await userEvent.click(incomingNext);

    // Incoming advanced to page 2
    expect(await screen.findByText(/r6/i)).toBeInTheDocument();
    // Sent list remains on page 1
    expect(screen.getByText(/s1/i)).toBeInTheDocument();
  });
});
