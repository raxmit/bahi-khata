import { validate } from 'class-validator';
import { CreateTransactionDto } from './create-transaction.dto.js';
import { FilterCriteriaDto } from './filter-criteria.dto.js';

describe('date-only DTO format', () => {
  it('accepts YYYY-MM-DD and rejects timestamps for transaction dates', async () => {
    const valid = Object.assign(new CreateTransactionDto(), {
      amount: '1.00', type: 'Expense', categoryId: 'food-id', date: '2026-03-01',
    });
    const timestamp = Object.assign(new CreateTransactionDto(), {
      ...valid, date: '2026-03-01T00:00:00Z',
    });
    expect(await validate(valid)).toHaveLength(0);
    expect(await validate(timestamp)).toEqual(expect.arrayContaining([
      expect.objectContaining({ property: 'date' }),
    ]));
  });

  it('accepts date-only filter bounds and rejects timestamp bounds', async () => {
    const valid = Object.assign(new FilterCriteriaDto(), {
      startDate: '2026-03-01', endDate: '2026-03-31',
    });
    const timestamp = Object.assign(new FilterCriteriaDto(), {
      startDate: '2026-03-01T00:00:00Z',
    });
    expect(await validate(valid)).toHaveLength(0);
    expect(await validate(timestamp)).toEqual(expect.arrayContaining([
      expect.objectContaining({ property: 'startDate' }),
    ]));
  });
});
