import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SujetListRow } from './sujet-list-row';
import { SujetProjet } from '../../../../core/models/sujet-projet.model';

describe('SujetListRow', () => {
  let component: SujetListRow;
  let fixture: ComponentFixture<SujetListRow>;

  const baseSujet: SujetProjet = {
    id: 1,
    titre: 'Test Subject',
    categorie: 'PFE',
    description: 'A test description',
    objectifs: 'Obj1',
    prerequis: [],
    domaines: ['AI', 'Web'],
    technologies: ['Angular'],
    capaciteAccueil: 3,
    statut: 'CANDIDATURE_OUVERTE',
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
    nombreMembresActifs: 1,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SujetListRow],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SujetListRow);
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

  it('should return categorieBadge', () => {
    component.sujet = { ...baseSujet, categorie: 'PFE' };
    expect(component.categorieBadge.label).toBe('PFE');
    component.sujet = { ...baseSujet, categorie: 'RDI' };
    expect(component.categorieBadge.label).toBe('RDI');
    component.sujet = { ...baseSujet, categorie: 'STAGE_INGENIEUR' };
    expect(component.categorieBadge.label).toBe('Stage');
  });

  it('should return categorieShortLabel', () => {
    component.sujet = { ...baseSujet, categorie: 'PFE' };
    expect(component.categorieShortLabel).toBe('PFE');
    component.sujet = { ...baseSujet, categorie: 'RDI' };
    expect(component.categorieShortLabel).toBe('RDI');
    component.sujet = { ...baseSujet, categorie: 'STAGE_INGENIEUR' };
    expect(component.categorieShortLabel).toBe('STAGE');
    component.sujet = { ...baseSujet, categorie: 'OTHER' as any };
    expect(component.categorieShortLabel).toBe('PFE');
  });

  it('should return statutBadge', () => {
    component.sujet = { ...baseSujet, statut: 'VALIDE' };
    expect(component.statutBadge.label).toBe('Validé');
    component.sujet = { ...baseSujet, statut: 'UNKNOWN' as any };
    expect(component.statutBadge.label).toBe('UNKNOWN');
  });

  it('should return statutListClass', () => {
    component.sujet = { ...baseSujet, statut: 'CANDIDATURE_OUVERTE' };
    expect(component.statutListClass).toBe('badge--statut-cand-ouverte');
    component.sujet = { ...baseSujet, statut: 'UNKNOWN' as any };
    expect(component.statutListClass).toBe('badge--neutral');
  });

  it('should return statusDotClass', () => {
    const statuses = [
      'SOUMIS_EN_VALIDATION', 'EN_ATTENTE', 'INVALIDE', 'VALIDE',
      'CANDIDATURE_OUVERTE', 'CANDIDATURE_FERMEE', 'REALISATION_EN_COURS',
      'REALISATION_TERMINEE', 'CANDIDAT_INDUSTRIALISATION_INTERNE',
      'CANDIDAT_INDUSTRIALISATION_EXTERNE', 'INDUSTRIALISE_DSI', 'INDUSTRIALISE_EXTERNE',
    ];
    statuses.forEach(s => {
      component.sujet = { ...baseSujet, statut: s as any };
      expect(component.statusDotClass).toBeTruthy();
    });
    component.sujet = { ...baseSujet, statut: 'UNKNOWN' as any };
    expect(component.statusDotClass).toBe('');
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

  it('should return shortDescription', () => {
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

  it('should return placesLabel', () => {
    component.sujet = { ...baseSujet, capaciteAccueil: 3, nombreMembresActifs: 1 };
    expect(component.placesLabel).toBe('2 places restantes');
    component.sujet = { ...baseSujet, capaciteAccueil: 3, nombreMembresActifs: 3 };
    expect(component.placesLabel).toBe('Complet');
    component.sujet = { ...baseSujet, capaciteAccueil: 3, nombreMembresActifs: 2 };
    expect(component.placesLabel).toBe('1 place restante');
    component.sujet = { ...baseSujet, capaciteAccueil: 3, nombreMembresActifs: 5 };
    expect(component.placesLabel).toBe('Complet');
    component.sujet = { ...baseSujet, capaciteAccueil: 3, nombreMembresActifs: undefined };
    expect(component.placesLabel).toBe('3 places restantes');
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

  it('should return showCandidaturesAction as true', () => {
    expect(component.showCandidaturesAction).toBeTrue();
  });

  it('should emit edit event', () => {
    spyOn(component.edit, 'emit');
    const event = new Event('click');
    component.onEdit(event);
    expect(component.edit.emit).toHaveBeenCalled();
  });

  it('should emit delete event', () => {
    spyOn(component.delete, 'emit');
    const event = new Event('click');
    component.onDelete(event);
    expect(component.delete.emit).toHaveBeenCalled();
  });

  it('should emit gererCandidatures event', () => {
    spyOn(component.gererCandidatures, 'emit');
    const event = new Event('click');
    component.onGererCandidatures(event);
    expect(component.gererCandidatures.emit).toHaveBeenCalled();
  });
});
