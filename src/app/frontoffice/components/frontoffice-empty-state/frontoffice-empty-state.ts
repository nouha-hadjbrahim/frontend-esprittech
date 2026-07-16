import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';

export type FrontofficeEmptyIcon =
  | 'sujet'
  | 'candidature'
  | 'catalogue'
  | 'equipe'
  | 'industrialisation'
  | 'search';

@Component({
  selector: 'app-frontoffice-empty-state',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './frontoffice-empty-state.html',
  styleUrl: './frontoffice-empty-state.css',
})
export class FrontofficeEmptyState {
  @Input({ required: true }) title = '';
  @Input({ required: true }) message = '';
  @Input() icon: FrontofficeEmptyIcon = 'search';
  @Input() actionLabel?: string;
  @Input() actionLink?: string | any[];
  @Output() action = new EventEmitter<void>();

  onAction(): void {
    this.action.emit();
  }
}
