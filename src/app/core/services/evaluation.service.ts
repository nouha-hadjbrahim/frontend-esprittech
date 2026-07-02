import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  EvaluationOverrideRequest,
  EvaluationResponse,
  EvaluationValidationRequest,
} from '../models/evaluation.model';

@Injectable({ providedIn: 'root' })
export class EvaluationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/projets`;

  calculateScore(projetId: number): Observable<EvaluationResponse> {
    return this.http.post<EvaluationResponse>(`${this.baseUrl}/${projetId}/calculer-score`, {});
  }

  getLatestEvaluation(projetId: number): Observable<EvaluationResponse> {
    return this.http.get<EvaluationResponse>(`${this.baseUrl}/${projetId}/evaluation`);
  }

  getEvaluationHistory(projetId: number): Observable<EvaluationResponse[]> {
    return this.http.get<EvaluationResponse[]>(`${this.baseUrl}/${projetId}/evaluations`);
  }

  validateEvaluation(projetId: number, commentaire?: string): Observable<EvaluationResponse> {
    const body: EvaluationValidationRequest = { commentaire: commentaire?.trim() || null };
    return this.http.post<EvaluationResponse>(`${this.baseUrl}/${projetId}/evaluation/valider`, body);
  }

  rejectEvaluation(projetId: number, commentaire?: string): Observable<EvaluationResponse> {
    const body: EvaluationValidationRequest = { commentaire: commentaire?.trim() || null };
    return this.http.post<EvaluationResponse>(`${this.baseUrl}/${projetId}/evaluation/rejeter`, body);
  }

  overrideEvaluation(projetId: number, finalScore: number, reason?: string): Observable<EvaluationResponse> {
    const body: EvaluationOverrideRequest = {
      finalScore,
      reason: reason?.trim() || null,
    };
    return this.http.post<EvaluationResponse>(`${this.baseUrl}/${projetId}/evaluation/override`, body);
  }
}
