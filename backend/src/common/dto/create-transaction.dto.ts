import {
  IsEnum,
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  Matches,
} from 'class-validator';
import type { TransactionType } from '../types.js';

export class CreateTransactionDto {
  @Matches(/^(?=.*[1-9])(?:0|[1-9]\d{0,12})\.\d{2}$/, {
    message: 'Amount must be a positive INR amount with two decimal places',
  })
  amount: string;

  @IsEnum(['Income', 'Expense'], { message: 'Type must be Income or Expense' })
  type: TransactionType;

  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  category: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must use YYYY-MM-DD format',
  })
  date: string;

  @IsOptional()
  @MaxLength(250, { message: 'Note must not exceed 250 characters' })
  note?: string;
}
