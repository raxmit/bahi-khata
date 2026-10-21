import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Category, CreateCategoryDto, UpdateCategoryDto } from '../types';

const API = '/api/categories';

@Injectable({ providedIn: 'root' })
export class CategoryApiService {
  private readonly http = inject(HttpClient);

  getAll(): Observable<Category[]> {
    return this.http.get<Category[]>(API);
  }

  create(data: CreateCategoryDto): Observable<Category> {
    return this.http.post<Category>(API, data);
  }

  update(id: string, data: UpdateCategoryDto): Observable<Category> {
    return this.http.patch<Category>(`${API}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API}/${id}`);
  }
}
