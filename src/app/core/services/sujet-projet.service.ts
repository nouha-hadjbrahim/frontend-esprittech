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

  /** Admin uniquement : sujets validés ou plus avancés, pour la page de gestion des candidatures. */
  getSujetsPourCandidatures(): Observable<SujetProjet[]> {
    return this.http.get<SujetProjet[]>(`${this.baseUrl}/admin/candidatures`);
  }

  /** Chef d'équipe (ou admin) : sujets soumis et en attente de validation. */
  getSujetsEnAttenteValidation(): Observable<SujetProjet[]> {
    return this.http.get<SujetProjet[]>(`${this.baseUrl}/en-attente-validation`);
  }

  validerSujet(id: number): Observable<SujetProjet> {
    return this.http.post<SujetProjet>(`${this.baseUrl}/${id}/valider`, {});
  }

  invaliderSujet(id: number, motif: string): Observable<SujetProjet> {
    return this.http.post<SujetProjet>(`${this.baseUrl}/${id}/invalider`, { motif });
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

  getSujetsAValider(categorie?: CategorieSujet, statut?: StatutSujet): Observable<SujetProjet[]> {
    let params = new HttpParams();
    if (categorie) params = params.set('categorie', categorie);
    if (statut) params = params.set('statut', statut);
    return this.http.get<SujetProjet[]>(`${this.baseUrl}/a-valider`, { params });
  }

  /** Chef d'équipe : tous les sujets déposés par les membres de son équipe. */
  getSujetsEquipe(categorie?: CategorieSujet, statut?: StatutSujet): Observable<SujetProjet[]> {
    let params = new HttpParams();
    if (categorie) params = params.set('categorie', categorie);
    if (statut) params = params.set('statut', statut);
    return this.http.get<SujetProjet[]>(`${this.baseUrl}/equipe`, { params });
  }

  declarerTerminaison(id: number): Observable<SujetProjet> {
    return this.http.post<SujetProjet>(`${this.baseUrl}/${id}/terminer`, {});
  }
}
