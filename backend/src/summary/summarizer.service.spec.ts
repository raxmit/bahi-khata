import { SummarizerService } from './summarizer.service.js';
import type { Transaction } from '../common/types.js';
import { Prisma } from '@prisma/client';

describe('SummarizerService date and exact INR semantics', () => {
  const summarizer = new SummarizerService();
  const transaction = (
    date: string,
    amount = '0.10',
    type: Transaction['type'] = 'Expense',
    category = 'Food',
  ): Transaction => ({
    id: `${date}-${type}-${category}-${amount}`,
    amount,
    type,
    category,
    date,
    createdAt: `${date}T12:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`,
  });

  it('sums exact decimal values and includes both monthly boundary dates', () => {
    const result = summarizer.summarize(
      [
        transaction('2026-02-28', '9.00'),
        transaction('2026-03-01', '0.10', 'Income', 'Salary'),
        transaction('2026-03-31', '0.20', 'Income', 'Salary'),
        transaction('2026-04-01', '9.00'),
      ],
      'monthly',
      '2026-03-01',
    );

    expect(result).toMatchObject({
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      totalIncome: '0.30',
      totalExpenses: '0.00',
      netBalance: '0.30',
      isEmpty: false,
    });
  });

  it('includes leap day in the selected yearly period', () => {
    const result = summarizer.summarize(
      [transaction('2024-02-29', '12.30', 'Expense')],
      'yearly',
      '2024-02-29',
    );
    expect(result).toMatchObject({
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      totalExpenses: '12.30',
    });
  });

  it('counts cross-year weekly dates once in ISO Monday-Sunday range', () => {
    const result = summarizer.summarize(
      [
        transaction('2026-12-27', '4.00'),
        transaction('2026-12-28', '0.10'),
        transaction('2027-01-03', '0.20'),
        transaction('2027-01-04', '8.00'),
      ],
      'weekly',
      '2026-12-31',
    );
    expect(result).toMatchObject({
      startDate: '2026-12-28',
      endDate: '2027-01-03',
      totalExpenses: '0.30',
    });
  });

  it('clamps monthly ISO week buckets and totals each transaction exactly once', () => {
    const transactions = [
      transaction('2026-04-30', '10.00'),
      transaction('2026-05-01', '0.10'),
      transaction('2026-05-03', '0.20'),
      transaction('2026-05-04', '0.30'),
      transaction('2026-05-31', '0.40'),
      transaction('2026-06-01', '20.00'),
    ];
    const weekly = summarizer.getWeeklyBreakdown(transactions, '2026-05-15');
    const monthly = summarizer.summarize(transactions, 'monthly', '2026-05-01');

    expect(weekly[0]).toMatchObject({ startDate: '2026-05-01', endDate: '2026-05-03' });
    expect(weekly.at(-1)).toMatchObject({ startDate: '2026-05-25', endDate: '2026-05-31' });
    const weeklyTotal = weekly.reduce(
      (total, week) => total.add(new Prisma.Decimal(week.totalExpenses)),
      new Prisma.Decimal(0),
    );
    expect(weeklyTotal.toFixed(2)).toBe(monthly.totalExpenses);
    expect(monthly.totalExpenses).toBe('1.00');
  });
});
