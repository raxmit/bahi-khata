import { describe, expect, it } from 'vitest';
import { canonicalRupees, formatRupees, isValidRupeeInput } from './money';

describe('INR money text', () => {
  it('validates decimal text without converting through Number', () => {
    expect(isValidRupeeInput('0.10')).toBe(true);
    expect(isValidRupeeInput('90071992547409.91')).toBe(false);
    expect(isValidRupeeInput('9999999999999.99')).toBe(true);
    expect(isValidRupeeInput('10000000000000.00')).toBe(false);
    expect(isValidRupeeInput('0')).toBe(false);
    expect(isValidRupeeInput('1.234')).toBe(false);
    expect(isValidRupeeInput('1e3')).toBe(false);
  });

  it('normalizes accepted text to canonical rupees and paise', () => {
    expect(canonicalRupees('0.1')).toBe('0.10');
    expect(canonicalRupees('12')).toBe('12.00');
    expect(canonicalRupees('00012.3')).toBe('12.30');
  });

  it('formats large and fractional values with Indian grouping exactly', () => {
    expect(formatRupees('0.10')).toBe('₹0.10');
    expect(formatRupees('90071992547409.91')).toBe('₹9,00,71,99,25,47,409.91');
    expect(formatRupees('-0.10')).toBe('-₹0.10');
  });
});
