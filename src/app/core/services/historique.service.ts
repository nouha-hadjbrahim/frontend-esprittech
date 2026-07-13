import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../models/page.model';
import {
  HistoriqueEntry,
  HistoriqueFilter,
  HistoriqueFilters,
  HistoriqueResponse,
} from '../models/historique.model';

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

  /**
   * Historique d'un projet du catalogue. Accessible aux rôles de gouvernance ainsi
   * qu'à l'enseignant encadrant du projet (contrôle d'accès fait côté serveur).
   */
  findByProjet(projetId: number): Observable<HistoriqueResponse[]> {
    return this.http.get<HistoriqueResponse[]>(`${this.base}/projet/${projetId}`);
  }

  getBySujet(sujetId: number, filter: HistoriqueFilter = 'TOUT'): Observable<HistoriqueEntry[]> {
    const params = new HttpParams().set('filter', filter);
    return this.http.get<HistoriqueEntry[]>(`${this.base}/sujet/${sujetId}`, { params });
  }
}
