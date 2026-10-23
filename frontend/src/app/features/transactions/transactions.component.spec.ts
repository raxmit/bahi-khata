import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { AppStateService } from '../../core/app-state.service';
import { CategoryApiService } from '../../core/services/category-api.service';
import { TransactionApiService } from '../../core/services/transaction-api.service';
import { ToastService } from '../../core/toast.service';
import type { Transaction } from '../../core/types';
import { TransactionsComponent } from './transactions.component';

describe('TransactionsComponent create feedback', () => {
  const savedTransaction: Transaction = {
    id: 'synthetic-transaction-1',
    amount: '48.25',
    type: 'Expense',
    category: 'Food',
    categoryId: 'synthetic-food-category',
    date: '2026-10-23',
    note: 'Synthetic M3.1 entry',
    createdAt: '2026-10-23T12:00:00.000Z',
    updatedAt: '2026-10-23T12:00:00.000Z',
  };

  function setup() {
    const createResponse = new Subject<Transaction>();
    const transactionApi = {
      create: vi.fn().mockReturnValue(createResponse.asObservable()),
      getAll: vi.fn().mockReturnValue(of([])),
      delete: vi.fn(),
    };
    const categoryApi = { getAll: vi.fn().mockReturnValue(of([])) };
    const toast = { show: vi.fn() };

    TestBed.configureTestingModule({
      imports: [TransactionsComponent],
      providers: [
        AppStateService,
        { provide: TransactionApiService, useValue: transactionApi },
        { provide: CategoryApiService, useValue: categoryApi },
        { provide: ToastService, useValue: toast },
      ],
    });

    const fixture = TestBed.createComponent(TransactionsComponent);
    fixture.detectChanges();
    return {
      fixture,
      component: fixture.componentInstance,
      createResponse,
      transactionApi,
      toast,
      state: TestBed.inject(AppStateService),
    };
  }

  function fillForm(component: TransactionsComponent): void {
    component.form.setValue({
      amount: '48.25',
      type: 'Expense',
      categoryId: 'synthetic-food-category',
      date: component.today,
      note: 'Synthetic M3.1 entry',
    });
  }

  it('shows pending state and blocks duplicate submits', () => {
    const { fixture, component, transactionApi, state } = setup();
    const refreshTransactions = vi.spyOn(state, 'refreshTransactions');
    fillForm(component);

    component.onSubmit();
    fixture.detectChanges();

    const submitButton = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(component.submitting()).toBe(true);
    expect(submitButton.disabled).toBe(true);
    expect(submitButton.textContent).toContain('Saving');

    component.onSubmit();
    expect(transactionApi.create).toHaveBeenCalledTimes(1);
    expect(refreshTransactions).not.toHaveBeenCalled();
  });

  const privateFailureDetail = 'PRIVATE_FINANCIAL_RESPONSE_AMOUNT_999.99';
  it.each([
    [
      'network failure',
      new HttpErrorResponse({ status: 0, error: { message: privateFailureDetail } }),
      'Could not reach the server',
    ],
    [
      '400 rejection',
      new HttpErrorResponse({ status: 400, error: { message: privateFailureDetail } }),
      'Transaction was rejected',
    ],
    [
      '404 not found',
      new HttpErrorResponse({ status: 404, error: { message: privateFailureDetail } }),
      'selected category could not be found',
    ],
    [
      '409 conflict',
      new HttpErrorResponse({ status: 409, error: { message: privateFailureDetail } }),
      'conflict prevented saving',
    ],
    [
      '500 server error',
      new HttpErrorResponse({ status: 500, error: { message: privateFailureDetail } }),
      'service could not save the transaction',
    ],
    [
      '503 unavailable',
      new HttpErrorResponse({ status: 503, error: { message: privateFailureDetail } }),
      'service could not save the transaction',
    ],
    [
      'non-HTTP failure',
      new Error(privateFailureDetail),
      'Transaction could not be saved',
    ],
  ] as const)('shows safe actionable guidance for %s and retains the form', (_case, failure, guidance) => {
    const { fixture, component, createResponse, state } = setup();
    const refreshTransactions = vi.spyOn(state, 'refreshTransactions');
    fillForm(component);
    const enteredValues = component.form.getRawValue();

    component.onSubmit();
    createResponse.error(failure);
    fixture.detectChanges();

    expect(component.submitting()).toBe(false);
    expect(component.form.getRawValue()).toEqual(enteredValues);
    expect(component.submitError()).toContain(guidance);
    expect(component.submitError()).toMatch(/try again/i);
    const alertText = fixture.nativeElement.querySelector('[role="alert"]')?.textContent ?? '';
    expect(alertText).toContain(guidance);
    expect(alertText).not.toContain(privateFailureDetail);
    expect(refreshTransactions).not.toHaveBeenCalled();
  });

  it('refreshes once only after create succeeds, then resets the form and displays the saved row once', () => {
    const {
      fixture, component, createResponse, transactionApi, toast, state,
    } = setup();
    const refreshTransactions = vi.spyOn(state, 'refreshTransactions');
    transactionApi.getAll.mockReturnValue(of([savedTransaction]));
    fillForm(component);

    component.onSubmit();

    expect(transactionApi.create).toHaveBeenCalledWith({
      amount: '48.25',
      type: 'Expense',
      categoryId: 'synthetic-food-category',
      date: component.today,
      note: 'Synthetic M3.1 entry',
    });
    expect(refreshTransactions).not.toHaveBeenCalled();

    createResponse.next(savedTransaction);
    createResponse.complete();
    fixture.detectChanges();

    expect(refreshTransactions).toHaveBeenCalledTimes(1);
    expect(transactionApi.getAll).toHaveBeenCalledTimes(1);
    expect(component.displayedTransactions()).toEqual([savedTransaction]);
    expect(fixture.nativeElement.querySelectorAll('.tx-item')).toHaveLength(1);
    expect(component.form.get('amount')?.value).toBeNull();
    expect(component.form.get('date')?.value).toBe(component.today);
    expect(component.submitting()).toBe(false);
    expect(toast.show).toHaveBeenCalledWith('Transaction added', 'success');
  });
});
