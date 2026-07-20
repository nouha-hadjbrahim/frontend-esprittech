import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ValidationSujetCard } from './validation-sujet-card';
import { SujetProjet } from '../../../../core/models/sujet-projet.model';

function makeSujet(overrides: Partial<SujetProjet> = {}): SujetProjet {
  return {
    id: 1,
    titre: 'Test Sujet',
    categorie: 'PFE',
    description: 'Description test',
    objectifs: 'Objectifs',
    prerequis: [],
    domaines: ['IA', 'Web'],
    technologies: [],
    capaciteAccueil: 3,
    statut: 'SOUMIS_EN_VALIDATION',
    scoreFinal: null,
    eligibleIndustrialisation: false,
    catalogue: false,
    encadrantId: 1,
    encadrantNom: 'Ahmed Ben Ali',
    encadrantEmail: null,
    equipeNom: null,
    dateCreation: '2026-01-01',
    dateSoumission: null,
    dateValidation: null,
    dateDebutRealisation: null,
    dateTerminaison: null,
    motifInvalidation: null,
    ...overrides,
  };
}

describe('ValidationSujetCard', () => {
  let component: ValidationSujetCard;
  let fixture: ComponentFixture<ValidationSujetCard>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [ValidationSujetCard], providers: [provideRouter([])] });
    fixture = TestBed.createComponent(ValidationSujetCard);
    component = fixture.componentInstance;
    component.sujet = makeSujet();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initials', () => {
    it('returns first+last initials for multi-word name', () => {
      expect(component.initials).toBe('AA');
    });

    it('returns first 2 chars for single word', () => {
      component.sujet = makeSujet({ encadrantNom: 'Ahmed' });
      expect(component.initials).toBe('AH');
    });

    it('returns ? for empty name', () => {
      component.sujet = makeSujet({ encadrantNom: '' });
      expect(component.initials).toBe('?');
    });
  });

  it('categorieBadge returns correct label', () => {
    expect(component.categorieBadge.label).toBe('PFE');
  });

  it('categorieBadge returns fallback for unknown', () => {
    component.sujet = makeSujet({ categorie: 'UNKNOWN' as any });
    expect(component.categorieBadge.label).toBe('UNKNOWN');
  });

  it('statutBadge returns En attente for SOUMIS_EN_VALIDATION', () => {
    expect(component.statutBadge.label).toBe('En attente');
  });

  it('statutBadge returns En attente for EN_ATTENTE', () => {
    component.sujet = makeSujet({ statut: 'EN_ATTENTE' });
    expect(component.statutBadge.label).toBe('En attente');
  });

  it('statutBadge uses STATUT_LABELS for other statuses', () => {
    component.sujet = makeSujet({ statut: 'VALIDE' });
    expect(component.statutBadge.label).toBe('Validé');
  });

  it('statutBadge returns fallback for unknown statut', () => {
    component.sujet = makeSujet({ statut: 'UNKNOWN' as any });
    expect(component.statutBadge.label).toBe('En attente');
  });

  it('primaryDomaine returns first domain', () => {
    expect(component.primaryDomaine).toBe('IA');
  });

  it('primaryDomaine returns null if empty', () => {
    component.sujet = makeSujet({ domaines: [] });
    expect(component.primaryDomaine).toBeNull();
  });

  it('shortDescription truncates at 120 chars', () => {
    component.sujet = makeSujet({ description: 'x'.repeat(150) });
    expect(component.shortDescription.length).toBe(120);
    expect(component.shortDescription).toContain('...');
  });

  it('shortDescription returns full text if <= 120 chars', () => {
    component.sujet = makeSujet({ description: 'Short text' });
    expect(component.shortDescription).toBe('Short text');
  });

  it('shortDescription handles null/empty', () => {
    component.sujet = makeSujet({ description: null as any });
    expect(component.shortDescription).toBe('');
  });

  it('onValidate emits when not loading', () => {
    spyOn(component.validate, 'emit');
    component.onValidate();
    expect(component.validate.emit).toHaveBeenCalled();
  });

  it('onValidate does not emit when validating', () => {
    spyOn(component.validate, 'emit');
    component.validating = true;
    component.onValidate();
    expect(component.validate.emit).not.toHaveBeenCalled();
  });

  it('onValidate does not emit when rejecting', () => {
    spyOn(component.validate, 'emit');
    component.rejecting = true;
    component.onValidate();
    expect(component.validate.emit).not.toHaveBeenCalled();
  });

  it('onReject emits when not loading', () => {
    spyOn(component.reject, 'emit');
    component.onReject();
    expect(component.reject.emit).toHaveBeenCalled();
  });

  it('onReject does not emit when validating', () => {
    spyOn(component.reject, 'emit');
    component.validating = true;
    component.onReject();
    expect(component.reject.emit).not.toHaveBeenCalled();
  });

  it('onReject does not emit when rejecting', () => {
    spyOn(component.reject, 'emit');
    component.rejecting = true;
    component.onReject();
    expect(component.reject.emit).not.toHaveBeenCalled();
  });
});
