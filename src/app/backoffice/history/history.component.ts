import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, takeUntil, finalize } from 'rxjs';
import { HistoriqueService } from '../../core/services/historique.service';
import {
  HistoriqueResponse,
  MODULE_LABEL,
  ACTION_LABEL,
  ROLE_LABEL,
  MODULE_NAMES,
  MODULE_STYLE,
} from '../../core/models/historique.model';

interface LogEntry {
  id: number;
  module: string;
  action: string;
  user: string;
  role: string;
  date: string;
  time: string;
  oldStatus: string;
  newStatus: string;
  comment: string;
  summary: string;
  moduleColor: string;
  moduleBg: string;
  moduleBgSolid: string;
  oldValuesRaw: Record<string, unknown> | null;
  newValuesRaw: Record<string, unknown> | null;
  metadataRaw: Record<string, unknown> | null;
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './history.component.html',
  styleUrl: './history.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryComponent implements OnInit, OnDestroy {
  private readonly historiqueService = inject(HistoriqueService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly destroy$ = new Subject<void>();

  readonly searchTerm = signal('');
  readonly selectedModule = signal('all');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly allLogs = signal<LogEntry[]>([]);
  readonly page = signal(0);
  readonly hasMore = signal(true);
  readonly pageSize = 100;
  readonly selectedLog = signal<LogEntry | null>(null);
  readonly selectedLogOldKeys = signal<Array<{ key: string; value: string }>>([]);
  readonly selectedLogNewKeys = signal<Array<{ key: string; value: string }>>([]);
  readonly selectedLogMetaKeys = signal<Array<{ key: string; value: string }>>([]);

  readonly modules = MODULE_NAMES;

  readonly filteredLogs = computed(() => {
    const q = this.searchTerm().toLowerCase();
    const mod = this.selectedModule();
    return this.allLogs().filter((l) => {
      const matchQ =
        !q ||
        l.user.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.comment.toLowerCase().includes(q) ||
        l.summary?.toLowerCase().includes(q);
      const matchM = mod === 'all' || l.module === mod;
      return matchQ && matchM;
    });
  });

  readonly groupedLogs = computed(() => {
    const map = new Map<string, LogEntry[]>();
    this.filteredLogs().forEach((l) => {
      const arr = map.get(l.date) ?? [];
      arr.push(l);
      map.set(l.date, arr);
    });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  });

  readonly stats = computed(() => {
    const logs = this.allLogs();
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: logs.length,
      today: logs.filter((l) => l.date === today).length,
      modules: new Set(logs.map((l) => l.module)).size,
      users: new Set(logs.map((l) => l.user)).size,
    };
  });

  ngOnInit(): void {
    this.loadLogs();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadLogs(): void {
    this.loading.set(true);
    this.error.set(null);
    this.historiqueService
      .search({}, this.page(), this.pageSize)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (res) => {
          const entries = res.content
            .map((r) => this.mapEntry(r))
            .filter((e) => MODULE_NAMES.includes(e.module));
          this.allLogs.update((prev) => [...prev, ...entries]);
          this.hasMore.set(!res.last);
        },
        error: () => {
          this.error.set('Impossible de charger l\'historique. Veuillez réessayer.');
        },
      });
  }

  onSearch(value: string): void {
    this.searchTerm.set(value);
  }

  onModuleChange(mod: string): void {
    this.selectedModule.set(mod);
  }

  openDetails(log: LogEntry): void {
    this.selectedLog.set(log);
    this.selectedLogOldKeys.set(this.formatJsonKeys(log.oldValuesRaw));
    this.selectedLogNewKeys.set(this.formatJsonKeys(log.newValuesRaw));
    this.selectedLogMetaKeys.set(this.formatJsonKeys(log.metadataRaw));
  }

  closeDetails(): void {
    this.selectedLog.set(null);
  }

  formatJsonKeys(obj: Record<string, unknown> | null): Array<{ key: string; value: string }> {
    if (!obj) return [];
    return Object.entries(obj).map(([key, value]) => ({
      key,
      value: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '—'),
    }));
  }

  loadMore(): void {
    this.page.update((p) => p + 1);
    this.loadLogs();
  }

  exportCsv(): void {
    const headers = ['Date', 'Heure', 'Module', 'Action', 'Utilisateur', 'Rôle', 'Ancien statut', 'Nouveau statut', 'Commentaire'];
    const rows = this.filteredLogs().map((l) => [
      l.date, l.time, l.module, l.action, l.user, l.role, l.oldStatus, l.newStatus, l.comment,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historique_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  formatDate(d: string): string {
    try {
      return new Date(d).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return d;
    }
  }

  private mapEntry(r: HistoriqueResponse): LogEntry {
    const module = MODULE_LABEL[r.entityType] ?? r.entityType;
    const action = ACTION_LABEL[r.action] ?? r.action;
    const user = `${r.actorPrenom} ${r.actorNom}`.trim();
    const role = ROLE_LABEL[r.actorRole] ?? r.actorRole;

    let date = '';
    let time = '';
    try {
      const dt = new Date(r.createdAt);
      date = dt.toISOString().slice(0, 10);
      time = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      date = r.createdAt;
      time = '';
    }

    let oldStatus = '—';
    let newStatus = '—';
    let oldValuesRaw: Record<string, unknown> | null = null;
    let newValuesRaw: Record<string, unknown> | null = null;
    try {
      if (r.oldValues) {
        const ov = JSON.parse(r.oldValues);
        oldValuesRaw = ov;
        oldStatus = ov.statut ?? ov.status ?? JSON.stringify(ov);
      }
      if (r.newValues) {
        const nv = JSON.parse(r.newValues);
        newValuesRaw = nv;
        newStatus = nv.statut ?? nv.status ?? JSON.stringify(nv);
      }
    } catch { /* keep defaults */ }

    let comment = '';
    let metadataRaw: Record<string, unknown> | null = null;
    try {
      if (r.metadata) {
        const m = JSON.parse(r.metadata);
        metadataRaw = m;
        comment = m.motif ?? m.commentaire ?? m.reason ?? '';
      }
    } catch { /* empty */ }

    if (!comment) {
      comment = r.summary;
    }

    const style = MODULE_STYLE[module] ?? { color: '#64748b', bg: 'rgba(100,116,139,0.1)', bgSolid: '#64748b' };

    return {
      id: r.id,
      module,
      action,
      user,
      role,
      date,
      time,
      oldStatus,
      newStatus,
      comment,
      summary: r.summary,
      moduleColor: style.color,
      moduleBg: style.bg,
      moduleBgSolid: style.bgSolid,
      oldValuesRaw,
      newValuesRaw,
      metadataRaw,
    };
  }

  getModuleDotColor(module: string): string {
    return MODULE_STYLE[module]?.bgSolid ?? '#64748b';
  }

  getActionIcon(action: string): SafeHtml {
    const a = action.toLowerCase();
    let svg = '';
    if (a.includes('validation') || a.includes('acceptation')) {
      svg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
    } else if (a.includes('refus') || a.includes('invalidation')) {
      svg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    } else if (a.includes('ouverture') || a.includes('téléversement') || a.includes('soumission')) {
      svg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>';
    } else if (a.includes('désignation') || a.includes('chef')) {
      svg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z"/><line x1="3" y1="20" x2="21" y2="20"/></svg>';
    } else if (a.includes('création') || a.includes('ajout')) {
      svg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>';
    } else if (a.includes('suppression') || a.includes('retrait')) {
      svg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
    } else if (a.includes('activation') || a.includes('désactivation')) {
      svg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>';
    } else if (a.includes('go') || a.includes('nogo') || a.includes('décision')) {
      svg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    } else if (a.includes('affiliation')) {
      svg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
    } else {
      svg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
    }
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }

  getModuleIcon(module: string): SafeHtml {
    let svg = '';
    switch (module) {
      case 'Sujets':
        svg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';
        break;
      case 'Équipes':
        svg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
        break;
      case 'Candidatures':
        svg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
        break;
      case 'Industrialisation':
        svg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20"/><path d="M5 20V8l7-5 7 5v12"/><path d="M9 20v-5h6v5"/></svg>';
        break;
      case 'Affiliation':
        svg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
        break;
      case 'Utilisateurs':
        svg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>';
        break;
      case 'Catalogue':
        svg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>';
        break;
      case 'Évaluation':
        svg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
        break;
      default:
        svg = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>';
    }
    return this.sanitizer.bypassSecurityTrustHtml(svg);
  }
}
