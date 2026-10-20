import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  Transaction, Period, PeriodSummary, CategoryTotal, WeeklyBreakdown,
} from '../common/types.js';
import {
  getMonthlyWeekBounds,
  getPeriodBounds,
} from '../common/utils/civil-date.js';

@Injectable()
export class SummarizerService {
  /** Computes exact totals for the calendar period containing the date-only reference. */
  summarize(
    transactions: Transaction[],
    period: Period,
    referenceDate: string,
  ): PeriodSummary {
    const { startDate, endDate } = getPeriodBounds(period, referenceDate);
    const inWindow = transactions.filter(
      (transaction) => transaction.date >= startDate && transaction.date <= endDate,
    );

    let totalIncome = new Prisma.Decimal(0);
    let totalExpenses = new Prisma.Decimal(0);
    const categoryMap = new Map<string, { type: Transaction['type']; total: Prisma.Decimal }>();

    for (const transaction of inWindow) {
      if (transaction.type === 'Income') {
        totalIncome = totalIncome.plus(transaction.amount);
      } else {
        totalExpenses = totalExpenses.plus(transaction.amount);
      }
      const key = `${transaction.category}::${transaction.type}`;
      const existing = categoryMap.get(key);
      if (existing) {
        existing.total = existing.total.plus(transaction.amount);
      } else {
        categoryMap.set(key, { type: transaction.type, total: new Prisma.Decimal(transaction.amount) });
      }
    }

    const categoryBreakdown: CategoryTotal[] = Array.from(categoryMap.entries())
      .map(([key, value]) => ({
        category: key.split('::')[0],
        type: value.type,
        total: value.total.toFixed(2),
      }))
      .sort((a, b) => new Prisma.Decimal(b.total).comparedTo(a.total));

    return {
      period,
      startDate,
      endDate,
      totalIncome: totalIncome.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      netBalance: totalIncome.minus(totalExpenses).toFixed(2),
      categoryBreakdown,
      isEmpty: inWindow.length === 0,
    };
  }

  /** Creates ISO Monday-Sunday buckets, clipped to the selected calendar month. */
  getWeeklyBreakdown(transactions: Transaction[], month: string): WeeklyBreakdown[] {
    return getMonthlyWeekBounds(month).map(({ startDate, endDate, weekNumber }) => {
      const inWeek = transactions.filter(
        (transaction) => transaction.date >= startDate && transaction.date <= endDate,
      );
      let totalIncome = new Prisma.Decimal(0);
      let totalExpenses = new Prisma.Decimal(0);
      for (const transaction of inWeek) {
        if (transaction.type === 'Income') totalIncome = totalIncome.plus(transaction.amount);
        else totalExpenses = totalExpenses.plus(transaction.amount);
      }
      return {
        weekNumber,
        startDate,
        endDate,
        totalIncome: totalIncome.toFixed(2),
        totalExpenses: totalExpenses.toFixed(2),
      };
    });
  }
}
