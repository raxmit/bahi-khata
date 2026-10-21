import { ValidatorService } from './validator.service.js';

describe('ValidatorService INR amount validation', () => {
  const validator = new ValidatorService();
  const base = {
    type: 'Expense' as const,
    categoryId: 'category-food',
    date: '2026-01-01',
  };

  it.each(['0.01', '1234.50', '9999999999999.99'])(
    'accepts exact positive INR amount %s',
    (amount) => {
      expect(validator.validateTransaction({ ...base, amount }).valid).toBe(true);
    },
  );

  it.each([0.1, '1', '1.2', '1.234', '0.00', '10000000000000.00', '1e2', ' 1.00'])(
    'rejects invalid or out-of-range INR amount %s',
    (amount) => {
      expect(validator.validateTransaction({ ...base, amount } as never).errors)
        .toHaveProperty('amount');
    },
  );
});

describe('ValidatorService civil date validation', () => {
  const validator = new ValidatorService();
  const now = new Date('2026-10-20T18:45:00.000Z');
  const validTransaction = { amount: '1.00', type: 'Expense' as const, categoryId: 'category-food' };

  it('uses Asia/Kolkata today across the UTC day boundary', () => {
    expect(validator.validateTransaction({ ...validTransaction, date: '2026-10-21' }, now).valid)
      .toBe(true);
    expect(validator.validateTransaction({ ...validTransaction, date: '2026-10-22' }, now).errors)
      .toHaveProperty('date', 'Date must not be in the future');
  });

  it.each(['2025-02-29', '2026-02-30', '2026-10-21T00:00:00Z', '2026-1-01'])(
    'rejects non-canonical or invalid date %s',
    (date) => {
      expect(validator.validateTransaction({ ...validTransaction, date }, now).errors)
        .toHaveProperty('date');
    },
  );

  it('accepts a valid leap day and filter endpoint dates inclusively', () => {
    expect(validator.validateTransaction({ ...validTransaction, date: '2024-02-29' }, now).valid)
      .toBe(true);
    expect(validator.validateFilter({ startDate: '2026-03-01', endDate: '2026-03-31' }).valid)
      .toBe(true);
    expect(validator.validateFilter({ startDate: '2026-03-02', endDate: '2026-03-01' }).errors)
      .toHaveProperty('dateRange');
  });

  it('rejects invalid and timestamp filter endpoints', () => {
    expect(validator.validateFilter({ startDate: '2026-02-30' }).errors).toHaveProperty('startDate');
    expect(validator.validateFilter({ endDate: '2026-10-21T00:00:00Z' }).errors)
      .toHaveProperty('endDate');
  });
});

describe('ValidatorService transaction field validation', () => {
  const validator = new ValidatorService();
  const validTransaction = {
    amount: '1.00',
    type: 'Expense' as const,
    categoryId: 'category-food',
    date: '2026-01-01',
  };

  it.each(['0.00', '-1.00', '1', '1.234', '1e2', '10000000000000.00'])(
    'rejects non-positive, malformed, or out-of-range amount %s',
    (amount) => {
      expect(validator.validateTransaction({ ...validTransaction, amount }).errors)
        .toHaveProperty('amount');
    },
  );

  it.each(['', '   ', 42])('rejects blank or non-text category ID %s', (categoryId) => {
    expect(validator.validateTransaction({ ...validTransaction, categoryId } as never).errors)
      .toHaveProperty('categoryId');
  });

  it.each(['Saving', 'expense', 1])('rejects unsupported transaction type %s', (type) => {
    expect(validator.validateTransaction({ ...validTransaction, type } as never).errors)
      .toHaveProperty('type');
  });

  it('accepts notes up to 250 characters and rejects invalid note values', () => {
    expect(validator.validateTransaction({ ...validTransaction, note: 'n'.repeat(250) }).valid)
      .toBe(true);
    expect(validator.validateTransaction({ ...validTransaction, note: 'n'.repeat(251) }).errors)
      .toHaveProperty('note', 'Note must not exceed 250 characters');
    expect(validator.validateTransaction({ ...validTransaction, note: 123 } as never).errors)
      .toHaveProperty('note', 'Note must be text');
  });
});
