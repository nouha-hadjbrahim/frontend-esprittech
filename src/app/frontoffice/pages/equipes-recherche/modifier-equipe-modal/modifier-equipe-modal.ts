import { Component, EventEmitter, Input, OnChanges, OnInit, Output, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Equipe } from '../../../../core/models/equipe.model';
import { EquipeService } from '../../../../core/services/equipe.service';
import { EquipeDomaine } from '../../../../core/models/equipe-domaine.model';
import { EquipeDomaineService } from '../../../../core/services/equipe-domaine.service';

@Component({
  selector: 'app-modifier-equipe-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './modifier-equipe-modal.html',
  styleUrl: './modifier-equipe-modal.css',
})
export class ModifierEquipeModal implements OnInit, OnChanges {
  private readonly fb = inject(FormBuilder);
  private readonly equipeSvc = inject(EquipeService);
  private readonly domaineSvc = inject(EquipeDomaineService);

  @Input() isOpen = false;
  @Input() equipe!: Equipe;
  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  domaines: EquipeDomaine[] = [];
  isSubmitting = false;
  errorMessage = '';

  form = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
    description: ['', [Validators.maxLength(2000)]],
    domaineId: [0, [Validators.required, Validators.min(1)]],
  });

  get modalTitle(): string {
    return `Modifier l'équipe « ${this.equipe?.nom ?? ''} »`;
  }

  ngOnInit(): void {
    this.loadDomaines();
  }

  ngOnChanges(): void {
    if (this.isOpen && this.equipe) {
      this.form.patchValue({
        nom: this.equipe.nom,
        description: this.equipe.description ?? '',
        domaineId: this.equipe.domaineId,
      });
      this.errorMessage = '';
    }
  }

  private loadDomaines(): void {
    this.domaineSvc.getAll().subscribe({
      next: (data) => (this.domaines = data),
      error: () => (this.errorMessage = 'Erreur lors du chargement des domaines.'),
    });
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    const payload: Partial<Equipe> = {
      nom: this.form.value.nom,
      description: this.form.value.description || null,
      domaineId: this.form.value.domaineId,
      chefId: this.equipe.chef?.id,
    };

    this.equipeSvc.modifier(this.equipe.id, payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.saved.emit();
      },
      error: () => {
        this.isSubmitting = false;
        this.errorMessage = 'Erreur lors de la modification. Vérifiez que le backend est démarré.';
      },
    });
  }

  isInvalid(field: 'nom' | 'description' | 'domaineId'): boolean {
    const control = this.form.controls[field];
    return control.invalid && control.touched;
  }

  couleurDomaine(id: number | undefined): string {
    if (!id || id === 0) return 'transparent';
    const colors = ['#E63946', '#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#8b5cf6', '#ec4899'];
    return colors[id % colors.length];
  }
}
