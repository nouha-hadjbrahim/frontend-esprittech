import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ValidationProjetListRow } from './validation-projet-list-row';
import { ProjetCard } from '../../../../core/models/projet-catalogue.model';

describe('ValidationProjetListRow', () => {
  let component: ValidationProjetListRow;
  let fixture: ComponentFixture<ValidationProjetListRow>;

  const baseProjet: ProjetCard = {
    id: 1,
    typeProjet: 'PFE',
    titre: 'Test Projet',
    description: 'A test description for project validation',
    statut: 'SOUMIS_EN_VALIDATION',
    score: 85,
    encadrantId: 10,
    encadrantNom: 'Jean Dupont',
    equipeId: null,
    equipeNom: null,
    dateDebut: '2026-01-01',
    dateFin: '2026-06-30',
    dateCreation: '2026-01-15T10:00:00Z',
    domaines: ['AI', 'Web'],
    technologies: ['Angular'],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ValidationProjetListRow],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ValidationProjetListRow);
    component = fixture.componentInstance;
    component.projet = { ...baseProjet };
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should return primaryDomaine', () => {
    expect(component.primaryDomaine).toBe('AI');
    component.projet = { ...baseProjet, domaines: [] };
    expect(component.primaryDomaine).toBe('—');
  });

  it('should return typeShortLabel', () => {
    component.projet = { ...baseProjet, typeProjet: 'PFE' };
    expect(component.typeShortLabel).toBe('PFE');
    component.projet = { ...baseProjet, typeProjet: 'RDI' };
    expect(component.typeShortLabel).toBe('RDI');
    component.projet = { ...baseProjet, typeProjet: 'STAGE_INGENIEUR' };
    expect(component.typeShortLabel).toBe('STAGE');
    component.projet = { ...baseProjet, typeProjet: 'UNKNOWN' as any };
    expect(component.typeShortLabel).toBe('PFE');
  });

  it('should return statutBadge for SOUMIS_EN_VALIDATION', () => {
    component.projet = { ...baseProjet, statut: 'SOUMIS_EN_VALIDATION' };
    const badge = component.statutBadge;
    expect(badge.label).toBe('En attente');
    expect(badge.listClass).toBe('badge--statut-soumis');
    expect(badge.dotClass).toBe('dot--soumis');
  });

  it('should return statutBadge for other statuts', () => {
    component.projet = { ...baseProjet, statut: 'VALIDE' };
    const badge = component.statutBadge;
    expect(badge.label).toBe('Validé');
    expect(badge.listClass).toBe('badge--statut-attente');
    expect(badge.dotClass).toBe('dot--attente');
    component.projet = { ...baseProjet, statut: 'UNKNOWN' as any };
    expect(component.statutBadge.label).toBe('En attente');
  });

  it('should return accentClass', () => {
    component.projet = { ...baseProjet, typeProjet: 'PFE' };
    expect(component.accentClass).toBe('accent--pfe');
    component.projet = { ...baseProjet, typeProjet: 'STAGE_INGENIEUR' };
    expect(component.accentClass).toBe('accent--stage');
    component.projet = { ...baseProjet, typeProjet: 'RDI' };
    expect(component.accentClass).toBe('accent--rdi');
    component.projet = { ...baseProjet, typeProjet: 'OTHER' as any };
    expect(component.accentClass).toBe('accent--pfe');
  });

  it('should return shortDescription', () => {
    component.projet = { ...baseProjet, description: 'Short' };
    expect(component.shortDescription).toBe('Short');
    component.projet = { ...baseProjet, description: '' };
    expect(component.shortDescription).toBe('—');
    component.projet = { ...baseProjet, description: '   ' };
    expect(component.shortDescription).toBe('—');
    const long = 'A'.repeat(120);
    component.projet = { ...baseProjet, description: long };
    expect(component.shortDescription.length).toBe(110);
    expect(component.shortDescription).toContain('...');
  });

  it('should return formattedDate', () => {
    component.projet = { ...baseProjet, dateCreation: '2026-01-15T10:00:00Z' };
    expect(component.formattedDate).toContain('2026');
    component.projet = { ...baseProjet, dateCreation: '' };
    expect(component.formattedDate).toBe('—');
  });

  it('should return initials', () => {
    component.projet = { ...baseProjet, encadrantNom: 'Jean Dupont' };
    expect(component.initials).toBe('JD');
    component.projet = { ...baseProjet, encadrantNom: 'Jean' };
    expect(component.initials).toBe('JE');
    component.projet = { ...baseProjet, encadrantNom: '' };
    expect(component.initials).toBe('?');
    component.projet = { ...baseProjet, encadrantNom: '  ' };
    expect(component.initials).toBe('?');
  });

  it('should return timeAgo', () => {
    const now = new Date();
    component.projet = { ...baseProjet, dateCreation: now.toISOString() };
    expect(component.timeAgo).toBe("Aujourd'hui");
    const yesterday = new Date(now.getTime() - 86400000);
    component.projet = { ...baseProjet, dateCreation: yesterday.toISOString() };
    expect(component.timeAgo).toBe('Il y a 1 jour');
    const threeDays = new Date(now.getTime() - 3 * 86400000);
    component.projet = { ...baseProjet, dateCreation: threeDays.toISOString() };
    expect(component.timeAgo).toContain('jours');
    const oneWeek = new Date(now.getTime() - 7 * 86400000);
    component.projet = { ...baseProjet, dateCreation: oneWeek.toISOString() };
    expect(component.timeAgo).toBe('Il y a 1 semaine');
    const threeWeeks = new Date(now.getTime() - 21 * 86400000);
    component.projet = { ...baseProjet, dateCreation: threeWeeks.toISOString() };
    expect(component.timeAgo).toContain('semaines');
    const twoMonths = new Date(now.getTime() - 65 * 86400000);
    component.projet = { ...baseProjet, dateCreation: twoMonths.toISOString() };
    expect(component.timeAgo).toContain('mois');
    component.projet = { ...baseProjet, dateCreation: '' };
    expect(component.timeAgo).toBe('—');
  });

  it('should emit validate event', () => {
    spyOn(component.validate, 'emit');
    const event = new Event('click');
    component.onValidate(event);
    expect(component.validate.emit).toHaveBeenCalled();
  });

  it('should not emit validate when validating or rejecting', () => {
    spyOn(component.validate, 'emit');
    component.validating = true;
    component.onValidate(new Event('click'));
    expect(component.validate.emit).not.toHaveBeenCalled();
    component.validating = false;
    component.rejecting = true;
    component.onValidate(new Event('click'));
    expect(component.validate.emit).not.toHaveBeenCalled();
  });

  it('should emit reject event', () => {
    spyOn(component.reject, 'emit');
    const event = new Event('click');
    component.onReject(event);
    expect(component.reject.emit).toHaveBeenCalled();
  });

  it('should not emit reject when validating or rejecting', () => {
    spyOn(component.reject, 'emit');
    component.validating = true;
    component.onReject(new Event('click'));
    expect(component.reject.emit).not.toHaveBeenCalled();
    component.validating = false;
    component.rejecting = true;
    component.onReject(new Event('click'));
    expect(component.reject.emit).not.toHaveBeenCalled();
  });
});
