import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CritereEliminatoire, CritereEliminatoireRequest, OrdreCritereRequest } from '../models/critere.model';

/**
 * Service pour gérer les critères éliminatoires.
 * Endpoints: /api/admin/criteres/eliminatoires
 */
@Injectable({ providedIn: 'root' })
export class CritereEliminatoireService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/criteres/eliminatoires`;

  /**
   * Récupère tous les critères éliminatoires.
   */
  findAll(): Observable<CritereEliminatoire[]> {
    return this.http.get<CritereEliminatoire[]>(this.baseUrl);
  }

  /**
   * Récupère uniquement les critères éliminatoires actifs.
   */
  findActive(): Observable<CritereEliminatoire[]> {
    return this.http.get<CritereEliminatoire[]>(`${this.baseUrl}/actifs`);
  }

  /**
   * Crée un nouveau critère éliminatoire.
   */
  create(request: CritereEliminatoireRequest): Observable<CritereEliminatoire> {
    return this.http.post<CritereEliminatoire>(this.baseUrl, request);
  }

  /**
   * Met à jour un critère éliminatoire existant.
   */
  update(id: number, request: CritereEliminatoireRequest): Observable<CritereEliminatoire> {
    return this.http.put<CritereEliminatoire>(`${this.baseUrl}/${id}`, request);
  }

  /**
   * Désactive un critère éliminatoire (PATCH).
   */
  deactivate(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/desactiver`, {});
  }

  /**
   * Active un critère éliminatoire (PATCH).
   */
  activate(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/activer`, {});
  }

  /**
   * Réorganise l'ordre des critères.
   */
  reorder(requests: OrdreCritereRequest[]): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/ordre`, requests);
  }
}
