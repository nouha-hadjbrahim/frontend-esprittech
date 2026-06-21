import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Equipe } from '../models/equipe.model';
import { User } from '../models/user.model';

/**
 * Consultation des équipes de recherche (accessible à tout utilisateur authentifié).
 */
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
}
