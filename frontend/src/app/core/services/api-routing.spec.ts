import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CategoryApiService } from './category-api.service';
import { SummaryApiService } from './summary-api.service';
import { TransactionApiService } from './transaction-api.service';

describe('API service routing', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        CategoryApiService,
        SummaryApiService,
        TransactionApiService,
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends transaction requests through the same-origin /api prefix', () => {
    let transactions: unknown;
    TestBed.inject(TransactionApiService).getAll().subscribe((result) => transactions = result);
    const request = http.expectOne('/api/transactions');
    expect(request.request.method).toBe('GET');
    request.flush({ matches: [], hasResults: false });
    expect(transactions).toEqual([]);
  });

  it('sends category requests through the same-origin /api prefix', () => {
    TestBed.inject(CategoryApiService).getAll().subscribe();
    const request = http.expectOne('/api/categories');
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });

  it('renames a category through the same-origin /api prefix', () => {
    TestBed.inject(CategoryApiService).update('category-id', { name: 'Books' }).subscribe();
    const request = http.expectOne('/api/categories/category-id');
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ name: 'Books' });
    request.flush({});
  });

  it('sends summary requests and their parameters through /api', () => {
    TestBed.inject(SummaryApiService).getSummary('monthly', '2026-10-01').subscribe();
    const request = http.expectOne(
      (candidate) => candidate.url === '/api/summary'
        && candidate.params.get('period') === 'monthly'
        && candidate.params.get('date') === '2026-10-01',
    );
    expect(request.request.method).toBe('GET');
    request.flush({});
  });
});
