import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Livrable, LivrableLinkRequest, LivrableUpdateRequest, TypeLivrable } from '../models/livrable.model';

@Injectable({ providedIn: 'root' })
export class LivrableService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  upload(projetId: number, payload: {
    typeLivrable: TypeLivrable;
    nom: string;
    description?: string;
    file: File;
  }): Observable<Livrable> {
    const formData = new FormData();
    formData.append('typeLivrable', payload.typeLivrable);
    formData.append('nom', payload.nom);
    if (payload.description) {
      formData.append('description', payload.description);
    }
    formData.append('file', payload.file);
    return this.http.post<Livrable>(`${this.apiUrl}/projets/${projetId}/livrables/upload`, formData);
  }

  addLink(projetId: number, request: LivrableLinkRequest): Observable<Livrable> {
    return this.http.post<Livrable>(`${this.apiUrl}/projets/${projetId}/livrables/link`, request);
  }

  findByProjet(projetId: number): Observable<Livrable[]> {
    return this.http.get<Livrable[]>(`${this.apiUrl}/projets/${projetId}/livrables`);
  }

  findAllAdmin(): Observable<Livrable[]> {
    return this.http.get<Livrable[]>(`${this.apiUrl}/admin/livrables`);
  }

  update(id: number, request: LivrableUpdateRequest): Observable<Livrable> {
    return this.http.put<Livrable>(`${this.apiUrl}/livrables/${id}`, request);
  }

  updateAdmin(id: number, request: LivrableUpdateRequest): Observable<Livrable> {
    return this.http.put<Livrable>(`${this.apiUrl}/admin/livrables/${id}`, request);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/livrables/${id}`);
  }

  deleteAdmin(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/admin/livrables/${id}`);
  }

  downloadUrl(id: number): string {
    return `${this.apiUrl}/livrables/${id}/download`;
  }
}
