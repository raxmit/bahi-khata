import { PrismaService } from '../common/prisma.service.js';
import { TransactionRepository } from './transaction.repository.js';
import { BadRequestException } from '@nestjs/common';

describe('TransactionRepository civil date mapping', () => {
  it('maps the same civil date to and from Prisma DATE in UTC', async () => {
    const category = { id: 'food-id', name: 'Food', type: 'Expense', isDefault: true };
    const create = vi.fn(async ({ data }: { data: { date: Date; categoryId: string } }) => ({
      id: 'synthetic',
      amount: { toFixed: () => '1.00' },
      type: 'Expense',
      category: 'Food',
      categoryId: data.categoryId,
      categoryRef: category,
      date: data.date,
      note: null,
      createdAt: new Date('2026-03-01T10:00:00.000Z'),
      updatedAt: new Date('2026-03-01T10:00:00.000Z'),
    }));
    const prisma = { transaction: { create }, category: { findUnique: vi.fn().mockResolvedValue(category) } } as unknown as PrismaService;
    const repository = new TransactionRepository(prisma);

    const result = await repository.create({
      amount: '1.00',
      type: 'Expense',
      categoryId: 'food-id',
      date: '2026-03-01',
    });

    const createData = create.mock.calls[0][0].data;
    expect(createData.date.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(result.date).toBe('2026-03-01');
  });
});

describe('TransactionRepository category ID integrity', () => {
  const expenseCategory = { id: 'expense-id', name: 'Food', type: 'Expense', isDefault: true };
  const incomeCategory = { id: 'income-id', name: 'Bonus', type: 'Income', isDefault: true };
  const transactionRecord = {
    id: 'tx-id',
    amount: { toFixed: () => '1.00' },
    type: 'Expense',
    category: 'Food',
    categoryId: 'expense-id',
    categoryRef: expenseCategory,
    date: new Date('2026-03-01T00:00:00Z'),
    note: null,
    createdAt: new Date('2026-03-01T10:00:00Z'),
    updatedAt: new Date('2026-03-01T10:00:00Z'),
  };

  it.each([null, incomeCategory])('rejects a missing or wrong-type category on create', async (selected) => {
    const create = vi.fn();
    const repository = new TransactionRepository({
      category: { findUnique: vi.fn().mockResolvedValue(selected) },
      transaction: { create },
    } as unknown as PrismaService);

    await expect(repository.create({
      amount: '1.00', type: 'Expense', categoryId: 'bad-id', date: '2026-03-01',
    })).rejects.toMatchObject({ status: 400 });
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects changing transaction type without a matching category ID', async () => {
    const update = vi.fn();
    const repository = new TransactionRepository({
      transaction: { findUnique: vi.fn().mockResolvedValue(transactionRecord), update },
      category: { findUnique: vi.fn().mockResolvedValue(expenseCategory) },
    } as unknown as PrismaService);

    await expect(repository.update('tx-id', { type: 'Income' })).rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects assigning a missing category ID on update', async () => {
    const update = vi.fn();
    const repository = new TransactionRepository({
      transaction: { findUnique: vi.fn().mockResolvedValue(transactionRecord), update },
      category: { findUnique: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaService);

    await expect(repository.update('tx-id', { categoryId: 'missing-id' })).rejects.toMatchObject({ status: 400 });
    expect(update).not.toHaveBeenCalled();
  });

  it('accepts a type and matching category change together', async () => {
    const update = vi.fn().mockResolvedValue({
      ...transactionRecord,
      type: 'Income',
      category: 'Bonus',
      categoryId: 'income-id',
      categoryRef: incomeCategory,
    });
    const repository = new TransactionRepository({
      transaction: { findUnique: vi.fn().mockResolvedValue(transactionRecord), update },
      category: { findUnique: vi.fn().mockResolvedValue(incomeCategory) },
    } as unknown as PrismaService);

    await repository.update('tx-id', { type: 'Income', categoryId: 'income-id' });
    expect(update.mock.calls[0][0].data).toMatchObject({
      type: 'Income', categoryId: 'income-id', category: 'Bonus',
    });
  });
});
