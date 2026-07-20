import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SujetCatalogCard } from './sujet-catalog-card';
import { SujetProjet } from '../../../../core/models/sujet-projet.model';

function makeSujet(overrides: Partial<SujetProjet> = {}): SujetProjet {
  return {
    id: 1,
    titre: 'Test Sujet',
    categorie: 'PFE',
    description: 'Description test',
    objectifs: 'Objectifs',
    prerequis: [],
    domaines: ['IA', 'Web', 'Security'],
    technologies: ['Angular', 'Spring Boot', 'Docker'],
    capaciteAccueil: 3,
    statut: 'VALIDE',
    scoreFinal: 80,
    eligibleIndustrialisation: true,
    catalogue: true,
    encadrantId: 1,
    encadrantNom: 'Ahmed Ben Ali',
    encadrantEmail: null,
    equipeNom: 'Equipe Alpha',
    dateCreation: '2026-01-01',
    dateSoumission: null,
    dateValidation: null,
    dateDebutRealisation: null,
    dateTerminaison: null,
    motifInvalidation: null,
    ...overrides,
  };
}

describe('SujetCatalogCard', () => {
  let component: SujetCatalogCard;
  let fixture: ComponentFixture<SujetCatalogCard>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [SujetCatalogCard], providers: [provideRouter([])] });
    fixture = TestBed.createComponent(SujetCatalogCard);
    component = fixture.componentInstance;
    component.sujet = makeSujet();
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('categorieBadge returns correct label', () => {
    expect(component.categorieBadge.label).toBe('PFE');
  });

  it('categorieBadge returns fallback for unknown categorie', () => {
    component.sujet = makeSujet({ categorie: 'UNKNOWN' as any });
    expect(component.categorieBadge.label).toBe('UNKNOWN');
  });

  it('statutBadge returns correct label', () => {
    expect(component.statutBadge.label).toBe('Validé');
  });

  it('statutBadge returns fallback for unknown statut', () => {
    component.sujet = makeSujet({ statut: 'UNKNOWN' as any });
    expect(component.statutBadge.label).toBe('UNKNOWN');
  });

  it('subtitle joins encadrant and equipe', () => {
    expect(component.subtitle).toBe('Ahmed Ben Ali · Equipe Alpha');
  });

  it('subtitle handles missing equipe', () => {
    component.sujet = makeSujet({ equipeNom: null });
    expect(component.subtitle).toBe('Ahmed Ben Ali');
  });

  it('tags returns first 2 domaines + first 2 techs', () => {
    expect(component.tags).toEqual(['IA', 'Web', 'Angular', 'Spring Boot']);
  });
});
