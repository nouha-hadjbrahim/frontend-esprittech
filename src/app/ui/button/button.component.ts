import { Component, Input, HostBinding, booleanAttribute } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

@Component({
  selector: 'button[app-button], a[app-button]',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      white-space: nowrap;
      border-radius: calc(var(--radius) - 2px);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: colors 0.15s;
      border: 1px solid transparent;
      text-decoration: none;
      line-height: 1;
      font-family: inherit;
      outline: none;
    }
    :host:focus-visible { outline: 1px solid var(--ring); outline-offset: 2px; }
    :host:disabled { pointer-events: none; opacity: 0.5; cursor: not-allowed; }

    :host-context(.variant-default) {
      background: var(--primary);
      color: var(--primary-foreground);
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    :host-context(.variant-default):hover { background: color-mix(in srgb, var(--primary) 90%, black); }
    :host-context(.variant-default):active { background: color-mix(in srgb, var(--primary) 80%, black); }

    :host-context(.variant-destructive) {
      background: var(--destructive);
      color: var(--destructive-foreground);
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    :host-context(.variant-destructive):hover { background: #dc2626; }

    :host-context(.variant-outline) {
      border-color: var(--border);
      background: var(--background);
      color: var(--foreground);
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    :host-context(.variant-outline):hover { background: var(--accent); color: var(--accent-foreground); }

    :host-context(.variant-secondary) {
      background: var(--secondary);
      color: var(--secondary-foreground);
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    :host-context(.variant-secondary):hover { background: color-mix(in srgb, var(--secondary) 80%, black); }

    :host-context(.variant-ghost):hover { background: var(--accent); color: var(--accent-foreground); }
    :host-context(.variant-ghost) { color: var(--foreground); background: transparent; }

    :host-context(.variant-link) { color: var(--primary); text-underline-offset: 4px; background: transparent; }
    :host-context(.variant-link):hover { text-decoration: underline; }

    :host-context(.size-default) { height: 2.25rem; padding: 0 1rem; }
    :host-context(.size-sm) { height: 2rem; border-radius: calc(var(--radius) - 2px); padding: 0 0.75rem; font-size: 0.75rem; }
    :host-context(.size-lg) { height: 2.5rem; border-radius: calc(var(--radius) - 2px); padding: 0 2rem; }
    :host-context(.size-icon) { height: 2.25rem; width: 2.25rem; padding: 0; }
  `]
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'default';
  @Input() size: ButtonSize = 'default';
  @Input({ transform: booleanAttribute }) disabled = false;

  @HostBinding('class')
  get cls() { return `variant-${this.variant} size-${this.size}`; }

  @HostBinding('attr.disabled')
  get disabledAttr() { return this.disabled ? true : null; }
}
