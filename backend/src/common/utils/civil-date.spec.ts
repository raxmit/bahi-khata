import {
  addCivilDays,
  getIsoWeekNumber,
  getMonthlyWeekBounds,
  getPeriodBounds,
  isValidCivilDate,
  todayInTimeZone,
} from './civil-date.js';

describe('civil-date helpers', () => {
  it('accepts strict valid dates and rejects invalid calendar dates and timestamps', () => {
    expect(isValidCivilDate('2024-02-29')).toBe(true);
    expect(isValidCivilDate('2025-02-29')).toBe(false);
    expect(isValidCivilDate('2026-02-30')).toBe(false);
    expect(isValidCivilDate('2026-10-21T00:00:00Z')).toBe(false);
    expect(isValidCivilDate('')).toBe(false);
  });

  it('uses Asia/Kolkata calendar today at UTC day boundaries', () => {
    expect(todayInTimeZone(new Date('2026-10-20T18:45:00.000Z'))).toBe('2026-10-21');
    expect(todayInTimeZone(new Date('2026-10-20T18:29:59.999Z'))).toBe('2026-10-20');
  });

  it('does calendar-day arithmetic without depending on the host timezone', () => {
    expect(addCivilDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addCivilDays('2024-03-01', -1)).toBe('2024-02-29');
  });

  it('returns inclusive Monday-Sunday weeks, including cross-year bounds', () => {
    expect(getPeriodBounds('weekly', '2026-06-01')).toEqual({
      startDate: '2026-06-01',
      endDate: '2026-06-07',
    });
    expect(getPeriodBounds('weekly', '2026-12-31')).toEqual({
      startDate: '2026-12-28',
      endDate: '2027-01-03',
    });
    expect(getIsoWeekNumber('2026-12-28')).toBe(53);
  });

  it('returns inclusive calendar month and leap-year bounds', () => {
    expect(getPeriodBounds('monthly', '2026-03-01')).toEqual({
      startDate: '2026-03-01',
      endDate: '2026-03-31',
    });
    expect(getPeriodBounds('yearly', '2024-02-29')).toEqual({
      startDate: '2024-01-01',
      endDate: '2024-12-31',
    });
  });

  it('clamps May 2026 ISO week buckets to the month with no gaps or overlaps', () => {
    const weeks = getMonthlyWeekBounds('2026-05-15');
    expect(weeks[0]).toMatchObject({ startDate: '2026-05-01', endDate: '2026-05-03' });
    expect(weeks.at(-1)).toMatchObject({ startDate: '2026-05-25', endDate: '2026-05-31' });
    expect(weeks[0].weekNumber).toBe(18);
    expect(weeks.flatMap(({ startDate, endDate }) => [startDate, endDate])).not.toContain('2026-04-30');
    expect(weeks.slice(1).every((week, index) =>
      addCivilDays(weeks[index].endDate, 1) === week.startDate,
    )).toBe(true);
  });
});
