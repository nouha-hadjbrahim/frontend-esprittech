import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../models/page.model';
import { HistoriqueResponse, HistoriqueFilters } from '../models/historique.model';

@Injectable({ providedIn: 'root' })
export class HistoriqueService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/historique`;

  search(
    filters: HistoriqueFilters = {},
    page = 0,
    size = 20,
    sort = 'createdAt,DESC',
  ): Observable<Page<HistoriqueResponse>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', sort);

    if (filters.entityType) {
      params = params.set('entityType', filters.entityType);
    }
    if (filters.entityId != null) {
      params = params.set('entityId', filters.entityId.toString());
    }
    if (filters.action) {
      params = params.set('action', filters.action);
    }
    if (filters.actorId != null) {
      params = params.set('actorId', filters.actorId.toString());
    }
    if (filters.dateFrom) {
      params = params.set('dateFrom', filters.dateFrom);
    }
    if (filters.dateTo) {
      params = params.set('dateTo', filters.dateTo);
    }

    return this.http.get<Page<HistoriqueResponse>>(this.base, { params });
  }
}
