import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ng-template[appHoverContent]',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      display: block;
      z-index: 50;
      width: 16rem;
      border-radius: calc(var(--radius) + 2px);
      border: 1px solid var(--border);
      background: var(--popover);
      color: var(--popover-foreground);
      padding: 1rem;
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
      outline: none;
    }
  `]
})
export class HoverCardContentComponent {}
