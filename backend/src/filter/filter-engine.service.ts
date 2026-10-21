import { Injectable } from '@nestjs/common';
import { Transaction, FilterCriteria, FilterResult } from '../common/types.js';

@Injectable()
export class FilterEngineService {
  /**
   * Applies AND-conjunction filter logic across type, categories, and date range.
   * Empty criteria returns all transactions unchanged.
   */
  applyFilter(
    transactions: Transaction[],
    criteria: FilterCriteria,
  ): FilterResult {
    const matches = transactions.filter((t) => {
      // Type filter
      if (criteria.type && t.type !== criteria.type) return false;

      // Category filter (multi-select OR within the criterion)
      if (
        criteria.categories?.length &&
        (!t.categoryId || !criteria.categories.includes(t.categoryId))
      ) {
        return false;
      }

      // Date range filter (inclusive on both ends)
      if (criteria.startDate && t.date < criteria.startDate) return false;
      if (criteria.endDate && t.date > criteria.endDate) return false;

      return true;
    });

    return { matches, hasResults: matches.length > 0 };
  }
}
