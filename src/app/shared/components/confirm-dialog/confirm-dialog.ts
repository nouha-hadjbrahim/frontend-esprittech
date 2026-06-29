import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog {
  @Input() isOpen = false;
  @Input() title = 'Confirmation';
  @Input() message = '';
  @Input() confirmLabel = 'Confirmer';
  @Input() cancelLabel = 'Annuler';
  @Input() alertOnly = false;
  @Input() showIcon = true;
  @Input() loading = false;
  @Input() errorMessage = '';

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('confirm-overlay')) {
      this.cancel();
    }
  }

  confirm(): void {
    if (!this.loading) {
      this.confirmed.emit();
    }
  }

  cancel(): void {
    if (!this.loading) {
      this.cancelled.emit();
    }
  }
}
