import { BadRequestException, ConflictException } from '@nestjs/common';
import { ValidatorService } from '../validator/validator.service.js';
import { CategoryRepository } from './category.repository.js';
import { CategoriesController } from './categories.controller.js';

describe('CategoriesController rename', () => {
  const findById = vi.fn();
  const findAll = vi.fn();
  const rename = vi.fn();
  let controller: CategoriesController;

  beforeEach(() => {
    vi.clearAllMocks();
    findById.mockResolvedValue({ id: 'custom-id', name: 'Books', type: 'Expense', isDefault: false });
    findAll.mockResolvedValue([{ id: 'custom-id', name: 'Books', type: 'Expense', isDefault: false }]);
    rename.mockImplementation(async (id, name) => ({ id, name, type: 'Expense', isDefault: false }));
    controller = new CategoriesController(
      { findById, findAll, rename } as unknown as CategoryRepository,
      new ValidatorService(),
    );
  });

  it('renames a custom category with stable identity', async () => {
    await expect(controller.rename('custom-id', { name: '  Reading  ' })).resolves.toMatchObject({
      id: 'custom-id', name: 'Reading',
    });
    expect(rename).toHaveBeenCalledWith('custom-id', 'Reading');
  });

  it('rejects blank and duplicate names before persistence', async () => {
    findAll.mockResolvedValue([
      { id: 'custom-id', name: 'Books', type: 'Expense', isDefault: false },
      { id: 'other-id', name: 'Reading', type: 'Expense', isDefault: false },
    ]);
    await expect(controller.rename('custom-id', { name: '' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.rename('custom-id', { name: '   ' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.rename('custom-id', { name: 'Reading' })).rejects.toBeInstanceOf(ConflictException);
    expect(rename).not.toHaveBeenCalled();
  });
});
