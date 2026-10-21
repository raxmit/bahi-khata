import { FilterEngineService } from './filter-engine.service.js';
import type { Transaction } from '../common/types.js';

describe('FilterEngineService civil date ranges', () => {
  const service = new FilterEngineService();
  const transaction = (date: string): Transaction => ({
    id: date,
    amount: '1.00',
    type: 'Expense',
    category: 'Food',
    categoryId: 'food-id',
    date,
    createdAt: `${date}T12:00:00.000Z`,
    updatedAt: `${date}T12:00:00.000Z`,
  });

  it('includes both date-only filter endpoints and excludes adjacent dates', () => {
    const result = service.applyFilter(
      ['2026-02-28', '2026-03-01', '2026-03-31', '2026-04-01'].map(transaction),
      { startDate: '2026-03-01', endDate: '2026-03-31' },
    );
    expect(result.matches.map(({ date }) => date)).toEqual(['2026-03-01', '2026-03-31']);
  });

  it('filters by stable category ID rather than the displayed category name', () => {
    const food = transaction('2026-03-01');
    const otherCategoryWithSameDisplayName = {
      ...food,
      id: 'other-id',
      type: 'Income' as const,
      categoryId: 'other-food-id',
    };
    const result = service.applyFilter([food, otherCategoryWithSameDisplayName], {
      categories: ['food-id'],
    });

    expect(result.matches.map(({ id }) => id)).toEqual(['2026-03-01']);
  });
});
