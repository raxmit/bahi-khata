import { Injectable } from '@nestjs/common';
import { Category, ValidationResult } from '../common/types.js';
import { CreateTransactionDto } from '../common/dto/create-transaction.dto.js';
import { CreateCategoryDto } from '../common/dto/create-category.dto.js';
import { FilterCriteriaDto } from '../common/dto/filter-criteria.dto.js';

@Injectable()
export class ValidatorService {
  /**
   * Validates a transaction input against business rules.
   * Enforces: amount > 0, date not in future, all required fields present,
   * note truncated at 250 chars.
   */
  validateTransaction(input: Partial<CreateTransactionDto>): ValidationResult {
    const errors: Record<string, string> = {};

    // Required field checks
    if (input.amount === undefined || input.amount === null) {
      errors['amount'] = 'Amount is required';
    } else if (
      typeof input.amount !== 'string' ||
      !/^(?:0|[1-9]\d{0,12})\.\d{2}$/.test(input.amount) ||
      /^0+\.00$/.test(input.amount)
    ) {
      errors['amount'] =
        'Amount must be a positive INR amount with two decimal places';
    }

    if (!input.type) {
      errors['type'] = 'Type is required';
    } else if (!['Income', 'Expense'].includes(input.type)) {
      errors['type'] = 'Type must be Income or Expense';
    }

    if (!input.category || input.category.trim() === '') {
      errors['category'] = 'Category is required';
    }

    if (!input.date) {
      errors['date'] = 'Date is required';
    } else {
      const parsed = new Date(input.date);
      if (isNaN(parsed.getTime())) {
        errors['date'] = 'Date must be a valid ISO 8601 date string';
      } else {
        // Strip time from today for fair date-only comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const txDate = new Date(input.date);
        txDate.setHours(0, 0, 0, 0);
        if (txDate > today) {
          errors['date'] = 'Date must not be in the future';
        }
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }

  /**
   * Validates a new category ensuring the name is unique within its type.
   */
  validateCategory(
    input: Partial<CreateCategoryDto>,
    existing: Category[],
  ): ValidationResult {
    const errors: Record<string, string> = {};

    if (!input.name || input.name.trim() === '') {
      errors['name'] = 'Category name is required';
    }

    if (!input.type) {
      errors['type'] = 'Type is required';
    } else if (!['Income', 'Expense'].includes(input.type)) {
      errors['type'] = 'Type must be Income or Expense';
    }

    // Uniqueness check: name must be unique per type
    if (input.name && input.type) {
      const duplicate = existing.find(
        (c) =>
          c.name.toLowerCase() === input.name!.toLowerCase() &&
          c.type === input.type,
      );
      if (duplicate) {
        errors['name'] = 'Category name must be unique per type';
      }
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }

  /**
   * Validates filter criteria — specifically that startDate <= endDate.
   */
  validateFilter(filter: FilterCriteriaDto): ValidationResult {
    const errors: Record<string, string> = {};

    if (filter.startDate && filter.endDate) {
      const start = new Date(filter.startDate);
      const end = new Date(filter.endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start > end) {
        errors['dateRange'] =
          'startDate must not be later than endDate';
      }
    }

    if (filter.startDate && isNaN(new Date(filter.startDate).getTime())) {
      errors['startDate'] = 'startDate must be a valid ISO 8601 date string';
    }

    if (filter.endDate && isNaN(new Date(filter.endDate).getTime())) {
      errors['endDate'] = 'endDate must be a valid ISO 8601 date string';
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }

  /**
   * Truncates a note to 250 characters if it exceeds the limit.
   * Returns the (possibly truncated) value and a flag indicating truncation.
   */
  truncateNote(note: string): { value: string; truncated: boolean } {
    const MAX = 250;
    if (note.length > MAX) {
      return { value: note.slice(0, MAX), truncated: true };
    }
    return { value: note, truncated: false };
  }
}
