import { PrismaService } from '../common/prisma.service.js';
import { TransactionRepository } from './transaction.repository.js';

describe('TransactionRepository civil date mapping', () => {
  it('maps the same civil date to and from Prisma DATE in UTC', async () => {
    const create = vi.fn(async ({ data }: { data: { date: Date } }) => ({
      id: 'synthetic',
      amount: { toFixed: () => '1.00' },
      type: 'Expense',
      category: 'Food',
      date: data.date,
      note: null,
      createdAt: new Date('2026-03-01T10:00:00.000Z'),
      updatedAt: new Date('2026-03-01T10:00:00.000Z'),
    }));
    const prisma = { transaction: { create } } as unknown as PrismaService;
    const repository = new TransactionRepository(prisma);

    const result = await repository.create({
      amount: '1.00',
      type: 'Expense',
      category: 'Food',
      date: '2026-03-01',
    });

    const createData = create.mock.calls[0][0].data;
    expect(createData.date.toISOString()).toBe('2026-03-01T00:00:00.000Z');
    expect(result.date).toBe('2026-03-01');
  });
});
