import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CandidatureService } from '../../../../core/services/candidature.service';

@Component({
  selector: 'app-postuler-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './postuler-modal.html',
  styleUrls: ['./postuler-modal.scss']
})
export class PostulerModal {
  @Input() sujet: any = null;
  @Output() closed = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<void>();

  message = '';
  loading = false;
  error = '';
  success = false;

  constructor(private candidatureService: CandidatureService) {}

  postuler() {
    if (!this.sujet) return;
    this.loading = true;
    this.error = '';

    this.candidatureService.deposerCandidature(this.sujet.id, this.message).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
      },
      error: (err: any) => {
        this.loading = false;
        this.error = err?.error?.message || 'Une erreur est survenue. Veuillez réessayer.';
      }
    });
  }

  closeAfterSuccess(): void {
    this.submitted.emit();
    this.close();
  }

  close() {
    this.closed.emit();
  }
}
