import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../models/page.model';
import {
  ReferenceCounts,
  ReferenceItem,
  ReferenceItemRequest,
  ReferenceType,
} from '../models/sujet-reference.model';

@Injectable({ providedIn: 'root' })
export class SujetReferenceService {
  private readonly http = inject(HttpClient);
  private readonly adminBaseUrl = `${environment.apiUrl}/sujet-projets/admin/references`;
  private readonly teacherBaseUrl = `${environment.apiUrl}/sujet-projets`;

  getCounts(): Observable<ReferenceCounts> {
    return this.http.get<ReferenceCounts>(`${this.adminBaseUrl}/counts`);
  }

  getPage(
    type: ReferenceType,
    page = 0,
    size = 12,
    search = ''
  ): Observable<Page<ReferenceItem>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<Page<ReferenceItem>>(`${this.adminBaseUrl}/${type}`, { params });
  }

  create(type: ReferenceType, request: ReferenceItemRequest): Observable<ReferenceItem> {
    return this.http.post<ReferenceItem>(`${this.adminBaseUrl}/${type}`, request);
  }

  update(type: ReferenceType, id: number, request: ReferenceItemRequest): Observable<ReferenceItem> {
    return this.http.put<ReferenceItem>(`${this.adminBaseUrl}/${type}/${id}`, request);
  }

  delete(type: ReferenceType, id: number): Observable<void> {
    return this.http.delete<void>(`${this.adminBaseUrl}/${type}/${id}`);
  }

  suggestDomaine(nom: string): Observable<ReferenceItem> {
    return this.http.post<ReferenceItem>(`${this.teacherBaseUrl}/references/domaines`, { nom });
  }

  suggestPrerequis(nom: string): Observable<ReferenceItem> {
    return this.http.post<ReferenceItem>(`${this.teacherBaseUrl}/references/prerequis`, { nom });
  }

  suggestTechnologie(nom: string): Observable<ReferenceItem> {
    return this.http.post<ReferenceItem>(`${this.teacherBaseUrl}/references/technologies`, { nom });
  }
}
