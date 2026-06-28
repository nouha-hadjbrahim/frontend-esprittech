import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EvaluationResponse } from '../models/evaluation.model';

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
}
