import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProjetCard } from '../../core/models/projet-catalogue.model';
import { CatalogComponent } from './catalog.component';
import { environment } from '../../../environments/environment';

describe('CatalogComponent', () => {
  let fixture: ComponentFixture<CatalogComponent>;
  let component: CatalogComponent;
  let httpTesting: HttpTestingController;

  const API = environment.apiUrl;

  const mockCards: ProjetCard[] = [
    {
      id: 1, typeProjet: 'RDI', titre: 'Projet IA', description: 'Machine Learning',
      statut: 'VALIDE', score: 80, encadrantId: 1, encadrantNom: 'Jean Dupont',
      equipeId: 100, equipeNom: 'Equipe IA', dateDebut: '2026-01-01', dateFin: '2026-12-31',
      dateCreation: '2026-01-10T10:00:00', domaines: ['IA', 'Data'], technologies: ['Python'],
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CatalogComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(CatalogComponent);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  function flushCatalogue(data: ProjetCard[] = mockCards): void {
    const req = httpTesting.expectOne(r => r.url === `${API}/projets/admin`);
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
    expect(component.allProjets.length).toBe(1);
    expect(component.isLoading).toBe(false);
  });

  it('opens and cancels the delete confirmation', () => {
    fixture.detectChanges();
    flushCatalogue();
    component.askDelete(mockCards[0]);
    expect(component.deleteConfirmOpen).toBe(true);
    component.cancelDelete();
    expect(component.deleteConfirmOpen).toBe(false);
    expect(component.projetToDelete).toBeNull();
  });

  it('deletes a project on confirm', () => {
    fixture.detectChanges();
    flushCatalogue();
    component.askDelete(mockCards[0]);
    component.confirmDelete();
    const deleteReq = httpTesting.expectOne(r => r.url === `${API}/projets/1` && r.method === 'DELETE');
    deleteReq.flush(null);
    flushCatalogue([]);
    expect(component.deleteConfirmOpen).toBe(false);
  });
});
