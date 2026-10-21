import { Transform } from 'class-transformer';
import { IsOptional, IsEnum, IsArray, IsString, Matches, ArrayNotEmpty } from 'class-validator';
import type { TransactionType } from '../types.js';

export class FilterCriteriaDto {
  @IsOptional()
  @IsEnum(['Income', 'Expense'], { message: 'Type must be Income or Expense' })
  type?: TransactionType;

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      const category = value.trim();
      return category ? [category] : undefined;
    }
    if (Array.isArray(value)) {
      const categories = value.map((item) => typeof item === 'string' ? item.trim() : item)
        .filter((item) => item !== '');
      return categories.length ? categories : undefined;
    }
    return value;
  })
  @IsArray({ message: 'Categories must be supplied as repeated category IDs' })
  @ArrayNotEmpty({ message: 'At least one category ID must be provided' })
  @IsString({ each: true, message: 'Each category must be a string' })
  categories?: string[]; // Category IDs

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must use YYYY-MM-DD format' })
  startDate?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate must use YYYY-MM-DD format' })
  endDate?: string;
}
