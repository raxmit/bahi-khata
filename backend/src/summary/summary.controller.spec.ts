import { BadRequestException } from '@nestjs/common';
import { SummaryController } from './summary.controller.js';
import type { TransactionRepository } from '../transactions/transaction.repository.js';
import { SummarizerService } from './summarizer.service.js';
import type { Transaction } from '../common/types.js';

describe('SummaryController date-only query contract', () => {
  const findAll = vi.fn().mockResolvedValue([]);
  const summarize = vi.fn().mockReturnValue({ period: 'monthly' });
  const getWeeklyBreakdown = vi.fn().mockReturnValue([]);
  const controller = new SummaryController(
    { summarize, getWeeklyBreakdown } as unknown as SummarizerService,
    { findAll } as unknown as TransactionRepository,
  );

  beforeEach(() => vi.clearAllMocks());

  it('passes valid civil reference dates through without instant conversion', async () => {
    await controller.getSummary('monthly', '2026-03-01');
    expect(summarize).toHaveBeenCalledWith([], 'monthly', '2026-03-01');
  });

  it.each(['2026-02-30', '2026-03-01T00:00:00Z'])(
    'rejects invalid summary date %s',
    async (date) => {
      await expect(controller.getSummary('monthly', date)).rejects
        .toBeInstanceOf(BadRequestException);
      expect(findAll).not.toHaveBeenCalled();
    },
  );

  it('rejects invalid monthly weekly-breakdown dates', async () => {
    await expect(controller.getWeeklyBreakdown('2025-02-29')).rejects
      .toBeInstanceOf(BadRequestException);
    expect(findAll).not.toHaveBeenCalled();
  });

  it('passes a valid monthly weekly-breakdown date as a civil string', async () => {
    await controller.getWeeklyBreakdown('2026-05-15');
    expect(getWeeklyBreakdown).toHaveBeenCalledWith([], '2026-05-15');
  });

  it('returns the documented exact monthly summary contract using repository records', async () => {
    const transactions: Transaction[] = [
      {
        id: 'income-1', amount: '12.30', type: 'Income', category: 'Salary',
        categoryId: 'salary', date: '2024-02-29',
        createdAt: '2024-02-29T12:00:00.000Z', updatedAt: '2024-02-29T12:00:00.000Z',
      },
      {
        id: 'expense-1', amount: '0.10', type: 'Expense', category: 'Food',
        categoryId: 'food', date: '2024-02-01',
        createdAt: '2024-02-01T12:00:00.000Z', updatedAt: '2024-02-01T12:00:00.000Z',
      },
    ];
    const apiController = new SummaryController(
      new SummarizerService(),
      { findAll: vi.fn().mockResolvedValue(transactions) } as unknown as TransactionRepository,
    );

    await expect(apiController.getSummary('monthly', '2024-02-29')).resolves.toEqual({
      period: 'monthly',
      startDate: '2024-02-01',
      endDate: '2024-02-29',
      totalIncome: '12.30',
      totalExpenses: '0.10',
      netBalance: '12.20',
      categoryBreakdown: [
        { categoryId: 'salary', category: 'Salary', type: 'Income', total: '12.30' },
        { categoryId: 'food', category: 'Food', type: 'Expense', total: '0.10' },
      ],
      isEmpty: false,
    });
  });
});
