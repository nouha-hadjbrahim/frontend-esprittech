import { Component, Input, HostBinding, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      border-radius: calc(var(--radius) - 2px);
      border: 1px solid transparent;
      padding: 0.125rem 0.625rem;
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1.25rem;
      transition: colors 0.15s;
      white-space: nowrap;
    }
    :host-context(.variant-default) {
      background: var(--primary);
      color: var(--primary-foreground);
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    :host-context(.variant-secondary) {
      background: var(--secondary);
      color: var(--secondary-foreground);
    }
    :host-context(.variant-destructive) {
      background: var(--destructive);
      color: var(--destructive-foreground);
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    :host-context(.variant-outline) {
      border-color: var(--border);
      color: var(--foreground);
    }
  `]
})
export class BadgeComponent {
  @Input() variant: BadgeVariant = 'default';

  @HostBinding('class')
  get cls() { return `variant-${this.variant}`; }
}
