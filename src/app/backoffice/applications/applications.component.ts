import { Component } from '@angular/core';

@Component({
    selector: 'app-applications',
    standalone: true,
    template: `
    <div class="page-container">
      <h1>Candidatures</h1>
      <p>Contenu en cours de développement...</p>
    </div>
  `,
    styles: [`
    .page-container { padding: 20px; }
  `]
})
export class ApplicationsComponent { }
