import { Injectable } from '@nestjs/common';
import { Category, ValidationResult } from '../common/types.js';
import { CreateTransactionDto } from '../common/dto/create-transaction.dto.js';
import { CreateCategoryDto } from '../common/dto/create-category.dto.js';
import { FilterCriteriaDto } from '../common/dto/filter-criteria.dto.js';
import {
  isValidCivilDate,
  todayInTimeZone,
} from '../common/utils/civil-date.js';

@Injectable()
export class ValidatorService {
  /**
   * Validates a transaction input against business rules.
   * Enforces exact positive INR amounts, required fields, civil-date rules,
   * and an optional text note no longer than 250 characters.
   */
  validateTransaction(
    input: Partial<CreateTransactionDto>,
    now: Date = new Date(),
  ): ValidationResult {
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

    if (input.categoryId === undefined || input.categoryId === null || input.categoryId === '') {
      errors['categoryId'] = 'Category ID is required';
    } else if (typeof input.categoryId !== 'string' || input.categoryId.trim() === '') {
      errors['categoryId'] = 'Category ID is invalid';
    }

    if (!input.date) {
      errors['date'] = 'Date is required';
    } else if (!isValidCivilDate(input.date)) {
      errors['date'] = 'Date must be a valid YYYY-MM-DD calendar date';
    } else if (input.date > todayInTimeZone(now)) {
      errors['date'] = 'Date must not be in the future';
    }

    if (input.note !== undefined) {
      if (typeof input.note !== 'string') {
        errors['note'] = 'Note must be text';
      } else if (input.note.length > 250) {
        errors['note'] = 'Note must not exceed 250 characters';
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

    if (filter.startDate && !isValidCivilDate(filter.startDate)) {
      errors['startDate'] = 'startDate must be a valid YYYY-MM-DD calendar date';
    }

    if (filter.endDate && !isValidCivilDate(filter.endDate)) {
      errors['endDate'] = 'endDate must be a valid YYYY-MM-DD calendar date';
    }

    if (
      filter.startDate && filter.endDate &&
      isValidCivilDate(filter.startDate) && isValidCivilDate(filter.endDate) &&
      filter.startDate > filter.endDate
    ) {
      errors['dateRange'] = 'startDate must not be later than endDate';
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }

}
