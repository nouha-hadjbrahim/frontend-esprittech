import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Notification, NotificationPage } from '../models/notification.model';
import { AuthService } from './auth.service';
import { WebSocketService } from './websocket.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly websocketService = inject(WebSocketService);
  private readonly authService = inject(AuthService);

  private readonly baseUrl = `${environment.apiUrl}/notifications`;

  private readonly _notifications = signal<Notification[]>([]);
  private readonly _unreadCount = signal(0);
  private readonly _loading = signal(false);
  private readonly _hasMore = signal(true);
  private readonly _currentPage = signal(0);

  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = this._unreadCount.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly hasMore = this._hasMore.asReadonly();

  private initialized = false;

  constructor() {
    effect(() => {
      this.authService.tokenRefreshed();
      if (this.initialized) {
        this.websocketService.updateToken();
      }
    });
  }

  initialize(): void {
    if (this.initialized || !this.authService.isLoggedIn()) return;
    this.initialized = true;

    this.fetchNotifications(true);
    this.fetchUnreadCount();

    this.websocketService.connect((notification) => {
      this._notifications.update((list) => [notification, ...list]);
      this._unreadCount.update((c) => c + 1);
    });
  }

  fetchNotifications(reset = false): void {
    if (this._loading()) return;

    const page = reset ? 0 : this._currentPage();
    this._loading.set(true);

    this.http.get<NotificationPage>(`${this.baseUrl}?page=${page}`).subscribe({
      next: (res) => {
        this._notifications.update((list) =>
          reset ? res.content : [...list, ...res.content],
        );
        this._currentPage.set(res.number + 1);
        this._hasMore.set(!res.last);
        this._loading.set(false);
      },
      error: () => this._loading.set(false),
    });
  }

  loadMore(): void {
    if (!this._hasMore() || this._loading()) return;
    this.fetchNotifications(false);
  }

  fetchUnreadCount(): void {
    this.http.get<{ count: number }>(`${this.baseUrl}/unread-count`).subscribe({
      next: (res) => this._unreadCount.set(res.count),
    });
  }

  marquerCommeLu(id: number): void {
    this.http.patch(`${this.baseUrl}/${id}/read`, {}).subscribe({
      next: () => {
        this._notifications.update((list) =>
          list.map((n) => (n.id === id ? { ...n, read: true } : n)),
        );
        this._unreadCount.update((c) => Math.max(0, c - 1));
      },
    });
  }

  marquerToutCommeLu(): void {
    this.http.patch(`${this.baseUrl}/read-all`, {}).subscribe({
      next: () => {
        this._notifications.update((list) =>
          list.map((n) => ({ ...n, read: true })),
        );
        this._unreadCount.set(0);
      },
    });
  }

  deconnecter(): void {
    this.websocketService.disconnect();
    this.initialized = false;
    this._notifications.set([]);
    this._unreadCount.set(0);
    this._currentPage.set(0);
    this._hasMore.set(true);
  }
}
