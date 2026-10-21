import { IsOptional, IsEnum, IsString, Matches } from 'class-validator';
import type { TransactionType } from '../types.js';

export class FilterCriteriaDto {
  @IsOptional()
  @IsEnum(['Income', 'Expense'], { message: 'Type must be Income or Expense' })
  type?: TransactionType;

  @IsOptional()
  @IsString({ each: true, message: 'Each category must be a string' })
  categories?: string[]; // Category IDs

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'startDate must use YYYY-MM-DD format' })
  startDate?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'endDate must use YYYY-MM-DD format' })
  endDate?: string;
}
