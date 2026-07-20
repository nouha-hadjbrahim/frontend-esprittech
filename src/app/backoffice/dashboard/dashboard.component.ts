import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Chart, registerables, type ScriptableContext } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions, Plugin } from 'chart.js';
import { AuthService } from '../../core/services/auth.service';
import { DashboardAdminService } from '../../core/services/dashboard-admin.service';
import {
  AdminKpiResponse,
  CatalogueByDomainItem,
  ExtendedDashboardResponse,
  RecentActivityItem,
  SujetByCategorieItem,
  TrendItem,
} from '../../core/models/dashboard-admin.model';

Chart.register(...registerables);

interface DashboardKpiCard {
  key: string;
  label: string;
  value: number;
  hint: string;
  icon: 'projets' | 'sujets' | 'enseignants' | 'equipes';
}

interface ActivityViewItem extends RecentActivityItem {
  initials: string;
  tone: 'pink' | 'green' | 'blue' | 'amber' | 'red';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [BaseChartDirective, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css',
})
export class DashboardComponent implements OnInit {
  private readonly dashboardService = inject(DashboardAdminService);
  private readonly authService = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly kpis = signal<AdminKpiResponse | null>(null);
  readonly sujetsByCategorie = signal<SujetByCategorieItem[]>([]);
  readonly recentActivity = signal<RecentActivityItem[]>([]);
  readonly domainsChartMinWidth = signal(0);
  readonly domainsNeedsScroll = signal(false);

  areaChartData: ChartData<'line'> = { labels: [], datasets: [] };
  areaChartOptions: ChartOptions<'line'> = {};
  donutChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  donutChartOptions: ChartOptions<'doughnut'> = {};
  donutCenterPlugin: Plugin<'doughnut'> = { id: 'donutCenter' };
  domainsChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  domainsChartOptions: ChartOptions<'bar'> = {};

  readonly greetingName = computed(() => {
    const user = this.authService.currentUser();
    if (!user) {
      return '';
    }
    return `${user.prenom} ${user.nom}`.trim();
  });

  readonly cards = computed<DashboardKpiCard[]>(() => {
    const k = this.kpis();
    if (!k) {
      return [];
    }
    return [
      {
        key: 'projets',
        label: 'Nombre de projets',
        value: k.projetsCatalogue,
        hint: 'Catalogue applicatif',
        icon: 'projets',
      },
      {
        key: 'sujets',
        label: 'Nombre de sujets',
        value: k.sujetsTotal,
        hint: 'Tous statuts confondus',
        icon: 'sujets',
      },
      {
        key: 'enseignants',
        label: "Nombre d'enseignants",
        value: k.encadrantsTotal,
        hint: "Enseignants et chefs d'équipe",
        icon: 'enseignants',
      },
      {
        key: 'equipes',
        label: "Nombre d'équipes",
        value: k.equipesTotal,
        hint: 'Équipes de recherche',
        icon: 'equipes',
      },
    ];
  });

  readonly categorieTotal = computed(() =>
    this.sujetsByCategorie().reduce((sum, item) => sum + item.value, 0)
  );

  readonly categorieLegend = computed(() => {
    const total = this.categorieTotal();
    return this.sujetsByCategorie().map((item) => ({
      ...item,
      percent: total > 0 ? Math.round((item.value / total) * 100) : 0,
    }));
  });

  readonly activityItems = computed<ActivityViewItem[]>(() =>
    this.recentActivity().map((item) => ({
      ...item,
      initials: this.initialsFrom(item.actor),
      tone: this.toneFrom(item.type),
    }))
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.dashboardService.getExtendedDashboard(5).subscribe({
      next: (response) => {
        this.kpis.set(response.kpis);
        this.sujetsByCategorie.set(response.sujetsByCategorie ?? []);
        this.recentActivity.set((response.recentActivity ?? []).slice(0, 5));
        this.loading.set(false);
        setTimeout(() => this.initCharts(response));
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  private initCharts(response: ExtendedDashboardResponse): void {
    this.initAreaChart(
      response.trendsCandidatures ?? [],
      response.trendsIndustrialisation ?? []
    );
    this.initDonutChart(response.sujetsByCategorie ?? []);
    this.initDomainsChart(response.sujetsByDomaine ?? response.catalogueByDomain ?? []);
  }

  private initAreaChart(candidatures: TrendItem[], industrialisation: TrendItem[]): void {
    const labels = (candidatures.length ? candidatures : industrialisation).map((item) =>
      this.shortMonthLabel(item.month)
    );

    this.areaChartData = {
      labels,
      datasets: [
        {
          label: 'Candidatures',
          data: candidatures.map((item) => item.value),
          fill: true,
          borderColor: '#E23E3E',
          backgroundColor: (ctx: ScriptableContext<'line'>) => {
            const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 280);
            gradient.addColorStop(0, 'rgba(226, 62, 62, 0.28)');
            gradient.addColorStop(1, 'rgba(226, 62, 62, 0)');
            return gradient;
          },
          pointBackgroundColor: '#E23E3E',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 3.5,
          pointHoverRadius: 5,
          tension: 0.45,
          borderWidth: 2.5,
        },
        {
          label: "Demandes d'industrialisation",
          data: industrialisation.map((item) => item.value),
          fill: true,
          borderColor: '#FFB74D',
          backgroundColor: (ctx: ScriptableContext<'line'>) => {
            const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 280);
            gradient.addColorStop(0, 'rgba(255, 183, 77, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 183, 77, 0)');
            return gradient;
          },
          pointBackgroundColor: '#FFB74D',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          pointRadius: 3.5,
          pointHoverRadius: 5,
          tension: 0.45,
          borderWidth: 2.5,
        },
      ],
    };

    this.areaChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#ffffff',
          titleColor: '#1f2937',
          bodyColor: '#4b5563',
          borderColor: '#e5e7eb',
          borderWidth: 1,
          cornerRadius: 12,
          padding: 12,
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { size: 11, weight: 500 } },
          border: { display: false },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148, 163, 184, 0.18)' },
          ticks: { color: '#94a3b8', font: { size: 11 }, precision: 0 },
          border: { display: false },
        },
      },
    };
  }

  private initDonutChart(items: SujetByCategorieItem[]): void {
    const total = items.reduce((sum, item) => sum + item.value, 0);

    this.donutChartData = {
      labels: items.map((item) => item.name),
      datasets: [
        {
          data: items.map((item) => item.value),
          backgroundColor: items.map((item) => item.color),
          borderColor: '#ffffff',
          borderWidth: 3,
          hoverOffset: 2,
        },
      ],
    };

    this.donutChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      layout: {
        padding: 8,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#ffffff',
          titleColor: '#1f2937',
          bodyColor: '#4b5563',
          borderColor: '#e5e7eb',
          borderWidth: 1,
          cornerRadius: 12,
          padding: 10,
        },
      },
    };

    this.donutCenterPlugin = {
      id: 'donutCenter',
      afterDraw: (chart) => {
        const { ctx, chartArea } = chart;
        if (!chartArea) {
          return;
        }
        const centerX = (chartArea.left + chartArea.right) / 2;
        const centerY = (chartArea.top + chartArea.bottom) / 2;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#111827';
        ctx.font = '800 22px Inter, system-ui, sans-serif';
        ctx.fillText(String(total), centerX, centerY - 7);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '600 11px Inter, system-ui, sans-serif';
        ctx.fillText('Total', centerX, centerY + 11);
        ctx.restore();
      },
    };
  }

  private initDomainsChart(items: CatalogueByDomainItem[]): void {
    const values = items.map((item) => item.value);
    const maxValue = Math.max(0, ...values);
    const yStep = this.niceAxisStep(maxValue);
    const yMax = Math.max(yStep * 4, Math.ceil(maxValue / yStep) * yStep || yStep * 4);

    const visibleSlots = 6;
    const slotWidth = 88;
    const needsScroll = items.length > visibleSlots;
    this.domainsNeedsScroll.set(needsScroll);
    this.domainsChartMinWidth.set(needsScroll ? items.length * slotWidth : 0);

    this.domainsChartData = {
      labels: items.map((item) => item.domain),
      datasets: [
        {
          label: 'Sujets',
          data: values,
          backgroundColor: '#E23E3E',
          hoverBackgroundColor: '#c93434',
          borderRadius: 10,
          borderSkipped: false,
          maxBarThickness: 34,
          categoryPercentage: 0.65,
          barPercentage: 0.8,
        },
      ],
    };

    this.domainsChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#ffffff',
          titleColor: '#1f2937',
          bodyColor: '#4b5563',
          borderColor: '#e5e7eb',
          borderWidth: 1,
          cornerRadius: 12,
          padding: 10,
          callbacks: {
            title: (entries) => entries[0]?.label ?? '',
            label: (entry) => `Valeur : ${entry.parsed.y ?? 0}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#94a3b8',
            font: { size: 11, weight: 500 },
            maxRotation: 0,
            autoSkip: false,
          },
          border: { display: false },
        },
        y: {
          beginAtZero: true,
          max: yMax,
          grid: { color: 'rgba(148, 163, 184, 0.2)' },
          ticks: {
            color: '#94a3b8',
            font: { size: 11 },
            stepSize: yStep,
            precision: 0,
          },
          border: { display: false },
        },
      },
    };
  }

  /** Calcule un pas d'axe Y lisible selon les volumes. */
  private niceAxisStep(maxValue: number): number {
    if (maxValue <= 0) {
      return 1;
    }
    if (maxValue <= 4) {
      return 1;
    }
    if (maxValue <= 8) {
      return 2;
    }
    if (maxValue <= 20) {
      return 5;
    }
    if (maxValue <= 40) {
      return 10;
    }
    if (maxValue <= 80) {
      return 20;
    }
    if (maxValue <= 150) {
      return 30;
    }
    if (maxValue <= 250) {
      return 50;
    }
    if (maxValue <= 500) {
      return 100;
    }
    const rough = maxValue / 4;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
    const normalized = rough / magnitude;
    if (normalized <= 1.5) {
      return magnitude;
    }
    if (normalized <= 3) {
      return 2 * magnitude;
    }
    if (normalized <= 7) {
      return 5 * magnitude;
    }
    return 10 * magnitude;
  }

  private initialsFrom(actor: string): string {
    const parts = actor.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) {
      return '?';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }

  private toneFrom(type: string): ActivityViewItem['tone'] {
    switch (type) {
      case 'validation':
      case 'acceptation':
        return 'green';
      case 'refus':
        return 'amber';
      case 'creation':
        return 'blue';
      case 'en_attente':
        return 'pink';
      default:
        return 'red';
    }
  }

  private shortMonthLabel(month: string): string {
    const raw = month.trim();
    if (!raw) {
      return '';
    }
    const token = raw.split(/[\s.]+/)[0] ?? raw;
    return token.charAt(0).toUpperCase() + token.slice(1, 3).toLowerCase();
  }
}
