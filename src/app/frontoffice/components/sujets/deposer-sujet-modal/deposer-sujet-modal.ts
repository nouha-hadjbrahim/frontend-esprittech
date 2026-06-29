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
import { NgTemplateOutlet } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AdminService } from '../../../../core/services/admin.service';
import { SujetProjetService } from '../../../../core/services/sujet-projet.service';
import { SujetReferenceService } from '../../../../core/services/sujet-reference.service';
import { CategorieSujet, SujetProjet, SujetProjetRequest } from '../../../../core/models/sujet-projet.model';
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
export class DeposerSujetModal implements OnInit, OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly sujetProjetService = inject(SujetProjetService);
  private readonly adminService = inject(AdminService);
  private readonly referenceService = inject(SujetReferenceService);
  private readonly authService = inject(AuthService);

  /** `modal` = overlay dialog ; `page` = formulaire pleine page (backoffice). */
  @Input() layout: 'modal' | 'page' = 'modal';
  /** Utilise l'API admin pour la modification (backoffice). */
  @Input() adminMode = false;
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
    return this.isEditMode ? 'Modifier le sujet' : 'Déposer un sujet';
  }

  get submitLabel(): string {
    if (this.isSubmitting) {
      return this.isEditMode ? 'Enregistrement...' : 'Envoi...';
    }
    return this.isEditMode ? 'Enregistrer les modifications' : 'Soumettre le sujet';
  }

  get encadrantName(): string {
    if (this.encadrantDisplayName) {
      return this.encadrantDisplayName;
    }
    const user = this.authService.currentUser();
    return user ? `${user.prenom} ${user.nom}` : '';
  }

  get isPageLayout(): boolean {
    return this.layout === 'page';
  }

  get isVisible(): boolean {
    return this.isPageLayout || this.isOpen;
  }

  ngOnInit(): void {
    this.loadSuggestions();
    if (this.isPageLayout && this.editSujet) {
      this.populateForm(this.editSujet);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    const opened = changes['isOpen']?.currentValue === true;
    const closed = changes['isOpen']?.currentValue === false;
    const editChanged = !!changes['editSujet'];

    if (closed) {
      return;
    }

    if (opened || (this.isVisible && editChanged)) {
      if (this.editSujet) {
        this.populateForm(this.editSujet);
      } else if (opened || this.isPageLayout) {
        this.resetForm();
      }
    }
  }

  private loadSuggestions(): void {
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

    if (this.form.invalid) {
      this.form.markAllAsTouched();
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
    } else {
      operation = this.sujetProjetService.creerSujet(request);
    }

    operation.subscribe({
      next: () => {
        this.isSubmitting = false;
        this.resetForm();
        this.saved.emit();
      },
      error: () => {
        this.isSubmitting = false;
        this.errorMessage = this.isEditMode
          ? 'Erreur lors de la modification. Vérifiez que le backend est démarré.'
          : 'Erreur lors de l\'envoi. Vérifiez que le backend est démarré.';
      },
    });
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
    this.sujetProjetService.getDomainesSuggestions().subscribe({
      next: (domaines) => {
        this.domaineOptions = domaines;
        onDone?.();
      },
    });
  }

  private reloadPrerequis(onDone?: () => void): void {
    this.sujetProjetService.getPrerequisSuggestions().subscribe({
      next: (prerequis) => {
        this.prerequisOptions = prerequis;
        onDone?.();
      },
    });
  }

  private reloadTechnologies(onDone?: () => void): void {
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
