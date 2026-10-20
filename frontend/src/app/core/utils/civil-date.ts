import type { Period } from '../types';

export const APP_TIME_ZONE = 'Asia/Kolkata';
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidCivilDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = month === 2 ? (leapYear ? 29 : 28) : ([4, 6, 9, 11].includes(month) ? 30 : 31);
  return day <= days;
}

export function todayInAppTimeZone(instant: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values['year']}-${values['month']}-${values['day']}`;
}

export function addCivilDays(date: string, amount: number): string {
  const parts = parseDate(date);
  const utc = new Date(0);
  utc.setUTCHours(0, 0, 0, 0);
  utc.setUTCFullYear(parts.year, parts.month - 1, parts.day + amount);
  return formatDate(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
}

export function navigateCivilPeriod(date: string, period: Period, direction: -1 | 1): string {
  if (period === 'weekly') return addCivilDays(date, direction * 7);
  const { year, month } = parseDate(date);
  if (period === 'monthly') {
    const target = new Date(0);
    target.setUTCHours(0, 0, 0, 0);
    target.setUTCFullYear(year, month - 1 + direction, 1);
    return formatDate(target.getUTCFullYear(), target.getUTCMonth() + 1, 1);
  }
  return formatDate(year + direction, 1, 1);
}

export function isWithinCivilDateRange(
  date: string,
  startDate?: string,
  endDate?: string,
): boolean {
  return (!startDate || date >= startDate) && (!endDate || date <= endDate);
}

export function formatCivilDate(date: string): string {
  const { year, month, day } = parseDate(date);
  const utc = new Date(0);
  utc.setUTCHours(12, 0, 0, 0);
  utc.setUTCFullYear(year, month - 1, day);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(utc);
}

function parseDate(value: string): { year: number; month: number; day: number } {
  if (!isValidCivilDate(value)) throw new RangeError(`Invalid civil date: ${value}`);
  const match = DATE_PATTERN.exec(value)!;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function formatDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
