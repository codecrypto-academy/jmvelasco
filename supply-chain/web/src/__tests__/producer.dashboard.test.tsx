import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import Dashboard from '../pages/Dashboard';
import { buildPendingSent } from './utils/builders';

describe('Producer Dashboard', () => {
  test('shows dashboard with the required actions for Producer role', async () => {
    // Mock hooks to simulate Producer role
    vi.mock('../hooks/useWallet', () => ({
      useWallet: () => ({ address: '0x123', isConnected: true }),
    }));
    vi.mock('../hooks/useUserInfo', () => ({
      useUserInfo: () => ({
        userInfo: { role: 'Producer', status: 'Approved' },
        loading: false,
        error: null,
      }),
    }));

    // Render dashboard
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Producer Dashboard/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Create Raw Material/i })).toBeInTheDocument();
      expect(
        screen.getByText(/Mint a new raw material token to your address/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/Transfer to Factory/i)).toBeInTheDocument();
      expect(screen.getByText(/Send materials to processing facilities/i)).toBeInTheDocument();
    });
  });

  test('renders pending transfers list when there are items', async () => {
    vi.mock('../hooks/useWallet', () => ({
      useWallet: () => ({ address: '0x123', isConnected: true }),
    }));
    vi.mock('../hooks/useUserInfo', () => ({
      useUserInfo: () => ({
        userInfo: { role: 'Producer', status: 'Approved' },
        loading: false,
        error: null,
      }),
    }));
    // Outgoing list uses unified hook (all-status enabled at Dashboard); mock to return a pending item
    vi.mock('../hooks/useTransfersList', () => ({
      useTransfersList: () => ({
        items: [
          buildPendingSent(1, {
            id: 'tx1',
            tokenId: 1,
            tokenName: 'Wheat',
            amount: 10,
            from: '0x123',
            to: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            createdAt: 1700000000,
          }),
        ],
        total: 1,
        page: 1,
        setPage: () => {},
        loading: false,
        error: null,
        refresh: () => {},
      }),
    }));

    render(<Dashboard />);

    // Should show the Outgoing Transfers section with a row containing Wheat
    expect(await screen.findByRole('heading', { name: /Outgoing Transfers/i })).toBeInTheDocument();
    expect(await screen.findByText(/Wheat/i)).toBeInTheDocument();
    expect(screen.getByText('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toBeInTheDocument();
    expect(screen.getByText(/^Pending$/i)).toBeInTheDocument();
  });
});
