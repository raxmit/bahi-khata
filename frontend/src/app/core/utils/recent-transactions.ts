import { Transaction } from '../types';

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
