import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ProjetEvaluable } from '../models/evaluation.model';

@Injectable({ providedIn: 'root' })
export class ProjetEvaluableService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/projets`;

  /** Récupère les projets évaluables (backend: /api/projets/evaluables) */
  getEvaluables(): Observable<ProjetEvaluable[]> {
    return this.http.get<ProjetEvaluable[]>(`${this.baseUrl}/evaluables`);
  }
}
