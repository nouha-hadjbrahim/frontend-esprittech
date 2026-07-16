import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables, type ScriptableContext } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';
import {
  LucideUsers, LucideFileText, LucideClock, LucideCheckCircle2, LucideCircleX,
  LucideInbox, LucideThumbsUp, LucideThumbsDown, LucideLibrary, LucideGraduationCap,
  LucideUsersRound, LucideUserPlus, LucideTrendingUp, LucideTrendingDown,
} from '@lucide/angular';
import { DashboardAdminService } from '../../../core/services/dashboard-admin.service';
import { ExtendedDashboardResponse, TrendItem } from '../../../core/models/dashboard-admin.model';
import { CardComponent } from '../../../ui/card/card.component';

Chart.register(...registerables);

@Component({
  selector: 'app-kpi-dashboard',
  standalone: true,
  imports: [
    CommonModule, CardComponent, BaseChartDirective,
    LucideUsers, LucideFileText, LucideClock, LucideCheckCircle2, LucideCircleX,
    LucideInbox, LucideThumbsUp, LucideThumbsDown, LucideLibrary, LucideGraduationCap,
    LucideUsersRound, LucideUserPlus, LucideTrendingUp, LucideTrendingDown,
  ],
  templateUrl: './kpi-dashboard.component.html',
  styleUrl: './kpi-dashboard.component.css',
})
export class KpiDashboardComponent implements OnInit {
  private readonly adminDashboardService = inject(DashboardAdminService);

  readonly loading = signal(true);
  readonly error = signal(false);
  readonly data = signal<ExtendedDashboardResponse | null>(null);

  areaChartData: ChartData<'line'> = { labels: [], datasets: [] };
  areaChartOptions: ChartOptions<'line'> = {};
  pieChartData: ChartData<'doughnut'> = { labels: [], datasets: [] };
  pieChartOptions: ChartOptions<'doughnut'> = {};
  barChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  barChartOptions: ChartOptions<'bar'> = {};
  hBarChartData: ChartData<'bar'> = { labels: [], datasets: [] };
  hBarChartOptions: ChartOptions<'bar'> = {};

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.adminDashboardService.getExtendedDashboard().subscribe({
      next: (d) => {
        this.data.set(d);
        setTimeout(() => this.initCharts(d));
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  private initCharts(d: ExtendedDashboardResponse): void {
    this.initAreaChart(d.trendsCandidatures);
    this.initPieChart(d.sujetsByStatut);
    this.initBarChart(d.usersByRole);
    this.initHBarChart(d.catalogueByDomain);
  }

  private initAreaChart(data: TrendItem[]): void {
    const labels = data.map(i => i.month);
    const values = data.map(i => i.value);
    this.areaChartData = {
      labels,
      datasets: [{
        label: 'Candidatures',
        data: values,
        fill: true,
        borderColor: '#E63946',
        backgroundColor: (ctx: ScriptableContext<'line'>) => {
          const grad = ctx.chart.ctx.createLinearGradient(0, 0, 0, 260);
          grad.addColorStop(0, 'rgba(230,57,70,0.3)');
          grad.addColorStop(1, 'rgba(230,57,70,0)');
          return grad;
        },
        pointBackgroundColor: '#E63946',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        tension: 0.4,
        borderWidth: 2.5,
      }]
    };
    this.areaChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#fff', titleColor: '#1e293b', bodyColor: '#1e293b', borderColor: '#e2e8f0', borderWidth: 1, cornerRadius: 12, padding: 10 } },
      scales: { x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } }, y: { grid: { color: 'rgba(148,163,184,0.15)' }, ticks: { color: '#94a3b8', font: { size: 11 } } } },
    };
  }

  private initPieChart(data: { name: string; value: number; color: string }[]): void {
    this.pieChartData = {
      labels: data.map(i => i.name),
      datasets: [{
        data: data.map(i => i.value),
        backgroundColor: data.map(i => i.color),
        borderWidth: 0,
      }]
    };
    this.pieChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#fff', titleColor: '#1e293b', bodyColor: '#1e293b', borderColor: '#e2e8f0', borderWidth: 1, cornerRadius: 12, padding: 10 } },
    };
  }

  private initBarChart(data: { role: string; value: number }[]): void {
    this.barChartData = {
      labels: data.map(i => i.role),
      datasets: [{
        label: 'Utilisateurs',
        data: data.map(i => i.value),
        backgroundColor: '#E63946',
        borderRadius: 6,
        borderSkipped: false,
      }]
    };
    this.barChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#fff', titleColor: '#1e293b', bodyColor: '#1e293b', borderColor: '#e2e8f0', borderWidth: 1, cornerRadius: 12, padding: 10 } },
      scales: { x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } }, y: { grid: { color: 'rgba(148,163,184,0.15)' }, ticks: { color: '#94a3b8', font: { size: 10 } } } },
    };
  }

  private initHBarChart(data: { domain: string; value: number }[]): void {
    this.hBarChartData = {
      labels: data.map(i => i.domain),
      datasets: [{
        label: 'Projets',
        data: data.map(i => i.value),
        backgroundColor: '#10B981',
        borderRadius: 6,
        borderSkipped: false,
      }]
    };
    this.hBarChartOptions = {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { backgroundColor: '#fff', titleColor: '#1e293b', bodyColor: '#1e293b', borderColor: '#e2e8f0', borderWidth: 1, cornerRadius: 12, padding: 10 } },
      scales: { x: { grid: { color: 'rgba(148,163,184,0.15)' }, ticks: { color: '#94a3b8', font: { size: 10 } } }, y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } } },
    };
  }
}
