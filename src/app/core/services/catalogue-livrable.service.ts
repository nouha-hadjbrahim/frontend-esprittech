import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LivrableCatalogue } from '../models/livrable-catalogue.model';
import { LivrableLinkRequest, TypeLivrable } from '../models/livrable.model';

/** Appels aux endpoints des livrables des projets du catalogue applicatif. */
@Injectable({ providedIn: 'root' })
export class CatalogueLivrableService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  upload(projetId: number, payload: {
    typeLivrable: TypeLivrable;
    nom: string;
    description?: string;
    file: File;
  }): Observable<LivrableCatalogue> {
    const formData = new FormData();
    formData.append('typeLivrable', payload.typeLivrable);
    formData.append('nom', payload.nom);
    if (payload.description) {
      formData.append('description', payload.description);
    }
    formData.append('file', payload.file);
    return this.http.post<LivrableCatalogue>(`${this.apiUrl}/projets-catalogue/${projetId}/livrables/upload`, formData);
  }

  addLink(projetId: number, request: LivrableLinkRequest): Observable<LivrableCatalogue> {
    return this.http.post<LivrableCatalogue>(`${this.apiUrl}/projets-catalogue/${projetId}/livrables/link`, request);
  }

  findByProjet(projetId: number): Observable<LivrableCatalogue[]> {
    return this.http.get<LivrableCatalogue[]>(`${this.apiUrl}/projets-catalogue/${projetId}/livrables`);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/livrables-catalogue/${id}`);
  }

  downloadUrl(id: number): string {
    return `${this.apiUrl}/livrables-catalogue/${id}/download`;
  }
}
