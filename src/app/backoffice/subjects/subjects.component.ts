import { Component } from '@angular/core';

@Component({
  selector: 'app-subjects',
  standalone: true,
  template: `
    <div class="subjects-page">
      <div class="page-header">
        <h1>Sujets</h1>
        <p>Gérez les sujets déposés par les enseignants.</p>
      </div>
      <div class="placeholder-card">
        <p>La liste des sujets sera disponible prochainement.</p>
      </div>
    </div>
  `,
  styles: [`
    .subjects-page { display: flex; flex-direction: column; gap: 24px; }
    .page-header h1 { font-size: 2rem; font-weight: 700; color: #111827; margin: 0 0 8px; }
    .page-header p { color: #6b7280; margin: 0; }
    .placeholder-card {
      background: #fff; border: 1px solid #e5e7eb; border-radius: 16px;
      padding: 48px; text-align: center; color: #6b7280;
    }
  `],
})
export class SubjectsComponent {}
