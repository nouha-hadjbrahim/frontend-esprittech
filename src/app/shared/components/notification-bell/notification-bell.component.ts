import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, signal, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Notification, NotificationType } from '../../../core/models/notification.model';
import { NotificationService } from '../../../core/services/notification.service';

const NOTIFICATION_CONFIG: Record<NotificationType, { icon: string; color: string }> = {
  CANDIDATURE_RECUE:     { icon: 'file', color: '#E23E3E' },
  CANDIDATURE_ACCEPTEE:  { icon: 'check', color: '#E23E3E' },
  CANDIDATURE_REJETEE:   { icon: 'x', color: '#E23E3E' },
  EQUIPE_INVITATION:     { icon: 'users', color: '#E23E3E' },
  EQUIPE_REJOINTE:       { icon: 'user-check', color: '#E23E3E' },
  AFFILIATION_DEMANDE:   { icon: 'mail', color: '#E23E3E' },
  AFFILIATION_ACCEPTEE:  { icon: 'check', color: '#E23E3E' },
  AFFILIATION_REJETEE:   { icon: 'x', color: '#E23E3E' },
  PROJET_SOUMIS:         { icon: 'edit', color: '#E23E3E' },
  PROJET_VALIDE:         { icon: 'check', color: '#E23E3E' },
  PROJET_REJETE:         { icon: 'x', color: '#E23E3E' },
  SUJET_DEMANDE:         { icon: 'edit', color: '#E23E3E' },
  SUJET_VALIDE:          { icon: 'check', color: '#E23E3E' },
  SUJET_REJETE:          { icon: 'x', color: '#E23E3E' },
  EVALUATION_CALCULEE:   { icon: 'bar-chart', color: '#E23E3E' },
  EVALUATION_TERMINEE:   { icon: 'bar-chart', color: '#E23E3E' },
  CI_DEMANDE_SOUMISE:    { icon: 'clipboard', color: '#E23E3E' },
  CI_DEMANDE_APPOUVEE:   { icon: 'check', color: '#E23E3E' },
  CI_DEMANDE_REJETEE:    { icon: 'x', color: '#E23E3E' },
};

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notification-bell.component.html',
  styleUrl: './notification-bell.component.css',
})
export class NotificationBellComponent {
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);

  readonly notifications = this.notificationService.notifications;
  readonly unreadCount = this.notificationService.unreadCount;
  readonly loading = this.notificationService.loading;
  readonly hasMore = this.notificationService.hasMore;

  isOpen = signal(false);

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!this.elementRef.nativeElement.contains(target)) {
      this.isOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.isOpen.set(false);
  }

  toggle(event: MouseEvent): void {
    event.stopPropagation();
    this.isOpen.update((v) => !v);
  }

  onNotificationClick(notification: Notification, event: MouseEvent): void {
    event.stopPropagation();
    if (!notification.read) {
      this.notificationService.marquerCommeLu(notification.id);
    }
    if (notification.link) {
      if (this.router.url === notification.link) {
        this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
          this.router.navigateByUrl(notification.link!);
        });
      } else {
        this.router.navigateByUrl(notification.link);
      }
    }
    this.isOpen.set(false);
  }

  onMarkRead(notification: Notification, event: MouseEvent): void {
    event.stopPropagation();
    if (!notification.read) {
      this.notificationService.marquerCommeLu(notification.id);
    }
  }

  marquerToutCommeLu(event: MouseEvent): void {
    event.stopPropagation();
    this.notificationService.marquerToutCommeLu();
  }

  onLoadMore(event: MouseEvent): void {
    event.stopPropagation();
    this.notificationService.loadMore();
  }

  getNotifConfig(type: NotificationType): { icon: string; color: string } {
    return NOTIFICATION_CONFIG[type] ?? { icon: '🔔', color: '#6b7280' };
  }

  getTimeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffMin / 60);
    const diffJ = Math.floor(diffH / 24);

    if (diffMin < 1) return "à l'instant";
    if (diffMin < 60) return `il y a ${diffMin} min`;
    if (diffH < 24) return `il y a ${diffH}h`;
    return `il y a ${diffJ}j`;
  }
}
