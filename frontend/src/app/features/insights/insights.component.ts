import { Component, OnInit, inject, signal } from '@angular/core';
import { NgClass, TitleCasePipe } from '@angular/common';
import { SummaryApiService } from '../../core/services/summary-api.service';
import { AppStateService } from '../../core/app-state.service';
import { Period, PeriodSummary, WeeklyBreakdown } from '../../core/types';
import { formatRupees } from '../../core/utils/money';

@Component({
  selector: 'app-insights',
  standalone: true,
  imports: [NgClass, TitleCasePipe],
  template: `
    <div class="page-header">
      <h1>Insights</h1>
    </div>

    <!-- Period Selector -->
    <div class="period-controls card">
      <div class="period-selector" role="group" aria-label="Select period">
        @for (p of periods; track p) {
          <button class="btn" [ngClass]="period() === p ? 'btn-primary' : 'btn-ghost'"
            (click)="setPeriod(p)">
            {{ p | titlecase }}
          </button>
        }
      </div>
      <div class="period-nav" aria-label="Navigate periods">
        <button class="btn btn-ghost" (click)="navigate(-1)" aria-label="Previous period">‹</button>
        <span class="period-label">{{ periodLabel() }}</span>
        <button class="btn btn-ghost" (click)="navigate(1)" aria-label="Next period">›</button>
      </div>
    </div>

    <!-- Summary -->
    @if (summary()) {
      @if (summary()!.isEmpty) {
        <div class="empty-state card">No transactions recorded for this period.</div>
      } @else {
        <div class="summary-grid">
          <div class="card summary-card">
            <span class="summary-label">Income</span>
            <span class="summary-value amount-income">{{ formatMoney(summary()!.totalIncome) }}</span>
          </div>
          <div class="card summary-card">
            <span class="summary-label">Expenses</span>
            <span class="summary-value amount-expense">{{ formatMoney(summary()!.totalExpenses) }}</span>
          </div>
          <div class="card summary-card">
            <span class="summary-label">Net Balance</span>
            <span class="summary-value"
              [ngClass]="summary()!.netBalance.startsWith('-') ? 'amount-expense' : 'amount-income'">
              {{ formatMoney(summary()!.netBalance) }}
            </span>
          </div>
        </div>

        <!-- Category Breakdown -->
        <section class="card">
          <h2>By Category</h2>
          <ul class="breakdown-list" aria-label="Category breakdown">
            @for (cat of summary()!.categoryBreakdown; track cat.category) {
              <li class="breakdown-item">
                <span class="breakdown-name">
                  <span class="badge" [ngClass]="cat.type === 'Income' ? 'badge-income' : 'badge-expense'">
                    {{ cat.type }}
                  </span>
                  {{ cat.category }}
                </span>
                <span [ngClass]="cat.type === 'Income' ? 'amount-income' : 'amount-expense'">
                  {{ formatMoney(cat.total) }}
                </span>
              </li>
            }
          </ul>
        </section>

        <!-- Weekly Breakdown (monthly only) -->
        @if (period() === 'monthly' && weeklyBreakdown().length > 0) {
          <section class="card">
            <h2>Week by Week</h2>
            <table class="weekly-table" aria-label="Weekly breakdown">
              <thead>
                <tr>
                  <th scope="col">Week</th>
                  <th scope="col">Income</th>
                  <th scope="col">Expenses</th>
                </tr>
              </thead>
              <tbody>
                @for (week of weeklyBreakdown(); track week.weekNumber) {
                  <tr>
                    <td>Week {{ week.weekNumber }} ({{ week.startDate }} – {{ week.endDate }})</td>
                    <td class="amount-income">{{ formatMoney(week.totalIncome) }}</td>
                    <td class="amount-expense">{{ formatMoney(week.totalExpenses) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </section>
        }
      }
    } @else {
      <p class="empty-state">Loading…</p>
    }
  `,
  styles: [`
    .page-header { margin-bottom: 1.5rem; }
    .period-controls { display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .period-selector { display: flex; gap: 0.5rem; }
    .period-nav { display: flex; align-items: center; gap: 0.5rem; }
    .period-label { font-weight: 500; min-width: 120px; text-align: center; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1rem; }
    .summary-card { display: flex; flex-direction: column; gap: 0.4rem; }
    .summary-label { font-size: 0.8rem; color: var(--text-secondary); text-transform: uppercase; }
    .summary-value { font-size: 1.4rem; font-weight: 700; }
    .breakdown-list { list-style: none; display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem; }
    .breakdown-item { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--border); }
    .breakdown-item:last-child { border-bottom: none; }
    .breakdown-name { display: flex; align-items: center; gap: 0.5rem; }
    .weekly-table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.9rem; }
    .weekly-table th, .weekly-table td { padding: 0.6rem 0.75rem; text-align: left; border-bottom: 1px solid var(--border); }
    .weekly-table th { color: var(--text-secondary); font-weight: 600; font-size: 0.8rem; text-transform: uppercase; }
  `],
})
export class InsightsComponent implements OnInit {
  private readonly summaryApi = inject(SummaryApiService);
  private readonly state = inject(AppStateService);

  periods: Period[] = ['weekly', 'monthly', 'yearly'];
  period = signal<Period>('monthly');
  referenceDate = signal(new Date());
  summary = signal<PeriodSummary | null>(null);
  weeklyBreakdown = signal<WeeklyBreakdown[]>([]);

  periodLabel = signal('');

  formatMoney(amount: string): string { return formatRupees(amount); }

  ngOnInit(): void {
    this.state.currentPeriod$.subscribe((p) => {
      this.period.set(p);
      this.loadSummary();
    });
  }

  setPeriod(p: Period): void {
    this.period.set(p);
    this.state.setPeriod(p);
    this.loadSummary();
  }

  navigate(direction: -1 | 1): void {
    const d = new Date(this.referenceDate());
    const p = this.period();
    if (p === 'weekly') d.setDate(d.getDate() + direction * 7);
    else if (p === 'monthly') d.setMonth(d.getMonth() + direction);
    else d.setFullYear(d.getFullYear() + direction);
    this.referenceDate.set(d);
    this.loadSummary();
  }

  private loadSummary(): void {
    const dateStr = this.referenceDate().toISOString().split('T')[0];
    this.summaryApi.getSummary(this.period(), dateStr).subscribe({
      next: (s) => {
        this.summary.set(s);
        this.updatePeriodLabel(s);
        if (this.period() === 'monthly') this.loadWeekly(dateStr);
      },
      error: () => this.summary.set(null),
    });
  }

  private loadWeekly(monthStr: string): void {
    this.summaryApi.getWeeklyBreakdown(monthStr).subscribe({
      next: (w) => this.weeklyBreakdown.set(w),
      error: () => this.weeklyBreakdown.set([]),
    });
  }

  private updatePeriodLabel(s: PeriodSummary): void {
    this.periodLabel.set(`${s.startDate} – ${s.endDate}`);
  }
}
