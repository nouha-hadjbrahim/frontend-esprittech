import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { finalize, shareReplay, timeout } from 'rxjs/operators';
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
  /** Endpoints dédiés au catalogue applicatif, indexés par l'identifiant de projet catalogue. */
  private readonly catalogueBaseUrl = `${environment.apiUrl}/projets-catalogue`;
  private readonly calculationTimeoutMs = 320_000;

  private readonly inFlightCalculations =
    new Map<number, Observable<EvaluationResponse>>();
  private readonly inFlightCatalogueCalculations =
    new Map<number, Observable<EvaluationResponse>>();

  calculateScore(projetId: number): Observable<EvaluationResponse> {
    const existing = this.inFlightCalculations.get(projetId);
    if (existing) {
      return existing;
    }

    const request$ = this.http
      .post<EvaluationResponse>(
        `${this.baseUrl}/${projetId}/calculer-score`,
        {},
      )
      .pipe(
        timeout(this.calculationTimeoutMs),
        finalize(() => this.inFlightCalculations.delete(projetId)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    this.inFlightCalculations.set(projetId, request$);
    return request$;
  }

  /**
   * Recalcule le score d'un projet du catalogue (indexé par l'identifiant de projet catalogue,
   * pas par celui du sujet). Le backend résout le sujet d'origine et synchronise projet.score.
   */
  calculateProjetCatalogueScore(projetId: number): Observable<EvaluationResponse> {
    const existing = this.inFlightCatalogueCalculations.get(projetId);
    if (existing) {
      return existing;
    }

    const request$ = this.http
      .post<EvaluationResponse>(
        `${this.catalogueBaseUrl}/${projetId}/calculer-score`,
        {},
      )
      .pipe(
        timeout(this.calculationTimeoutMs),
        finalize(() => this.inFlightCatalogueCalculations.delete(projetId)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    this.inFlightCatalogueCalculations.set(projetId, request$);
    return request$;
  }

  /** Dernière évaluation d'un projet du catalogue (indexé par l'identifiant de projet catalogue). */
  getLatestProjetCatalogueEvaluation(projetId: number): Observable<EvaluationResponse> {
    return this.http.get<EvaluationResponse>(
      `${this.catalogueBaseUrl}/${projetId}/evaluation`,
    );
  }

  /** Historique des evaluations d'un projet du catalogue. */
  getProjetCatalogueEvaluationHistory(
    projetId: number,
  ): Observable<EvaluationResponse[]> {
    return this.http.get<EvaluationResponse[]>(
      `${this.catalogueBaseUrl}/${projetId}/evaluations`,
    );
  }

  isScoreCalculationRunning(projetId: number): boolean {
    return this.inFlightCalculations.has(projetId);
  }

  getLatestEvaluation(projetId: number): Observable<EvaluationResponse> {
    return this.http.get<EvaluationResponse>(
      `${this.baseUrl}/${projetId}/evaluation`,
    );
  }

  getEvaluationHistory(
    projetId: number,
  ): Observable<EvaluationResponse[]> {
    return this.http.get<EvaluationResponse[]>(
      `${this.baseUrl}/${projetId}/evaluations`,
    );
  }

  validateEvaluation(
    projetId: number,
    commentaire?: string,
  ): Observable<EvaluationResponse> {
    const body: EvaluationValidationRequest = {
      commentaire: commentaire?.trim() || null,
    };

    return this.http.post<EvaluationResponse>(
      `${this.baseUrl}/${projetId}/evaluation/valider`,
      body,
    );
  }

  rejectEvaluation(
    projetId: number,
    commentaire?: string,
  ): Observable<EvaluationResponse> {
    const body: EvaluationValidationRequest = {
      commentaire: commentaire?.trim() || null,
    };

    return this.http.post<EvaluationResponse>(
      `${this.baseUrl}/${projetId}/evaluation/rejeter`,
      body,
    );
  }

  overrideEvaluation(
    projetId: number,
    finalScore: number,
    reason?: string,
  ): Observable<EvaluationResponse> {
    const body: EvaluationOverrideRequest = {
      finalScore,
      reason: reason?.trim() || null,
    };

    return this.http.post<EvaluationResponse>(
      `${this.baseUrl}/${projetId}/evaluation/override`,
      body,
    );
  }
}
