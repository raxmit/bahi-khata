import { SummarizerService } from './summarizer.service.js';
import type { Transaction } from '../common/types.js';

describe('SummarizerService exact INR arithmetic', () => {
  const summarizer = new SummarizerService();
  const transaction = (
    amount: string,
    type: Transaction['type'],
    category: string,
  ): Transaction => ({
    id: `${type}-${category}-${amount}`,
    amount,
    type,
    category,
    date: '2026-10-15',
    createdAt: '2026-10-15T12:00:00.000Z',
    updatedAt: '2026-10-15T12:00:00.000Z',
  });

  it('sums amounts without binary floating point error and serializes two decimals', () => {
    const result = summarizer.summarize(
      [
        transaction('0.10', 'Income', 'Salary'),
        transaction('0.20', 'Income', 'Salary'),
        transaction('0.10', 'Expense', 'Food'),
      ],
      'monthly',
      new Date('2026-10-15T12:00:00.000Z'),
    );

    expect(result.totalIncome).toBe('0.30');
    expect(result.totalExpenses).toBe('0.10');
    expect(result.netBalance).toBe('0.20');
    expect(result.categoryBreakdown).toEqual([
      { category: 'Salary', type: 'Income', total: '0.30' },
      { category: 'Food', type: 'Expense', total: '0.10' },
    ]);
  });

  it('keeps weekly totals as fixed-scale decimal strings', () => {
    const result = summarizer.getWeeklyBreakdown(
      [transaction('12.30', 'Expense', 'Food')],
      new Date('2026-10-15T12:00:00.000Z'),
    );
    expect(result.find((week) => week.startDate <= '2026-10-15' && week.endDate >= '2026-10-15'))
      .toMatchObject({ totalIncome: '0.00', totalExpenses: '12.30' });
  });
});
