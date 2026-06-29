import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { CreateProjetRequest, ReferenceItem, TypeProjet } from '../../../../core/models/projet-catalogue.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ProjetCatalogueService } from '../../../../core/services/projet-catalogue.service';
import { TYPE_PROJET_OPTIONS } from '../../../constants/projet-catalogue.constants';

/** Validateur de groupe : la date de fin doit être strictement postérieure à la date de début. */
function dateFinAfterDateDebut(group: AbstractControl): ValidationErrors | null {
  const debut = group.get('dateDebut')?.value;
  const fin = group.get('dateFin')?.value;
  if (debut && fin && new Date(fin) <= new Date(debut)) {
    return { dateRange: true };
  }
  return null;
}

/**
 * Formulaire (modale) de dépôt d'un projet complet au catalogue.
 * Reactive form avec validations temps réel ; aucun champ score (forcé à 0 serveur).
 */
@Component({
  selector: 'app-ajouter-projet-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './ajouter-projet-modal.html',
  styleUrl: './ajouter-projet-modal.css',
})
export class AjouterProjetModal implements OnInit, OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly projetService = inject(ProjetCatalogueService);
  private readonly authService = inject(AuthService);

  @Input() isOpen = false;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  readonly typeOptions = TYPE_PROJET_OPTIONS;

  domaines: ReferenceItem[] = [];
  technologies: ReferenceItem[] = [];
  prerequis: ReferenceItem[] = [];

  readonly selectedDomaines = new Set<number>();
  readonly selectedTechnologies = new Set<number>();
  readonly selectedPrerequis = new Set<number>();

  domainesTouched = false;
  technologiesTouched = false;

  isSubmitting = false;
  errorMessage = '';
  fieldErrors: Record<string, string> = {};

  readonly form = this.fb.nonNullable.group(
    {
      typeProjet: ['PFE' as TypeProjet, Validators.required],
      titre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      objectifs: ['', [Validators.required]],
      dateDebut: ['', [Validators.required]],
      dateFin: ['', [Validators.required]],
    },
    { validators: [dateFinAfterDateDebut] },
  );

  get encadrantName(): string {
    const user = this.authService.currentUser();
    return user ? `${user.prenom} ${user.nom}` : '';
  }

  get equipeNom(): string {
    return this.authService.equipeNom() ?? '—';
  }

  ngOnInit(): void {
    this.loadReferences();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.resetForm();
    }
  }

  private loadReferences(): void {
    this.projetService.getDomaines().subscribe({ next: (d) => (this.domaines = d), error: () => (this.domaines = []) });
    this.projetService.getTechnologies().subscribe({ next: (t) => (this.technologies = t), error: () => (this.technologies = []) });
    this.projetService.getPrerequis().subscribe({ next: (p) => (this.prerequis = p), error: () => (this.prerequis = []) });
  }

  selectType(type: TypeProjet): void {
    this.form.controls.typeProjet.setValue(type);
  }

  isTypeActive(type: TypeProjet): boolean {
    return this.form.controls.typeProjet.value === type;
  }

  toggleDomaine(id: number): void {
    this.domainesTouched = true;
    this.toggle(this.selectedDomaines, id);
  }

  toggleTechnologie(id: number): void {
    this.technologiesTouched = true;
    this.toggle(this.selectedTechnologies, id);
  }

  togglePrerequis(id: number): void {
    this.toggle(this.selectedPrerequis, id);
  }

  private toggle(set: Set<number>, id: number): void {
    if (set.has(id)) {
      set.delete(id);
    } else {
      set.add(id);
    }
  }

  isInvalid(field: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[field];
    return control.invalid && control.touched;
  }

  get isDateRangeInvalid(): boolean {
    return this.form.hasError('dateRange') && !!this.form.controls.dateFin.touched;
  }

  get isDomainesInvalid(): boolean {
    return this.domainesTouched && this.selectedDomaines.size === 0;
  }

  get isTechnologiesInvalid(): boolean {
    return this.technologiesTouched && this.selectedTechnologies.size === 0;
  }

  close(): void {
    this.errorMessage = '';
    this.closed.emit();
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close();
    }
  }

  submit(): void {
    this.errorMessage = '';
    this.fieldErrors = {};
    this.domainesTouched = true;
    this.technologiesTouched = true;
    this.form.markAllAsTouched();

    if (this.form.invalid || this.selectedDomaines.size === 0 || this.selectedTechnologies.size === 0) {
      return;
    }

    const value = this.form.getRawValue();
    const request: CreateProjetRequest = {
      typeProjet: value.typeProjet,
      titre: value.titre.trim(),
      description: value.description.trim(),
      objectifs: value.objectifs.trim(),
      dateDebut: value.dateDebut,
      dateFin: value.dateFin,
      domainesIds: Array.from(this.selectedDomaines),
      technologiesIds: Array.from(this.selectedTechnologies),
      prerequisIds: Array.from(this.selectedPrerequis),
    };

    this.isSubmitting = true;
    this.projetService.creerProjet(request).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.resetForm();
        this.saved.emit();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.handleBackendError(err);
      },
    });
  }

  /** Mappe les erreurs structurées du backend (ApiErrorResponse) sur les champs et un message global. */
  private handleBackendError(err: unknown): void {
    const body = (err as { error?: { errors?: Record<string, string>; detail?: string; message?: string } }).error;
    if (body?.errors) {
      this.fieldErrors = body.errors;
    }
    this.errorMessage = body?.detail || body?.message || 'Une erreur est survenue lors de la soumission du projet.';
  }

  private resetForm(): void {
    this.form.reset({
      typeProjet: 'PFE',
      titre: '',
      description: '',
      objectifs: '',
      dateDebut: '',
      dateFin: '',
    });
    this.selectedDomaines.clear();
    this.selectedTechnologies.clear();
    this.selectedPrerequis.clear();
    this.domainesTouched = false;
    this.technologiesTouched = false;
    this.errorMessage = '';
    this.fieldErrors = {};
  }
}
