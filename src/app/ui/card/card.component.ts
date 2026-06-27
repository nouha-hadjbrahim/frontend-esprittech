import { Component, Input, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      display: block;
      border-radius: calc(var(--radius) + 2px);
      border: 1px solid var(--border);
      background: var(--card);
      color: var(--card-foreground);
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
  `]
})
export class CardComponent {}

@Component({
  selector: 'app-card-header',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content></ng-content>`,
  styles: [`
    :host { display: flex; flex-direction: column; gap: 0.375rem; padding: 1.5rem 1.5rem 0; }
  `]
})
export class CardHeaderComponent {}

@Component({
  selector: 'app-card-title',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content></ng-content>`,
  styles: [`
    :host { display: block; font-size: 1.125rem; font-weight: 600; line-height: 1; letter-spacing: -0.025em; }
  `]
})
export class CardTitleComponent {}

@Component({
  selector: 'app-card-description',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content></ng-content>`,
  styles: [`
    :host { display: block; font-size: 0.875rem; color: var(--muted-foreground); }
  `]
})
export class CardDescriptionComponent {}

@Component({
  selector: 'app-card-content',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content></ng-content>`,
  styles: [`
    :host { display: block; padding: 1.5rem; }
    :host-context(app-card-header) + :host { padding-top: 0; }
  `]
})
export class CardContentComponent {}

@Component({
  selector: 'app-card-footer',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content></ng-content>`,
  styles: [`
    :host { display: flex; align-items: center; padding: 0 1.5rem 1.5rem; }
  `]
})
export class CardFooterComponent {}
