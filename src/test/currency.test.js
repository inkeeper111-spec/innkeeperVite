import { describe, expect, it } from 'vitest';
import { formatCurrency, getCurrencySymbol } from '../utils/currency';

describe('currency formatting', () => {
  it('formats Indian rupees using Indian digit grouping', () => {
    expect(formatCurrency(123456.78, 'INR')).toBe('₹1,23,456.78');
    expect(getCurrencySymbol('INR')).toBe('₹');
  });

  it('formats non-INR currencies by their configured currency code', () => {
    expect(formatCurrency(1234.5, 'USD')).toBe('$1,234.50');
    expect(formatCurrency(1234.5, 'EUR')).toContain('€');
  });

  it('returns a readable value for invalid amounts and currency codes', () => {
    expect(formatCurrency('not-a-number', 'INVALID')).toBe('INVALID 0.00');
    expect(getCurrencySymbol('INVALID')).toBe('INVALID');
  });
});
