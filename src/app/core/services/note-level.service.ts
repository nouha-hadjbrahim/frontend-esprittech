import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NoteLevel, NoteLevelRequest } from '../models/critere.model';

@Injectable({ providedIn: 'root' })
export class NoteLevelService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin/evaluation/note-levels`;

  findAll(): Observable<NoteLevel[]> {
    return this.http.get<NoteLevel[]>(this.baseUrl);
  }

  create(request: NoteLevelRequest): Observable<NoteLevel> {
    return this.http.post<NoteLevel>(this.baseUrl, request);
  }

  update(id: number, request: NoteLevelRequest): Observable<NoteLevel> {
    return this.http.put<NoteLevel>(`${this.baseUrl}/${id}`, request);
  }

  activate(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/activer`, {});
  }

  deactivate(id: number): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/desactiver`, {});
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
