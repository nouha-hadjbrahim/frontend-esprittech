import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Page } from '../models/page.model';
import { EquipeDomaine } from '../models/equipe-domaine.model';

@Injectable({ providedIn: 'root' })
export class EquipeDomaineService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/equipes/admin/domaines`;

  getPage(page = 0, size = 12, search = ''): Observable<Page<EquipeDomaine>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search.trim()) {
      params = params.set('search', search.trim());
    }
    return this.http.get<Page<EquipeDomaine>>(this.baseUrl, { params });
  }

  getAll(): Observable<EquipeDomaine[]> {
    return this.http.get<EquipeDomaine[]>(`${this.baseUrl}/all`);
  }

  getCount(): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/count`);
  }

  create(nom: string): Observable<EquipeDomaine> {
    return this.http.post<EquipeDomaine>(this.baseUrl, { nom });
  }

  update(id: number, nom: string): Observable<EquipeDomaine> {
    return this.http.put<EquipeDomaine>(`${this.baseUrl}/${id}`, { nom });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
