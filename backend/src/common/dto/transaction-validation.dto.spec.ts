import { validate } from 'class-validator';
import { CreateTransactionDto } from './create-transaction.dto.js';

describe('CreateTransactionDto validation contract', () => {
  const makeDto = (changes: Record<string, unknown> = {}) => Object.assign(
    new CreateTransactionDto(),
    {
      amount: '1.00',
      type: 'Expense',
      category: 'Food',
      date: '2026-03-01',
      ...changes,
    },
  );

  it('accepts a valid transaction with an optional bounded note', async () => {
    expect(await validate(makeDto({ note: 'Synthetic' }))).toHaveLength(0);
    expect(await validate(makeDto({ note: 'n'.repeat(250) }))).toHaveLength(0);
  });

  it.each([
    ['amount', '0.00'],
    ['amount', 1],
    ['type', 'Transfer'],
    ['category', '   '],
    ['category', 42],
    ['date', '2026-03-01T00:00:00Z'],
    ['note', 'n'.repeat(251)],
    ['note', 42],
  ])('rejects invalid %s input', async (field, value) => {
    const errors = await validate(makeDto({ [field]: value }));
    expect(errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ property: field }),
    ]));
  });
});
