import { Component } from '@angular/core';
import { KpiDashboardComponent } from '../../../shared/components/kpi-dashboard/kpi-dashboard.component';

@Component({
  selector: 'app-tableau-de-bord',
  standalone: true,
  imports: [KpiDashboardComponent],
  templateUrl: './tableau-de-bord.html',
  styleUrl: './tableau-de-bord.css',
})
export class TableauDeBord {}
