import { describe, expect, it } from 'vitest';
import type { TokenDetails } from '../lib/contract';
import { mergeTokenDetails } from '../lib/tokens';
import { buildToken } from './utils/builders';

describe('mergeTokenDetails', () => {
  const mockToken1: TokenDetails = buildToken({
    id: 1,
    name: 'Wheat',
  });

  const mockToken2: TokenDetails = buildToken({
    id: 2,
    creator: '0xfactory',
    name: 'Flour',
    totalSupply: 50,
    features: '{"type":"processed"}',
    parentId: 1,
    dateCreated: 1700000100,
    balance: 50,
  });

  it('adds a new token to an empty list', () => {
    const result = mergeTokenDetails([], mockToken1);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(mockToken1);
  });

  it('updates an existing token by ID', () => {
    const existing = [mockToken1];
    const updated = { ...mockToken1, balance: 150 };

    const result = mergeTokenDetails(existing, updated);

    expect(result).toHaveLength(1);
    expect(result[0].balance).toBe(150);
    expect(result[0].id).toBe(1);
  });

  it('adds a new token to an existing list', () => {
    const existing = [mockToken1];

    const result = mergeTokenDetails(existing, mockToken2);

    expect(result).toHaveLength(2);
    expect(result.find((t) => t.id === 1)).toEqual(mockToken1);
    expect(result.find((t) => t.id === 2)).toEqual(mockToken2);
  });

  it('merges multiple tokens at once (array input)', () => {
    const existing = [mockToken1];
    const updated1 = { ...mockToken1, balance: 150 };
    const newToken = mockToken2;

    const result = mergeTokenDetails(existing, [updated1, newToken]);

    expect(result).toHaveLength(2);
    expect(result.find((t) => t.id === 1)?.balance).toBe(150);
    expect(result.find((t) => t.id === 2)).toEqual(mockToken2);
  });

  it('preserves tokens not affected by the merge', () => {
    const mockToken3: TokenDetails = buildToken({
      id: 3,
      creator: '0xretailer',
      name: 'Bread',
      totalSupply: 20,
      features: '{"type":"final"}',
      parentId: 2,
      dateCreated: 1700000200,
      balance: 20,
    });

    const existing = [mockToken1, mockToken2, mockToken3];
    const updated = { ...mockToken2, balance: 75 };

    const result = mergeTokenDetails(existing, updated);

    expect(result).toHaveLength(3);
    expect(result.find((t) => t.id === 1)).toEqual(mockToken1); // unchanged
    expect(result.find((t) => t.id === 2)?.balance).toBe(75); // updated
    expect(result.find((t) => t.id === 3)).toEqual(mockToken3); // unchanged
  });

  it('returns a new array (immutable)', () => {
    const existing = [mockToken1];

    const result = mergeTokenDetails(existing, mockToken2);

    expect(result).not.toBe(existing);
    expect(existing).toHaveLength(1); // original unchanged
  });

  it('handles duplicate IDs in update array (last wins)', () => {
    const existing = [mockToken1];
    const update1 = { ...mockToken1, balance: 150 };
    const update2 = { ...mockToken1, balance: 200 };

    const result = mergeTokenDetails(existing, [update1, update2]);

    expect(result).toHaveLength(1);
    expect(result[0].balance).toBe(200); // last update wins
  });
});
