import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dialogue-confirmation',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule],
  template: `
    <div class="confirm-box">
      <div class="confirm-icon"><mat-icon>warning</mat-icon></div>
      <p class="confirm-msg">{{ message }}</p>
      <div class="confirm-actions">
        <button class="cancel-btn" (click)="ref.close(false)">Annuler</button>
        <button class="submit-btn" (click)="ref.close(true)">Confirmer</button>
      </div>
    </div>
  `,
  styles: [`
    .confirm-box {
      padding: 24px;
      text-align: center;
      min-width: 280px;
      max-width: 100%;
      overflow: hidden;
    }
    .confirm-icon {
      font-size: 40px;
      color: #f59e0b;
      margin-bottom: 12px;
    }
    .confirm-icon mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
    }
    .confirm-msg {
      margin: 0 0 20px;
      font-size: 0.95rem;
      color: #374151;
      line-height: 1.5;
      overflow-wrap: break-word;
      word-break: break-word;
    }
    .confirm-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
    }
    .cancel-btn {
      padding: 8px 20px;
      border-radius: 10px;
      border: 1px solid #e5e7eb;
      background: #fff;
      font-weight: 600;
      color: #4b5563;
      cursor: pointer;
    }
    .cancel-btn:hover { background: #f9fafb; }
    .submit-btn {
      padding: 8px 20px;
      border-radius: 10px;
      border: none;
      background: #E23E3E;
      color: #fff;
      font-weight: 600;
      cursor: pointer;
    }
    .submit-btn:hover { background: #c93535; }
  `],
})
export class DialogueConfirmationComponent {
  constructor(
    public ref: MatDialogRef<DialogueConfirmationComponent>,
    @Inject(MAT_DIALOG_DATA) public message: string,
  ) {}
}
