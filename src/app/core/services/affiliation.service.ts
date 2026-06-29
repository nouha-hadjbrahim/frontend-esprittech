import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AffiliationEnseignantResponse,
  TraiterAffiliationRequest,
} from '../models/affiliation-request.model';

@Injectable({ providedIn: 'root' })
export class AffiliationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/equipes`;

  getAll(): Observable<AffiliationEnseignantResponse[]> {
    return this.http.get<AffiliationEnseignantResponse[]>(`${this.baseUrl}/affiliations`);
  }

  getByEquipe(equipeId: number): Observable<AffiliationEnseignantResponse[]> {
    return this.http.get<AffiliationEnseignantResponse[]>(`${this.baseUrl}/${equipeId}/affiliations`);
  }

  getMesDemandes(): Observable<AffiliationEnseignantResponse[]> {
    return this.http.get<AffiliationEnseignantResponse[]>(`${this.baseUrl}/affiliations/mine`);
  }

  create(equipeId: number): Observable<AffiliationEnseignantResponse> {
    return this.http.post<AffiliationEnseignantResponse>(`${this.baseUrl}/${equipeId}/affiliations`, {});
  }

  traiter(affiliationId: number, equipeId: number, statut: 'EN_ATTENTE' | 'ACCEPTEE' | 'REFUSEE', motifDecision?: string): Observable<AffiliationEnseignantResponse> {
    const body: TraiterAffiliationRequest = { statut, motifDecision };
    return this.http.put<AffiliationEnseignantResponse>(`${this.baseUrl}/${equipeId}/affiliations/${affiliationId}`, body);
  }
}
