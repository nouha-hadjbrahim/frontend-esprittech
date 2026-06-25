import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CategorieSujet, StatutSujet, SujetProjet, SujetProjetRequest } from '../models/sujet-projet.model';

@Injectable({ providedIn: 'root' })
export class SujetProjetService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/sujet-projets`;

  creerSujet(request: SujetProjetRequest): Observable<SujetProjet> {
    return this.http.post<SujetProjet>(this.baseUrl, request);
  }

  modifierSujet(id: number, request: SujetProjetRequest): Observable<SujetProjet> {
    return this.http.put<SujetProjet>(`${this.baseUrl}/${id}`, request);
  }

  supprimerSujet(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  getMesSujets(categorie?: CategorieSujet, statut?: StatutSujet): Observable<SujetProjet[]> {
    let params = new HttpParams();
    if (categorie) params = params.set('categorie', categorie);
    if (statut) params = params.set('statut', statut);
    return this.http.get<SujetProjet[]>(`${this.baseUrl}/mes-sujets`, { params });
  }

  getSujetsDisponibles(categorie?: CategorieSujet): Observable<SujetProjet[]> {
    let params = new HttpParams();
    if (categorie) params = params.set('categorie', categorie);
    return this.http.get<SujetProjet[]>(`${this.baseUrl}/disponibles`, { params });
  }

  getSujetById(id: number): Observable<SujetProjet> {
    return this.http.get<SujetProjet>(`${this.baseUrl}/${id}`);
  }

  getTechnologies(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/technologies`);
  }

  getPrerequisSuggestions(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/suggestions/prerequis`);
  }

  getDomainesSuggestions(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/suggestions/domaines`);
  }
}
