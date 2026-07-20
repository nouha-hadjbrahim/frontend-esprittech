import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Role } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';

const UI_MESSAGES = {
  PASSWORD_MISMATCH: 'Les deux mots de passe ne correspondent pas.',
  PASSWORD_CHANGED: 'Mot de passe modifié avec succès.',
  PROFILE_UPDATED: 'Profil mis à jour avec succès.',
  UNAUTHORIZED: 'Mot de passe actuel incorrect ou session expirée.',
  BAD_REQUEST: 'Données invalides. Vérifiez le formulaire.',
  GENERIC_ERROR: 'Une erreur est survenue. Veuillez réessayer.',
} as const;

@Component({
  selector: 'app-mon-profil',
  imports: [ReactiveFormsModule],
  templateUrl: './mon-profil.html',
  styleUrl: './mon-profil.css',
})
export class MonProfil implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly user = this.authService.currentUser;

  private static readonly ROLE_LABELS: Record<Role, string> = {
    ROLE_ADMIN: 'Administrateur',
    ROLE_ENSEIGNANT: 'Enseignant',
    ROLE_CHEF_EQUIPE: "Chef d'équipe",
    ROLE_ETUDIANT: 'Étudiant',
    ROLE_CI: 'Comité industriel',
  };

  readonly roleLabel = computed(() => {
    const role = this.user()?.role;
    return role ? MonProfil.ROLE_LABELS[role] : '';
  });

  readonly initials = computed(() => {
    const u = this.user();
    return u ? `${u.prenom.charAt(0)}${u.nom.charAt(0)}`.toUpperCase() : 'U';
  });

  readonly profileForm = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    prenom: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
  });

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  isSavingProfile = false;
  profileSuccess = '';
  profileError = '';

  isSavingPassword = false;
  passwordSuccess = '';
  passwordError = '';

  ngOnInit(): void {
    const u = this.user();
    if (u) {
      this.profileForm.setValue({ nom: u.nom, prenom: u.prenom });
    }
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSavingProfile = true;
    this.profileSuccess = '';
    this.profileError = '';

    this.authService.updateProfile(this.profileForm.getRawValue()).subscribe({
      next: () => {
        this.isSavingProfile = false;
        this.profileSuccess = UI_MESSAGES.PROFILE_UPDATED;
      },
      error: (err) => {
        this.isSavingProfile = false;
        this.profileError = this.resolveSubmitError(err);
      },
    });
  }

  savePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();
    if (newPassword !== confirmPassword) {
      this.passwordError = UI_MESSAGES.PASSWORD_MISMATCH;
      return;
    }

    this.isSavingPassword = true;
    this.passwordSuccess = '';
    this.passwordError = '';

    this.authService.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.isSavingPassword = false;
        this.passwordSuccess = UI_MESSAGES.PASSWORD_CHANGED;
        this.passwordForm.reset();
      },
      error: (err) => {
        this.isSavingPassword = false;
        this.passwordError = this.resolveSubmitError(err);
      },
    });
  }

  private resolveSubmitError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const body = err.error as { message?: string; detail?: string } | string | null;
      if (typeof body === 'string' && body.trim()) {
        return body;
      }
      if (body && typeof body === 'object') {
        if (body.message?.trim()) {
          return body.message;
        }
        if (body.detail?.trim()) {
          return body.detail;
        }
      }
      if (err.status === 401) {
        return UI_MESSAGES.UNAUTHORIZED;
      }
      if (err.status === 400) {
        return UI_MESSAGES.BAD_REQUEST;
      }
    }
    return UI_MESSAGES.GENERIC_ERROR;
  }
}
