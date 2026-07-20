import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ValidationSujetListRow } from './validation-sujet-list-row';
import { SujetProjet } from '../../../../core/models/sujet-projet.model';

describe('ValidationSujetListRow', () => {
  let component: ValidationSujetListRow;
  let fixture: ComponentFixture<ValidationSujetListRow>;

  const baseSujet: SujetProjet = {
    id: 1,
    titre: 'Test Subject',
    categorie: 'PFE',
    description: 'A test description for validation',
    objectifs: 'Obj1\nObj2',
    prerequis: [],
    domaines: ['AI', 'Web'],
    technologies: ['Angular'],
    capaciteAccueil: 3,
    statut: 'SOUMIS_EN_VALIDATION',
    scoreFinal: null,
    eligibleIndustrialisation: false,
    catalogue: false,
    encadrantId: 10,
    encadrantNom: 'Jean Dupont',
    encadrantEmail: 'jean@test.com',
    equipeNom: null,
    dateCreation: '2026-01-15T10:00:00Z',
    dateSoumission: '2026-01-20T14:00:00Z',
    dateValidation: null,
    dateDebutRealisation: null,
    dateTerminaison: null,
    motifInvalidation: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidationSujetListRow],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ValidationSujetListRow);
    component = fixture.componentInstance;
    component.sujet = { ...baseSujet };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return primaryDomaine', () => {
    expect(component.primaryDomaine).toBe('AI');
    component.sujet = { ...baseSujet, domaines: [] };
    expect(component.primaryDomaine).toBe('—');
  });

  it('should return categorieShortLabel for each type', () => {
    component.sujet = { ...baseSujet, categorie: 'PFE' };
    expect(component.categorieShortLabel).toBe('PFE');
    component.sujet = { ...baseSujet, categorie: 'RDI' };
    expect(component.categorieShortLabel).toBe('RDI');
    component.sujet = { ...baseSujet, categorie: 'STAGE_INGENIEUR' };
    expect(component.categorieShortLabel).toBe('STAGE');
    component.sujet = { ...baseSujet, categorie: 'UNKNOWN' as any };
    expect(component.categorieShortLabel).toBe('PFE');
  });

  it('should return statutBadge for SOUMIS_EN_VALIDATION and EN_ATTENTE', () => {
    component.sujet = { ...baseSujet, statut: 'SOUMIS_EN_VALIDATION' };
    expect(component.statutBadge.label).toBe('En attente');
    component.sujet = { ...baseSujet, statut: 'EN_ATTENTE' };
    expect(component.statutBadge.label).toBe('En attente');
    component.sujet = { ...baseSujet, statut: 'VALIDE' };
    expect(component.statutBadge.label).toBe('Validé');
  });

  it('should return statutListClass', () => {
    component.sujet = { ...baseSujet, statut: 'SOUMIS_EN_VALIDATION' };
    expect(component.statutListClass).toBe('badge--statut-soumis');
    component.sujet = { ...baseSujet, statut: 'INVALIDE' as any };
    expect(component.statutListClass).toBe('badge--statut-invalide');
  });

  it('should return statusDotClass', () => {
    component.sujet = { ...baseSujet, statut: 'SOUMIS_EN_VALIDATION' };
    expect(component.statusDotClass).toBe('dot--soumis');
    component.sujet = { ...baseSujet, statut: 'EN_ATTENTE' };
    expect(component.statusDotClass).toBe('dot--attente');
    component.sujet = { ...baseSujet, statut: 'INVALIDE' };
    expect(component.statusDotClass).toBe('dot--invalide');
    component.sujet = { ...baseSujet, statut: 'VALIDE' };
    expect(component.statusDotClass).toBe('dot--valide');
    component.sujet = { ...baseSujet, statut: 'UNKNOWN' as any };
    expect(component.statusDotClass).toBe('dot--attente');
  });

  it('should return accentClass', () => {
    component.sujet = { ...baseSujet, categorie: 'PFE' };
    expect(component.accentClass).toBe('accent--pfe');
    component.sujet = { ...baseSujet, categorie: 'STAGE_INGENIEUR' };
    expect(component.accentClass).toBe('accent--stage');
    component.sujet = { ...baseSujet, categorie: 'RDI' };
    expect(component.accentClass).toBe('accent--rdi');
    component.sujet = { ...baseSujet, categorie: 'OTHER' as any };
    expect(component.accentClass).toBe('accent--pfe');
  });

  it('should return shortDescription truncated at 110 chars', () => {
    component.sujet = { ...baseSujet, description: 'Short' };
    expect(component.shortDescription).toBe('Short');
    component.sujet = { ...baseSujet, description: '' };
    expect(component.shortDescription).toBe('—');
    component.sujet = { ...baseSujet, description: '   ' };
    expect(component.shortDescription).toBe('—');
    const long = 'A'.repeat(120);
    component.sujet = { ...baseSujet, description: long };
    expect(component.shortDescription.length).toBe(110);
    expect(component.shortDescription).toContain('...');
  });

  it('should return formattedDate', () => {
    component.sujet = { ...baseSujet, dateSoumission: '2026-01-20T14:00:00Z' };
    expect(component.formattedDate).toContain('2026');
    component.sujet = { ...baseSujet, dateSoumission: null, dateCreation: '2026-03-10T10:00:00Z' };
    expect(component.formattedDate).toContain('2026');
    component.sujet = { ...baseSujet, dateSoumission: null, dateCreation: '' };
    expect(component.formattedDate).toBe('—');
  });

  it('should return initials', () => {
    component.sujet = { ...baseSujet, encadrantNom: 'Jean Dupont' };
    expect(component.initials).toBe('JD');
    component.sujet = { ...baseSujet, encadrantNom: 'Jean' };
    expect(component.initials).toBe('JE');
    component.sujet = { ...baseSujet, encadrantNom: '' };
    expect(component.initials).toBe('?');
    component.sujet = { ...baseSujet, encadrantNom: '  ' };
    expect(component.initials).toBe('?');
  });

  it('should return timeAgo', () => {
    const now = new Date();
    component.sujet = { ...baseSujet, dateSoumission: now.toISOString() };
    expect(component.timeAgo).toBe("Aujourd'hui");
    const yesterday = new Date(now.getTime() - 86400000);
    component.sujet = { ...baseSujet, dateSoumission: yesterday.toISOString() };
    expect(component.timeAgo).toBe('Il y a 1 jour');
    const threeDays = new Date(now.getTime() - 3 * 86400000);
    component.sujet = { ...baseSujet, dateSoumission: threeDays.toISOString() };
    expect(component.timeAgo).toContain('jours');
    const oneWeek = new Date(now.getTime() - 7 * 86400000);
    component.sujet = { ...baseSujet, dateSoumission: oneWeek.toISOString() };
    expect(component.timeAgo).toBe('Il y a 1 semaine');
    const threeWeeks = new Date(now.getTime() - 21 * 86400000);
    component.sujet = { ...baseSujet, dateSoumission: threeWeeks.toISOString() };
    expect(component.timeAgo).toContain('semaines');
    const twoMonths = new Date(now.getTime() - 65 * 86400000);
    component.sujet = { ...baseSujet, dateSoumission: twoMonths.toISOString() };
    expect(component.timeAgo).toContain('mois');
    component.sujet = { ...baseSujet, dateSoumission: null, dateCreation: '' };
    expect(component.timeAgo).toBe('—');
  });

  it('should emit validate event', () => {
    spyOn(component.validate, 'emit');
    const event = new Event('click');
    component.onValidate(event);
    expect(component.validate.emit).toHaveBeenCalled();
  });

  it('should not emit validate when validating', () => {
    spyOn(component.validate, 'emit');
    component.validating = true;
    const event = new Event('click');
    component.onValidate(event);
    expect(component.validate.emit).not.toHaveBeenCalled();
  });

  it('should not emit validate when rejecting', () => {
    spyOn(component.validate, 'emit');
    component.rejecting = true;
    const event = new Event('click');
    component.onValidate(event);
    expect(component.validate.emit).not.toHaveBeenCalled();
  });

  it('should emit reject event', () => {
    spyOn(component.reject, 'emit');
    const event = new Event('click');
    component.onReject(event);
    expect(component.reject.emit).toHaveBeenCalled();
  });

  it('should not emit reject when validating', () => {
    spyOn(component.reject, 'emit');
    component.validating = true;
    const event = new Event('click');
    component.onReject(event);
    expect(component.reject.emit).not.toHaveBeenCalled();
  });

  it('should not emit reject when rejecting', () => {
    spyOn(component.reject, 'emit');
    component.rejecting = true;
    const event = new Event('click');
    component.onReject(event);
    expect(component.reject.emit).not.toHaveBeenCalled();
  });
});
