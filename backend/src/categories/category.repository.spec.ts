import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service.js';
import { CategoryRepository } from './category.repository.js';

describe('CategoryRepository rename and deletion safeguards', () => {
  const custom = { id: 'custom-id', name: 'Books', type: 'Expense', isDefault: false };
  const defaults = { id: 'default-id', name: 'Food', type: 'Expense', isDefault: true };

  it('blocks deletion while transactions reference the category', async () => {
    const remove = vi.fn();
    const repository = new CategoryRepository({
      category: { findUnique: vi.fn().mockResolvedValue(custom), delete: remove },
      transaction: { count: vi.fn().mockResolvedValue(2) },
    } as unknown as PrismaService);

    await expect(repository.delete(custom.id)).rejects.toBeInstanceOf(ConflictException);
    expect(remove).not.toHaveBeenCalled();
  });

  it('maps the foreign-key deletion race to HTTP 409', async () => {
    const foreignKeyError = new Prisma.PrismaClientKnownRequestError('foreign key', {
      code: 'P2003', clientVersion: '5.22.0',
    });
    const repository = new CategoryRepository({
      category: {
        findUnique: vi.fn().mockResolvedValue(custom),
        delete: vi.fn().mockRejectedValue(foreignKeyError),
      },
      transaction: { count: vi.fn().mockResolvedValue(0) },
    } as unknown as PrismaService);

    await expect(repository.delete(custom.id)).rejects.toMatchObject({ status: 409 });
  });

  it('deletes an unreferenced custom category', async () => {
    const remove = vi.fn();
    const repository = new CategoryRepository({
      category: { findUnique: vi.fn().mockResolvedValue(custom), delete: remove },
      transaction: { count: vi.fn().mockResolvedValue(0) },
    } as unknown as PrismaService);

    await repository.delete(custom.id);
    expect(remove).toHaveBeenCalledWith({ where: { id: custom.id } });
  });

  it('continues to protect default categories from deletion and rename', async () => {
    const repository = new CategoryRepository({
      category: { findUnique: vi.fn().mockResolvedValue(defaults), update: vi.fn(), delete: vi.fn() },
      transaction: { count: vi.fn() },
    } as unknown as PrismaService);

    await expect(repository.delete(defaults.id)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(repository.rename(defaults.id, 'Meals')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('renames a custom category without changing its stable ID', async () => {
    const update = vi.fn().mockResolvedValue({ ...custom, name: 'Reading' });
    const updateMany = vi.fn().mockResolvedValue({ count: 2 });
    const transaction = {
      category: { update },
      transaction: { updateMany },
    };
    const repository = new CategoryRepository({
      category: { findUnique: vi.fn().mockResolvedValue(custom) },
      $transaction: vi.fn(async (action) => action(transaction)),
    } as unknown as PrismaService);

    await expect(repository.rename(custom.id, 'Reading')).resolves.toMatchObject({
      id: custom.id, name: 'Reading', type: 'Expense', isDefault: false,
    });
    expect(update).toHaveBeenCalledWith({ where: { id: custom.id }, data: { name: 'Reading' } });
    expect(updateMany).toHaveBeenCalledWith({
      where: { categoryId: custom.id }, data: { category: 'Reading' },
    });
  });
});
