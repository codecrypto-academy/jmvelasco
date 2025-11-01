import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SimpleTraceabilityCache } from '../lib/traceabilityCache';

describe('SimpleTraceabilityCache', () => {
  let cache: SimpleTraceabilityCache;

  beforeEach(() => {
    cache = new SimpleTraceabilityCache();
  });

  describe('Basic Cache Operations', () => {
    it('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should store and retrieve data correctly', () => {
      const testData = { id: 1, name: 'Test Token' };
      cache.set('test-key', testData);

      expect(cache.get('test-key')).toEqual(testData);
    });

    it('should return null for expired entries after TTL', () => {
      const testData = { id: 1, name: 'Test Token' };
      cache.set('test-key', testData);

      // Mock time passing beyond TTL (2 minutes)
      vi.useFakeTimers();
      vi.advanceTimersByTime(2 * 60 * 1000 + 1); // 2 minutes + 1ms

      expect(cache.get('test-key')).toBeNull();

      vi.useRealTimers();
    });

    it('should clear all entries when clear() is called', () => {
      cache.set('key1', { data: 'value1' });
      cache.set('key2', { data: 'value2' });

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('Cache Key Helpers', () => {
    it('should generate correct token cache keys', () => {
      expect(SimpleTraceabilityCache.tokenKey(123)).toBe('token_123');
      expect(SimpleTraceabilityCache.tokenKey(456)).toBe('token_456');
    });

    it('should generate correct user cache keys', () => {
      expect(SimpleTraceabilityCache.userKey('0x123abc')).toBe('user_0x123abc');
      expect(SimpleTraceabilityCache.userKey('0x456def')).toBe('user_0x456def');
    });

    it('should generate correct lineage cache keys', () => {
      expect(SimpleTraceabilityCache.lineageKey(789)).toBe('lineage_789');
      expect(SimpleTraceabilityCache.lineageKey(101112)).toBe('lineage_101112');
    });

    it('should generate correct transfer history cache keys', () => {
      expect(SimpleTraceabilityCache.transferHistoryKey(123)).toBe('transfers_123');
      expect(SimpleTraceabilityCache.transferHistoryKey(456)).toBe('transfers_456');
    });

    it('should generate correct timeline cache keys', () => {
      expect(SimpleTraceabilityCache.timelineKey(789)).toBe('timeline_789');
      expect(SimpleTraceabilityCache.timelineKey(101)).toBe('timeline_101');
    });
  });
});
