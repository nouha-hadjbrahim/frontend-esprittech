import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EvaluationRequest, EvaluationResponse } from '../models/evaluation.model';

/**
 * Service pour gérer les évaluations de projets.
 * Endpoints: /api/projets/{id}/evaluations/calculer, /api/projets/{id}/evaluation
 */
@Injectable({ providedIn: 'root' })
export class EvaluationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/projets`;

  /**
   * Calcule l'évaluation d'un projet basée sur les résultats des critères.
   */
  calculerEvaluation(projetId: number, request: EvaluationRequest): Observable<EvaluationResponse> {
    return this.http.post<EvaluationResponse>(`${this.baseUrl}/${projetId}/evaluations/calculer`, request);
  }

  /**
   * Récupère la dernière évaluation d'un projet.
   */
  getLatestEvaluation(projetId: number): Observable<EvaluationResponse> {
    return this.http.get<EvaluationResponse>(`${this.baseUrl}/${projetId}/evaluation`);
  }
}
