import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller.js';
import { CategoryRepository } from './category.repository.js';
import { PrismaService } from '../common/prisma.service.js';
import { ValidatorService } from '../validator/validator.service.js';

@Module({
  controllers: [CategoriesController],
  providers: [CategoryRepository, PrismaService, ValidatorService],
  exports: [CategoryRepository],
})
export class CategoriesModule {}
