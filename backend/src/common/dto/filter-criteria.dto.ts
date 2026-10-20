import { IsOptional, IsEnum, IsString, IsDateString } from 'class-validator';
import type { TransactionType } from '../types.js';

export class FilterCriteriaDto {
  @IsOptional()
  @IsEnum(['Income', 'Expense'], { message: 'Type must be Income or Expense' })
  type?: TransactionType;

  @IsOptional()
  @IsString({ each: true, message: 'Each category must be a string' })
  categories?: string[];

  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid ISO 8601 date string' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate must be a valid ISO 8601 date string' })
  endDate?: string;
}
