import { Injectable, inject, signal } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import { AuthService } from './auth.service';
import { Notification } from '../models/notification.model';

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private client: Client | null = null;
  private subscription: StompSubscription | null = null;
  private authService = inject(AuthService);
  private onNotificationCallback: ((notification: Notification) => void) | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private _connected = signal(false);
  readonly connected = this._connected.asReadonly();

  connect(onNotification: (notification: Notification) => void): void {
    if (this.client?.active) return;

    this.onNotificationCallback = onNotification;
    this.createAndActivateClient();
  }

  updateToken(): void {
    this.reconnect();
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.teardownClient();
    this.onNotificationCallback = null;
    this._connected.set(false);
  }

  private reconnect(): void {
    this.teardownClient();
    if (this.onNotificationCallback && this.authService.isLoggedIn()) {
      this.createAndActivateClient();
    }
  }

  private teardownClient(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.subscription) {
      try { this.subscription.unsubscribe(); } catch {}
      this.subscription = null;
    }
    if (this.client) {
      try { this.client.deactivate(); } catch {}
      this.client = null;
    }
    this._connected.set(false);
  }

  private createAndActivateClient(): void {
    const wsUrl = `${window.location.protocol}//${window.location.host}/ws`;

    this.client = new Client({
      webSocketFactory: () => new WebSocket(wsUrl),
      connectHeaders: this.buildHeaders(),
      reconnectDelay: 0,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        console.log('[WS] Connected');
        this._connected.set(true);
        this.subscribe();
      },
      onDisconnect: () => {
        console.log('[WS] Disconnected');
        this._connected.set(false);
        this.subscription = null;
        this.scheduleReconnect();
      },
      onStompError: (frame) => {
        console.error('[WS] STOMP error:', frame.headers['message'], frame.headers, frame.body);
      },
      onWebSocketError: (event) => {
        console.error('[WS] WebSocket error:', event);
      },
    });

    this.client.activate();
  }

  private scheduleReconnect(): void {
    if (!this.authService.isLoggedIn()) return;
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.authService.isLoggedIn()) {
        console.log('[WS] Reconnecting...');
        this.createAndActivateClient();
      }
    }, 3000);
  }

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.authService.accessToken()}`,
    };
  }

  private subscribe(): void {
    this.subscription = this.client!.subscribe(
      '/user/queue/notifications',
      (message: IMessage) => {
        console.log('[WS] Notification received:', message.body);
        const notification: Notification = JSON.parse(message.body);
        this.onNotificationCallback?.(notification);
      },
    );
  }
}
