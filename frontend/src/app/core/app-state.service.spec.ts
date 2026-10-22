import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { throwError } from 'rxjs';
import { AppStateService } from './app-state.service';
import { CategoryApiService } from './services/category-api.service';
import { TransactionApiService } from './services/transaction-api.service';

describe('AppStateService error logging', () => {
  it('logs only the HTTP status instead of a response body', () => {
    const transactionApi = {
      getAll: vi.fn(() => throwError(() => new HttpErrorResponse({
        status: 500,
        error: { message: 'amount=123.45 password=secret' },
      }))),
    };
    const categoryApi = { getAll: vi.fn() };
    const errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    TestBed.configureTestingModule({
      providers: [
        AppStateService,
        { provide: TransactionApiService, useValue: transactionApi },
        { provide: CategoryApiService, useValue: categoryApi },
      ],
    });

    TestBed.inject(AppStateService).refreshTransactions();

    expect(errorLog).toHaveBeenCalledWith('Failed to load transactions', { status: 500 });
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('123.45');
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain('password=secret');
    errorLog.mockRestore();
  });
});
