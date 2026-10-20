import { ValidatorService } from './validator.service.js';

describe('ValidatorService INR amount validation', () => {
  const validator = new ValidatorService();
  const base = {
    type: 'Expense' as const,
    category: 'Food',
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
