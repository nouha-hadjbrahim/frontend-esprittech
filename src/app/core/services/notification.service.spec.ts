import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Notification, NotificationPage } from '../models/notification.model';
import { NotificationService } from './notification.service';

const API = 'http://localhost:8080/api/notifications';

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: 1,
    type: 'CANDIDATURE_RECUE',
    title: 'Candidature recue',
    message: 'Un etudiant a depose une candidature.',
    link: '/frontoffice/mes-projets',
    read: false,
    createdAt: '2026-07-15T10:00:00Z',
    ...overrides,
  };
}

function makePage(notifications: Notification[], last = true): NotificationPage {
  return {
    content: notifications,
    totalElements: notifications.length,
    totalPages: 1,
    number: 0,
    size: 20,
    last,
  };
}

describe('NotificationService', () => {
  let service: NotificationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(NotificationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should be created with empty state', () => {
    expect(service).toBeTruthy();
    expect(service.notifications()).toEqual([]);
    expect(service.unreadCount()).toBe(0);
    expect(service.loading()).toBeFalse();
    expect(service.hasMore()).toBeTrue();
  });

  describe('fetchNotifications', () => {
    it('should load first page and update state', () => {
      const notifs = [makeNotification({ id: 1 }), makeNotification({ id: 2 })];
      service.fetchNotifications(true);

      const req = http.expectOne(`${API}?page=0`);
      expect(req.request.method).toBe('GET');
      req.flush(makePage(notifs, false));

      expect(service.notifications().length).toBe(2);
      expect(service.notifications()[0].id).toBe(1);
      expect(service.hasMore()).toBeTrue();
      expect(service.loading()).toBeFalse();
    });

    it('should set hasMore to false when last page', () => {
      service.fetchNotifications(true);

      const req = http.expectOne(`${API}?page=0`);
      req.flush(makePage([makeNotification()], true));

      expect(service.hasMore()).toBeFalse();
    });

    it('should append to existing list when not reset', () => {
      service.fetchNotifications(true);
      http.expectOne(`${API}?page=0`).flush(makePage([makeNotification({ id: 1 })]));

      service.fetchNotifications(false);
      http.expectOne(`${API}?page=1`).flush(makePage([makeNotification({ id: 2 })], true));

      expect(service.notifications().length).toBe(2);
    });

    it('should increment page counter after fetch', () => {
      service.fetchNotifications(true);
      http.expectOne(`${API}?page=0`).flush(makePage([makeNotification()], false));

      expect((service as any)._currentPage()).toBe(1);
    });

    it('should not fetch if already loading', () => {
      service.fetchNotifications(true);
      expect(service.loading()).toBeTrue();

      service.fetchNotifications(true);

      http.expectOne(`${API}?page=0`).flush(makePage([], true));
      expect(service.loading()).toBeFalse();
    });

    it('should set loading to false on error', () => {
      service.fetchNotifications(true);

      const req = http.expectOne(`${API}?page=0`);
      req.flush('error', { status: 500, statusText: 'Server Error' });

      expect(service.loading()).toBeFalse();
    });
  });

  describe('loadMore', () => {
    it('should fetch next page when hasMore and not loading', () => {
      service.fetchNotifications(true);
      http.expectOne(`${API}?page=0`).flush(makePage([makeNotification({ id: 1 })], false));

      service.loadMore();

      const req = http.expectOne(`${API}?page=1`);
      req.flush(makePage([makeNotification({ id: 2 })], true));

      expect(service.notifications().length).toBe(2);
      expect(service.hasMore()).toBeFalse();
    });

    it('should not fetch if hasMore is false', () => {
      service.fetchNotifications(true);
      http.expectOne(`${API}?page=0`).flush(makePage([], true));

      service.loadMore();
      http.verify();
    });

    it('should not fetch if loading is true', () => {
      service.fetchNotifications(true);
      expect(service.loading()).toBeTrue();

      service.loadMore();

      http.expectOne(`${API}?page=0`).flush(makePage([], true));
    });
  });

  describe('fetchUnreadCount', () => {
    it('should fetch and set unread count', () => {
      service.fetchUnreadCount();

      const req = http.expectOne(`${API}/unread-count`);
      expect(req.request.method).toBe('GET');
      req.flush({ count: 5 });

      expect(service.unreadCount()).toBe(5);
    });

    it('should set count to 0', () => {
      service.fetchUnreadCount();
      http.expectOne(`${API}/unread-count`).flush({ count: 0 });

      expect(service.unreadCount()).toBe(0);
    });
  });

  describe('marquerCommeLu', () => {
    it('should mark single notification as read and update local state', () => {
      service.fetchNotifications(true);
      http.expectOne(`${API}?page=0`).flush(
        makePage([makeNotification({ id: 1, read: false }), makeNotification({ id: 2, read: false })]),
      );
      service.fetchUnreadCount();
      http.expectOne(`${API}/unread-count`).flush({ count: 2 });

      service.marquerCommeLu(1);

      const req = http.expectOne(`${API}/1/read`);
      expect(req.request.method).toBe('PATCH');
      req.flush(null, { status: 204, statusText: 'No Content' });

      const notifs = service.notifications();
      expect(notifs.find((n) => n.id === 1)!.read).toBeTrue();
      expect(notifs.find((n) => n.id === 2)!.read).toBeFalse();
      expect(service.unreadCount()).toBe(1);
    });

    it('should not decrement unreadCount below zero', () => {
      service.fetchNotifications(true);
      http.expectOne(`${API}?page=0`).flush(
        makePage([makeNotification({ id: 1, read: false })]),
      );
      service.fetchUnreadCount();
      http.expectOne(`${API}/unread-count`).flush({ count: 0 });

      service.marquerCommeLu(1);

      const req = http.expectOne(`${API}/1/read`);
      req.flush(null, { status: 204, statusText: 'No Content' });

      expect(service.unreadCount()).toBe(0);
    });

    it('should not affect other notifications', () => {
      service.fetchNotifications(true);
      http.expectOne(`${API}?page=0`).flush(
        makePage([makeNotification({ id: 1, read: false }), makeNotification({ id: 2, read: false }), makeNotification({ id: 3, read: false })]),
      );

      service.marquerCommeLu(2);
      http.expectOne(`${API}/2/read`).flush(null, { status: 204, statusText: 'No Content' });

      const notifs = service.notifications();
      expect(notifs.find((n) => n.id === 1)!.read).toBeFalse();
      expect(notifs.find((n) => n.id === 2)!.read).toBeTrue();
      expect(notifs.find((n) => n.id === 3)!.read).toBeFalse();
    });
  });

  describe('marquerToutCommeLu', () => {
    it('should mark all as read and set unreadCount to 0', () => {
      service.fetchNotifications(true);
      http.expectOne(`${API}?page=0`).flush(
        makePage([makeNotification({ id: 1, read: false }), makeNotification({ id: 2, read: false })]),
      );
      service.fetchUnreadCount();
      http.expectOne(`${API}/unread-count`).flush({ count: 2 });

      service.marquerToutCommeLu();

      const req = http.expectOne(`${API}/read-all`);
      expect(req.request.method).toBe('PATCH');
      req.flush(null, { status: 204, statusText: 'No Content' });

      expect(service.notifications().every((n) => n.read)).toBeTrue();
      expect(service.unreadCount()).toBe(0);
    });
  });

  describe('deconnecter', () => {
    it('should reset initialized flag', () => {
      (service as any).initialized = true;
      service.deconnecter();
      expect((service as any).initialized).toBeFalse();
    });
  });

  describe('initialize', () => {
    it('should not fetch if already initialized', () => {
      (service as any).initialized = true;
      service.initialize();
      expect((service as any).initialized).toBeTrue();
      http.expectNone(`${API}?page=0`);
    });
  });
});
