import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { NotificationBellComponent } from './notification-bell.component';
import { NotificationService } from '../../../core/services/notification.service';
import { Notification } from '../../../core/models/notification.model';

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

describe('NotificationBellComponent', () => {
  let component: NotificationBellComponent;
  let fixture: ComponentFixture<NotificationBellComponent>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let routerSpy: jasmine.SpyObj<Router>;

  const mockNotifications = signal<Notification[]>([]);
  const mockUnreadCount = signal(0);
  const mockLoading = signal(false);
  const mockHasMore = signal(true);

  beforeEach(() => {
    notificationServiceSpy = jasmine.createSpyObj('NotificationService', [
      'marquerCommeLu',
      'marquerToutCommeLu',
      'loadMore',
    ], {
      notifications: mockNotifications,
      unreadCount: mockUnreadCount,
      loading: mockLoading,
      hasMore: mockHasMore,
    });

    routerSpy = jasmine.createSpyObj('Router', ['navigateByUrl'], { url: '/frontoffice/other' });
    routerSpy.navigateByUrl.and.returnValue(Promise.resolve(true));

    TestBed.configureTestingModule({
      imports: [NotificationBellComponent],
      providers: [
        { provide: NotificationService, useValue: notificationServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });

    fixture = TestBed.createComponent(NotificationBellComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function openDropdown(): void {
    component.isOpen.set(true);
    mockNotifications.set([]);
    fixture.detectChanges();
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle dropdown on bell click', () => {
    expect(component.isOpen()).toBeFalse();

    const btn = fixture.nativeElement.querySelector('.notification-btn');
    btn.click();
    expect(component.isOpen()).toBeTrue();

    btn.click();
    expect(component.isOpen()).toBeFalse();
  });

  it('should close dropdown on outside click', () => {
    component.isOpen.set(true);
    document.body.click();
    expect(component.isOpen()).toBeFalse();
  });

  it('should close dropdown on Escape key', () => {
    component.isOpen.set(true);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(component.isOpen()).toBeFalse();
  });

  it('should show empty state when no notifications', () => {
    openDropdown();

    const empty = fixture.nativeElement.querySelector('.empty-state');
    expect(empty).toBeTruthy();
    expect(empty.textContent).toContain('Aucune notification');
  });

  it('should show notification items', () => {
    component.isOpen.set(true);
    mockNotifications.set([
      makeNotification({ id: 1, title: 'First' }),
      makeNotification({ id: 2, title: 'Second', read: true }),
    ]);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.notification-item');
    expect(items.length).toBe(2);
  });

  it('should apply unread class to unread notifications', () => {
    component.isOpen.set(true);
    mockNotifications.set([makeNotification({ id: 1, read: false })]);
    fixture.detectChanges();

    const item = fixture.nativeElement.querySelector('.notification-item');
    expect(item).toBeTruthy();
    expect(item.classList.contains('unread')).toBeTrue();
  });

  it('should not apply unread class to read notifications', () => {
    component.isOpen.set(true);
    mockNotifications.set([makeNotification({ id: 1, read: true })]);
    fixture.detectChanges();

    const item = fixture.nativeElement.querySelector('.notification-item');
    expect(item).toBeTruthy();
    expect(item.classList.contains('unread')).toBeFalse();
  });

  it('should show badge when unreadCount > 0', () => {
    mockUnreadCount.set(3);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.notification-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent.trim()).toBe('3');
  });

  it('should cap badge at 99+', () => {
    mockUnreadCount.set(150);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.notification-badge');
    expect(badge.textContent.trim()).toBe('99+');
  });

  it('should not show badge when unreadCount is 0', () => {
    mockUnreadCount.set(0);
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.notification-badge');
    expect(badge).toBeNull();
  });

  it('should call marquerCommeLu when clicking unread notification', () => {
    component.isOpen.set(true);
    mockNotifications.set([makeNotification({ id: 5, read: false })]);
    fixture.detectChanges();

    const item = fixture.nativeElement.querySelector('.notification-item');
    item.click();

    expect(notificationServiceSpy.marquerCommeLu).toHaveBeenCalledWith(5);
  });

  it('should not call marquerCommeLu when clicking read notification', () => {
    component.isOpen.set(true);
    mockNotifications.set([makeNotification({ id: 5, read: true })]);
    fixture.detectChanges();

    const item = fixture.nativeElement.querySelector('.notification-item');
    item.click();

    expect(notificationServiceSpy.marquerCommeLu).not.toHaveBeenCalled();
  });

  it('should navigate to link on notification click', () => {
    component.isOpen.set(true);
    mockNotifications.set([makeNotification({ link: '/frontoffice/mes-projets' })]);
    fixture.detectChanges();

    const item = fixture.nativeElement.querySelector('.notification-item');
    item.click();

    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/frontoffice/mes-projets');
  });

  it('should not navigate when notification has no link', () => {
    component.isOpen.set(true);
    mockNotifications.set([makeNotification({ link: null })]);
    fixture.detectChanges();

    const item = fixture.nativeElement.querySelector('.notification-item');
    item.click();

    expect(routerSpy.navigateByUrl).not.toHaveBeenCalled();
  });

  it('should close dropdown after clicking notification', () => {
    component.isOpen.set(true);
    mockNotifications.set([makeNotification()]);
    fixture.detectChanges();

    const item = fixture.nativeElement.querySelector('.notification-item');
    item.click();

    expect(component.isOpen()).toBeFalse();
  });

  it('should call marquerToutCommeLu when clicking mark all button', () => {
    component.isOpen.set(true);
    mockUnreadCount.set(2);
    mockNotifications.set([]);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.mark-all-btn');
    btn.click();

    expect(notificationServiceSpy.marquerToutCommeLu).toHaveBeenCalled();
  });

  it('should show load more button when hasMore is true', () => {
    component.isOpen.set(true);
    mockNotifications.set([makeNotification()]);
    mockHasMore.set(true);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.load-more-btn');
    expect(btn).toBeTruthy();
    expect(btn.tagName).toBe('BUTTON');
  });

  it('should not show load more button when hasMore is false', () => {
    component.isOpen.set(true);
    mockNotifications.set([makeNotification()]);
    mockHasMore.set(false);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.load-more-btn');
    expect(btn).toBeNull();
  });

  it('should call loadMore when clicking load more button', () => {
    component.isOpen.set(true);
    mockNotifications.set([makeNotification()]);
    mockHasMore.set(true);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.load-more-btn');
    btn.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    expect(notificationServiceSpy.loadMore).toHaveBeenCalled();
  });

  it('should show spinner when loading', () => {
    component.isOpen.set(true);
    mockNotifications.set([makeNotification()]);
    mockHasMore.set(true);
    mockLoading.set(true);
    fixture.detectChanges();

    const spinner = fixture.nativeElement.querySelector('.spinner');
    expect(spinner).toBeTruthy();
  });

  it('should return correct config for known notification type', () => {
    const config = component.getNotifConfig('CANDIDATURE_RECUE');
    expect(config.icon).toBe('📄');
    expect(config.color).toBe('#3b82f6');
  });

  it('should return fallback config for unknown type', () => {
    const config = component.getNotifConfig('UNKNOWN' as any);
    expect(config.icon).toBe('🔔');
    expect(config.color).toBe('#6b7280');
  });

  it('should return instant text for very recent notifications', () => {
    const now = new Date().toISOString();
    expect(component.getTimeAgo(now)).toContain('instant');
  });

  it('should return minutes for notifications < 1 hour old', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    expect(component.getTimeAgo(fiveMinAgo)).toContain('min');
  });

  it('should return hours for notifications < 24 hours old', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600000).toISOString();
    expect(component.getTimeAgo(twoHoursAgo)).toContain('h');
  });

  it('should return days for notifications >= 24 hours old', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
    expect(component.getTimeAgo(threeDaysAgo)).toContain('j');
  });

  it('should call onMarkRead via check button without navigating', () => {
    component.isOpen.set(true);
    mockNotifications.set([makeNotification({ id: 10, read: false })]);
    fixture.detectChanges();

    const checkBtn = fixture.nativeElement.querySelector('.mark-read-btn');
    expect(checkBtn).toBeTruthy();
    checkBtn.click();

    expect(notificationServiceSpy.marquerCommeLu).toHaveBeenCalledWith(10);
    expect(routerSpy.navigateByUrl).not.toHaveBeenCalled();
  });

  it('should navigate to same URL using skipLocationChange', () => {
    Object.defineProperty(routerSpy, 'url', { value: '/frontoffice/mes-projets', writable: true });
    component.isOpen.set(true);
    mockNotifications.set([makeNotification({ link: '/frontoffice/mes-projets' })]);
    fixture.detectChanges();

    const item = fixture.nativeElement.querySelector('.notification-item');
    item.click();

    expect(routerSpy.navigateByUrl).toHaveBeenCalledWith('/', { skipLocationChange: true });
  });

  it('should not call onMarkRead for already-read notification', () => {
    component.isOpen.set(true);
    mockNotifications.set([makeNotification({ id: 10, read: true })]);
    fixture.detectChanges();

    const checkBtn = fixture.nativeElement.querySelector('.mark-read-btn');
    expect(checkBtn).toBeNull();
  });

  it('should return correct config for SUJET_DEMANDE type', () => {
    const config = component.getNotifConfig('SUJET_DEMANDE');
    expect(config.icon).toBe('📝');
    expect(config.color).toBe('#f59e0b');
  });

  it('should return correct config for EVALUATION_CALCULEE type', () => {
    const config = component.getNotifConfig('EVALUATION_CALCULEE');
    expect(config.icon).toBe('📊');
    expect(config.color).toBe('#8b5cf6');
  });

  it('should return correct config for CI_DEMANDE_SOUMISE type', () => {
    const config = component.getNotifConfig('CI_DEMANDE_SOUMISE');
    expect(config.icon).toBe('📋');
    expect(config.color).toBe('#f59e0b');
  });

  it('should return correct config for PROJET_VALIDE type', () => {
    const config = component.getNotifConfig('PROJET_VALIDE');
    expect(config.icon).toBe('✅');
    expect(config.color).toBe('#16a34a');
  });

  it('should hide mark-all button when unreadCount is 0', () => {
    component.isOpen.set(true);
    mockNotifications.set([]);
    mockUnreadCount.set(0);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.mark-all-btn');
    expect(btn).toBeNull();
  });

  it('should render mixed read/unread notifications correctly', () => {
    component.isOpen.set(true);
    mockNotifications.set([
      makeNotification({ id: 1, read: false }),
      makeNotification({ id: 2, read: true }),
      makeNotification({ id: 3, read: false }),
    ]);
    fixture.detectChanges();

    const items = fixture.nativeElement.querySelectorAll('.notification-item');
    expect(items.length).toBe(3);
    expect(items[0].classList.contains('unread')).toBeTrue();
    expect(items[1].classList.contains('unread')).toBeFalse();
    expect(items[2].classList.contains('unread')).toBeTrue();
  });

  it('should show mark-read button only for unread notifications', () => {
    component.isOpen.set(true);
    mockNotifications.set([
      makeNotification({ id: 1, read: false }),
      makeNotification({ id: 2, read: true }),
    ]);
    fixture.detectChanges();

    const markBtns = fixture.nativeElement.querySelectorAll('.mark-read-btn');
    expect(markBtns.length).toBe(1);
  });

  it('should stopPropagation on toggle click', () => {
    const event = new Event('click');
    spyOn(event, 'stopPropagation');

    component.toggle(event as MouseEvent);

    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it('should stopPropagation on markAll click', () => {
    const event = new Event('click');
    spyOn(event, 'stopPropagation');

    component.marquerToutCommeLu(event as MouseEvent);

    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it('should stopPropagation on loadMore click', () => {
    const event = new Event('click');
    spyOn(event, 'stopPropagation');

    component.onLoadMore(event as MouseEvent);

    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it('should stopPropagation on onNotificationClick', () => {
    const event = new Event('click');
    spyOn(event, 'stopPropagation');

    component.onNotificationClick(makeNotification({ link: null }), event as MouseEvent);

    expect(event.stopPropagation).toHaveBeenCalled();
  });

  it('should stopPropagation on onMarkRead', () => {
    const event = new Event('click');
    spyOn(event, 'stopPropagation');

    component.onMarkRead(makeNotification({ read: false }), event as MouseEvent);

    expect(event.stopPropagation).toHaveBeenCalled();
  });
});
