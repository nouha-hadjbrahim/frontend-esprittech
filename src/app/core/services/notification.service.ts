import { HttpClient } from '@angular/common/http';
import { Injectable, effect, inject, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { Notification } from '../models/notification.model';
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

  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = this._unreadCount.asReadonly();

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

    this.fetchNotifications();
    this.fetchUnreadCount();

    this.websocketService.connect((notification) => {
      this._notifications.update((list) => [notification, ...list]);
      this._unreadCount.update((c) => c + 1);
    });
  }

  fetchNotifications(): void {
    this.http.get<Notification[]>(this.baseUrl).subscribe({
      next: (notifications) => this._notifications.set(notifications),
    });
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
  }
}
