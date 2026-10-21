import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
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

  it('normalizes a single category, repeated categories, and empty category query values', async () => {
    const single = plainToInstance(FilterCriteriaDto, { categories: ' food-id ' });
    const repeated = plainToInstance(FilterCriteriaDto, { categories: ['food-id', 'books-id'] });
    const empty = plainToInstance(FilterCriteriaDto, { categories: ['', '   '] });

    expect(await validate(single)).toHaveLength(0);
    expect(single.categories).toEqual(['food-id']);
    expect(await validate(repeated)).toHaveLength(0);
    expect(repeated.categories).toEqual(['food-id', 'books-id']);
    expect(await validate(empty)).toHaveLength(0);
    expect(empty.categories).toBeUndefined();
  });

  it('rejects non-string category query values', async () => {
    const invalid = plainToInstance(FilterCriteriaDto, { categories: [42] });
    expect(await validate(invalid)).toEqual(expect.arrayContaining([
      expect.objectContaining({ property: 'categories' }),
    ]));
  });
});
