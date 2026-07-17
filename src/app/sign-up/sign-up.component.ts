import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AccueilStats } from '../core/models/accueil-stats.model';
import { AccueilService } from '../core/services/accueil.service';
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
  styleUrls: ['./sign-up.component.css', '../sign-in/sign-in.component.css']
})
export class SignUpComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly accueilService = inject(AccueilService);
  private readonly router = inject(Router);

  // Doit rester aligné avec les contraintes du backend (RegisterRequest)
  private static readonly PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
  // Partie locale en classe négative ([^@\s]+) plutôt que `.+` : supprime l'ambiguïté de
  // backtracking signalée par Sonar (S5852, ReDoS) et rejette correctement les e-mails malformés.
  private static readonly ESPRIT_EMAIL_PATTERN = /^[^@\s]+@esprit\.tn$/;
  private static readonly CODE_PATTERN = /^\d{6}$/;

  /** 'form' : saisie des infos ; 'verify' : saisie du code reçu par email. */
  readonly step = signal<'form' | 'verify'>('form');
  readonly loading = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly infoMessage = signal<string | null>(null);
  /** Email en cours de vérification (affiché à l'étape 2). */
  readonly pendingEmail = signal<string>('');
  readonly stats = signal<AccueilStats | null>(null);

  ngOnInit(): void {
    this.accueilService.getStats().subscribe({
      next: (s) => this.stats.set(s),
      error: () => this.stats.set(null),
    });
  }

  formatStat(value: number | null | undefined, withPlus = false): string {
    if (value == null) return '—';
    const formatted = new Intl.NumberFormat('fr-FR').format(value);
    return withPlus ? `${formatted}+` : formatted;
  }

  readonly form = this.fb.nonNullable.group(
    {
      prenom: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      nom: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      email: [
        '',
        [Validators.required, Validators.email, Validators.pattern(SignUpComponent.ESPRIT_EMAIL_PATTERN)],
      ],
      password: [
        '',
        [Validators.required, Validators.minLength(8), Validators.pattern(SignUpComponent.PASSWORD_PATTERN)],
      ],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatch },
  );

  readonly codeForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(SignUpComponent.CODE_PATTERN)]],
  });

  get f() {
    return this.form.controls;
  }

  get c() {
    return this.codeForm.controls;
  }

  /** Étape 1 : envoie le code de vérification à l'email saisi. */
  onSubmit(): void {
    this.serverError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nom, prenom, email, password } = this.form.getRawValue();
    this.loading.set(true);
    this.authService.startRegister({ nom, prenom, email, password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.pendingEmail.set(email);
        this.infoMessage.set(`Un code de vérification a été envoyé à ${email}.`);
        this.codeForm.reset();
        this.step.set('verify');
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.applyServerErrors(err);
      },
    });
  }

  /** Étape 2 : valide le code, crée le compte et connecte l'utilisateur. */
  onVerify(): void {
    this.serverError.set(null);
    if (this.codeForm.invalid) {
      this.codeForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.authService.verifyEmail(this.pendingEmail(), this.codeForm.getRawValue().code).subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigateByUrl(this.authService.landingRoute());
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.applyServerErrors(err);
      },
    });
  }

  /** Renvoie un nouveau code de vérification. */
  onResend(): void {
    this.serverError.set(null);
    this.infoMessage.set(null);
    this.loading.set(true);
    this.authService.resendCode(this.pendingEmail()).subscribe({
      next: () => {
        this.loading.set(false);
        this.infoMessage.set(`Un nouveau code a été envoyé à ${this.pendingEmail()}.`);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.applyServerErrors(err);
      },
    });
  }

  /** Revient au formulaire pour corriger l'email. */
  backToForm(): void {
    this.serverError.set(null);
    this.infoMessage.set(null);
    this.step.set('form');
  }

  /** Mappe les erreurs backend (organisation Azure, code OTP, doublon, validation) vers l'UI. */
  private applyServerErrors(err: HttpErrorResponse): void {
    if (err.status === 0) {
      this.serverError.set('Serveur injoignable. Vérifiez que le backend est démarré.');
      return;
    }
    if (err.status === 404) {
      // L'email n'appartient pas à l'organisation ESPRIT (aucun compte Azure correspondant).
      this.serverError.set(
        err.error?.detail ??
          "Cet email n'appartient pas à l'organisation ESPRIT. Impossible de créer un compte.",
      );
      return;
    }
    if (err.status === 409) {
      this.serverError.set(err.error?.detail ?? 'Cet email est déjà utilisé.');
      return;
    }
    if (err.status === 503) {
      // Vérification Azure / envoi d'email temporairement indisponible.
      this.serverError.set(
        err.error?.detail ??
          'Le service est momentanément indisponible. Veuillez réessayer plus tard.',
      );
      return;
    }
    // 400 : code OTP invalide/expiré (étape 2) ou erreurs de validation champ par champ (étape 1)
    const fieldErrors = err.error?.errors as Record<string, string> | undefined;
    if (fieldErrors && this.step() === 'form') {
      Object.entries(fieldErrors).forEach(([field, message]) => {
        this.form.get(field)?.setErrors({ server: message });
      });
      this.serverError.set('Veuillez corriger les champs en rouge.');
      return;
    }
    this.serverError.set(err.error?.detail ?? 'Une erreur est survenue. Veuillez réessayer.');
  }
}
