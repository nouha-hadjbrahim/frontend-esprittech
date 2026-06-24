import { Component, Input, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-label',
  standalone: true,
  imports: [CommonModule],
  template: `<ng-content></ng-content>`,
  styles: [`
    :host {
      display: inline-block;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1;
      color: var(--foreground);
    }
    :host(.disabled) { cursor: not-allowed; opacity: 0.7; }
    :host([for]) { cursor: pointer; }
  `]
})
export class LabelComponent {
  @Input() for = '';
  @HostBinding('attr.for') get forAttr() { return this.for || null; }
}
