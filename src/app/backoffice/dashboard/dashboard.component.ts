import { Component } from '@angular/core';
import { KpiDashboardComponent } from '../../shared/components/kpi-dashboard/kpi-dashboard.component';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [KpiDashboardComponent],
    template: `
    <div class="page-container">
      <h1>Tableau de bord</h1>
      <app-kpi-dashboard></app-kpi-dashboard>
    </div>
  `,
    styles: [`
    .page-container { padding: 20px; }
    h1 { margin-bottom: 1.5rem; }
  `]
})
export class DashboardComponent { }
