import { Transaction } from '../types.js';

/**
 * Returns the most recent `limit` transactions from the list.
 * Sort order: date descending, then createdAt descending for ties.
 */
export function getRecentTransactions(
  transactions: Transaction[],
  limit: number,
): Transaction[] {
  const sorted = [...transactions].sort((a, b) => {
    const dateDiff = b.date.localeCompare(a.date);
    if (dateDiff !== 0) return dateDiff;
    return b.createdAt.localeCompare(a.createdAt);
  });
  return sorted.slice(0, Math.min(limit, sorted.length));
}
