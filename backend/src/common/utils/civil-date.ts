import type { Period } from '../types.js';

export const APP_TIME_ZONE = 'Asia/Kolkata';
const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface CivilDateParts {
  year: number;
  month: number;
  day: number;
}

export interface DateBounds {
  startDate: string;
  endDate: string;
}

export function parseCivilDate(value: unknown): CivilDateParts | null {
  if (typeof value !== 'string') return null;
  const match = DATE_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export function isValidCivilDate(value: unknown): value is string {
  return parseCivilDate(value) !== null;
}

export function todayInTimeZone(
  instant: Date = new Date(),
  timeZone = APP_TIME_ZONE,
): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values['year']}-${values['month']}-${values['day']}`;
}

export function addCivilDays(date: string, amount: number): string {
  const parts = requireCivilDate(date);
  const result = toUtcDate(parts);
  result.setUTCDate(result.getUTCDate() + amount);
  return formatUtcDate(result);
}

export function getPeriodBounds(period: Period, referenceDate: string): DateBounds {
  const parts = requireCivilDate(referenceDate);
  switch (period) {
    case 'weekly': {
      const weekday = toUtcDate(parts).getUTCDay();
      const daysSinceMonday = (weekday + 6) % 7;
      const startDate = addCivilDays(referenceDate, -daysSinceMonday);
      return { startDate, endDate: addCivilDays(startDate, 6) };
    }
    case 'monthly': {
      const startDate = formatCivilDate(parts.year, parts.month, 1);
      return {
        startDate,
        endDate: formatCivilDate(parts.year, parts.month, daysInMonth(parts.year, parts.month)),
      };
    }
    case 'yearly':
      return {
        startDate: formatCivilDate(parts.year, 1, 1),
        endDate: formatCivilDate(parts.year, 12, 31),
      };
  }
}

export function getMonthlyWeekBounds(month: string): Array<DateBounds & { weekNumber: number }> {
  const parts = requireCivilDate(month);
  const monthStart = formatCivilDate(parts.year, parts.month, 1);
  const monthEnd = formatCivilDate(parts.year, parts.month, daysInMonth(parts.year, parts.month));
  const firstWeekday = toUtcDate(requireCivilDate(monthStart)).getUTCDay();
  let weekStart = addCivilDays(monthStart, -((firstWeekday + 6) % 7));
  const weeks: Array<DateBounds & { weekNumber: number }> = [];

  while (weekStart <= monthEnd) {
    const weekEnd = addCivilDays(weekStart, 6);
    const startDate = weekStart < monthStart ? monthStart : weekStart;
    const endDate = weekEnd > monthEnd ? monthEnd : weekEnd;
    weeks.push({ startDate, endDate, weekNumber: getIsoWeekNumber(weekStart) });
    weekStart = addCivilDays(weekStart, 7);
  }
  return weeks;
}

export function getIsoWeekNumber(date: string): number {
  const parts = requireCivilDate(date);
  const utcDate = toUtcDate(parts);
  const mondayBasedDay = (utcDate.getUTCDay() + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 3 - mondayBasedDay);
  const weekYear = utcDate.getUTCFullYear();
  const januaryFourth = toUtcDate({ year: weekYear, month: 1, day: 4 });
  const jan4MondayOffset = (januaryFourth.getUTCDay() + 6) % 7;
  januaryFourth.setUTCDate(januaryFourth.getUTCDate() - jan4MondayOffset);
  return 1 + Math.floor((utcDate.getTime() - januaryFourth.getTime()) / (7 * DAY_MS));
}

function requireCivilDate(value: string): CivilDateParts {
  const parts = parseCivilDate(value);
  if (!parts) throw new RangeError(`Invalid civil date: ${value}`);
  return parts;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function toUtcDate(parts: CivilDateParts): Date {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(parts.year, parts.month - 1, parts.day);
  return date;
}

function formatUtcDate(date: Date): string {
  return formatCivilDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function formatCivilDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
