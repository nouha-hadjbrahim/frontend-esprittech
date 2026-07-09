import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../models/page.model';
import { CategorieSujet, StatutSujet, SujetProjet, SujetProjetRequest, AdminCreateSujetProjetRequest } from '../models/sujet-projet.model';
import { CreateUserRequest, UpdateUserRequest, User } from '../models/user.model';

/** Réponse générique porteuse d'un message (MessageResponse backend). */
export interface MessageResponse {
  message: string;
  timestamp: string;
}

/**
 * Opérations réservées à l'administrateur : import du référentiel CSV,
 * création d'équipes et assignation des chefs.
 */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin`;

  /** Importe le référentiel à partir d'un fichier CSV (multipart, champ `file`). */
  importCsv(file: File): Observable<MessageResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<MessageResponse>(`${this.baseUrl}/import-referentiel`, formData);
  }

  // ----- Gestion des utilisateurs -----

  /** Crée directement un utilisateur (action admin, sans référentiel). */
  createUser(request: CreateUserRequest): Observable<User> {
    return this.http.post<User>(`${this.baseUrl}/users`, request);
  }

  /** Liste paginée des utilisateurs, avec recherche libre optionnelle. */
  getUsers(page: number, size: number, search?: string): Observable<Page<User>> {
    return this._getUsers(page, size, search);
  }

  chercherUtilisateurs(search: string, page = 0, size = 6): Observable<Page<User>> {
    return this._getUsers(page, size, search);
  }

  private _getUsers(page: number, size: number, search?: string): Observable<Page<User>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<Page<User>>(`${this.baseUrl}/users`, { params });
  }

  /** Met à jour un utilisateur (identité, rôle, état d'activation). */
  updateUser(id: number, request: UpdateUserRequest): Observable<User> {
    return this.http.put<User>(`${this.baseUrl}/users/${id}`, request);
  }

  /** Supprime un utilisateur. */
  deleteUser(id: number): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.baseUrl}/users/${id}`);
  }

  // ----- Gestion des sujets -----

  /** Recherche d'enseignants affiliés à une équipe (affectation de sujet). */
  chercherEncadrants(search: string, page = 0, size = 6): Observable<Page<User>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search?.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<Page<User>>(`${this.baseUrl}/encadrants`, { params });
  }

  /** Crée un sujet validé et publié pour un encadrant affilié. */
  createSujet(request: AdminCreateSujetProjetRequest): Observable<SujetProjet> {
    return this.http.post<SujetProjet>(`${this.baseUrl}/sujet-projets`, request);
  }

  /** Liste paginée de tous les sujets. */
  getSujets(
    page: number,
    size: number,
    search?: string,
    categorie?: CategorieSujet,
    statut?: StatutSujet,
  ): Observable<Page<SujetProjet>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search?.trim()) params = params.set('search', search.trim());
    if (categorie) params = params.set('categorie', categorie);
    if (statut) params = params.set('statut', statut);
    return this.http.get<Page<SujetProjet>>(`${this.baseUrl}/sujet-projets`, { params });
  }

  /** Demandes de sujets non encore traitées. */
  getDemandes(
    page: number,
    size: number,
    search?: string,
    categorie?: CategorieSujet,
  ): Observable<Page<SujetProjet>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search?.trim()) params = params.set('search', search.trim());
    if (categorie) params = params.set('categorie', categorie);
    return this.http.get<Page<SujetProjet>>(`${this.baseUrl}/sujet-projets/demandes`, { params });
  }

  /** Sujets publiés dans le catalogue (visibles côté frontoffice). */
  getSujetsDisponibles(
    page: number,
    size: number,
    search?: string,
    categorie?: CategorieSujet,
  ): Observable<Page<SujetProjet>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search?.trim()) params = params.set('search', search.trim());
    if (categorie) params = params.set('categorie', categorie);
    return this.http.get<Page<SujetProjet>>(`${this.baseUrl}/sujet-projets/disponibles`, { params });
  }

  /** Accepte une demande de sujet. */
  validerSujet(id: number): Observable<SujetProjet> {
    return this.http.post<SujetProjet>(`${this.baseUrl}/sujet-projets/${id}/valider`, {});
  }

  /** Refuse une demande de sujet avec motif. */
  invaliderSujet(id: number, motif: string): Observable<SujetProjet> {
    return this.http.post<SujetProjet>(`${this.baseUrl}/sujet-projets/${id}/invalider`, { motif });
  }

  /** Détail complet d'un sujet. */
  getSujetById(id: number): Observable<SujetProjet> {
    return this.http.get<SujetProjet>(`${this.baseUrl}/sujet-projets/${id}`);
  }

  /** Met à jour un sujet. */
  updateSujet(id: number, request: SujetProjetRequest): Observable<SujetProjet> {
    return this.http.put<SujetProjet>(`${this.baseUrl}/sujet-projets/${id}`, request);
  }

  /** Supprime un sujet. */
  deleteSujet(id: number): Observable<MessageResponse> {
    return this.http.delete<MessageResponse>(`${this.baseUrl}/sujet-projets/${id}`);
  }
}
