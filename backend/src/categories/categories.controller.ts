import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, HttpCode, HttpStatus,
  BadRequestException, ConflictException, NotFoundException,
} from '@nestjs/common';
import { CategoryRepository } from './category.repository.js';
import { ValidatorService } from '../validator/validator.service.js';
import { CreateCategoryDto } from '../common/dto/create-category.dto.js';
import { Category } from '../common/types.js';
import { UpdateCategoryDto } from '../common/dto/update-category.dto.js';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly repo: CategoryRepository,
    private readonly validator: ValidatorService,
  ) {}

  /** GET /categories — list all categories sorted alphabetically within each type */
  @Get()
  async findAll() {
    const categories = await this.repo.findAll();
    return this.sortCategories(categories);
  }

  /** POST /categories — create a new custom category */
  @Post()
  async create(@Body() dto: CreateCategoryDto) {
    // Validate uniqueness before hitting the DB
    const existing = await this.repo.findAll();
    const validation = this.validator.validateCategory(dto, existing);
    if (!validation.valid) {
      throw new BadRequestException(validation.errors);
    }
    return this.repo.create(dto);
  }

  /** PATCH /categories/:id — rename a custom category while preserving its identity. */
  @Patch(':id')
  async rename(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    const current = await this.repo.findById(id);
    if (!current) throw new NotFoundException('Category not found');
    const validation = this.validator.validateCategory(
      { name: dto.name, type: current.type },
      (await this.repo.findAll()).filter((category) => category.id !== id),
    );
    if (!validation.valid) {
      if (validation.errors['name'] === 'Category name must be unique per type') {
        throw new ConflictException(validation.errors);
      }
      throw new BadRequestException(validation.errors);
    }
    return this.repo.rename(id, dto.name.trim());
  }

  /** DELETE /categories/:id — remove a custom category (default categories blocked) */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.repo.delete(id); // throws ForbiddenException for default categories
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private sortCategories(categories: Category[]): Category[] {
    return [...categories].sort((a, b) => {
      // Group by type first (Income before Expense), then alphabetically by name
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.name.localeCompare(b.name);
    });
  }
}
