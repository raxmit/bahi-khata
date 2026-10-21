import { BadRequestException } from '@nestjs/common';
import { FilterEngineService } from '../filter/filter-engine.service.js';
import { ValidatorService } from '../validator/validator.service.js';
import { TransactionRepository } from './transaction.repository.js';
import { TransactionsController } from './transactions.controller.js';
import { Transaction } from '../common/types.js';

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

describe('TransactionsController PATCH validation', () => {
  const existing: Transaction = {
    id: 'synthetic-id',
    amount: '25.00',
    type: 'Expense',
    category: 'Food',
    date: '2026-10-20',
    note: 'unchanged note',
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  };
  const findById = vi.fn();
  const update = vi.fn();
  let controller: TransactionsController;

  beforeEach(() => {
    findById.mockReset().mockResolvedValue(existing);
    update.mockReset().mockImplementation(async (_id, changes) => ({ ...existing, ...changes }));
    controller = new TransactionsController(
      { findById, update } as unknown as TransactionRepository,
      {} as FilterEngineService,
      new ValidatorService(),
    );
  });

  it('accepts a valid one-field patch and retains omitted values', async () => {
    const result = await controller.update('synthetic-id', { amount: '30.50' });

    expect(result).toMatchObject({ amount: '30.50', type: 'Expense', category: 'Food', date: '2026-10-20', note: 'unchanged note' });
    expect(update).toHaveBeenCalledWith('synthetic-id', { amount: '30.50' });
  });

  it.each([
    [{ amount: '0.00' }, 'amount'],
    [{ type: 'Transfer' }, 'type'],
    [{ category: '   ' }, 'category'],
    [{ date: '2099-01-01' }, 'date'],
    [{ note: 'n'.repeat(251) }, 'note'],
  ] as const)('rejects invalid supplied value %s with HTTP 400', async (patch, field) => {
    await expect(controller.update('synthetic-id', patch as never)).rejects.toMatchObject({
      response: { [field]: expect.any(String) },
      status: 400,
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects an empty patch with HTTP 400 before reading the transaction', async () => {
    await expect(controller.update('synthetic-id', {})).rejects.toMatchObject({ status: 400 });
    expect(findById).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('validates the resulting merged record, including fields omitted from the patch', async () => {
    findById.mockResolvedValue({ ...existing, date: '2099-01-01' });

    await expect(controller.update('synthetic-id', { note: 'edited' })).rejects.toMatchObject({
      response: { date: expect.any(String) },
      status: 400,
    });
    expect(update).not.toHaveBeenCalled();
  });
});
