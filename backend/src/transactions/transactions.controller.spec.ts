import { BadRequestException } from '@nestjs/common';
import { FilterEngineService } from '../filter/filter-engine.service.js';
import { ValidatorService } from '../validator/validator.service.js';
import { TransactionRepository } from './transaction.repository.js';
import { TransactionsController } from './transactions.controller.js';

describe('TransactionsController create validation', () => {
  const create = vi.fn();
  const controller = new TransactionsController(
    { create } as unknown as TransactionRepository,
    {} as FilterEngineService,
    new ValidatorService(),
  );

  beforeEach(() => create.mockReset());

  it.each([
    [{ amount: '0.00', type: 'Expense', category: 'Food', date: '2026-01-01' }, 'amount'],
    [{ amount: '1.00', type: 'Transfer', category: 'Food', date: '2026-01-01' }, 'type'],
    [{ amount: '1.00', type: 'Expense', category: '   ', date: '2026-01-01' }, 'category'],
    [{ amount: '1.00', type: 'Expense', category: 'Food', date: '2025-02-29' }, 'date'],
    [{ amount: '1.00', type: 'Expense', category: 'Food', date: '2099-01-01' }, 'date'],
    [{ amount: '1.00', type: 'Expense', category: 'Food', date: '2026-01-01', note: 'n'.repeat(251) }, 'note'],
  ] as const)('returns an actionable 400 for invalid %s input', async (input, field) => {
    const rejection = controller.create(input as never);
    await expect(rejection).rejects.toBeInstanceOf(BadRequestException);
    const error = await rejection.then(() => null, (reason: unknown) => reason);
    expect(error).toBeInstanceOf(BadRequestException);
    if (error instanceof BadRequestException) {
      expect(error.getStatus()).toBe(400);
      expect(error.getResponse()).toMatchObject({ [field]: expect.any(String) });
    }
    expect(create).not.toHaveBeenCalled();
  });
});
