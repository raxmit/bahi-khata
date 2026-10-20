import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service.js';
import { Category } from '../common/types.js';
import { CreateCategoryDto } from '../common/dto/create-category.dto.js';

@Injectable()
export class CategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCategoryDto): Promise<Category> {
    try {
      const record = await this.prisma.category.create({
        data: { name: data.name, type: data.type, isDefault: false },
      });
      return this.toCategory(record);
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        (e as Prisma.PrismaClientKnownRequestError).code === 'P2002'
      ) {
        throw new ConflictException(
          'Category name must be unique per type',
        );
      }
      throw this.handleError(e);
    }
  }

  async delete(id: string): Promise<void> {
    const record = await this.prisma.category.findUnique({ where: { id } });
    if (!record) throw new NotFoundException(`Category ${id} not found`);
    if (record.isDefault) {
      throw new ForbiddenException('Default categories cannot be deleted');
    }
    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (e) {
      throw this.handleError(e);
    }
  }

  async findAll(): Promise<Category[]> {
    try {
      const records = await this.prisma.category.findMany({
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      });
      return records.map(this.toCategory);
    } catch (e) {
      throw this.handleError(e);
    }
  }

  async findByNameAndType(
    name: string,
    type: Category['type'],
  ): Promise<Category | null> {
    try {
      const record = await this.prisma.category.findUnique({
        where: { name_type: { name, type } },
      });
      return record ? this.toCategory(record) : null;
    } catch (e) {
      throw this.handleError(e);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private toCategory(record: {
    id: string;
    name: string;
    type: string;
    isDefault: boolean;
  }): Category {
    return {
      id: record.id,
      name: record.name,
      type: record.type as Category['type'],
      isDefault: record.isDefault,
    };
  }

  private handleError(e: unknown): Error {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      const err = e as Prisma.PrismaClientKnownRequestError;
      if (err.code === 'P2025') {
        return new NotFoundException('Record not found');
      }
    }
    return new InternalServerErrorException('Database operation failed');
  }
}
