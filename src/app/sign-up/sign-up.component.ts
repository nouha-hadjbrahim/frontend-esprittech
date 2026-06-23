import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

/** Vérifie que password et confirmPassword sont identiques (validateur de groupe). */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.css'
})
export class SignUpComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Doit rester aligné avec les contraintes du backend (RegisterRequest)
  private static readonly PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
  // Partie locale en classe négative ([^@\s]+) plutôt que `.+` : supprime l'ambiguïté de
  // backtracking signalée par Sonar (S5852, ReDoS) et rejette correctement les e-mails malformés.
  private static readonly ESPRIT_EMAIL_PATTERN = /^[^@\s]+@esprit\.tn$/;

  readonly loading = signal(false);
  readonly serverError = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      prenom: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      nom: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: [
        '',
        [Validators.required, Validators.email, Validators.pattern(SignUpComponent.ESPRIT_EMAIL_PATTERN)],
      ],
      identifiant: ['', [Validators.required]],
      password: [
        '',
        [Validators.required, Validators.minLength(8), Validators.pattern(SignUpComponent.PASSWORD_PATTERN)],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  get f() {
    return this.form.controls;
  }

  onSubmit(): void {
    this.serverError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nom, prenom, email, identifiant, password } = this.form.getRawValue();
    this.loading.set(true);
    this.authService.register({ nom, prenom, email, identifiant, password }).subscribe({
      next: () => {
        this.loading.set(false);
        // Le compte est créé et connecté : on dirige selon le rôle (étudiant/enseignant)
        void this.router.navigateByUrl(this.authService.landingRoute());
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.applyServerErrors(err);
      },
    });
  }

  /** Mappe les erreurs backend (référentiel, doublon, validation) vers l'UI. */
  private applyServerErrors(err: HttpErrorResponse): void {
    if (err.status === 0) {
      this.serverError.set('Serveur injoignable. Vérifiez que le backend est démarré.');
      return;
    }
    if (err.status === 404) {
      this.serverError.set(
        err.error?.detail ?? 'Utilisateur non trouvé dans le référentiel.',
      );
      return;
    }
    if (err.status === 409) {
      this.serverError.set(err.error?.detail ?? 'Cet email ou identifiant est déjà utilisé.');
      return;
    }
    // 400 : erreurs de validation champ par champ
    const fieldErrors = err.error?.errors as Record<string, string> | undefined;
    if (fieldErrors) {
      Object.entries(fieldErrors).forEach(([field, message]) => {
        this.form.get(field)?.setErrors({ server: message });
      });
      this.serverError.set('Veuillez corriger les champs en rouge.');
      return;
    }
    this.serverError.set(err.error?.detail ?? 'Une erreur est survenue. Veuillez réessayer.');
  }
}
