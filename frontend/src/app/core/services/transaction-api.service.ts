import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  Transaction, CreateTransactionDto, UpdateTransactionDto,
  FilterCriteria, FilterResult,
} from '../types';

const API = '/api/transactions';

@Injectable({ providedIn: 'root' })
export class TransactionApiService {
  private readonly http = inject(HttpClient);

  getAll(filter?: FilterCriteria): Observable<Transaction[]> {
    let params = new HttpParams();
    if (filter?.type) params = params.set('type', filter.type);
    if (filter?.startDate) params = params.set('startDate', filter.startDate);
    if (filter?.endDate) params = params.set('endDate', filter.endDate);
    if (filter?.categories?.length) {
      filter.categories.forEach((c) => (params = params.append('categories', c)));
    }
    return this.http.get<Transaction[]>(API, { params });
  }

  create(data: CreateTransactionDto): Observable<Transaction> {
    return this.http.post<Transaction>(API, data);
  }

  update(id: string, changes: UpdateTransactionDto): Observable<Transaction> {
    return this.http.patch<Transaction>(`${API}/${id}`, changes);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/${id}`);
  }
}
