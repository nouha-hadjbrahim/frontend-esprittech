import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AffiliationDecision,
  AffiliationDecisionRequest,
  AffiliationRequest,
  CreateAffiliationRequest,
} from '../models/affiliation-request.model';

@Injectable({ providedIn: 'root' })
export class AffiliationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/affiliations`;

  getAll(): Observable<AffiliationRequest[]> {
    return this.http.get<AffiliationRequest[]>(this.baseUrl);
  }

  getByEquipe(equipeId: number): Observable<AffiliationRequest[]> {
    return this.http.get<AffiliationRequest[]>(`${this.baseUrl}/equipe/${equipeId}`);
  }

  getMesDemandes(): Observable<AffiliationRequest[]> {
    return this.http.get<AffiliationRequest[]>(`${this.baseUrl}/mes-demandes`);
  }

  create(payload: CreateAffiliationRequest): Observable<AffiliationRequest> {
    return this.http.post<AffiliationRequest>(this.baseUrl, payload);
  }

  decider(id: number, decision: AffiliationDecision): Observable<AffiliationRequest> {
    const body: AffiliationDecisionRequest = { decision };
    return this.http.put<AffiliationRequest>(`${this.baseUrl}/${id}/decider`, body);
  }
}
