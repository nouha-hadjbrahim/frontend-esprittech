import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AccueilStats } from '../models/accueil-stats.model';

@Injectable({ providedIn: 'root' })
export class AccueilService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/accueil`;

  getStats(): Observable<AccueilStats> {
    return this.http.get<AccueilStats>(`${this.baseUrl}/stats`);
  }
}
