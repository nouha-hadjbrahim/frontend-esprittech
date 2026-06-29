import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProjetCard } from '../../../core/models/projet-catalogue.model';
import { Catalogue } from './catalogue';

describe('Catalogue', () => {
  let fixture: ComponentFixture<Catalogue>;
  let component: Catalogue;
  let httpTesting: HttpTestingController;

  const API = 'http://localhost:8080/api';

  const mockCards: ProjetCard[] = [
    {
      id: 1, typeProjet: 'RDI', titre: 'Projet IA', description: 'Machine Learning',
      statut: 'VALIDE', score: 80, encadrantId: 1, encadrantNom: 'Jean Dupont',
      equipeId: 100, equipeNom: 'Equipe IA', dateDebut: '2026-01-01', dateFin: '2026-12-31',
      dateCreation: '2026-01-10T10:00:00', domaines: ['IA', 'Data'], technologies: ['Python'],
    },
    {
      id: 2, typeProjet: 'PFE', titre: 'Web App', description: 'Application web Angular',
      statut: 'VALIDE', score: 60, encadrantId: 2, encadrantNom: 'Alice Martin',
      equipeId: 100, equipeNom: 'Equipe IA', dateDebut: '2025-09-01', dateFin: '2026-06-30',
      dateCreation: '2025-08-20T14:00:00', domaines: ['Web'], technologies: ['Angular'],
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Catalogue],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(Catalogue);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  function flushCatalogue(data: ProjetCard[] = mockCards): void {
    const req = httpTesting.expectOne(r => r.url === `${API}/catalogue`);
    req.flush(data);
  }

  it('should create', () => {
    fixture.detectChanges();
    flushCatalogue();
    expect(component).toBeTruthy();
  });

  it('loads catalogue on init', () => {
    fixture.detectChanges();
    flushCatalogue();
    expect(component.allProjets.length).toBe(2);
    expect(component.filtered.length).toBe(2);
    expect(component.isLoading).toBe(false);
  });

  it('derives domaine options from data', () => {
    fixture.detectChanges();
    flushCatalogue();
    expect(component.domaineOptions).toContain('IA');
    expect(component.domaineOptions).toContain('Web');
    expect(component.domaineOptions).toContain('Data');
  });

  it('derives annee options from data', () => {
    fixture.detectChanges();
    flushCatalogue();
    expect(component.anneeOptions).toContain(2026);
    expect(component.anneeOptions).toContain(2025);
  });

  it('handles load error', () => {
    fixture.detectChanges();
    const req = httpTesting.expectOne(r => r.url === `${API}/catalogue`);
    req.error(new ProgressEvent('error'));
    expect(component.allProjets.length).toBe(0);
    expect(component.errorMessage).toBeTruthy();
    expect(component.isLoading).toBe(false);
  });

  it('filters by type selection', () => {
    fixture.detectChanges();
    flushCatalogue();
    component.selectType('PFE');
    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0].typeProjet).toBe('PFE');
  });

  it('type filter "Tous" shows all', () => {
    fixture.detectChanges();
    flushCatalogue();
    component.selectType('PFE');
    expect(component.filtered.length).toBe(1);
    component.selectType('');
    expect(component.filtered.length).toBe(2);
  });

  it('filters by domaine', () => {
    fixture.detectChanges();
    flushCatalogue();
    component.selectedDomaine = 'Web';
    component.onFilterChange();
    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0].id).toBe(2);
  });

  it('filters by annee', () => {
    fixture.detectChanges();
    flushCatalogue();
    component.selectedAnnee = '2025';
    component.onFilterChange();
    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0].id).toBe(2);
  });

  it('sorts by score', () => {
    fixture.detectChanges();
    flushCatalogue();
    component.sortOrder = 'score';
    component.onFilterChange();
    expect(component.filtered[0].score).toBe(80);
    expect(component.filtered[1].score).toBe(60);
  });

  it('sorts by oldest', () => {
    fixture.detectChanges();
    flushCatalogue();
    component.sortOrder = 'ancien';
    component.onFilterChange();
    expect(component.filtered[0].id).toBe(2);
  });

  it('sorts by recent (default)', () => {
    fixture.detectChanges();
    flushCatalogue();
    expect(component.filtered[0].id).toBe(1);
  });

  it('filters by search (titre)', () => {
    fixture.detectChanges();
    flushCatalogue();
    component.searchQuery = 'web app';
    (component as any).applyFilters();
    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0].id).toBe(2);
  });

  it('filters by search (encadrant)', () => {
    fixture.detectChanges();
    flushCatalogue();
    component.searchQuery = 'alice';
    (component as any).applyFilters();
    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0].encadrantNom).toBe('Alice Martin');
  });

  it('filters by search (technology)', () => {
    fixture.detectChanges();
    flushCatalogue();
    component.searchQuery = 'angular';
    (component as any).applyFilters();
    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0].id).toBe(2);
  });

  it('combined filters: type + domaine', () => {
    fixture.detectChanges();
    flushCatalogue();
    component.selectType('RDI');
    component.selectedDomaine = 'Web';
    component.onFilterChange();
    expect(component.filtered.length).toBe(0);
  });
});
