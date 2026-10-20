import { describe, expect, it } from 'vitest';
import {
  formatCivilDate,
  isValidCivilDate,
  isWithinCivilDateRange,
  navigateCivilPeriod,
  todayInAppTimeZone,
} from './civil-date';

describe('civil date policy', () => {
  it('accepts real leap dates and rejects invalid dates and timestamp strings', () => {
    expect(isValidCivilDate('2024-02-29')).toBe(true);
    expect(isValidCivilDate('2025-02-29')).toBe(false);
    expect(isValidCivilDate('2026-02-30')).toBe(false);
    expect(isValidCivilDate('2026-10-21T00:00:00Z')).toBe(false);
  });

  it('uses Asia/Kolkata today rather than the UTC or host calendar date', () => {
    expect(todayInAppTimeZone(new Date('2026-10-20T18:45:00.000Z'))).toBe('2026-10-21');
    expect(todayInAppTimeZone(new Date('2026-10-20T18:29:59.999Z'))).toBe('2026-10-20');
  });

  it('formats the same civil date without browser timezone shifts', () => {
    expect(formatCivilDate('2026-10-21')).toBe('Oct 21, 2026');
  });

  it('uses inclusive date-only filter endpoints', () => {
    expect(isWithinCivilDateRange('2026-03-01', '2026-03-01', '2026-03-31')).toBe(true);
    expect(isWithinCivilDateRange('2026-03-31', '2026-03-01', '2026-03-31')).toBe(true);
    expect(isWithinCivilDateRange('2026-02-28', '2026-03-01', '2026-03-31')).toBe(false);
    expect(isWithinCivilDateRange('2026-04-01', '2026-03-01', '2026-03-31')).toBe(false);
  });

  it('navigates months and years without day overflow', () => {
    expect(navigateCivilPeriod('2026-01-31', 'monthly', 1)).toBe('2026-02-01');
    expect(navigateCivilPeriod('2024-02-29', 'yearly', 1)).toBe('2025-01-01');
    expect(navigateCivilPeriod('2026-06-01', 'weekly', 1)).toBe('2026-06-08');
    expect(navigateCivilPeriod('2026-06-01', 'weekly', -1)).toBe('2026-05-25');
  });
});
