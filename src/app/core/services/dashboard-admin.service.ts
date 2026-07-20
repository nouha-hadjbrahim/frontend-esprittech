import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExtendedDashboardResponse } from '../models/dashboard-admin.model';

@Injectable({ providedIn: 'root' })
export class DashboardAdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/dashboard`;

  getExtendedDashboard(recentActivityLimit = 5): Observable<ExtendedDashboardResponse> {
    return this.http.get<ExtendedDashboardResponse>(`${this.baseUrl}/extended`, {
      params: { recentActivityLimit },
    });
  }
}
