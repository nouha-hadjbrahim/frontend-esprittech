import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AssignChefRequest, CreateEquipePayload, CreateEquipeRequest, Equipe } from '../models/equipe.model';
import { Page } from '../models/page.model';
import { User } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class EquipeService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/equipes`;

  getAll(): Observable<Equipe[]> {
    return this.http.get<Equipe[]>(this.baseUrl);
  }

  getById(id: number): Observable<Equipe> {
    return this.http.get<Equipe>(`${this.baseUrl}/${id}`);
  }

  getMembres(id: number): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/${id}/membres`);
  }

  creer(payload: CreateEquipePayload): Observable<Equipe> {
    const body = {
      nom: payload.nom,
      description: payload.description,
      domaineId: payload.domaineId,
      chefId: payload.chefId,
      memberIds: payload.memberIds,
    };
    return this.http.post<Equipe>(this.baseUrl, body);
  }

  modifier(id: number, payload: Partial<Equipe>): Observable<Equipe> {
    const body: Record<string, unknown> = {};
    if (payload.nom !== undefined) body['nom'] = payload.nom;
    if (payload.description !== undefined) body['description'] = payload.description;
    if (payload.domaineId !== undefined) body['domaineId'] = payload.domaineId;
    if (payload.chefId !== undefined) body['chefId'] = payload.chefId;
    if (payload.statut !== undefined) body['statut'] = payload.statut;
    return this.http.put<Equipe>(`${this.baseUrl}/${id}`, body);
  }

  supprimer(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  assignerChef(equipeId: number, chefId: number): Observable<Equipe> {
    const body: AssignChefRequest = { chefId };
    return this.http.put<Equipe>(`${this.baseUrl}/${equipeId}/chef`, body);
  }

  ajouterMembres(equipeId: number, memberIds: number[]): Observable<Equipe> {
    return this.http.post<Equipe>(`${this.baseUrl}/${equipeId}/membres`, { memberIds });
  }

  retirerMembre(equipeId: number, userId: number): Observable<Equipe> {
    return this.http.delete<Equipe>(`${this.baseUrl}/${equipeId}/membres/${userId}`);
  }

  retirerChef(equipeId: number): Observable<Equipe> {
    return this.http.delete<Equipe>(`${this.baseUrl}/${equipeId}/chef`);
  }

  createEquipe(request: CreateEquipeRequest): Observable<Equipe> {
    return this.http.post<Equipe>(this.baseUrl, request);
  }

  assignChef(equipeId: number, chefId: number): Observable<Equipe> {
    return this.http.put<Equipe>(`${this.baseUrl}/${equipeId}/chef`, { chefId });
  }

  chercherUtilisateursEligibles(search: string, equipeId: number | null, type: string, page = 0, size = 6): Observable<Page<User>> {
    let params = new HttpParams()
      .set('type', type)
      .set('search', search)
      .set('page', page)
      .set('size', size);
    if (equipeId != null) {
      params = params.set('equipeId', equipeId);
    }
    return this.http.get<Page<User>>(`${this.baseUrl}/users/eligible`, { params });
  }
}
