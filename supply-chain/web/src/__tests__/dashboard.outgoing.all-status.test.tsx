import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { buildPendingSent } from './utils/builders';

// Mock wallet and user to show Producer dashboard (only Outgoing Transfers section)
vi.mock('../hooks/useWallet', () => ({
  useWallet: () => ({ address: '0xprod', isConnected: true }),
}));
vi.mock('../hooks/useUserInfo', () => ({
  useUserInfo: () => ({
    userInfo: { role: 'Producer', status: 'Approved' },
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

// Mock the unified hook in all-status mode to return mixed statuses
vi.mock('../hooks/useTransfersList', () => ({
  useTransfersList: () => ({
    items: [
      buildPendingSent(1, {
        id: 't1',
        tokenId: 1,
        tokenName: 'Wheat',
        amount: 4,
        from: '0xprod',
        to: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        status: 'Accepted',
        createdAt: 1700000000,
      }),
      buildPendingSent(2, {
        id: 't2',
        tokenId: 2,
        tokenName: null,
        amount: 1,
        from: '0xprod',
        to: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        status: 'Rejected',
        createdAt: 1700000100,
      }),
    ],
    total: 2,
    page: 1,
    setPage: () => {},
    loading: false,
    error: null,
    refresh: () => {},
  }),
}));

describe('Dashboard Outgoing Transfers (all statuses)', () => {
  it('shows Accepted and Rejected items in Outgoing Transfers', async () => {
    const { default: Dashboard } = await import('../pages/Dashboard');
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Outgoing Transfers/i })).toBeInTheDocument();
      expect(screen.getByText(/Wheat/i)).toBeInTheDocument();
      expect(screen.getByText(/Accepted/i)).toBeInTheDocument();
      expect(screen.getByText(/Token #2/i)).toBeInTheDocument();
      expect(screen.getByText(/Rejected/i)).toBeInTheDocument();
    });
  });
});
