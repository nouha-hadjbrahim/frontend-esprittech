import { Component } from '@angular/core';
import { KpiDashboardComponent } from '../../shared/components/kpi-dashboard/kpi-dashboard.component';

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [KpiDashboardComponent],
    template: `
    <div class="page-container">
      <app-kpi-dashboard></app-kpi-dashboard>
    </div>
  `,
    styles: [`
    .page-container { padding: 1.25rem; }
  `]
})
export class DashboardComponent { }
