import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { EvaluationResponse } from '../models/evaluation.model';
import { LivrableCatalogue } from '../models/livrable-catalogue.model';
import {
  CreateProjetRequest,
  ProjetCard,
  ProjetCatalogue,
  ProjetDetails,
  ReferenceItem,
  TypeProjet,
} from '../models/projet-catalogue.model';

/** Filtres optionnels du catalogue public. */
export interface CatalogueFiltres {
  type?: TypeProjet;
  domaineId?: number;
  annee?: number;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class ProjetCatalogueService {
  private readonly http = inject(HttpClient);
  private readonly projetsUrl = `${environment.apiUrl}/projets`;
  private readonly catalogueUrl = `${environment.apiUrl}/catalogue`;

  // ── Enseignant affilié ─────────────────────────────────────────────
  creerProjet(request: CreateProjetRequest): Observable<ProjetCatalogue> {
    return this.http.post<ProjetCatalogue>(this.projetsUrl, request);
  }

  mesProjets(): Observable<ProjetCard[]> {
    return this.http.get<ProjetCard[]>(`${this.projetsUrl}/mes-projets`);
  }

  // ── Chef d'équipe ──────────────────────────────────────────────────
  projetsAValider(): Observable<ProjetCard[]> {
    return this.http.get<ProjetCard[]>(`${this.projetsUrl}/a-valider`);
  }

  valider(id: number): Observable<ProjetCatalogue> {
    return this.http.put<ProjetCatalogue>(`${this.projetsUrl}/${id}/valider`, {});
  }

  refuser(id: number, motifRefus: string): Observable<ProjetCatalogue> {
    return this.http.put<ProjetCatalogue>(`${this.projetsUrl}/${id}/refuser`, { motifRefus });
  }

  // ── Détails ────────────────────────────────────────────────────────
  /** Détail vue enseignant/chef/admin (encadrant, chef de l'équipe ou admin). */
  detailsProjet(id: number): Observable<ProjetDetails> {
    return this.http.get<ProjetDetails>(`${this.projetsUrl}/${id}`);
  }

  /** Détail vue publique du catalogue (statut public requis). */
  detailsCatalogue(id: number): Observable<ProjetDetails> {
    return this.http.get<ProjetDetails>(`${this.catalogueUrl}/${id}`);
  }

  /** Évaluation ML d'un projet publié (catalogue ou sujet d'origine). */
  evaluationCatalogue(id: number): Observable<EvaluationResponse> {
    return this.http.get<EvaluationResponse>(`${this.catalogueUrl}/${id}/evaluation`);
  }

  /** Livrables d'un projet publié (catalogue, sinon sujet d'origine). */
  livrablesCatalogue(id: number): Observable<(LivrableCatalogue & { fromSujet?: boolean })[]> {
    return this.http.get<(LivrableCatalogue & { fromSujet?: boolean })[]>(`${this.catalogueUrl}/${id}/livrables`);
  }

  downloadLivrableCatalogueUrl(projetId: number, livrableId: number, fromSujet = false): string {
    const qs = fromSujet ? '?fromSujet=true' : '';
    return `${this.catalogueUrl}/${projetId}/livrables/${livrableId}/download${qs}`;
  }

  // ── Admin ──────────────────────────────────────────────────────────
  /** Tous les projets du catalogue applicatif, quel que soit leur statut. */
  tousLesProjets(): Observable<ProjetCard[]> {
    return this.http.get<ProjetCard[]>(`${this.projetsUrl}/admin`);
  }

  supprimerProjet(id: number): Observable<void> {
    return this.http.delete<void>(`${this.projetsUrl}/${id}`);
  }

  // ── Catalogue public ───────────────────────────────────────────────
  catalogue(filtres: CatalogueFiltres = {}): Observable<ProjetCard[]> {
    let params = new HttpParams();
    if (filtres.type) params = params.set('type', filtres.type);
    if (filtres.domaineId != null) params = params.set('domaineId', filtres.domaineId);
    if (filtres.annee != null) params = params.set('annee', filtres.annee);
    if (filtres.search?.trim()) params = params.set('search', filtres.search.trim());
    return this.http.get<ProjetCard[]>(this.catalogueUrl, { params });
  }

  // ── Références pour le formulaire ───────────────────────────────────
  getDomaines(): Observable<ReferenceItem[]> {
    return this.http.get<ReferenceItem[]>(`${this.projetsUrl}/references/domaines`);
  }

  getTechnologies(): Observable<ReferenceItem[]> {
    return this.http.get<ReferenceItem[]>(`${this.projetsUrl}/references/technologies`);
  }

  getPrerequis(): Observable<ReferenceItem[]> {
    return this.http.get<ReferenceItem[]>(`${this.projetsUrl}/references/prerequis`);
  }
}
