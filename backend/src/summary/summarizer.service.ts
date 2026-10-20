import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  startOfYear, endOfYear, getISOWeek, eachWeekOfInterval,
  isWithinInterval, parseISO,
} from 'date-fns';
import {
  Transaction, Period, PeriodSummary, CategoryTotal, WeeklyBreakdown,
} from '../common/types.js';

@Injectable()
export class SummarizerService {
  /**
   * Computes income, expenses, net balance and category breakdown
   * for the given period containing `date`.
   */
  summarize(
    transactions: Transaction[],
    period: Period,
    date: Date,
  ): PeriodSummary {
    const { start, end } = this.getPeriodBounds(period, date);

    const inWindow = transactions.filter((t) => {
      const d = parseISO(t.date);
      return isWithinInterval(d, { start, end });
    });

    const isEmpty = inWindow.length === 0;
    let totalIncome = new Prisma.Decimal(0);
    let totalExpenses = new Prisma.Decimal(0);
    const categoryMap = new Map<string, { type: Transaction['type']; total: Prisma.Decimal }>();

    for (const t of inWindow) {
      if (t.type === 'Income') {
        totalIncome = totalIncome.plus(t.amount);
      } else {
        totalExpenses = totalExpenses.plus(t.amount);
      }
      const key = `${t.category}::${t.type}`;
      const existing = categoryMap.get(key);
      if (existing) {
        existing.total = existing.total.plus(t.amount);
      } else {
        categoryMap.set(key, { type: t.type, total: new Prisma.Decimal(t.amount) });
      }
    }

    const categoryBreakdown: CategoryTotal[] = Array.from(
      categoryMap.entries(),
    )
      .map(([key, val]) => ({
        category: key.split('::')[0],
        type: val.type,
        total: val.total.toFixed(2),
      }))
      .sort((a, b) => new Prisma.Decimal(b.total).comparedTo(a.total)); // descending

    return {
      period,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      totalIncome: totalIncome.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      netBalance: totalIncome.minus(totalExpenses).toFixed(2),
      categoryBreakdown,
      isEmpty,
    };
  }

  /**
   * Partitions transactions in a calendar month into ISO week buckets.
   */
  getWeeklyBreakdown(
    transactions: Transaction[],
    month: Date,
  ): WeeklyBreakdown[] {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);

    // Get all week-start dates that overlap with the month
    const weekStarts = eachWeekOfInterval(
      { start: monthStart, end: monthEnd },
      { weekStartsOn: 1 }, // ISO weeks start on Monday
    );

    return weekStarts.map((weekStart) => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

      // Clamp to month boundaries
      const clampedStart = weekStart < monthStart ? monthStart : weekStart;
      const clampedEnd = weekEnd > monthEnd ? monthEnd : weekEnd;

      const inWeek = transactions.filter((t) => {
        const d = parseISO(t.date);
        return isWithinInterval(d, { start: clampedStart, end: clampedEnd });
      });

      let totalIncome = new Prisma.Decimal(0);
      let totalExpenses = new Prisma.Decimal(0);
      for (const t of inWeek) {
        if (t.type === 'Income') totalIncome = totalIncome.plus(t.amount);
        else totalExpenses = totalExpenses.plus(t.amount);
      }

      return {
        weekNumber: getISOWeek(weekStart),
        startDate: clampedStart.toISOString().split('T')[0],
        endDate: clampedEnd.toISOString().split('T')[0],
        totalIncome: totalIncome.toFixed(2),
        totalExpenses: totalExpenses.toFixed(2),
      };
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private getPeriodBounds(
    period: Period,
    date: Date,
  ): { start: Date; end: Date } {
    switch (period) {
      case 'weekly':
        return {
          start: startOfWeek(date, { weekStartsOn: 1 }),
          end: endOfWeek(date, { weekStartsOn: 1 }),
        };
      case 'monthly':
        return { start: startOfMonth(date), end: endOfMonth(date) };
      case 'yearly':
        return { start: startOfYear(date), end: endOfYear(date) };
    }
  }
}
