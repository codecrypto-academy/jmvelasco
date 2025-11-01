// Test Utilities: per-suite setup (opt-in)
// Import this file at the top of a suite to standardize cleanup and mocks reset.

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  // Reset spied functions and mocked implementations
  // Note: This does not clear module cache; suites should call vi.resetModules() when needed.
  // We keep module cache control explicit to avoid surprises in shuffled runs.
  // eslint-disable-next-line no-undef
  vi.resetAllMocks();
  cleanup();
});

// Optional minimal provider wrapper (opt-in per suite if needed)
export function ensureEthereumStub() {
  if (typeof window !== 'undefined') {
    (window as any).ethereum = (window as any).ethereum || {};
  }
}
