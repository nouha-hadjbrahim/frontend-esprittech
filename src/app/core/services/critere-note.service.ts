import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CritereNote, CritereNoteRequest, OrdreCritereRequest } from '../models/critere.model';

/**
 * Service pour gérer les critères notés.
 * Note: Le backend n'expose pas d'endpoints séparés pour les critères notés.
 * Cet service peut être étendu si des endpoints sont ajoutés à l'avenir.
 * Placeholder: /api/admin/criteres/notes
 */
@Injectable({ providedIn: 'root' })
export class CritereNoteService {
  private readonly http = inject(HttpClient);
  // backend exposes criteres-notes endpoints (hyphenated) for active lists
  private readonly baseUrl = `${environment.apiUrl}/admin/criteres/notes`;

  /**
   * Récupère tous les critères notés.
   */
  findAll(): Observable<CritereNote[]> {
    return this.http.get<CritereNote[]>(this.baseUrl);
  }

  /**
   * Récupère uniquement les critères notés actifs.
   */
  findActive(): Observable<CritereNote[]> {
    return this.http.get<CritereNote[]>(`${this.baseUrl}/actifs`);
  }

  /**
   * Crée un nouveau critère noté.
   */
  create(request: CritereNoteRequest): Observable<CritereNote> {
    return this.http.post<CritereNote>(this.baseUrl, request);
  }

  /**
   * Met à jour un critère noté existant.
   */
  update(id: number, request: CritereNoteRequest): Observable<CritereNote> {
    return this.http.put<CritereNote>(`${this.baseUrl}/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Désactive un critère noté (PATCH).
   */
  deactivate(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/deactivate`, {});
  }

  /**
   * Active un critère noté (PATCH).
   */
  activate(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/activate`, {});
  }

  /**
   * Réorganise l'ordre des critères.
   */
  reorder(requests: OrdreCritereRequest[]): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/ordre`, requests);
  }
}
