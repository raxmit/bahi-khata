import { Component, OnInit, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { AbstractControl, ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { TransactionApiService } from '../../core/services/transaction-api.service';
import { AppStateService } from '../../core/app-state.service';
import { ToastService } from '../../core/toast.service';
import { Transaction, FilterCriteria, FilterResult } from '../../core/types';
import { canonicalRupees, formatRupees, isValidRupeeInput } from '../../core/utils/money';
import {
  formatCivilDate,
  isWithinCivilDateRange,
  todayInAppTimeZone,
} from '../../core/utils/civil-date';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, FormsModule],
  template: `
    <div class="page-header">
      <h1>Transactions</h1>
    </div>

    <!-- Quick Entry Form -->
    <section class="card form-section">
      <h2>Add Transaction</h2>
      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label for="amount">Amount *</label>
            <input id="amount" type="text" inputmode="decimal" formControlName="amount" autocomplete="off"
              [class.invalid]="isInvalid('amount')" />
            @if (isInvalid('amount')) {
              <span class="error-msg">Enter an amount greater than ₹0 with no more than 2 decimal places</span>
            }
          </div>
          <div class="form-group">
            <label for="type">Type *</label>
            <select id="type" formControlName="type" (change)="onTypeChange()"
              [class.invalid]="isInvalid('type')">
              <option value="">Select type</option>
              <option value="Income">Income</option>
              <option value="Expense">Expense</option>
            </select>
          </div>
          <div class="form-group">
            <label for="category">Category *</label>
            <select id="category" formControlName="category" [class.invalid]="isInvalid('category')">
              <option value="">Select category</option>
              @for (cat of filteredCategories(); track cat.id) {
                <option [value]="cat.name">{{ cat.name }}</option>
              }
            </select>
          </div>
          <div class="form-group">
            <label for="date">Date *</label>
            <input id="date" type="date" formControlName="date" [max]="today"
              [class.invalid]="isInvalid('date')" />
            @if (isInvalid('date')) {
              <span class="error-msg">Date must not be in the future</span>
            }
          </div>
        </div>
        <div class="form-group">
          <label for="note">Note (optional)</label>
          <textarea id="note" formControlName="note" rows="2"
            maxlength="250" placeholder="Max 250 characters"></textarea>
          <span class="char-count">{{ form.get('note')?.value?.length ?? 0 }}/250</span>
        </div>
        <button type="submit" class="btn btn-primary" [disabled]="form.invalid || submitting()">
          {{ submitting() ? 'Saving…' : 'Add Transaction' }}
        </button>
      </form>
    </section>

    <!-- Filter Panel -->
    <section class="card filter-section">
      <h2>Filter</h2>
      <div class="filter-row">
        <div class="form-group">
          <label for="filterType">Type</label>
          <select id="filterType" [(ngModel)]="filterCriteria.type" (change)="applyFilter()"
            ngDefaultControl>
            <option value="">All</option>
            <option value="Income">Income</option>
            <option value="Expense">Expense</option>
          </select>
        </div>
        <div class="form-group">
          <label for="filterStart">From</label>
          <input id="filterStart" type="date" [(ngModel)]="filterCriteria.startDate"
            (change)="applyFilter()" ngDefaultControl />
        </div>
        <div class="form-group">
          <label for="filterEnd">To</label>
          <input id="filterEnd" type="date" [(ngModel)]="filterCriteria.endDate"
            (change)="applyFilter()" ngDefaultControl />
        </div>
        @if (dateRangeError()) {
          <span class="error-msg">Start date must not be after end date</span>
        }
        <button class="btn btn-ghost" (click)="clearFilters()">Clear Filters</button>
      </div>
    </section>

    <!-- Transaction List -->
    <section class="card">
      @if (displayedTransactions().length === 0) {
        <div class="empty-state">
          <p>No transactions found.</p>
          @if (isFiltered()) {
            <button class="btn btn-ghost" (click)="clearFilters()">Clear filters</button>
          }
        </div>
      } @else {
        <ul class="tx-list" aria-label="Transaction list">
          @for (tx of displayedTransactions(); track tx.id) {
            <li class="tx-item">
              <div class="tx-info">
                <span class="tx-category">{{ tx.category }}</span>
                <span class="tx-meta">
                  <span class="badge" [ngClass]="tx.type === 'Income' ? 'badge-income' : 'badge-expense'">
                    {{ tx.type }}
                  </span>
                  · {{ formatDate(tx.date) }}
                </span>
                @if (tx.note) { <span class="tx-note">{{ tx.note }}</span> }
              </div>
              <div class="tx-actions">
                <span [ngClass]="tx.type === 'Income' ? 'amount-income' : 'amount-expense'">
                  {{ tx.type === 'Expense' ? '-' : '+' }}{{ formatMoney(tx.amount) }}
                </span>
                <button class="btn btn-ghost btn-sm" (click)="deleteTransaction(tx)"
                  [attr.aria-label]="'Delete transaction for ' + tx.category">🗑</button>
              </div>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: [`
    .page-header { margin-bottom: 1.5rem; }
    .form-section, .filter-section { margin-bottom: 1rem; }
    .form-section h2, .filter-section h2 { margin-bottom: 1rem; }
    .form-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; }
    .filter-row { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end; }
    .filter-row .form-group { min-width: 140px; margin-bottom: 0; }
    .char-count { font-size: 0.75rem; color: var(--text-secondary); text-align: right; }
    .tx-list { list-style: none; display: flex; flex-direction: column; }
    .tx-item { display: flex; justify-content: space-between; align-items: flex-start; padding: 0.875rem 0; border-bottom: 1px solid var(--border); gap: 1rem; }
    .tx-item:last-child { border-bottom: none; }
    .tx-info { display: flex; flex-direction: column; gap: 0.2rem; flex: 1; }
    .tx-category { font-weight: 500; }
    .tx-meta { font-size: 0.8rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.4rem; }
    .tx-note { font-size: 0.8rem; color: var(--text-secondary); font-style: italic; }
    .tx-actions { display: flex; align-items: center; gap: 0.5rem; }
    .btn-sm { padding: 0.25rem 0.5rem; font-size: 0.8rem; }
  `],
})
export class TransactionsComponent implements OnInit {
  private readonly api = inject(TransactionApiService);
  private readonly state = inject(AppStateService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  today = todayInAppTimeZone();
  submitting = signal(false);
  displayedTransactions = signal<Transaction[]>([]);
  dateRangeError = signal(false);
  isFiltered = signal(false);
  filterCriteria: FilterCriteria = {};

  filteredCategories = signal(
    this.state.categories$.value.filter((c) => true),
  );

  form = this.fb.group({
    amount: ['', [Validators.required, (control: AbstractControl) => isValidRupeeInput(control.value) ? null : { rupeeAmount: true }]],
    type: ['', Validators.required],
    category: ['', Validators.required],
    date: [this.today, Validators.required],
    note: [''],
  });

  ngOnInit(): void {
    this.state.transactions$.subscribe((txs) => {
      this.displayedTransactions.set(txs);
    });
    this.state.categories$.subscribe(() => this.onTypeChange());
  }

  onTypeChange(): void {
    const type = this.form.get('type')?.value;
    const cats = this.state.categories$.value;
    this.filteredCategories.set(type ? cats.filter((c) => c.type === type) : cats);
    this.form.get('category')?.setValue('');
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.submitting.set(true);
    const val = this.form.value;
    this.api.create({
      amount: canonicalRupees(val.amount!),
      type: val.type as 'Income' | 'Expense',
      category: val.category!,
      date: val.date!,
      note: val.note || undefined,
    }).subscribe({
      next: () => {
        this.toast.show('Transaction added', 'success');
        this.form.reset({ date: this.today });
        this.state.refreshTransactions();
        this.submitting.set(false);
      },
      error: () => this.submitting.set(false),
    });
  }

  formatMoney(amount: string): string { return formatRupees(amount); }
  formatDate(date: string): string { return formatCivilDate(date); }

  applyFilter(): void {
    const { startDate, endDate } = this.filterCriteria;
    if (startDate && endDate && startDate > endDate) {
      this.dateRangeError.set(true);
      return;
    }
    this.dateRangeError.set(false);
    this.isFiltered.set(!!(this.filterCriteria.type || startDate || endDate));

    const all = this.state.transactions$.value;
    const filtered = all.filter((tx) => {
      if (this.filterCriteria.type && tx.type !== this.filterCriteria.type) return false;
      if (!isWithinCivilDateRange(tx.date, startDate, endDate)) return false;
      return true;
    });
    this.displayedTransactions.set(filtered);
  }

  clearFilters(): void {
    this.filterCriteria = {};
    this.dateRangeError.set(false);
    this.isFiltered.set(false);
    this.displayedTransactions.set(this.state.transactions$.value);
  }

  deleteTransaction(tx: Transaction): void {
    if (!confirm(`Delete transaction for ${tx.category} (${tx.amount})?`)) return;
    this.api.delete(tx.id).subscribe({
      next: () => {
        this.toast.show('Transaction deleted', 'success');
        this.state.refreshTransactions();
      },
    });
  }
}
