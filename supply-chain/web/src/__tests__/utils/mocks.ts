// Test Utilities: Standardized mocks for hooks and contract layer
import { vi } from 'vitest';
import type { TransferLike } from './builders';

// Decision: default mockUseTransfersList behavior is STATIC.
// Rationale: most suites just render lists/pagination and don't require dynamic refresh.
// Opt-in to stateful when testing realtime/event-driven updates to keep tests predictable.

export type StaticListConfig = {
  items?: TransferLike[];
  total?: number;
  page?: number;
  totalPages?: number;
  loading?: boolean;
  error?: any;
  pageSize?: number;
};

export type StatefulListConfig = {
  stateful: true;
  initial?: { items?: TransferLike[]; total?: number };
  pageSize?: number;
  /**
   * If true, the first render performs an initial fetch using getPendingBySender
   * to consume the first mocked value (aligns with suites relying on empty → item sequencing).
   * Defaults to true.
   */
  initialFetch?: boolean;
};

export type MockUseTransfersListReturn = {
  // For stateful mode, expose controller for direct seeding
  controller?: {
    setState: (items: TransferLike[], total?: number) => void;
  };
};

export function mockUseTransfersList(
  config: StaticListConfig | StatefulListConfig = {}
): MockUseTransfersListReturn {
  // Module ids relative to this utils file location (src/__tests__/utils)
  const moduleId = '../../hooks/useTransfersList';

  // Stateful mode
  if ((config as StatefulListConfig).stateful) {
    const cfg = config as StatefulListConfig;
    const pageSize = cfg.pageSize ?? 5;
    const state = {
      items: cfg.initial?.items ?? [],
      total: cfg.initial?.total ?? 0,
    };
    let initialized = false;
    vi.doMock(moduleId, () => ({
      useTransfersList: (opts: any) => {
        if (!initialized && (cfg.initialFetch ?? true)) {
          initialized = true;
          (async () => {
            try {
              const mod: any = await import('../../lib/contract');
              const res = await mod.getPendingBySender?.(opts?.address, 0, pageSize);
              if (res && typeof res === 'object') {
                state.items = res.items ?? state.items;
                state.total = typeof res.total === 'number' ? res.total : state.total;
              }
            } catch {
              // keep previous state
            }
          })();
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
            try {
              const mod: any = await import('../../lib/contract');
              const res = await mod.getPendingBySender?.(opts?.address, 0, pageSize);
              if (res && typeof res === 'object') {
                state.items = res.items ?? state.items;
                state.total = typeof res.total === 'number' ? res.total : state.total;
              }
            } catch {
              // keep previous state
            }
          },
        };
      },
      __mock: {
        setState: (items: TransferLike[], total?: number) => {
          state.items = items;
          state.total = typeof total === 'number' ? total : items.length;
        },
      },
    }));
    return {
      controller: {
        setState: (items: TransferLike[], total?: number) => {
          state.items = items;
          state.total = typeof total === 'number' ? total : items.length;
        },
      },
    };
  }

  // Static/default mode
  const s = config as StaticListConfig;
  const items = s.items ?? [];
  const total = s.total ?? items.length;
  const page = s.page ?? 1;
  const pageSize = s.pageSize ?? 5;
  const totalPages = s.totalPages ?? Math.max(1, Math.ceil(total / pageSize));
  const loading = s.loading ?? false;
  const error = s.error ?? null;

  vi.doMock(moduleId, () => ({
    useTransfersList: () => ({
      items,
      total,
      page,
      totalPages,
      setPage: () => {},
      loading,
      error,
      refresh: () => {},
    }),
  }));

  return {};
}

export type ContractOverrides = Partial<{
  getPendingBySender: any | Array<{ items: TransferLike[]; total: number } | (() => any)>;
  getPendingByRecipient: any | Array<{ items: TransferLike[]; total: number } | (() => any)>;
  getUserTokensWithBalance: any | Array<any>;
}>;

export function mockContract(overrides: ContractOverrides = {}) {
  const moduleId = '../../lib/contract';

  const fnOrSequence = (value: any) => {
    const fn = vi.fn as unknown as (impl?: any) => any;
    const mockFn: any = fn();
    if (Array.isArray(value)) {
      value.forEach((v) => {
        if (typeof v === 'function') {
          mockFn.mockImplementationOnce(v as any);
        } else {
          mockFn.mockResolvedValueOnce(v);
        }
      });
    } else {
      if (typeof value === 'function') {
        mockFn.mockImplementation(value);
      } else {
        mockFn.mockResolvedValue(value);
      }
    }
    return mockFn;
  };

  const mocked: Record<string, any> = {};
  if (overrides.getPendingBySender !== undefined) {
    mocked.getPendingBySender = fnOrSequence(overrides.getPendingBySender);
  }
  if (overrides.getPendingByRecipient !== undefined) {
    mocked.getPendingByRecipient = fnOrSequence(overrides.getPendingByRecipient);
  }
  if (overrides.getUserTokensWithBalance !== undefined) {
    mocked.getUserTokensWithBalance = fnOrSequence(overrides.getUserTokensWithBalance);
  }

  vi.doMock(moduleId, () => ({
    ...mocked,
  }));

  return mocked;
}

// Console noise helpers
let originalError: typeof console.error | null = null;
export function silenceConsoleErrors() {
  if (!originalError) {
    originalError = console.error;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    console.error = () => {};
  }
}
export function restoreConsole() {
  if (originalError) {
    console.error = originalError;
    originalError = null;
  }
}
