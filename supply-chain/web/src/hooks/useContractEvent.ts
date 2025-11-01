import { ethers } from 'ethers';
import { useCallback, useEffect } from 'react';
import { CONTRACT_CONFIG } from '../config/contracts';
import { SupplyChain__factory } from '../types/factories/SupplyChain__factory';

/**
 * Custom hook for listening to SupplyChain contract events
 *
 * Handles provider/contract setup, event registration, and cleanup automatically.
 * Eliminates duplication of event listener boilerplate across components.
 *
 * @param eventName - Name of the contract event to listen for (e.g., 'TokenCreated', 'TransferAccepted')
 * @param handler - Async function to handle the event when it fires
 * @param deps - Dependencies array for handler memoization (include all variables used in handler)
 *
 * @example
 * ```typescript
 * useContractEvent('TokenCreated', async (event) => {
 *   const { tokenId, creator } = event.args;
 *   // ... handle event
 * }, [userAddress]);
 * ```
 */
export function useContractEvent(
  eventName: string,
  handler: (...args: any[]) => Promise<void> | void,
  deps: any[] = []
) {
  // Memoize handler to prevent unnecessary re-registrations
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const memoizedHandler = useCallback(handler, deps);

  useEffect(() => {
    // Guard: only run in browser with MetaMask/provider available
    if (typeof window === 'undefined' || !window.ethereum) {
      return;
    }

    let contract: any;

    async function setup() {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        contract = SupplyChain__factory.connect(CONTRACT_CONFIG.address, provider);

        // Create event filter and register handler
        const filter = contract.filters[eventName]?.();
        if (filter) {
          contract.on(filter, memoizedHandler);
        }
      } catch (e) {
        console.error(`Error setting up ${eventName} listener:`, e);
      }
    }

    setup();

    // Cleanup: remove listener on unmount or when dependencies change
    return () => {
      if (contract && memoizedHandler) {
        try {
          // Try primary cleanup method
          contract.off(eventName, memoizedHandler);
        } catch {
          // Fallback: remove all listeners for this event
          try {
            contract.removeAllListeners?.(eventName);
          } catch (cleanupError) {
            console.error(`Error cleaning up ${eventName} listener:`, cleanupError);
          }
        }
      }
    };
  }, [eventName, memoizedHandler]);
}
