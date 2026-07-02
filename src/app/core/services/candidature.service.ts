import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  Affectation,
  Candidature,
  DecisionCandidatureRequest,
  Livrable,
  RetraitEtudiantRequest,
} from '../models/candidature.model';

@Injectable({ providedIn: 'root' })
export class CandidatureService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // ── US-14 : Ouverture des candidatures ─────────────────────────────
  ouvrirCandidatures(sujetId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/sujets/${sujetId}/ouvrir-candidatures`, {});
  }

  // ── US-19 + US-20 : Fermeture (+ bascule auto en réalisation) ──────
  fermerCandidatures(sujetId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/sujets/${sujetId}/fermer-candidatures`, {});
  }

  // ── US-17 : Accepter une candidature ───────────────────────────────
  accepterCandidature(candidatureId: number): Observable<Candidature> {
    return this.http.post<Candidature>(`${this.baseUrl}/candidatures/${candidatureId}/accepter`, {});
  }

  // ── US-18 : Refuser une candidature ────────────────────────────────
  refuserCandidature(candidatureId: number, motifRefus: string): Observable<Candidature> {
    const body: DecisionCandidatureRequest = { accepter: false, motifRefus };
    return this.http.post<Candidature>(`${this.baseUrl}/candidatures/${candidatureId}/refuser`, body);
  }

  // ── US-22 : Retrait archivé d'un étudiant ──────────────────────────
  retirerEtudiant(affectationId: number, motifRetrait: string): Observable<Affectation> {
    const body: RetraitEtudiantRequest = { motifRetrait };
    return this.http.post<Affectation>(`${this.baseUrl}/affectations/${affectationId}/retirer`, body);
  }

  // ── US-24 : Déclaration de terminaison ─────────────────────────────
  declarerTerminaison(sujetId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/sujet-projets/${sujetId}/terminer`, {});
  }

  // ── US-16 : Dépôt de candidature par l'étudiant ────────────────────
  deposerCandidature(sujetId: number, messageEtudiant?: string): Observable<Candidature> {
    const body: any = { sujetId };
    if (messageEtudiant?.trim()) {
      body.messageEtudiant = messageEtudiant.trim();
    }
    return this.http.post<Candidature>(`${this.baseUrl}/sujets/${sujetId}/candidatures`, body);
  }

  // ── US-15 : Mes candidatures (vue étudiant) ─────────────────────────
  getMesCandidatures(): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.baseUrl}/candidatures/mes-candidatures`);
  }

  retirerMaCandidature(candidatureId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/candidatures/${candidatureId}`);
  }

  // ── Lectures ────────────────────────────────────────────────────────
  getCandidaturesParSujet(sujetId: number): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.baseUrl}/sujets/${sujetId}/candidatures`);
  }

  getAffectationsParSujet(sujetId: number): Observable<Affectation[]> {
    return this.http.get<Affectation[]>(`${this.baseUrl}/sujets/${sujetId}/affectations`);
  }

  getLivrablesParSujet(sujetId: number): Observable<Livrable[]> {
    return this.http.get<Livrable[]>(`${this.baseUrl}/sujets/${sujetId}/livrables`);
  }
}
