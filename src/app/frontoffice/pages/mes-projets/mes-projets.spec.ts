import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProjetCard } from '../../../core/models/projet-catalogue.model';
import { MesProjets } from './mes-projets';
import { environment } from '../../../../environments/environment';

describe('MesProjets', () => {
  let fixture: ComponentFixture<MesProjets>;
  let component: MesProjets;
  let httpTesting: HttpTestingController;

  const API = environment.apiUrl;

  const mockCards: ProjetCard[] = [
    {
      id: 1, typeProjet: 'RDI', titre: 'Projet IA', description: 'Intelligence artificielle',
      statut: 'SOUMIS_EN_VALIDATION', score: 0, encadrantId: 1, encadrantNom: 'Jean Dupont',
      equipeId: 100, equipeNom: 'Equipe IA', dateDebut: '2026-01-01', dateFin: '2026-12-31',
      dateCreation: '2026-01-15T10:00:00', domaines: ['IA'], technologies: ['TensorFlow'],
    },
    {
      id: 2, typeProjet: 'PFE', titre: 'App Mobile', description: 'Application mobile Flutter',
      statut: 'VALIDE', score: 50, encadrantId: 1, encadrantNom: 'Jean Dupont',
      equipeId: 100, equipeNom: 'Equipe IA', dateDebut: '2026-03-01', dateFin: '2026-09-01',
      dateCreation: '2026-02-10T08:00:00', domaines: ['Mobile'], technologies: ['Flutter'],
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MesProjets],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(MesProjets);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  /** Flush the mesProjets GET + the 3 reference GETs fired by AjouterProjetModal child. */
  function flushInitRequests(data: ProjetCard[] = mockCards): void {
    httpTesting.expectOne(`${API}/projets/mes-projets`).flush(data);
    httpTesting.match(`${API}/projets/references/domaines`).forEach(r => r.flush([]));
    httpTesting.match(`${API}/projets/references/technologies`).forEach(r => r.flush([]));
    httpTesting.match(`${API}/projets/references/prerequis`).forEach(r => r.flush([]));
  }

  it('should create', () => {
    fixture.detectChanges();
    flushInitRequests();
    expect(component).toBeTruthy();
  });

  it('loads projects on init', () => {
    fixture.detectChanges();
    flushInitRequests();
    expect(component.projets.length).toBe(2);
    expect(component.filtered.length).toBe(2);
    expect(component.isLoading).toBe(false);
  });

  it('handles load error', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/mes-projets`).error(new ProgressEvent('error'));
    httpTesting.match(`${API}/projets/references/domaines`).forEach(r => r.flush([]));
    httpTesting.match(`${API}/projets/references/technologies`).forEach(r => r.flush([]));
    httpTesting.match(`${API}/projets/references/prerequis`).forEach(r => r.flush([]));
    expect(component.projets.length).toBe(0);
    expect(component.errorMessage).toBeTruthy();
    expect(component.isLoading).toBe(false);
  });

  it('filters by search query', () => {
    fixture.detectChanges();
    flushInitRequests();
    component.searchQuery = 'mobile';
    component.onSearchChange();
    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0].titre).toBe('App Mobile');
  });

  it('filters by type', () => {
    fixture.detectChanges();
    flushInitRequests();
    component.selectedType = 'PFE';
    component.onFilterChange();
    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0].typeProjet).toBe('PFE');
  });

  it('filters by statut', () => {
    fixture.detectChanges();
    flushInitRequests();
    component.selectedStatut = 'VALIDE';
    component.onFilterChange();
    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0].statut).toBe('VALIDE');
  });

  it('sorts by recent (default)', () => {
    fixture.detectChanges();
    flushInitRequests();
    expect(component.filtered[0].id).toBe(2);
  });

  it('sorts by oldest', () => {
    fixture.detectChanges();
    flushInitRequests();
    component.sortOrder = 'ancien';
    component.onFilterChange();
    expect(component.filtered[0].id).toBe(1);
  });

  it('opens and closes modal', () => {
    fixture.detectChanges();
    flushInitRequests();
    component.openModal();
    expect(component.isModalOpen).toBe(true);
    component.closeModal();
    expect(component.isModalOpen).toBe(false);
  });

  it('onProjetSaved reloads and shows success', () => {
    fixture.detectChanges();
    flushInitRequests();
    component.isModalOpen = true;
    component.onProjetSaved();
    expect(component.isModalOpen).toBe(false);
    expect(component.infoDialogOpen).toBeTrue();
    flushInitRequests();
  });

  it('search by domaine name', () => {
    fixture.detectChanges();
    flushInitRequests();
    component.searchQuery = 'IA';
    component.onSearchChange();
    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0].id).toBe(1);
  });

  it('search by technology name', () => {
    fixture.detectChanges();
    flushInitRequests();
    component.searchQuery = 'flutter';
    component.onSearchChange();
    expect(component.filtered.length).toBe(1);
    expect(component.filtered[0].id).toBe(2);
  });

  it('combined filters narrow results', () => {
    fixture.detectChanges();
    flushInitRequests();
    component.selectedType = 'RDI';
    component.selectedStatut = 'VALIDE';
    component.onFilterChange();
    expect(component.filtered.length).toBe(0);
  });

  it('empty search shows all', () => {
    fixture.detectChanges();
    flushInitRequests();
    component.searchQuery = '  ';
    component.onSearchChange();
    expect(component.filtered.length).toBe(2);
  });
});
