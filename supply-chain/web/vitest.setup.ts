// vitest setup file
import '@testing-library/jest-dom';
import { ethers } from 'ethers';
import { vi } from 'vitest';

// Provide a minimal ethereum mock when needed in tests (opt-in per test)
declare global {
  interface Window {
    ethereum?: any;
  }
}

// Reduce console noise from ENS lookups in tests by stubbing provider methods that
// would attempt ENS resolution on anvil/unknown networks.
try {
  vi.spyOn(ethers.JsonRpcProvider.prototype as any, 'resolveName').mockResolvedValue(null);
} catch {}

try {
  // Some versions may call getResolver internally; ensure it doesn't throw
  vi.spyOn(ethers.JsonRpcProvider.prototype as any, 'getResolver').mockResolvedValue(null);
} catch {}

// Mock console.error to prevent stderr pollution during tests
// while still allowing tests to verify error handling behavior
const originalConsoleError = console.error;
vi.spyOn(console, 'error').mockImplementation((...args: any[]) => {
  const message = args[0]?.toString() || '';

  // Silence known test-related error messages that are expected during error-case testing
  if (
    message.includes('Error processing materials:') ||
    message.includes('Error calculating available balance:') ||
    message.includes('JsonRpcProvider failed to detect network')
  ) {
    return; // Silently ignore these expected errors in tests
  }

  // Allow other errors to still be logged (for debugging real issues)
  originalConsoleError.apply(console, args);
});
