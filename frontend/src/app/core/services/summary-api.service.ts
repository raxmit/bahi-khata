import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Period, PeriodSummary, WeeklyBreakdown } from '../types';

const API = '/api/summary';

@Injectable({ providedIn: 'root' })
export class SummaryApiService {
  private readonly http = inject(HttpClient);

  getSummary(period: Period, date: string): Observable<PeriodSummary> {
    const params = new HttpParams().set('period', period).set('date', date);
    return this.http.get<PeriodSummary>(API, { params });
  }

  getWeeklyBreakdown(month: string): Observable<WeeklyBreakdown[]> {
    const params = new HttpParams().set('month', month);
    return this.http.get<WeeklyBreakdown[]>(`${API}/weekly`, { params });
  }
}
