import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { WebSocketService } from './websocket.service';
import { AuthService } from './auth.service';

describe('WebSocketService', () => {
  let service: WebSocketService;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', [
      'isLoggedIn', 'accessToken',
    ]);
    authService.isLoggedIn.and.returnValue(false);
    authService.accessToken.and.returnValue('test-token');

    TestBed.configureTestingModule({
      providers: [
        WebSocketService,
        { provide: AuthService, useValue: authService },
      ],
    });
    service = TestBed.inject(WebSocketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have connected signal initially false', () => {
    expect(service.connected()).toBeFalse();
  });

  // ── disconnect ─────────────────────────────────────────────────────

  it('disconnect clears reconnectTimer', fakeAsync(() => {
    (service as any).reconnectTimer = setTimeout(() => {}, 10000);
    expect((service as any).reconnectTimer).toBeTruthy();
    service.disconnect();
    expect((service as any).reconnectTimer).toBeNull();
    expect(service.connected()).toBeFalse();
    tick(11000);
  }));

  it('disconnect does nothing when reconnectTimer is null', () => {
    expect((service as any).reconnectTimer).toBeNull();
    service.disconnect();
    expect(service.connected()).toBeFalse();
  });

  it('disconnect clears subscription via unsubscribe', () => {
    const unsubSpy = jasmine.createSpy('unsubscribe');
    (service as any).subscription = { unsubscribe: unsubSpy };
    service.disconnect();
    expect(unsubSpy).toHaveBeenCalled();
    expect((service as any).subscription).toBeNull();
  });

  it('disconnect handles subscription unsubscribe throwing', () => {
    (service as any).subscription = { unsubscribe: () => { throw new Error('fail'); } };
    expect(() => service.disconnect()).not.toThrow();
    expect((service as any).subscription).toBeNull();
  });

  it('disconnect deactivates client', () => {
    const deactivateSpy = jasmine.createSpy('deactivate');
    (service as any).client = { deactivate: deactivateSpy };
    service.disconnect();
    expect(deactivateSpy).toHaveBeenCalled();
    expect((service as any).client).toBeNull();
  });

  it('disconnect handles client deactivate throwing', () => {
    (service as any).client = { deactivate: () => { throw new Error('fail'); } };
    expect(() => service.disconnect()).not.toThrow();
    expect((service as any).client).toBeNull();
  });

  it('disconnect clears onNotificationCallback', () => {
    (service as any).onNotificationCallback = () => {};
    service.disconnect();
    expect((service as any).onNotificationCallback).toBeNull();
  });

  it('disconnect sets connected to false', () => {
    (service as any)._connected.set(true);
    service.disconnect();
    expect(service.connected()).toBeFalse();
  });

  it('multiple disconnect calls are safe', () => {
    service.disconnect();
    service.disconnect();
    service.disconnect();
    expect(service.connected()).toBeFalse();
  });

  // ── teardownClient ─────────────────────────────────────────────────

  it('teardownClient clears reconnectTimer', fakeAsync(() => {
    (service as any).reconnectTimer = setTimeout(() => {}, 5000);
    (service as any).teardownClient();
    expect((service as any).reconnectTimer).toBeNull();
    tick(6000);
  }));

  it('teardownClient clears subscription', () => {
    const unsubSpy = jasmine.createSpy('unsubscribe');
    (service as any).subscription = { unsubscribe: unsubSpy };
    (service as any).teardownClient();
    expect(unsubSpy).toHaveBeenCalled();
    expect((service as any).subscription).toBeNull();
  });

  it('teardownClient clears client', () => {
    const deactivateSpy = jasmine.createSpy('deactivate');
    (service as any).client = { deactivate: deactivateSpy };
    (service as any).teardownClient();
    expect(deactivateSpy).toHaveBeenCalled();
    expect((service as any).client).toBeNull();
  });

  it('teardownClient sets connected to false', () => {
    (service as any)._connected.set(true);
    (service as any).teardownClient();
    expect(service.connected()).toBeFalse();
  });

  it('teardownClient handles no subscription and no client', () => {
    (service as any).subscription = null;
    (service as any).client = null;
    expect(() => (service as any).teardownClient()).not.toThrow();
  });

  // ── reconnect via updateToken ──────────────────────────────────────

  it('updateToken calls reconnect which tears down and recreates when logged in', () => {
    authService.isLoggedIn.and.returnValue(true);
    const deactivateSpy = jasmine.createSpy('deactivate');
    (service as any).client = { deactivate: deactivateSpy };
    (service as any).onNotificationCallback = () => {};
    service.updateToken();
    expect(deactivateSpy).toHaveBeenCalled();
    expect((service as any).client).not.toBeNull();
    service.disconnect();
  });

  it('updateToken tears down but does not recreate when not logged in', () => {
    authService.isLoggedIn.and.returnValue(false);
    const deactivateSpy = jasmine.createSpy('deactivate');
    (service as any).client = { deactivate: deactivateSpy };
    service.updateToken();
    expect(deactivateSpy).toHaveBeenCalled();
    expect((service as any).client).toBeNull();
  });

  it('updateToken tears down but does not recreate when no callback', () => {
    authService.isLoggedIn.and.returnValue(true);
    (service as any).onNotificationCallback = null;
    const deactivateSpy = jasmine.createSpy('deactivate');
    (service as any).client = { deactivate: deactivateSpy };
    service.updateToken();
    expect(deactivateSpy).toHaveBeenCalled();
    expect((service as any).client).toBeNull();
  });

  // ── scheduleReconnect ──────────────────────────────────────────────

  it('scheduleReconnect does nothing when not logged in', () => {
    authService.isLoggedIn.and.returnValue(false);
    (service as any).scheduleReconnect();
    expect((service as any).reconnectTimer).toBeNull();
  });

  it('scheduleReconnect does nothing when timer already set', fakeAsync(() => {
    authService.isLoggedIn.and.returnValue(true);
    (service as any).reconnectTimer = setTimeout(() => {}, 10000);
    (service as any).scheduleReconnect();
    expect((service as any).reconnectTimer).not.toBeNull();
    tick(11000);
    service.disconnect();
  }));

  it('scheduleReconnect sets timer and reconnects when logged in', fakeAsync(() => {
    authService.isLoggedIn.and.returnValue(true);
    (service as any).onNotificationCallback = () => {};

    (service as any).scheduleReconnect();
    expect((service as any).reconnectTimer).not.toBeNull();

    tick(3000);
    expect((service as any).reconnectTimer).toBeNull();
    service.disconnect();
  }));

  it('scheduleReconnect does not reconnect when not logged in at timer fire', fakeAsync(() => {
    authService.isLoggedIn.and.returnValue(true);
    (service as any).onNotificationCallback = () => {};

    (service as any).scheduleReconnect();
    expect((service as any).reconnectTimer).not.toBeNull();

    authService.isLoggedIn.and.returnValue(false);
    tick(3000);
    expect((service as any).reconnectTimer).toBeNull();
    service.disconnect();
  }));

  // ── subscribe ──────────────────────────────────────────────────────

  it('subscribe calls client.subscribe with correct queue', () => {
    const subscribeSpy = jasmine.createSpy('subscribe').and.returnValue({ unsubscribe: jasmine.createSpy() });
    (service as any).client = { subscribe: subscribeSpy };
    (service as any).subscribe();
    expect(subscribeSpy).toHaveBeenCalledWith('/user/queue/notifications', jasmine.any(Function));
  });

  it('subscribe stores the subscription reference', () => {
    const mockSub = { unsubscribe: jasmine.createSpy() };
    const subscribeSpy = jasmine.createSpy('subscribe').and.returnValue(mockSub);
    (service as any).client = { subscribe: subscribeSpy };
    (service as any).subscribe();
    expect((service as any).subscription).toBe(mockSub);
  });

  // ── buildHeaders ───────────────────────────────────────────────────

  it('buildHeaders returns Authorization with access token', () => {
    const headers = (service as any).buildHeaders();
    expect(headers).toEqual({ Authorization: 'Bearer test-token' });
  });

  it('buildHeaders returns Bearer null when no token', () => {
    authService.accessToken.and.returnValue(null);
    const headers = (service as any).buildHeaders();
    expect(headers).toEqual({ Authorization: 'Bearer null' });
  });

  // ── connect ────────────────────────────────────────────────────────

  it('connect stores callback and creates client', () => {
    const callback = jasmine.createSpy('onNotification');
    service.connect(callback);
    expect((service as any).onNotificationCallback).toBe(callback);
    expect((service as any).client).not.toBeNull();
    service.disconnect();
  });

  it('connect does nothing when client is already active', () => {
    (service as any).client = { active: true };
    const callback = jasmine.createSpy('onNotification');
    service.connect(callback);
    expect((service as any).onNotificationCallback).not.toBe(callback);
  });

  // ── createAndActivateClient via connect ─────────────────────────────

  it('createAndActivateClient is called by connect and activates client', () => {
    const callback = jasmine.createSpy('onNotification');
    service.connect(callback);
    const client = (service as any).client;
    expect(client).not.toBeNull();
    expect(typeof client.activate).toBe('function');
    service.disconnect();
  });

  // ── STOMP callbacks via captured config ─────────────────────────────

  it('onConnect callback sets connected to true and subscribes', () => {
    let onConnectFn: Function | undefined;
    const origClient = (window as any).Client;

    // Capture the config passed to Client constructor
    const OrigClient = (window as any).Client;
    (window as any).Client = function(config: any) {
      onConnectFn = config.onConnect;
      return {
        activate: jasmine.createSpy('activate'),
        deactivate: jasmine.createSpy('deactivate'),
        subscribe: jasmine.createSpy('subscribe').and.returnValue({ unsubscribe: jasmine.createSpy() }),
        active: false,
      };
    };

    const callback = jasmine.createSpy('onNotification');
    service.connect(callback);

    if (onConnectFn) {
      onConnectFn();
      expect(service.connected()).toBeTrue();
    }

    service.disconnect();
    (window as any).Client = OrigClient;
  });

  it('onDisconnect callback sets connected to false and schedules reconnect', fakeAsync(() => {
    let onDisconnectFn: Function | undefined;
    const OrigClient = (window as any).Client;

    (window as any).Client = function(config: any) {
      onDisconnectFn = config.onDisconnect;
      return {
        activate: jasmine.createSpy('activate'),
        deactivate: jasmine.createSpy('deactivate'),
        subscribe: jasmine.createSpy('subscribe').and.returnValue({ unsubscribe: jasmine.createSpy() }),
        active: false,
      };
    };

    authService.isLoggedIn.and.returnValue(true);
    const callback = jasmine.createSpy('onNotification');
    service.connect(callback);

    if (onDisconnectFn) {
      onDisconnectFn();
      expect(service.connected()).toBeFalse();
      expect((service as any).subscription).toBeNull();
      expect((service as any).reconnectTimer).not.toBeNull();
    }

    service.disconnect();
    tick(4000);
    (window as any).Client = OrigClient;
  }));

  it('onStompError does not throw', () => {
    let onStompErrorFn: Function | undefined;
    const OrigClient = (window as any).Client;

    (window as any).Client = function(config: any) {
      onStompErrorFn = config.onStompError;
      return {
        activate: jasmine.createSpy('activate'),
        deactivate: jasmine.createSpy('deactivate'),
        subscribe: jasmine.createSpy('subscribe').and.returnValue({ unsubscribe: jasmine.createSpy() }),
        active: false,
      };
    };

    const callback = jasmine.createSpy('onNotification');
    service.connect(callback);

    if (onStompErrorFn) {
      expect(() => onStompErrorFn!({ headers: { message: 'error' }, body: 'body' })).not.toThrow();
    }

    service.disconnect();
    (window as any).Client = OrigClient;
  });

  it('onWebSocketError does not throw', () => {
    let onWebSocketErrorFn: Function | undefined;
    const OrigClient = (window as any).Client;

    (window as any).Client = function(config: any) {
      onWebSocketErrorFn = config.onWebSocketError;
      return {
        activate: jasmine.createSpy('activate'),
        deactivate: jasmine.createSpy('deactivate'),
        subscribe: jasmine.createSpy('subscribe').and.returnValue({ unsubscribe: jasmine.createSpy() }),
        active: false,
      };
    };

    const callback = jasmine.createSpy('onNotification');
    service.connect(callback);

    if (onWebSocketErrorFn) {
      expect(() => onWebSocketErrorFn!(new Event('error'))).not.toThrow();
    }

    service.disconnect();
    (window as any).Client = OrigClient;
  });

  it('subscribe callback in onConnect parses notification and invokes callback', () => {
    let subscribeFn: Function | undefined;
    let onConnectFn: Function | undefined;
    const OrigClient = (window as any).Client;

    (window as any).Client = function(config: any) {
      onConnectFn = config.onConnect;
      return {
        activate: jasmine.createSpy('activate'),
        deactivate: jasmine.createSpy('deactivate'),
        subscribe: jasmine.createSpy('subscribe').and.callFake((_queue: string, cb: Function) => {
          subscribeFn = cb;
          return { unsubscribe: jasmine.createSpy() };
        }),
        active: false,
      };
    };

    const callback = jasmine.createSpy('onNotification');
    service.connect(callback);

    if (onConnectFn) {
      onConnectFn();
    }

    if (subscribeFn) {
      const notification = { id: 1, type: 'PROJET_VALIDE', title: 'Test', message: 'msg', link: null, read: false, createdAt: '2026-01-01' };
      subscribeFn({ body: JSON.stringify(notification) });
      expect(callback).toHaveBeenCalledWith(notification);
    }

    service.disconnect();
    (window as any).Client = OrigClient;
  });
});
