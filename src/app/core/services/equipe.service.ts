import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AssignChefRequest, CreateEquipePayload, Equipe } from '../models/equipe.model';
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
    return this.http.post<Equipe>(this.baseUrl, payload);
  }

  modifier(id: number, payload: Partial<Equipe>): Observable<Equipe> {
    return this.http.put<Equipe>(`${this.baseUrl}/${id}`, payload);
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
}
