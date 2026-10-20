import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import type { TransactionType } from '../types.js';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty({ message: 'Category name is required' })
  name: string;

  @IsEnum(['Income', 'Expense'], { message: 'Type must be Income or Expense' })
  type: TransactionType;
}
