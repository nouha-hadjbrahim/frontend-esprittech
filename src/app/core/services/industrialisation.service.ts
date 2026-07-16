import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CandidatureIndustrialisation,
  CandidatureIndustrialisationRequest,
  DecisionGoRequest,
  DecisionNoGoRequest,
  IndustrialisationFormResponse,
  IndustrialisationScore,
  QuestionIndustrialisation,
  QuestionIndustrialisationRequest,
  ReponsesIndustrialisationRequest,
  SubmitIndustrialisationRequest,
  StatutIndustrialisation,
  TypeIndustrialisation,
} from '../models/industrialisation.model';

@Injectable({ providedIn: 'root' })
export class IndustrialisationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  create(projetId: number, request: CandidatureIndustrialisationRequest): Observable<CandidatureIndustrialisation> {
    return this.http.post<CandidatureIndustrialisation>(`${this.apiUrl}/projets/${projetId}/industrialisation`, request);
  }

  /** Demande d'industrialisation sur un projet du catalogue applicatif (ProjetCatalogue), éligible dès qu'il est au statut VALIDE. */
  createForCatalogue(projetId: number, request: CandidatureIndustrialisationRequest): Observable<CandidatureIndustrialisation> {
    return this.http.post<CandidatureIndustrialisation>(`${this.apiUrl}/projets-catalogue/${projetId}/industrialisation`, request);
  }

  getFormulaire(id: number): Observable<IndustrialisationFormResponse> {
    return this.http.get<IndustrialisationFormResponse>(`${this.apiUrl}/industrialisation/${id}/formulaire`);
  }

  getDetail(id: number): Observable<CandidatureIndustrialisation> {
    return this.http.get<CandidatureIndustrialisation>(`${this.apiUrl}/industrialisation/${id}`);
  }

  saveReponses(id: number, request: ReponsesIndustrialisationRequest): Observable<CandidatureIndustrialisation> {
    return this.http.put<CandidatureIndustrialisation>(`${this.apiUrl}/industrialisation/${id}/reponses`, request);
  }

  uploadPreuve(id: number, questionId: number, file: File): Observable<CandidatureIndustrialisation> {
    const formData = new FormData();
    formData.append('questionId', String(questionId));
    formData.append('file', file);
    return this.http.post<CandidatureIndustrialisation>(`${this.apiUrl}/industrialisation/${id}/preuves`, formData);
  }

  soumettre(id: number, request: SubmitIndustrialisationRequest = {}): Observable<CandidatureIndustrialisation> {
    return this.http.post<CandidatureIndustrialisation>(`${this.apiUrl}/industrialisation/${id}/soumettre`, request);
  }

  mesDemandes(): Observable<CandidatureIndustrialisation[]> {
    return this.http.get<CandidatureIndustrialisation[]>(`${this.apiUrl}/industrialisation/mes-demandes`);
  }

  findCiRequests(filters?: {
    statut?: StatutIndustrialisation;
    type?: TypeIndustrialisation;
  }): Observable<CandidatureIndustrialisation[]> {
    let params = new HttpParams();
    if (filters?.statut) params = params.set('statut', filters.statut);
    if (filters?.type) params = params.set('type', filters.type);
    return this.http.get<CandidatureIndustrialisation[]>(`${this.apiUrl}/ci/industrialisation`, { params });
  }

  getCiDetail(id: number): Observable<CandidatureIndustrialisation> {
    return this.http.get<CandidatureIndustrialisation>(`${this.apiUrl}/ci/industrialisation/${id}`);
  }

  getCiScore(id: number): Observable<IndustrialisationScore> {
    return this.http.get<IndustrialisationScore>(`${this.apiUrl}/ci/industrialisation/${id}/score`);
  }

  decideGo(id: number, request: DecisionGoRequest): Observable<CandidatureIndustrialisation> {
    return this.http.post<CandidatureIndustrialisation>(`${this.apiUrl}/ci/industrialisation/${id}/go`, request);
  }

  decideNoGo(id: number, request: DecisionNoGoRequest): Observable<CandidatureIndustrialisation> {
    return this.http.post<CandidatureIndustrialisation>(`${this.apiUrl}/ci/industrialisation/${id}/no-go`, request);
  }

  findQuestions(): Observable<QuestionIndustrialisation[]> {
    return this.http.get<QuestionIndustrialisation[]>(`${this.apiUrl}/admin/industrialisation/questions`);
  }

  findActiveQuestions(): Observable<QuestionIndustrialisation[]> {
    return this.http.get<QuestionIndustrialisation[]>(`${this.apiUrl}/admin/industrialisation/questions/actives`);
  }

  createQuestion(request: QuestionIndustrialisationRequest): Observable<QuestionIndustrialisation> {
    return this.http.post<QuestionIndustrialisation>(`${this.apiUrl}/admin/industrialisation/questions`, request);
  }

  updateQuestion(id: number, request: QuestionIndustrialisationRequest): Observable<QuestionIndustrialisation> {
    return this.http.put<QuestionIndustrialisation>(`${this.apiUrl}/admin/industrialisation/questions/${id}`, request);
  }

  activateQuestion(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/admin/industrialisation/questions/${id}/activer`, {});
  }

  deactivateQuestion(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/admin/industrialisation/questions/${id}/desactiver`, {});
  }

  findAllAdminRequests(): Observable<CandidatureIndustrialisation[]> {
    return this.http.get<CandidatureIndustrialisation[]>(`${this.apiUrl}/admin/industrialisation`);
  }
}
