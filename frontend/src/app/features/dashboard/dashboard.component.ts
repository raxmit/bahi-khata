import { Component, OnInit, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SummaryApiService } from '../../core/services/summary-api.service';
import { AppStateService } from '../../core/app-state.service';
import { PeriodSummary, Transaction } from '../../core/types';
import { getRecentTransactions } from '../../core/utils/recent-transactions';
import { formatRupees } from '../../core/utils/money';
import { formatCivilDate, todayInAppTimeZone } from '../../core/utils/civil-date';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NgClass, RouterLink],
  template: `
    <div class="page-header">
      <h1>Dashboard</h1>
      <p class="subtitle">Current month overview</p>
    </div>

    <!-- Summary Card -->
    @if (summary()) {
      <div class="summary-grid">
        <div class="card summary-card">
          <span class="summary-label">Total Income</span>
          <span class="summary-value amount-income">
            {{ formatMoney(summary()!.totalIncome) }}
          </span>
        </div>
        <div class="card summary-card">
          <span class="summary-label">Total Expenses</span>
          <span class="summary-value amount-expense">
            {{ formatMoney(summary()!.totalExpenses) }}
          </span>
        </div>
        <div class="card summary-card">
          <span class="summary-label">Net Balance</span>
          <span class="summary-value"
            [ngClass]="summary()!.netBalance.startsWith('-') ? 'amount-expense' : 'amount-income'">
            {{ formatMoney(summary()!.netBalance) }}
          </span>
        </div>
      </div>
    } @else {
      <p class="empty-state">Loading summary…</p>
    }

    <!-- Recent Transactions -->
    <section class="card recent-section">
      <div class="section-header">
        <h2>Recent Transactions</h2>
        <a routerLink="/transactions" class="btn btn-ghost">View all</a>
      </div>

      @if (recentTransactions().length === 0) {
        <p class="empty-state">No transactions yet. Add your first one!</p>
      } @else {
        <ul class="tx-list" aria-label="Recent transactions">
          @for (tx of recentTransactions(); track tx.id) {
            <li class="tx-item">
              <div class="tx-info">
                <span class="tx-category">{{ tx.category }}</span>
                <span class="tx-date">{{ formatDate(tx.date) }}</span>
              </div>
              <span [ngClass]="tx.type === 'Income' ? 'amount-income' : 'amount-expense'">
                {{ tx.type === 'Expense' ? '-' : '+' }}{{ formatMoney(tx.amount) }}
              </span>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: [`
    .page-header { margin-bottom: 1.5rem; }
    .subtitle { color: var(--text-secondary); }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .summary-card { display: flex; flex-direction: column; gap: 0.4rem; }
    .summary-label { font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.05em; }
    .summary-value { font-size: 1.5rem; font-weight: 700; }
    .recent-section { margin-top: 0.5rem; }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
    .tx-list { list-style: none; display: flex; flex-direction: column; gap: 0.5rem; }
    .tx-item { display: flex; justify-content: space-between; align-items: center; padding: 0.75rem 0; border-bottom: 1px solid var(--border); }
    .tx-item:last-child { border-bottom: none; }
    .tx-info { display: flex; flex-direction: column; gap: 0.15rem; }
    .tx-category { font-weight: 500; }
    .tx-date { font-size: 0.8rem; color: var(--text-secondary); }
  `],
})
export class DashboardComponent implements OnInit {
  private readonly summaryApi = inject(SummaryApiService);
  private readonly state = inject(AppStateService);

  summary = signal<PeriodSummary | null>(null);
  recentTransactions = signal<Transaction[]>([]);

  formatMoney(amount: string): string { return formatRupees(amount); }
  formatDate(date: string): string { return formatCivilDate(date); }

  ngOnInit(): void {
    const today = todayInAppTimeZone();
    this.summaryApi.getSummary('monthly', today).subscribe({
      next: (s) => this.summary.set(s),
      error: () => {},
    });

    this.state.transactions$.subscribe((txs) => {
      this.recentTransactions.set(getRecentTransactions(txs, 5));
    });
  }
}
