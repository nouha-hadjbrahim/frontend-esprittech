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
import { Observable } from 'rxjs';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { CreateProjetRequest, ReferenceItem, TypeProjet } from '../../../../core/models/projet-catalogue.model';
import { AuthService } from '../../../../core/services/auth.service';
import { ProjetCatalogueService } from '../../../../core/services/projet-catalogue.service';
import { SujetReferenceService } from '../../../../core/services/sujet-reference.service';
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
  private readonly referenceService = inject(SujetReferenceService);
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
  addingReference = false;
  errorMessage = '';
  fieldErrors: Record<string, string> = {};

  /** Cover : aperçu (data URI), base64 brut et type MIME de l'image sélectionnée. */
  coverPreview: string | null = null;
  coverBase64: string | null = null;
  coverContentType: string | null = null;
  coverError = '';
  private static readonly COVER_ALLOWED_TYPES = ['image/png', 'image/jpeg'];
  /** ~900 Ko : reste sous la limite max_allowed_packet MySQL (l'image est stockée en base). */
  private static readonly COVER_MAX_BYTES = 900 * 1024;
  private static readonly COVER_MAX_LABEL = '900 Ko';

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

  /** Crée (ou retrouve) un domaine saisi, l'ajoute à la liste et le sélectionne. */
  addDomaine(input: HTMLInputElement): void {
    this.domainesTouched = true;
    this.addReference(input, (nom) => this.referenceService.suggestDomaine(nom), this.domaines, this.selectedDomaines);
  }

  /** Crée (ou retrouve) une technologie saisie, l'ajoute à la liste et la sélectionne. */
  addTechnologie(input: HTMLInputElement): void {
    this.technologiesTouched = true;
    this.addReference(input, (nom) => this.referenceService.suggestTechnologie(nom), this.technologies, this.selectedTechnologies);
  }

  /** Crée (ou retrouve) un prérequis saisi, l'ajoute à la liste et le sélectionne. */
  addPrerequis(input: HTMLInputElement): void {
    this.addReference(input, (nom) => this.referenceService.suggestPrerequis(nom), this.prerequis, this.selectedPrerequis);
  }

  /** Logique commune : persiste l'élément via le référentiel partagé puis l'ajoute/sélectionne. */
  private addReference(
    input: HTMLInputElement,
    create: (nom: string) => Observable<ReferenceItem>,
    list: ReferenceItem[],
    selected: Set<number>,
  ): void {
    const nom = input.value.trim();
    if (!nom || this.addingReference) {
      return;
    }
    this.addingReference = true;
    create(nom).subscribe({
      next: (item) => {
        this.addingReference = false;
        input.value = '';
        if (!list.some((existing) => existing.id === item.id)) {
          list.push(item);
          list.sort((a, b) => a.nom.localeCompare(b.nom));
        }
        selected.add(item.id);
      },
      error: () => {
        this.addingReference = false;
        this.errorMessage = "Impossible d'ajouter l'élément. Veuillez réessayer.";
      },
    });
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

  /** Lit l'image de couverture sélectionnée, la valide et la convertit en base64. */
  onCoverSelected(event: Event): void {
    this.coverError = '';
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (!AjouterProjetModal.COVER_ALLOWED_TYPES.includes(file.type)) {
      this.coverError = 'Format non autorisé. Choisissez une image PNG ou JPG.';
      input.value = '';
      return;
    }
    if (file.size > AjouterProjetModal.COVER_MAX_BYTES) {
      this.coverError = `L'image est trop volumineuse (max ${AjouterProjetModal.COVER_MAX_LABEL}). Choisissez une image plus légère.`;
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = reader.result as string;
      this.coverPreview = dataUri;
      this.coverContentType = file.type;
      const commaIndex = dataUri.indexOf(',');
      this.coverBase64 = commaIndex >= 0 ? dataUri.substring(commaIndex + 1) : dataUri;
    };
    reader.onerror = () => {
      this.coverError = "Impossible de lire l'image sélectionnée.";
    };
    reader.readAsDataURL(file);
  }

  removeCover(): void {
    this.coverPreview = null;
    this.coverBase64 = null;
    this.coverContentType = null;
    this.coverError = '';
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
      coverImageBase64: this.coverBase64,
      coverImageContentType: this.coverContentType,
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
    this.removeCover();
  }
}
