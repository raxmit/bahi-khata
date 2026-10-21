// ─── Core Enumerations ───────────────────────────────────────────────────────

export type TransactionType = 'Income' | 'Expense';
export type Period = 'weekly' | 'monthly' | 'yearly';

// ─── Domain Models ────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;           // UUID v4
  amount: string;       // positive INR amount with exactly two decimal places
  type: TransactionType; // 'Income' | 'Expense', required
  category: string;     // current category name (legacy snapshot if unmapped)
  categoryId: string;
  date: string;         // ISO 8601 date string (YYYY-MM-DD), required
  note?: string;        // optional, max 250 chars
  createdAt: string;    // ISO 8601 datetime, set on creation
  updatedAt: string;    // ISO 8601 datetime, updated on edit
}

export interface Category {
  id: string;           // UUID v4
  name: string;         // unique per type (enforced by DB unique constraint)
  type: TransactionType;
  isDefault: boolean;   // true for built-in categories; cannot be deleted
}

// ─── Summary / Insights ───────────────────────────────────────────────────────

export interface CategoryTotal {
  categoryId: string;
  category: string;
  type: TransactionType;
  total: string;
}

export interface WeeklyBreakdown {
  weekNumber: number;
  startDate: string;    // ISO 8601 date string
  endDate: string;      // ISO 8601 date string
  totalIncome: string;
  totalExpenses: string;
}

export interface PeriodSummary {
  period: Period;
  startDate: string;              // ISO 8601 date string
  endDate: string;                // ISO 8601 date string
  totalIncome: string;
  totalExpenses: string;
  netBalance: string;             // totalIncome - totalExpenses
  categoryBreakdown: CategoryTotal[]; // sorted by total descending
  isEmpty: boolean;               // true when no transactions fall in period
}

// ─── Filtering ────────────────────────────────────────────────────────────────

export interface FilterCriteria {
  type?: TransactionType;
  categories?: string[]; // Category IDs
  startDate?: string;   // ISO 8601 date string
  endDate?: string;     // ISO 8601 date string
}

export interface FilterResult {
  matches: Transaction[];
  hasResults: boolean;
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>; // fieldName -> error message
}
