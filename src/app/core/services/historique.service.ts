import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { HistoriqueEntry, HistoriqueFilter } from '../models/historique.model';

@Injectable({ providedIn: 'root' })
export class HistoriqueService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/historique`;

  getBySujet(sujetId: number, filter: HistoriqueFilter = 'TOUT'): Observable<HistoriqueEntry[]> {
    const params = new HttpParams().set('filter', filter);
    return this.http.get<HistoriqueEntry[]>(`${this.baseUrl}/sujet/${sujetId}`, { params });
  }
}
