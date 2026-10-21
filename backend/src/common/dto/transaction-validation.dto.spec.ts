import { validate } from 'class-validator';
import { CreateTransactionDto } from './create-transaction.dto.js';

describe('CreateTransactionDto validation contract', () => {
  const makeDto = (changes: Record<string, unknown> = {}) => Object.assign(
    new CreateTransactionDto(),
    {
      amount: '1.00',
      type: 'Expense',
      categoryId: 'category-food',
      date: '2026-03-01',
      ...changes,
    },
  );

  it('accepts a valid transaction with an optional bounded note', async () => {
    expect(await validate(makeDto({ note: 'Synthetic' }))).toHaveLength(0);
    expect(await validate(makeDto({ note: 'n'.repeat(250) }))).toHaveLength(0);
  });

  it('requires a category ID instead of accepting a category label', async () => {
    const errors = await validate(makeDto({ categoryId: 'food-id', category: 'Food' }));
    expect(errors).toEqual([]);
    const labelOnly = await validate(makeDto({ categoryId: undefined, category: 'Food' }));
    expect(labelOnly.some((error) => error.property === 'categoryId')).toBe(true);
  });

  it.each([
    ['amount', '0.00'],
    ['amount', 1],
    ['type', 'Transfer'],
    ['categoryId', '   '],
    ['categoryId', 42],
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
