import type { TokenDetails } from './contract';

/**
 * Merges existing token details with updates, using token ID as the unique key.
 *
 * This helper is used to update token lists when receiving fresh data from:
 * - Initial fetch (getUserTokensWithBalance + getTokenDetails)
 * - Real-time events (TokenCreated, TransferAccepted)
 *
 * The merge strategy:
 * - Existing tokens are preserved by ID
 * - Updates overwrite existing entries with the same ID
 * - New tokens are added
 * - Returns a new array (immutable update pattern)
 *
 * @param existing - Current list of token details
 * @param updates - Single token or array of tokens to merge/add
 * @returns New array with merged token details
 *
 * @example
 * ```typescript
 * const current = [{ id: 1, balance: 100, ... }];
 * const updated = mergeTokenDetails(current, { id: 1, balance: 150, ... });
 * // Result: [{ id: 1, balance: 150, ... }] - balance updated
 *
 * const withNew = mergeTokenDetails(current, [
 *   { id: 1, balance: 150, ... },
 *   { id: 2, balance: 50, ... }
 * ]);
 * // Result: [{ id: 1, balance: 150, ... }, { id: 2, balance: 50, ... }]
 * ```
 */
export function mergeTokenDetails(
  existing: TokenDetails[],
  updates: TokenDetails | TokenDetails[]
): TokenDetails[] {
  const byId = new Map<string, TokenDetails>();
  for (const t of existing) byId.set(String(t.id), t);
  const arr = Array.isArray(updates) ? updates : [updates];
  for (const u of arr) byId.set(String(u.id), u);
  return Array.from(byId.values());
}
