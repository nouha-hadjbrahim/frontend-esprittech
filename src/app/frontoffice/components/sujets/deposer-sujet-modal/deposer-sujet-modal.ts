import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, catchError, debounceTime, distinctUntilChanged, finalize, forkJoin, map, of, switchMap, takeUntil } from 'rxjs';
import { NgTemplateOutlet } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AdminService } from '../../../../core/services/admin.service';
import { SujetProjetService } from '../../../../core/services/sujet-projet.service';
import { SujetReferenceService } from '../../../../core/services/sujet-reference.service';
import { CategorieSujet, SujetProjet, SujetProjetRequest } from '../../../../core/models/sujet-projet.model';
import { User } from '../../../../core/models/user.model';
import { ReferenceType } from '../../../../core/models/sujet-reference.model';
import {
  CATEGORIE_OPTIONS,
  DEFAULT_DOMAINE_OPTIONS,
  DEFAULT_PREREQUIS_OPTIONS,
  FALLBACK_TECHNOLOGIES,
} from '../../../constants/sujet-projet.constants';
import { EditableOptionsField } from '../editable-options-field/editable-options';

@Component({
  selector: 'app-deposer-sujet-modal',
  imports: [ReactiveFormsModule, FormsModule, EditableOptionsField, RouterLink, NgTemplateOutlet],
  templateUrl: './deposer-sujet-modal.html',
  styleUrl: './deposer-sujet-modal.css',
})
export class DeposerSujetModal implements OnInit, OnChanges, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly sujetProjetService = inject(SujetProjetService);
  private readonly adminService = inject(AdminService);
  private readonly referenceService = inject(SujetReferenceService);
  private readonly authService = inject(AuthService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchEncadrant$ = new Subject<string>();

  @ViewChild('encadrantInput') encadrantInputRef?: ElementRef<HTMLInputElement>;
  @ViewChild('encadrantPickerWrap') encadrantPickerWrap?: ElementRef<HTMLElement>;

  /** `modal` = overlay dialog ; `page` = formulaire pleine page (backoffice). */
  @Input() layout: 'modal' | 'page' = 'modal';
  /** Utilise l'API admin pour la modification (backoffice). */
  @Input() adminMode = false;
  /** Création d'un sujet par l'admin avec affectation à un encadrant. */
  @Input() adminCreateMode = false;
  @Input() isOpen = false;
  @Input() editSujet?: SujetProjet;
  /** Nom affiché en mode admin (encadrant du sujet). */
  @Input() encadrantDisplayName = '';
  @Input() backLink = '/backoffice/subjects';
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  readonly categories = CATEGORIE_OPTIONS;

  technologies: string[] = [];
  domaineOptions: string[] = [];
  prerequisOptions: string[] = [];
  domaineSelected: string[] = [];
  prerequisSelected: string[] = [];
  selectedTechnologies = new Set<string>();
  newTechnology = '';
  addingReference = false;

  isSubmitting = false;
  errorMessage = '';
  domaineTouched = false;
  prerequisTouched = false;
  technologiesTouched = false;
  encadrantTouched = false;

  selectedEncadrant: User | null = null;
  encadrantQuery = '';
  encadrantCandidates: User[] = [];
  showEncadrantDropdown = false;
  encadrantLoading = false;
  encadrantHighlightIndex = 0;

  private readonly referencePageSize = 1000;

  form = this.fb.nonNullable.group({
    titre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
    categorie: ['PFE' as CategorieSujet, Validators.required],
    description: ['', [Validators.required, Validators.minLength(10)]],
    objectifs: ['', [Validators.required, Validators.minLength(10)]],
    capaciteAccueil: [1, [Validators.required, Validators.min(1), Validators.max(50)]],
  });

  get isEditMode(): boolean {
    return !!this.editSujet;
  }

  get modalTitle(): string {
    if (this.isEditMode) return 'Modifier le sujet';
    if (this.adminCreateMode) return 'Ajouter un sujet';
    return 'Déposer un sujet';
  }

  get submitLabel(): string {
    if (this.isSubmitting) {
      if (this.isEditMode) return 'Enregistrement...';
      if (this.adminCreateMode) return 'Publication...';
      return 'Envoi...';
    }
    if (this.isEditMode) return 'Enregistrer les modifications';
    if (this.adminCreateMode) return 'Publier le sujet';
    return 'Soumettre le sujet';
  }

  get encadrantName(): string {
    if (this.selectedEncadrant) {
      return `${this.selectedEncadrant.prenom} ${this.selectedEncadrant.nom}`;
    }
    if (this.encadrantDisplayName) {
      return this.encadrantDisplayName;
    }
    const user = this.authService.currentUser();
    return user ? `${user.prenom} ${user.nom}` : '';
  }

  get showEncadrantPicker(): boolean {
    return this.adminCreateMode && !this.isEditMode;
  }

  get isPageLayout(): boolean {
    return this.layout === 'page';
  }

  get isVisible(): boolean {
    return this.isPageLayout || this.isOpen;
  }

  ngOnInit(): void {
    this.loadSuggestions();
    this.setupEncadrantSearch();
    if (this.isPageLayout && this.editSujet) {
      this.populateForm(this.editSujet);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentMouseDown(event: MouseEvent): void {
    if (!this.showEncadrantDropdown || !this.encadrantPickerWrap) {
      return;
    }
    if (!this.encadrantPickerWrap.nativeElement.contains(event.target as Node)) {
      this.showEncadrantDropdown = false;
    }
  }

  private setupEncadrantSearch(): void {
    this.searchEncadrant$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((query) => {
          if (!this.showEncadrantPicker) {
            return of(null);
          }
          this.encadrantLoading = true;
          return this.adminService.chercherEncadrants(query);
        }),
        takeUntil(this.destroy$),
      )
      .subscribe({
        next: (page) => {
          this.encadrantLoading = false;
          if (!page) {
            this.encadrantCandidates = [];
            return;
          }
          this.encadrantCandidates = page.content.filter((u) => u.id !== this.selectedEncadrant?.id);
          this.encadrantHighlightIndex = 0;
        },
        error: () => {
          this.encadrantLoading = false;
          this.encadrantCandidates = [];
        },
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    const opened = changes['isOpen']?.currentValue === true;
    const closed = changes['isOpen']?.currentValue === false;
    const editChanged = !!changes['editSujet'];

    if (closed) {
      this.isSubmitting = false;
      return;
    }

    if (opened || (this.isVisible && editChanged)) {
      this.isSubmitting = false;
      if (this.editSujet) {
        this.populateForm(this.editSujet);
      } else if (opened || this.isPageLayout) {
        this.resetForm();
        if (this.showEncadrantPicker) {
          this.searchEncadrant$.next('');
        }
      }
      if (opened) {
        this.loadSuggestions();
      }
    }
  }

  private usesAdminReferences(): boolean {
    return this.adminMode || this.adminCreateMode;
  }

  private loadSuggestions(): void {
    if (this.usesAdminReferences()) {
      this.loadAdminReferenceOptions();
      return;
    }

    this.sujetProjetService.getTechnologies().subscribe({
      next: (techs) => (this.technologies = techs),
      error: () => (this.technologies = [...FALLBACK_TECHNOLOGIES]),
    });

    this.sujetProjetService.getDomainesSuggestions().subscribe({
      next: (domaines) => (this.domaineOptions = domaines),
      error: () => (this.domaineOptions = [...DEFAULT_DOMAINE_OPTIONS]),
    });

    this.sujetProjetService.getPrerequisSuggestions().subscribe({
      next: (prerequis) => (this.prerequisOptions = prerequis),
      error: () => (this.prerequisOptions = [...DEFAULT_PREREQUIS_OPTIONS]),
    });
  }

  private loadAdminReferenceOptions(onDone?: () => void): void {
    forkJoin({
      technologies: this.fetchReferenceNames('technologies'),
      domaines: this.fetchReferenceNames('domaines'),
      prerequis: this.fetchReferenceNames('prerequis'),
    }).subscribe(({ technologies, domaines, prerequis }) => {
      this.technologies = technologies;
      this.domaineOptions = domaines;
      this.prerequisOptions = prerequis;
      onDone?.();
    });
  }

  private fetchReferenceNames(type: ReferenceType) {
    return this.referenceService.getPage(type, 0, this.referencePageSize).pipe(
      map((page) => page.content.map((item) => item.nom)),
      catchError(() =>
        of(
          type === 'technologies'
            ? [...FALLBACK_TECHNOLOGIES]
            : type === 'domaines'
              ? [...DEFAULT_DOMAINE_OPTIONS]
              : [...DEFAULT_PREREQUIS_OPTIONS],
        ),
      ),
    );
  }

  selectCategorie(categorie: CategorieSujet): void {
    this.form.controls.categorie.setValue(categorie);
  }

  isCategorieActive(categorie: CategorieSujet): boolean {
    return this.form.controls.categorie.value === categorie;
  }

  onDomaineOptionsChange(options: string[]): void {
    this.domaineOptions = options;
  }

  onDomaineAdded(nom: string): void {
    this.persistReference('domaine', nom, () => {
      this.reloadDomaines(() => {
        if (!this.domaineSelected.includes(nom)) {
          this.domaineSelected = [...this.domaineSelected, nom];
        }
        this.domaineTouched = true;
      });
    });
  }

  onPrerequisOptionsChange(options: string[]): void {
    this.prerequisOptions = options;
  }

  onPrerequisAdded(nom: string): void {
    this.persistReference('prerequis', nom, () => {
      this.reloadPrerequis(() => {
        if (!this.prerequisSelected.includes(nom)) {
          this.prerequisSelected = [...this.prerequisSelected, nom];
        }
        this.prerequisTouched = true;
      });
    });
  }

  onDomaineSelectedChange(selected: string[]): void {
    this.domaineSelected = selected;
    this.domaineTouched = true;
  }

  onPrerequisSelectedChange(selected: string[]): void {
    this.prerequisSelected = selected;
    this.prerequisTouched = true;
  }

  addTechnology(): void {
    const value = this.newTechnology.trim();
    if (!value || this.technologies.includes(value)) {
      return;
    }

    this.persistReference('technologie', value, () => {
      this.reloadTechnologies(() => {
        this.selectedTechnologies.add(value);
        this.technologiesTouched = true;
        this.newTechnology = '';
      });
    });
  }

  onTechnologyKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addTechnology();
    }
  }

  toggleTechnology(tech: string): void {
    this.technologiesTouched = true;
    if (this.selectedTechnologies.has(tech)) {
      this.selectedTechnologies.delete(tech);
    } else {
      this.selectedTechnologies.add(tech);
    }
  }

  isTechnologySelected(tech: string): boolean {
    return this.selectedTechnologies.has(tech);
  }

  incrementCapacite(): void {
    const current = this.form.controls.capaciteAccueil.value;
    if (current < 50) {
      this.form.controls.capaciteAccueil.setValue(current + 1);
    }
  }

  decrementCapacite(): void {
    const current = this.form.controls.capaciteAccueil.value;
    if (current > 1) {
      this.form.controls.capaciteAccueil.setValue(current - 1);
    }
  }

  close(): void {
    if (!this.isVisible) {
      return;
    }
    this.isSubmitting = false;
    this.errorMessage = '';
    this.closed.emit();
  }

  onFormEnter(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.tagName !== 'TEXTAREA') {
      event.preventDefault();
    }
  }

  submit(): void {
    this.errorMessage = '';
    this.domaineTouched = true;
    this.prerequisTouched = true;
    this.technologiesTouched = true;
    if (this.showEncadrantPicker) {
      this.encadrantTouched = true;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }

    if (this.showEncadrantPicker && !this.selectedEncadrant) {
      this.errorMessage = 'Veuillez sélectionner un encadrant affilié à une équipe.';
      return;
    }

    if (this.domaineSelected.length === 0) {
      this.errorMessage = 'Veuillez sélectionner au moins un domaine.';
      return;
    }

    if (this.prerequisSelected.length === 0) {
      this.errorMessage = 'Veuillez sélectionner au moins un prérequis.';
      return;
    }

    if (this.selectedTechnologies.size === 0) {
      this.errorMessage = 'Veuillez sélectionner au moins une technologie.';
      return;
    }

    const request: SujetProjetRequest = {
      ...this.form.getRawValue(),
      domaines: [...this.domaineSelected],
      prerequis: [...this.prerequisSelected],
      technologies: Array.from(this.selectedTechnologies),
    };

    this.isSubmitting = true;

    let operation;
    if (this.isEditMode && this.editSujet) {
      operation = this.adminMode
        ? this.adminService.updateSujet(this.editSujet.id, request)
        : this.sujetProjetService.modifierSujet(this.editSujet.id, request);
    } else if (this.adminCreateMode && this.selectedEncadrant) {
      operation = this.adminService.createSujet({
        encadrantId: this.selectedEncadrant.id,
        sujet: request,
      });
    } else {
      operation = this.sujetProjetService.creerSujet(request);
    }

    operation.pipe(finalize(() => (this.isSubmitting = false))).subscribe({
      next: () => {
        this.resetForm();
        this.saved.emit();
      },
      error: (err) => {
        this.errorMessage = this.resolveSubmitError(err);
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
        return 'Session expirée. Reconnectez-vous puis réessayez.';
      }
      if (err.status === 400) {
        return 'Données invalides. Vérifiez le formulaire.';
      }
    }

    return this.isEditMode
      ? 'Erreur lors de la modification. Vérifiez que le backend est démarré.'
      : this.adminCreateMode
        ? 'Erreur lors de la publication. Vérifiez le formulaire et le backend.'
        : 'Erreur lors de l\'envoi. Vérifiez que le backend est démarré.';
  }

  focusEncadrantInput(): void {
    this.encadrantInputRef?.nativeElement?.focus();
  }

  onEncadrantQueryChange(query: string): void {
    this.searchEncadrant$.next(query);
    this.showEncadrantDropdown = true;
    this.encadrantHighlightIndex = 0;
  }

  onEncadrantKeydown(event: KeyboardEvent): void {
    if (!this.showEncadrantDropdown || this.encadrantCandidates.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.encadrantHighlightIndex = Math.min(
        this.encadrantHighlightIndex + 1,
        this.encadrantCandidates.length - 1,
      );
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.encadrantHighlightIndex = Math.max(this.encadrantHighlightIndex - 1, 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const candidate = this.encadrantCandidates[this.encadrantHighlightIndex];
      if (candidate) {
        this.selectEncadrant(candidate);
      }
    } else if (event.key === 'Escape') {
      this.showEncadrantDropdown = false;
    }
  }

  selectEncadrant(user: User): void {
    this.selectedEncadrant = user;
    this.encadrantQuery = '';
    this.encadrantCandidates = [];
    this.showEncadrantDropdown = false;
    this.encadrantTouched = true;
  }

  clearEncadrant(event: Event): void {
    event.stopPropagation();
    this.selectedEncadrant = null;
    this.encadrantQuery = '';
    this.searchEncadrant$.next('');
    this.focusEncadrantInput();
  }

  encadrantInitials(user: User): string {
    return `${user.prenom.charAt(0)}${user.nom.charAt(0)}`.toUpperCase();
  }

  encadrantAvatarColor(user: User): string {
    const palette = ['#E23E3E', '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899'];
    return palette[user.id % palette.length];
  }

  isEncadrantInvalid(): boolean {
    return this.encadrantTouched && !this.selectedEncadrant;
  }

  private populateForm(sujet: SujetProjet): void {
    this.form.reset({
      titre: sujet.titre,
      categorie: sujet.categorie,
      description: sujet.description,
      objectifs: sujet.objectifs,
      capaciteAccueil: sujet.capaciteAccueil,
    });

    sujet.domaines.forEach((d) => this.ensureOption(this.domaineOptions, d));
    this.domaineSelected = [...sujet.domaines];

    this.prerequisOptions = [...new Set([...this.prerequisOptions, ...sujet.prerequis])];
    this.prerequisSelected = [...sujet.prerequis];

    sujet.technologies.forEach((tech) => this.ensureOption(this.technologies, tech));
    this.selectedTechnologies = new Set(sujet.technologies);

    this.domaineTouched = false;
    this.prerequisTouched = false;
    this.technologiesTouched = false;
    this.errorMessage = '';
  }

  private resetForm(): void {
    this.isSubmitting = false;
    this.form.reset({
      titre: '',
      categorie: 'PFE',
      description: '',
      objectifs: '',
      capaciteAccueil: 1,
    });
    this.domaineSelected = [];
    this.prerequisSelected = [];
    this.selectedTechnologies.clear();
    this.domaineTouched = false;
    this.prerequisTouched = false;
    this.technologiesTouched = false;
    this.encadrantTouched = false;
    this.selectedEncadrant = null;
    this.encadrantQuery = '';
    this.encadrantCandidates = [];
    this.showEncadrantDropdown = false;
    this.errorMessage = '';
  }

  private ensureOption(list: string[], value: string): void {
    if (!list.includes(value)) {
      list.push(value);
    }
  }

  private persistReference(type: 'domaine' | 'prerequis' | 'technologie', nom: string, onSuccess: () => void): void {
    if (this.addingReference) {
      return;
    }
    this.addingReference = true;

    const operation =
      type === 'domaine'
        ? this.referenceService.suggestDomaine(nom)
        : type === 'prerequis'
          ? this.referenceService.suggestPrerequis(nom)
          : this.referenceService.suggestTechnologie(nom);

    operation.subscribe({
      next: () => {
        this.addingReference = false;
        onSuccess();
      },
      error: () => {
        this.addingReference = false;
        this.errorMessage = 'Impossible d\'ajouter cette valeur. Réessayez.';
      },
    });
  }

  private reloadDomaines(onDone?: () => void): void {
    if (this.usesAdminReferences()) {
      this.fetchReferenceNames('domaines').subscribe((domaines) => {
        this.domaineOptions = domaines;
        onDone?.();
      });
      return;
    }

    this.sujetProjetService.getDomainesSuggestions().subscribe({
      next: (domaines) => {
        this.domaineOptions = domaines;
        onDone?.();
      },
    });
  }

  private reloadPrerequis(onDone?: () => void): void {
    if (this.usesAdminReferences()) {
      this.fetchReferenceNames('prerequis').subscribe((prerequis) => {
        this.prerequisOptions = prerequis;
        onDone?.();
      });
      return;
    }

    this.sujetProjetService.getPrerequisSuggestions().subscribe({
      next: (prerequis) => {
        this.prerequisOptions = prerequis;
        onDone?.();
      },
    });
  }

  private reloadTechnologies(onDone?: () => void): void {
    if (this.usesAdminReferences()) {
      this.fetchReferenceNames('technologies').subscribe((techs) => {
        this.technologies = techs;
        onDone?.();
      });
      return;
    }

    this.sujetProjetService.getTechnologies().subscribe({
      next: (techs) => {
        this.technologies = techs;
        onDone?.();
      },
    });
  }

  isInvalid(field: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[field];
    return control.invalid && control.touched;
  }

  isDomaineInvalid(): boolean {
    return this.domaineTouched && this.domaineSelected.length === 0;
  }

  isPrerequisInvalid(): boolean {
    return this.prerequisTouched && this.prerequisSelected.length === 0;
  }

  isTechnologiesInvalid(): boolean {
    return this.technologiesTouched && this.selectedTechnologies.size === 0;
  }
}
