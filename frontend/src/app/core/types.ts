export type TransactionType = 'Income' | 'Expense';
export type Period = 'weekly' | 'monthly' | 'yearly';

export interface Transaction {
  id: string;
  amount: string;
  type: TransactionType;
  category: string;
  categoryId: string;
  date: string;        // YYYY-MM-DD
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  isDefault: boolean;
}

export interface CategoryTotal {
  categoryId: string;
  category: string;
  type: TransactionType;
  total: string;
}

export interface WeeklyBreakdown {
  weekNumber: number;
  startDate: string;
  endDate: string;
  totalIncome: string;
  totalExpenses: string;
}

export interface PeriodSummary {
  period: Period;
  startDate: string;
  endDate: string;
  totalIncome: string;
  totalExpenses: string;
  netBalance: string;
  categoryBreakdown: CategoryTotal[];
  isEmpty: boolean;
}

export interface FilterCriteria {
  type?: TransactionType;
  categories?: string[]; // Category IDs
  startDate?: string;
  endDate?: string;
}

export interface FilterResult {
  matches: Transaction[];
  hasResults: boolean;
}

export interface CreateTransactionDto {
  amount: string;
  type: TransactionType;
  categoryId: string;
  date: string;
  note?: string;
}

export interface UpdateTransactionDto {
  amount?: string;
  type?: TransactionType;
  categoryId?: string;
  date?: string;
  note?: string;
}

export interface CreateCategoryDto {
  name: string;
  type: TransactionType;
}

export interface UpdateCategoryDto {
  name: string;
}
