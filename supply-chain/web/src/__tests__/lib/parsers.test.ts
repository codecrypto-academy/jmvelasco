import { describe, expect, it } from 'vitest';
import {
  formatNumber,
  getProcessedBadgeClasses,
  getRoleBadgeClasses,
  parseDistribution,
  parseNotes,
  type ParsedItem,
} from '../../lib/parsers';

describe('parseDistribution', () => {
  it('should parse simple role distribution', () => {
    const input = 'Producer: 200 + Factory: 400';
    const expected: ParsedItem[] = [
      { type: 'role', label: 'Producer', value: 200 },
      { type: 'role', label: 'Factory', value: 400 },
    ];

    expect(parseDistribution(input)).toEqual(expected);
  });

  it('should parse distribution with processed amount', () => {
    const input = 'Producer: 200 + Factory: 400 + Procesado: 400';
    const expected: ParsedItem[] = [
      { type: 'role', label: 'Producer', value: 200 },
      { type: 'role', label: 'Factory', value: 400 },
      { type: 'processed', label: 'Procesado', value: 400 },
    ];

    expect(parseDistribution(input)).toEqual(expected);
  });

  it('should handle numbers with commas', () => {
    const input = 'Producer: 1,500 + Factory: 2,000';
    const expected: ParsedItem[] = [
      { type: 'role', label: 'Producer', value: 1500 },
      { type: 'role', label: 'Factory', value: 2000 },
    ];

    expect(parseDistribution(input)).toEqual(expected);
  });

  it('should handle empty string', () => {
    expect(parseDistribution('')).toEqual([]);
    expect(parseDistribution('   ')).toEqual([]);
  });

  it('should handle malformed input gracefully', () => {
    const input = 'Invalid format without colons';
    expect(parseDistribution(input)).toEqual([]);
  });
});

describe('parseNotes', () => {
  it('should parse colon-separated notes', () => {
    const input = 'Original: 1500, transferidos: 500';
    const expected: ParsedItem[] = [
      { type: 'info', label: 'Original', value: 1500 },
      { type: 'info', label: 'transferidos', value: 500 },
    ];

    expect(parseNotes(input)).toEqual(expected);
  });

  it('should parse space-separated notes', () => {
    const input = 'Recibidos 750, Enviados 250';
    const expected: ParsedItem[] = [
      { type: 'info', label: 'Recibidos', value: 750 },
      { type: 'info', label: 'Enviados', value: 250 },
    ];

    expect(parseNotes(input)).toEqual(expected);
  });

  it('should handle mixed formats', () => {
    const input = 'Original: 1500, Procesados 300, Restantes: 1200';
    const expected: ParsedItem[] = [
      { type: 'info', label: 'Original', value: 1500 },
      { type: 'info', label: 'Procesados', value: 300 },
      { type: 'info', label: 'Restantes', value: 1200 },
    ];

    expect(parseNotes(input)).toEqual(expected);
  });

  it('should handle numbers with commas', () => {
    const input = 'Total: 10,000, Usado: 2,500';
    const expected: ParsedItem[] = [
      { type: 'info', label: 'Total', value: 10000 },
      { type: 'info', label: 'Usado', value: 2500 },
    ];

    expect(parseNotes(input)).toEqual(expected);
  });

  it('should handle empty string', () => {
    expect(parseNotes('')).toEqual([]);
    expect(parseNotes('   ')).toEqual([]);
  });
});

describe('formatNumber', () => {
  it('should format numbers with thousand separators', () => {
    const locale = Intl.NumberFormat().format(1000);
    expect(formatNumber(1000)).toBe(locale);
    expect(formatNumber(1500000)).toBe(Intl.NumberFormat().format(1500000));
    expect(formatNumber(42)).toBe(Intl.NumberFormat().format(42));
  });
});

describe('getRoleBadgeClasses', () => {
  it('should return correct classes for Producer', () => {
    expect(getRoleBadgeClasses('Producer')).toBe('bg-green-100 text-green-700 border-green-200');
    expect(getRoleBadgeClasses('producer')).toBe('bg-green-100 text-green-700 border-green-200');
  });

  it('should return correct classes for Factory', () => {
    expect(getRoleBadgeClasses('Factory')).toBe('bg-blue-100 text-blue-700 border-blue-200');
    expect(getRoleBadgeClasses('factory')).toBe('bg-blue-100 text-blue-700 border-blue-200');
  });

  it('should return correct classes for Retailer', () => {
    expect(getRoleBadgeClasses('Retailer')).toBe('bg-purple-100 text-purple-700 border-purple-200');
  });

  it('should return correct classes for Consumer', () => {
    expect(getRoleBadgeClasses('Consumer')).toBe('bg-orange-100 text-orange-700 border-orange-200');
  });

  it('should return correct classes for Admin', () => {
    expect(getRoleBadgeClasses('Admin')).toBe('bg-red-100 text-red-700 border-red-200');
  });

  it('should return default classes for unknown labels', () => {
    expect(getRoleBadgeClasses('Original')).toBe('bg-gray-100 text-gray-700 border-gray-300');
    expect(getRoleBadgeClasses('Unknown Role')).toBe('bg-gray-100 text-gray-700 border-gray-300');
  });
});

describe('getProcessedBadgeClasses', () => {
  it('should return processed badge classes', () => {
    expect(getProcessedBadgeClasses()).toBe('bg-sky-50 text-sky-600 border-sky-400 italic');
  });
});
