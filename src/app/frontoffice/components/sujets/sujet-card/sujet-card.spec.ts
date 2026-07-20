import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SujetCard } from './sujet-card';
import { SujetProjet } from '../../../../core/models/sujet-projet.model';

describe('SujetCard', () => {
  let component: SujetCard;
  let fixture: ComponentFixture<SujetCard>;

  const mockSujet: SujetProjet = {
    id: 1,
    titre: 'Système IA',
    categorie: 'STAGE_INGENIEUR' as any,
    description: 'Description test',
    objectifs: 'Objectifs test',
    prerequis: ['Python'],
    domaines: ['Intelligence Artificielle'],
    technologies: ['Python', 'TensorFlow'],
    capaciteAccueil: 2,
    statut: 'CANDIDATURE_OUVERTE' as any,
    scoreFinal: null,
    eligibleIndustrialisation: false,
    catalogue: true,
    encadrantId: 10,
    encadrantNom: 'Dr. Sami',
    encadrantEmail: null,
    equipeNom: 'AI Team',
    dateCreation: new Date().toISOString(),
    dateSoumission: new Date().toISOString(),
    dateValidation: null,
    dateDebutRealisation: null,
    dateTerminaison: null,
    motifInvalidation: null,
    nombreMembresActifs: 1,
  } as any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SujetCard],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SujetCard);
    component = fixture.componentInstance;
    component.sujet = mockSujet;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── domainesLabel ─────────────────────────────────────────────────
  it('domainesLabel should join domaines with comma', () => {
    component.sujet = { ...mockSujet, domaines: ['IA', 'Data Science'] } as any;
    expect(component.domainesLabel).toBe('IA, Data Science');
  });

  it('domainesLabel should return — when domaines is empty', () => {
    component.sujet = { ...mockSujet, domaines: [] } as any;
    expect(component.domainesLabel).toBe('—');
  });

  it('domainesLabel should return — when domaines is null/undefined', () => {
    component.sujet = { ...mockSujet, domaines: null } as any;
    expect(component.domainesLabel).toBe('—');
  });

  // ── categorieShortLabel ───────────────────────────────────────────
  it('categorieShortLabel should return STAGE for STAGE_INGENIEUR', () => {
    component.sujet = { ...mockSujet, categorie: 'STAGE_INGENIEUR' } as any;
    expect(component.categorieShortLabel).toBe('STAGE');
  });

  it('categorieShortLabel should return PFE for PFE', () => {
    component.sujet = { ...mockSujet, categorie: 'PFE' } as any;
    expect(component.categorieShortLabel).toBe('PFE');
  });

  it('categorieShortLabel should return RDI for RDI', () => {
    component.sujet = { ...mockSujet, categorie: 'RDI' } as any;
    expect(component.categorieShortLabel).toBe('RDI');
  });

  it('categorieShortLabel should return PFE as fallback for unknown category', () => {
    component.sujet = { ...mockSujet, categorie: 'UNKNOWN' as any } as any;
    expect(component.categorieShortLabel).toBe('PFE');
  });

  // ── equipeLabel ───────────────────────────────────────────────────
  it('equipeLabel should return trimmed equipeNom', () => {
    component.sujet = { ...mockSujet, equipeNom: '  AI Team  ' } as any;
    expect(component.equipeLabel).toBe('AI Team');
  });

  it('equipeLabel should return default when equipeNom is null', () => {
    component.sujet = { ...mockSujet, equipeNom: null } as any;
    expect(component.equipeLabel).toBe('Équipe recherche');
  });

  it('equipeLabel should return default when equipeNom is empty', () => {
    component.sujet = { ...mockSujet, equipeNom: '' } as any;
    expect(component.equipeLabel).toBe('Équipe recherche');
  });

  it('equipeLabel should return default when equipeNom is whitespace only', () => {
    component.sujet = { ...mockSujet, equipeNom: '   ' } as any;
    expect(component.equipeLabel).toBe('Équipe recherche');
  });

  // ── statutBadge / statusLabel ────────────────────────────────────
  it('statutBadge should return label for known statut', () => {
    component.sujet = { ...mockSujet, statut: 'VALIDE' } as any;
    expect(component.statutBadge.label).toBe('Validé');
    expect(component.statusLabel).toBe('Validé');
  });

  it('statutBadge should return fallback for unknown statut', () => {
    component.sujet = { ...mockSujet, statut: 'UNKNOWN_STATUT' as any } as any;
    expect(component.statutBadge.label).toBe('UNKNOWN_STATUT');
    expect(component.statutBadge.cssClass).toBe('badge--neutral');
  });

  // ── statusTagClass / statusDotClass ───────────────────────────────
  it('statusTagClass should return style for known statut', () => {
    component.sujet = { ...mockSujet, statut: 'CANDIDATURE_OUVERTE' } as any;
    expect(component.statusTagClass).toBe('dispo-card__status-tag--cand-ouverte');
  });

  it('statusTagClass should return fallback for unknown statut', () => {
    component.sujet = { ...mockSujet, statut: 'UNKNOWN' as any } as any;
    expect(component.statusTagClass).toBe('dispo-card__status-tag--muted');
  });

  it('statusDotClass should return style for known statut', () => {
    component.sujet = { ...mockSujet, statut: 'REALISATION_EN_COURS' } as any;
    expect(component.statusDotClass).toBe('dispo-card__status-dot--realisation');
  });

  it('statusDotClass should return fallback for unknown statut', () => {
    component.sujet = { ...mockSujet, statut: 'UNKNOWN' as any } as any;
    expect(component.statusDotClass).toBe('dispo-card__status-dot--muted');
  });

  // ── primaryDomaine ───────────────────────────────────────────────
  it('primaryDomaine should return first domaine', () => {
    component.sujet = { ...mockSujet, domaines: ['IA', 'Web'] } as any;
    expect(component.primaryDomaine).toBe('IA');
  });

  it('primaryDomaine should return — when domaines is empty', () => {
    component.sujet = { ...mockSujet, domaines: [] } as any;
    expect(component.primaryDomaine).toBe('—');
  });

  // ── shortDescription ─────────────────────────────────────────────
  it('shortDescription should return — for empty description', () => {
    component.sujet = { ...mockSujet, description: '' } as any;
    expect(component.shortDescription).toBe('—');
  });

  it('shortDescription should return — for null description', () => {
    component.sujet = { ...mockSujet, description: null } as any;
    expect(component.shortDescription).toBe('—');
  });

  it('shortDescription should return text under 130 chars as-is', () => {
    const short = 'A'.repeat(129);
    component.sujet = { ...mockSujet, description: short } as any;
    expect(component.shortDescription).toBe(short);
    expect(component.shortDescription.length).toBe(129);
  });

  it('shortDescription should truncate text over 130 chars', () => {
    const long = 'A'.repeat(150);
    component.sujet = { ...mockSujet, description: long } as any;
    expect(component.shortDescription.length).toBe(130);
    expect(component.shortDescription).toBe('A'.repeat(127) + '...');
  });

  it('shortDescription should trim whitespace', () => {
    component.sujet = { ...mockSujet, description: '   Hello   ' } as any;
    expect(component.shortDescription).toBe('Hello');
  });

  // ── initials ─────────────────────────────────────────────────────
  it('initials should return ? when encadrantNom is empty', () => {
    component.sujet = { ...mockSujet, encadrantNom: '' } as any;
    expect(component.initials).toBe('?');
  });

  it('initials should return first two chars for single name', () => {
    component.sujet = { ...mockSujet, encadrantNom: 'Sami' } as any;
    expect(component.initials).toBe('SA');
  });

  it('initials should return first letters for two+ name parts', () => {
    component.sujet = { ...mockSujet, encadrantNom: 'Dr. Sami Ben' } as any;
    expect(component.initials).toBe('DB');
  });

  it('initials should return first letters for exactly two parts', () => {
    component.sujet = { ...mockSujet, encadrantNom: 'Jean Dupont' } as any;
    expect(component.initials).toBe('JD');
  });

  // ── avatarClass ──────────────────────────────────────────────────
  it('avatarClass should return pfe for PFE', () => {
    component.sujet = { ...mockSujet, categorie: 'PFE' } as any;
    expect(component.avatarClass).toBe('dispo-card__avatar--pfe');
  });

  it('avatarClass should return rdi for RDI', () => {
    component.sujet = { ...mockSujet, categorie: 'RDI' } as any;
    expect(component.avatarClass).toBe('dispo-card__avatar--rdi');
  });

  it('avatarClass should return stage for STAGE_INGENIEUR', () => {
    component.sujet = { ...mockSujet, categorie: 'STAGE_INGENIEUR' } as any;
    expect(component.avatarClass).toBe('dispo-card__avatar--stage');
  });

  it('avatarClass should return fallback for unknown category', () => {
    component.sujet = { ...mockSujet, categorie: 'UNKNOWN' as any } as any;
    expect(component.avatarClass).toBe('dispo-card__avatar--pfe');
  });

  // ── placesTaken ──────────────────────────────────────────────────
  it('placesTaken should return nombreMembresActifs', () => {
    component.sujet = { ...mockSujet, nombreMembresActifs: 3 } as any;
    expect(component.placesTaken).toBe(3);
  });

  it('placesTaken should return 0 when nombreMembresActifs is null', () => {
    component.sujet = { ...mockSujet, nombreMembresActifs: null } as any;
    expect(component.placesTaken).toBe(0);
  });

  it('placesTaken should return 0 when nombreMembresActifs is undefined', () => {
    component.sujet = { ...mockSujet } as any;
    delete (component.sujet as any).nombreMembresActifs;
    expect(component.placesTaken).toBe(0);
  });

  // ── capacityPercent ──────────────────────────────────────────────
  it('capacityPercent should return 0 when capaciteAccueil is 0', () => {
    component.sujet = { ...mockSujet, capaciteAccueil: 0 } as any;
    expect(component.capacityPercent).toBe(0);
  });

  it('capacityPercent should calculate normal percentage', () => {
    component.sujet = { ...mockSujet, capaciteAccueil: 4, nombreMembresActifs: 1 } as any;
    expect(component.capacityPercent).toBe(25);
  });

  it('capacityPercent should cap at 100', () => {
    component.sujet = { ...mockSujet, capaciteAccueil: 2, nombreMembresActifs: 5 } as any;
    expect(component.capacityPercent).toBe(100);
  });

  it('capacityPercent should return 0 when capaciteAccueil is falsy', () => {
    component.sujet = { ...mockSujet, capaciteAccueil: null } as any;
    expect(component.capacityPercent).toBe(0);
  });

  // ── formattedDate ────────────────────────────────────────────────
  it('formattedDate should use dateSoumission when available', () => {
    const date = '2025-03-15T10:00:00Z';
    component.sujet = { ...mockSujet, dateSoumission: date } as any;
    const result = component.formattedDate;
    expect(result).toContain('15');
    expect(result).toContain('2025');
  });

  it('formattedDate should fallback to dateCreation when dateSoumission is null', () => {
    const date = '2024-06-01T10:00:00Z';
    component.sujet = { ...mockSujet, dateSoumission: null, dateCreation: date } as any;
    const result = component.formattedDate;
    expect(result).toContain('2024');
  });

  it('formattedDate should return — when both dates are null', () => {
    component.sujet = { ...mockSujet, dateSoumission: null, dateCreation: null } as any;
    expect(component.formattedDate).toBe('—');
  });

  // ── metaSecondaryLabel ───────────────────────────────────────────
  it('metaSecondaryLabel should return Complet when 0 places left', () => {
    component.sujet = { ...mockSujet, capaciteAccueil: 2, nombreMembresActifs: 2 } as any;
    expect(component.metaSecondaryLabel).toBe('Complet');
  });

  it('metaSecondaryLabel should return singular for 1 place', () => {
    component.sujet = { ...mockSujet, capaciteAccueil: 2, nombreMembresActifs: 1 } as any;
    expect(component.metaSecondaryLabel).toBe('1 place restante');
  });

  it('metaSecondaryLabel should return plural for N places', () => {
    component.sujet = { ...mockSujet, capaciteAccueil: 5, nombreMembresActifs: 1 } as any;
    expect(component.metaSecondaryLabel).toBe('4 places restantes');
  });

  // ── visibleTechs / extraTechCount ────────────────────────────────
  it('visibleTechs should return at most 3 technologies', () => {
    component.sujet = { ...mockSujet, technologies: ['A', 'B', 'C', 'D', 'E'] } as any;
    expect(component.visibleTechs).toEqual(['A', 'B', 'C']);
    expect(component.extraTechCount).toBe(2);
  });

  it('extraTechCount should return 0 when 3 or fewer technologies', () => {
    component.sujet = { ...mockSujet, technologies: ['A', 'B'] } as any;
    expect(component.extraTechCount).toBe(0);
  });

  it('visibleTechs should return all technologies when 3 or fewer', () => {
    component.sujet = { ...mockSujet, technologies: ['A'] } as any;
    expect(component.visibleTechs).toEqual(['A']);
  });

  // ── footerSingleColumn ───────────────────────────────────────────
  it('footerSingleColumn should return false when detailsOnly is true', () => {
    component.detailsOnly = true;
    expect(component.footerSingleColumn).toBeFalse();
  });

  it('footerSingleColumn should return true when not owner', () => {
    component.isOwner = false;
    component.detailsOnly = false;
    expect(component.footerSingleColumn).toBeTrue();
  });

  it('footerSingleColumn should return false when isOwner and showCandidaturesAction', () => {
    component.isOwner = true;
    component.detailsOnly = false;
    expect(component.footerSingleColumn).toBeFalse();
  });

  // ── showCandidaturesAction ────────────────────────────────────────
  it('showCandidaturesAction should always be true', () => {
    expect(component.showCandidaturesAction).toBeTrue();
  });

  // ── Output events ─────────────────────────────────────────────────
  it('onEditClick should emit edit event and prevent defaults', () => {
    const editSpy = jasmine.createSpy('edit');
    component.edit.subscribe(editSpy);
    const event = new Event('click');
    spyOn(event, 'stopPropagation');
    spyOn(event, 'preventDefault');
    component.onEditClick(event);
    expect(editSpy).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('onDeleteClick should emit delete event and prevent defaults', () => {
    const deleteSpy = jasmine.createSpy('delete');
    component.delete.subscribe(deleteSpy);
    const event = new Event('click');
    spyOn(event, 'stopPropagation');
    spyOn(event, 'preventDefault');
    component.onDeleteClick(event);
    expect(deleteSpy).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it('onGererCandidaturesClick should emit gererCandidatures event', () => {
    const gererSpy = jasmine.createSpy('gererCandidatures');
    component.gererCandidatures.subscribe(gererSpy);
    component.onGererCandidaturesClick();
    expect(gererSpy).toHaveBeenCalled();
  });

  it('onPostulerClick should emit postuler event', () => {
    const postulerSpy = jasmine.createSpy('postuler');
    component.postuler.subscribe(postulerSpy);
    component.onPostulerClick();
    expect(postulerSpy).toHaveBeenCalled();
  });

  // ── detailsOnly / dejaPostule / isOwner inputs ───────────────────
  it('detailsOnly should default to false', () => {
    expect(component.detailsOnly).toBeFalse();
  });

  it('dejaPostule should default to false', () => {
    expect(component.dejaPostule).toBeFalse();
  });

  it('isOwner should default to false', () => {
    expect(component.isOwner).toBeFalse();
  });
});
