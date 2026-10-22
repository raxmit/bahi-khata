import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { Transaction, Category, Period } from './types';
import { TransactionApiService } from './services/transaction-api.service';
import { CategoryApiService } from './services/category-api.service';

@Injectable({ providedIn: 'root' })
export class AppStateService {
  private readonly transactionApi = inject(TransactionApiService);
  private readonly categoryApi = inject(CategoryApiService);

  readonly transactions$ = new BehaviorSubject<Transaction[]>([]);
  readonly categories$ = new BehaviorSubject<Category[]>([]);
  readonly currentPeriod$ = new BehaviorSubject<Period>('monthly');

  /** Reload transactions from the API and push to stream */
  refreshTransactions(): void {
    this.transactionApi.getAll().subscribe({
      next: (txs) => this.transactions$.next(txs),
      error: (error: unknown) => this.logApiFailure('Failed to load transactions', error),
    });
  }

  /** Reload categories from the API and push to stream */
  refreshCategories(): void {
    this.categoryApi.getAll().subscribe({
      next: (cats) => this.categories$.next(cats),
      error: (error: unknown) => this.logApiFailure('Failed to load categories', error),
    });
  }

  /** Refresh both datasets at once (e.g. on app init) */
  refreshAll(): void {
    this.refreshTransactions();
    this.refreshCategories();
  }

  setPeriod(period: Period): void {
    this.currentPeriod$.next(period);
  }

  private logApiFailure(context: string, error: unknown): void {
    const details = error instanceof HttpErrorResponse
      ? { status: error.status }
      : { errorType: error instanceof Error ? error.name : typeof error };
    console.error(context, details);
  }
}
