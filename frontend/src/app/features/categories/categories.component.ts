import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CategoryApiService } from '../../core/services/category-api.service';
import { AppStateService } from '../../core/app-state.service';
import { ToastService } from '../../core/toast.service';
import { Category } from '../../core/types';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <div class="page-header">
      <h1>Categories</h1>
    </div>

    <!-- Add Category Form -->
    <section class="card form-section">
      <h2>Add Category</h2>
      <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
        <div class="form-row">
          <div class="form-group">
            <label for="name">Name *</label>
            <input id="name" type="text" formControlName="name"
              [class.invalid]="isInvalid('name')" placeholder="Category name" />
            @if (isInvalid('name')) {
              <span class="error-msg">Name is required</span>
            }
            @if (duplicateError()) {
              <span class="error-msg">Category name must be unique per type</span>
            }
          </div>
          <div class="form-group">
            <label for="catType">Type *</label>
            <select id="catType" formControlName="type" [class.invalid]="isInvalid('type')">
              <option value="">Select type</option>
              <option value="Income">Income</option>
              <option value="Expense">Expense</option>
            </select>
            @if (isInvalid('type')) {
              <span class="error-msg">Type is required</span>
            }
          </div>
          <div class="form-group form-group-action">
            <button type="submit" class="btn btn-primary" [disabled]="form.invalid || submitting()">
              {{ submitting() ? 'Saving…' : 'Add' }}
            </button>
          </div>
        </div>
      </form>
    </section>

    <!-- Income Categories -->
    <section class="card category-section">
      <h2>Income Categories</h2>
      <ul class="category-list" aria-label="Income categories">
        @for (cat of incomeCategories(); track cat.id) {
          <li class="category-item">
            <span>{{ cat.name }}</span>
            @if (cat.isDefault) {
              <span class="default-badge">default</span>
            } @else {
              <button class="btn btn-ghost btn-sm" (click)="deleteCategory(cat)"
                [attr.aria-label]="'Delete ' + cat.name">🗑</button>
            }
          </li>
        }
      </ul>
    </section>

    <!-- Expense Categories -->
    <section class="card category-section">
      <h2>Expense Categories</h2>
      <ul class="category-list" aria-label="Expense categories">
        @for (cat of expenseCategories(); track cat.id) {
          <li class="category-item">
            <span>{{ cat.name }}</span>
            @if (cat.isDefault) {
              <span class="default-badge">default</span>
            } @else {
              <button class="btn btn-ghost btn-sm" (click)="deleteCategory(cat)"
                [attr.aria-label]="'Delete ' + cat.name">🗑</button>
            }
          </li>
        }
      </ul>
    </section>
  `,
  styles: [`
    .page-header { margin-bottom: 1.5rem; }
    .form-section { margin-bottom: 1rem; }
    .form-section h2 { margin-bottom: 1rem; }
    .form-row { display: flex; flex-wrap: wrap; gap: 1rem; align-items: flex-end; }
    .form-row .form-group { flex: 1; min-width: 160px; margin-bottom: 0; }
    .form-group-action { flex: 0; min-width: auto; display: flex; align-items: flex-end; }
    .category-section { margin-bottom: 1rem; }
    .category-section h2 { margin-bottom: 0.75rem; }
    .category-list { list-style: none; display: flex; flex-direction: column; gap: 0.25rem; }
    .category-item { display: flex; justify-content: space-between; align-items: center; padding: 0.6rem 0; border-bottom: 1px solid var(--border); }
    .category-item:last-child { border-bottom: none; }
    .default-badge { font-size: 0.7rem; background: var(--hover); color: var(--text-secondary); padding: 0.15rem 0.5rem; border-radius: 9999px; }
    .btn-sm { padding: 0.25rem 0.5rem; font-size: 0.85rem; }
  `],
})
export class CategoriesComponent implements OnInit {
  private readonly api = inject(CategoryApiService);
  private readonly state = inject(AppStateService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  submitting = signal(false);
  duplicateError = signal(false);
  incomeCategories = signal<Category[]>([]);
  expenseCategories = signal<Category[]>([]);

  form = this.fb.group({
    name: ['', Validators.required],
    type: ['', Validators.required],
  });

  ngOnInit(): void {
    this.state.categories$.subscribe((cats) => {
      this.incomeCategories.set(
        cats.filter((c) => c.type === 'Income').sort((a, b) => a.name.localeCompare(b.name)),
      );
      this.expenseCategories.set(
        cats.filter((c) => c.type === 'Expense').sort((a, b) => a.name.localeCompare(b.name)),
      );
    });
  }

  isInvalid(field: string): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl?.touched);
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    this.duplicateError.set(false);
    if (this.form.invalid) return;

    this.submitting.set(true);
    const val = this.form.value;
    this.api.create({ name: val.name!, type: val.type as 'Income' | 'Expense' }).subscribe({
      next: () => {
        this.toast.show('Category added', 'success');
        this.form.reset();
        this.state.refreshCategories();
        this.submitting.set(false);
      },
      error: (err) => {
        if (err.status === 409 || err.status === 400) {
          this.duplicateError.set(true);
        }
        this.submitting.set(false);
      },
    });
  }

  deleteCategory(cat: Category): void {
    if (!confirm(`Delete category "${cat.name}"? Existing transactions will keep this category label.`)) return;
    this.api.delete(cat.id).subscribe({
      next: () => {
        this.toast.show('Category deleted', 'success');
        this.state.refreshCategories();
      },
      error: (err) => {
        if (err.status === 403) {
          this.toast.show('Default categories cannot be deleted', 'error');
        }
      },
    });
  }
}
