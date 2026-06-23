import { Component } from '@angular/core';

@Component({
    selector: 'app-history',
    standalone: true,
    template: `
    <div class="page-container">
      <h1>Historique</h1>
      <p>Contenu en cours de développement...</p>
    </div>
  `,
    styles: [`
    .page-container { padding: 20px; }
  `]
})
export class HistoryComponent { }
