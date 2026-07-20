import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AccueilStats } from '../core/models/accueil-stats.model';
import { AccueilService } from '../core/services/accueil.service';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.css'
})
export class SignInComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly accueilService = inject(AccueilService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly stats = signal<AccueilStats | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.accueilService.getStats().subscribe({
      next: (s) => this.stats.set(s),
      error: () => this.stats.set(null),
    });
  }

  get f() {
    return this.form.controls;
  }

  formatStat(value: number | null | undefined, withPlus = false): string {
    if (value == null) return '—';
    const formatted = new Intl.NumberFormat('fr-FR').format(value);
    return withPlus ? `${formatted}+` : formatted;
  }

  onSubmit(): void {
    this.serverError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.authService.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.redirectAfterLogin();
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.serverError.set(this.extractError(err));
      },
    });
  }

  /** Redirige vers l'URL demandée (deep-link) ou selon le rôle. */
  private redirectAfterLogin(): void {
    const redirect = this.route.snapshot.queryParamMap.get('redirect');
    if (redirect) {
      void this.router.navigateByUrl(redirect);
      return;
    }
    void this.router.navigateByUrl(this.authService.landingRoute());
  }

  private extractError(err: HttpErrorResponse): string {
    if (err.status === 401) {
      return 'Email ou mot de passe incorrect.';
    }
    if (err.status === 0) {
      return 'Serveur injoignable. Vérifiez que le backend est démarré.';
    }
    return err.error?.detail ?? 'Une erreur est survenue. Veuillez réessayer.';
  }
}
