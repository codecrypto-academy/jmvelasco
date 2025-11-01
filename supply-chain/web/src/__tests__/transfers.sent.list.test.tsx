import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Default wallet: producer
vi.mock('../hooks/useWallet', () => ({
  useWallet: () => ({ address: '0xproducer' }),
}));

// Default contract mock: no items unless overridden per test
vi.mock('../lib/contract', () => ({
  getPendingBySender: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  getPendingByRecipient: vi.fn(),
}));

// Mock ethers BrowserProvider to avoid real provider checks
vi.mock('ethers', () => ({
  ethers: {
    BrowserProvider: class {
      constructor(_arg: any) {}
    },
  },
}));

// Mock SupplyChain__factory to capture listeners (Requested/Accepted/Rejected)
vi.mock('../types/factories/SupplyChain__factory', () => {
  const saved: Record<string, ((...args: any[]) => Promise<void> | void) | null> = {
    TransferRequested: null,
    TransferAccepted: null,
    TransferRejected: null,
  };
  const contract = {
    filters: {
      TransferRequested: () => 'TransferRequested',
      TransferAccepted: () => 'TransferAccepted',
      TransferRejected: () => 'TransferRejected',
    },
    on: (filter: any, handler: any) => {
      saved[String(filter)] = handler;
    },
    off: (filter: any, handler: any) => {
      if (saved[String(filter)] === handler) saved[String(filter)] = null;
    },
    removeAllListeners: () => {
      Object.keys(saved).forEach((k) => (saved[k] = null));
    },
  };
  return {
    SupplyChain__factory: {
      connect: vi.fn(() => contract),
    },
    __mock: {
      getListener: (evt?: string) => saved[evt || 'TransferRequested'],
      contract,
    },
  };
});

// @ts-expect-error test-only mock export provided via vi.mock above
import { __mock as factoryMock } from '../types/factories/SupplyChain__factory';

// ---------------- Sent list: pending-only ----------------
describe('Transfers – Sent List (pending only)', () => {
  beforeEach(async () => {
    // Ensure hermetic state when tests are shuffled: reset module cache and reapply default mocks
    vi.resetModules();
    // Provide a controlled mock for the transfers list hook to avoid leakage from other suites
    // and still allow dynamic updates via the component's refresh() calls.
    vi.doMock('../hooks/useTransfersList', () => {
      const state: { items: any[]; total: number } = { items: [], total: 0 };
      const pageSize = 5;
      let initialized = false;
      async function fetchPage(addr?: string) {
        try {
          const mod: any = await import('../lib/contract');
          const res = await mod.getPendingBySender(addr, 0, pageSize);
          state.items = res?.items || [];
          state.total = res?.total || 0;
        } catch {
          // keep previous state on error
        }
      }
      return {
        useTransfersList: (opts: any) => {
          // Perform an initial fetch once to align with real hook behaviour
          if (!initialized && state.items.length === 0 && state.total === 0) {
            initialized = true;
            // Fire-and-forget; component re-render is triggered by its own tick on events/tests
            void fetchPage(opts?.address);
          }
          return {
            items: state.items,
            total: state.total,
            page: 1,
            totalPages: Math.max(1, Math.ceil((state.total || 0) / pageSize)),
            setPage: () => {},
            loading: false,
            error: null,
            refresh: async () => {
              await fetchPage(opts?.address);
            },
          };
        },
        __mock: {
          setState: (items: any[], total?: number) => {
            state.items = items;
            state.total = typeof total === 'number' ? total : items.length;
          },
        },
      };
    });
    vi.doMock('../hooks/useWallet', () => ({
      useWallet: () => ({ address: '0xproducer' }),
    }));
    vi.doMock('../lib/contract', () => ({
      getPendingBySender: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      getPendingByRecipient: vi.fn(),
    }));
  });
  it('shows empty state when there are no pending transfers', async () => {
    const PendingTransfersSent = (await import('../components/tokenOps/OutgoingTransfers')).default;
    render(<PendingTransfersSent />);
    expect(screen.getByRole('heading', { name: /Outgoing Transfers/i })).toBeInTheDocument();
    expect(await screen.findByText(/No pending transfers/i)).toBeInTheDocument();
  });

  it('renders a list of pending transfers with basic fields', async () => {
    const { buildPendingSent } = await import('./utils/builders');
    // Seed the mocked hook state directly for initial render
    const { __mock: listMock }: any = await import('../hooks/useTransfersList');
    listMock.setState(
      [
        buildPendingSent(1, {
          tokenName: 'Wheat',
          amount: 10,
          to: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        }),
        buildPendingSent(2, {
          tokenId: 2,
          tokenName: null,
          amount: 5,
          to: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        }),
      ],
      2
    );

    const PendingTransfersSent = (await import('../components/tokenOps/OutgoingTransfers')).default;
    render(<PendingTransfersSent />);

    // Renders token name or fallback "Token #ID"
    expect(await screen.findByText(/Wheat/i)).toBeInTheDocument();
    expect(screen.getByText(/Token #2/i)).toBeInTheDocument();

    // Renders amounts
    expect(screen.getByText(/10/)).toBeInTheDocument();
    expect(screen.getByText(/5/)).toBeInTheDocument();

    // Renders recipient and status
    expect(screen.getByText('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).toBeInTheDocument();
    expect(screen.getAllByText(/Pending/i).length).toBeGreaterThan(0);
  });

  it('updates in real time when a TransferRequested from this sender is emitted', async () => {
    const { buildPendingSent } = await import('./utils/builders');
    const { getPendingBySender } = await import('../lib/contract');
    // Arrange: two sequential responses: empty -> one item
    (getPendingBySender as any)
      .mockResolvedValueOnce({ items: [], total: 0 })
      .mockResolvedValueOnce({
        items: [
          buildPendingSent(3, {
            tokenId: 7,
            tokenName: null,
            amount: 42,
            to: '0xcccccccccccccccccccccccccccccccccccccccc',
          }),
        ],
        total: 1,
      });

    // Needed to allow event listener setup
    (window as any).ethereum = {};

    const PendingTransfersSent = (await import('../components/tokenOps/OutgoingTransfers')).default;
    render(<PendingTransfersSent />);

    // Initially empty
    expect(await screen.findByText(/No pending transfers/i)).toBeInTheDocument();

    // Act: emit a TransferRequested event
    const listener = factoryMock.getListener();
    expect(listener).toBeTruthy();
    await act(async () => {
      await listener!({
        args: [3n, '0xproducer', '0xcccccccccccccccccccccccccccccccccccccccc', 7n, 42n],
      });
    });

    // Assert: list now shows the new item (fallback name)
    await waitFor(() => {
      expect(screen.getByText(/Token #7/i)).toBeInTheDocument();
      expect(screen.getByText('42')).toBeInTheDocument();
    });
  });

  it('ignores TransferRequested events from other senders', async () => {
    const { getPendingBySender } = await import('../lib/contract');
    // Arrange: always empty
    (getPendingBySender as any).mockResolvedValue({ items: [], total: 0 });
    (window as any).ethereum = {};

    const PendingTransfersSent = (await import('../components/tokenOps/OutgoingTransfers')).default;
    render(<PendingTransfersSent />);

    // Emit event from different address
    const listener = factoryMock.getListener();
    expect(listener).toBeTruthy();
    await act(async () => {
      await listener!({
        args: [4n, '0xother', '0xdddddddddddddddddddddddddddddddddddddddd', 9n, 1n],
      });
    });

    // Still empty
    await waitFor(() => {
      expect(screen.getByText(/No pending transfers/i)).toBeInTheDocument();
    });
  });

  it('does not duplicate when the same TransferRequested fires multiple times', async () => {
    const { buildPendingSent } = await import('./utils/builders');
    const { getPendingBySender } = await import('../lib/contract');
    const item = buildPendingSent(5, {
      tokenId: 11,
      tokenName: 'Corn',
      amount: 3,
      to: '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    });
    // Arrange: empty -> one item -> one item (for second refresh)
    (getPendingBySender as any)
      .mockResolvedValueOnce({ items: [], total: 0 })
      .mockResolvedValueOnce({ items: [item], total: 1 })
      .mockResolvedValueOnce({ items: [item], total: 1 });

    (window as any).ethereum = {};

    const PendingTransfersSent = (await import('../components/tokenOps/OutgoingTransfers')).default;
    render(<PendingTransfersSent />);
    expect(await screen.findByText(/No pending transfers/i)).toBeInTheDocument();

    const listener = factoryMock.getListener();
    expect(listener).toBeTruthy();

    // Fire same event twice
    await act(async () => {
      await listener!({
        args: [5n, '0xproducer', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 11n, 3n],
      });
    });
    await act(async () => {
      await listener!({
        args: [5n, '0xproducer', '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee', 11n, 3n],
      });
    });

    // Only one row shown
    await waitFor(() => {
      const rows = screen.getAllByText(/Corn/i);
      expect(rows.length).toBe(1);
    });
  });
});

// ---------------- Sent list: all-statuses mode ----------------
describe('Transfers – Sent List (all statuses)', () => {
  it('renders Accepted and Rejected transfers when showAllStatuses is enabled', async () => {
    vi.resetModules();
    vi.doMock('../hooks/useTransfersList', () => ({
      useTransfersList: () => ({
        items: [
          {
            id: 'txA',
            tokenId: 1,
            tokenName: 'Wheat',
            amount: 10,
            from: '0xproducer',
            to: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
            status: 'Accepted',
            createdAt: 1700000000,
          },
          {
            id: 'txR',
            tokenId: 2,
            tokenName: null,
            amount: 5,
            from: '0xproducer',
            to: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
            status: 'Rejected',
            createdAt: 1700001000,
          },
        ],
        total: 2,
        page: 1,
        setPage: () => {},
        loading: false,
        error: null,
        refresh: () => {},
      }),
    }));

    const { default: Component } = await import('../components/tokenOps/OutgoingTransfers');
    render(<Component showAllStatuses={true} />);

    // Shows table rows with Accepted and Rejected statuses
    expect(await screen.findByText(/Wheat/i)).toBeInTheDocument();
    expect(screen.getByText(/Token #2/i)).toBeInTheDocument();
    expect(screen.getByText(/Accepted/i)).toBeInTheDocument();
    expect(screen.getByText(/Rejected/i)).toBeInTheDocument();
  });

  it('updates to Accepted in real time on TransferAccepted', async () => {
    (window as any).ethereum = {};
    vi.resetModules();
    const results = [
      {
        items: [
          {
            id: 'tx1',
            tokenId: 7,
            tokenName: 'Barley',
            amount: 2,
            from: '0xproducer',
            to: '0xcccccccccccccccccccccccccccccccccccccccc',
            status: 'Pending',
            createdAt: 1700002000,
          },
        ],
        total: 1,
        page: 1,
        setPage: () => {},
        loading: false,
        error: null,
        refresh: vi.fn(),
      },
      {
        items: [
          {
            id: 'tx1',
            tokenId: 7,
            tokenName: 'Barley',
            amount: 2,
            from: '0xproducer',
            to: '0xcccccccccccccccccccccccccccccccccccccccc',
            status: 'Accepted',
            createdAt: 1700002000,
          },
        ],
        total: 1,
        page: 1,
        setPage: () => {},
        loading: false,
        error: null,
        refresh: vi.fn(),
      },
    ];

    let idx = 0;
    vi.doMock('../hooks/useTransfersList', () => ({
      useTransfersList: () => results[Math.min(idx, results.length - 1)],
    }));

    const { default: Component } = await import('../components/tokenOps/OutgoingTransfers');
    render(<Component showAllStatuses={true} />);

    expect(await screen.findByText(/Barley/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending/i)).toBeInTheDocument();

    // Emit Accepted event and switch mocked response to accepted
    idx = 1;
    const accepted = factoryMock.getListener('TransferAccepted');
    expect(accepted).toBeTruthy();
    await act(async () => {
      await accepted!({ args: [1n] });
    });

    await waitFor(() => {
      expect(screen.getByText(/Accepted/i)).toBeInTheDocument();
    });
  });

  it('updates to Rejected in real time on TransferRejected', async () => {
    (window as any).ethereum = {};
    vi.resetModules();
    const results = [
      {
        items: [
          {
            id: 'tx9',
            tokenId: 3,
            tokenName: null,
            amount: 1,
            from: '0xproducer',
            to: '0xdddddddddddddddddddddddddddddddddddddddd',
            status: 'Pending',
            createdAt: 1700001000,
          },
        ],
        total: 1,
        page: 1,
        setPage: () => {},
        loading: false,
        error: null,
        refresh: vi.fn(),
      },
      {
        items: [
          {
            id: 'tx9',
            tokenId: 3,
            tokenName: null,
            amount: 1,
            from: '0xproducer',
            to: '0xdddddddddddddddddddddddddddddddddddddddd',
            status: 'Rejected',
            createdAt: 1700001000,
          },
        ],
        total: 1,
        page: 1,
        setPage: () => {},
        loading: false,
        error: null,
        refresh: vi.fn(),
      },
    ];
    let idx = 0;
    vi.doMock('../hooks/useTransfersList', () => ({
      useTransfersList: () => results[Math.min(idx, results.length - 1)],
    }));

    const { default: Component } = await import('../components/tokenOps/OutgoingTransfers');
    render(<Component showAllStatuses={true} />);

    expect(await screen.findByText(/Token #3/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending/i)).toBeInTheDocument();

    idx = 1;
    const rejected = factoryMock.getListener('TransferRejected');
    expect(rejected).toBeTruthy();
    await act(async () => {
      await rejected!({ args: [9n] });
    });

    await waitFor(() => {
      expect(screen.getByText(/Rejected/i)).toBeInTheDocument();
    });
  });
});

// ---------------- Sent list: read-only rendering for Factory context ----------------
describe('Transfers – Sent List (read-only rendering)', () => {
  // Ensure any module mocks set here do not leak to other suites when running shuffled
  afterEach(() => {
    vi.resetModules();
    vi.unmock('../hooks/useTransfersList');
  });

  it('renders Sent (outgoing) pending transfers in read-only mode', async () => {
    // Ensure previous dynamic hook mocks do not leak
    vi.resetModules();
    vi.doMock('../hooks/useTransfersList', () => ({
      useTransfersList: () => ({
        items: [
          {
            id: 's1',
            tokenId: 300,
            tokenName: 'S1',
            amount: 5,
            to: '0xret',
            from: '0xfactory',
            status: 'Pending',
            createdAt: 1700000000,
          },
        ],
        total: 1,
        page: 1,
        setPage: () => {},
        loading: false,
        error: null,
        refresh: vi.fn(),
      }),
    }));

    const { default: PendingTransfersSent } = await import(
      '../components/tokenOps/OutgoingTransfers'
    );
    render(<PendingTransfersSent />);
    expect(await screen.findByRole('heading', { name: /outgoing transfers/i })).toBeInTheDocument();
    expect(screen.getByText(/s1/i)).toBeInTheDocument();
    // No action buttons expected
    const row = screen.getByText(/s1/i).closest('tr')!;
    expect(row.querySelector('button[name="accept"]')).toBeNull();
    expect(row.querySelector('button[name="reject"]')).toBeNull();
  });
});
