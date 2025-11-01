import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useContractEvent } from '../hooks/useContractEvent';

// Mock ethers BrowserProvider
vi.mock('ethers', () => ({
  ethers: {
    BrowserProvider: class {
      constructor(_arg: any) {}
    },
  },
}));

// Mock SupplyChain__factory
vi.mock('../types/factories/SupplyChain__factory', () => {
  const mockContract = {
    filters: {
      TokenCreated: vi.fn(() => 'TokenCreatedFilter'),
      TransferAccepted: vi.fn(() => 'TransferAcceptedFilter'),
    },
    on: vi.fn(),
    off: vi.fn(),
    removeAllListeners: vi.fn(),
  };

  return {
    SupplyChain__factory: {
      connect: vi.fn(() => mockContract),
    },
    __mock: {
      contract: mockContract,
    },
  };
});

// @ts-expect-error test-only mock export
import { __mock as factoryMock } from '../types/factories/SupplyChain__factory';

describe('useContractEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Setup window.ethereum for tests
    (window as any).ethereum = {};
  });

  it('registers event listener on mount', async () => {
    const handler = vi.fn();

    renderHook(() => useContractEvent('TokenCreated', handler, []));

    // Allow async setup to complete
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify filter was created and handler registered
    expect(factoryMock.contract.filters.TokenCreated).toHaveBeenCalled();
    expect(factoryMock.contract.on).toHaveBeenCalledWith(
      'TokenCreatedFilter',
      expect.any(Function)
    );
  });

  it('cleans up listener on unmount', async () => {
    const handler = vi.fn();

    const { unmount } = renderHook(() => useContractEvent('TokenCreated', handler, []));

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Unmount and verify cleanup
    unmount();

    expect(factoryMock.contract.off).toHaveBeenCalledWith('TokenCreated', expect.any(Function));
  });

  it('re-registers when eventName changes', async () => {
    const handler = vi.fn();
    let eventName = 'TokenCreated';

    const { rerender } = renderHook(() => useContractEvent(eventName, handler, []));

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify TokenCreated registered
    expect(factoryMock.contract.filters.TokenCreated).toHaveBeenCalled();

    // Clear mocks and change event name
    vi.clearAllMocks();
    eventName = 'TransferAccepted';
    rerender();

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify TransferAccepted registered
    expect(factoryMock.contract.filters.TransferAccepted).toHaveBeenCalled();
    expect(factoryMock.contract.on).toHaveBeenCalledWith(
      'TransferAcceptedFilter',
      expect.any(Function)
    );
  });

  it('handles setup errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = vi.fn();

    // Make filters throw error
    factoryMock.contract.filters.TokenCreated.mockImplementation(() => {
      throw new Error('Setup failed');
    });

    renderHook(() => useContractEvent('TokenCreated', handler, []));

    await new Promise((resolve) => setTimeout(resolve, 0));

    // Verify error was logged but hook didn't crash
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error setting up TokenCreated listener:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});
