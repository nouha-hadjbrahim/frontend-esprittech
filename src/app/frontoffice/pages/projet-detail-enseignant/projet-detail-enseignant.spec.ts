import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { ProjetDetails } from '../../../core/models/projet-catalogue.model';
import { ProjetDetailEnseignant } from './projet-detail-enseignant';

describe('ProjetDetailEnseignant', () => {
  let fixture: ComponentFixture<ProjetDetailEnseignant>;
  let component: ProjetDetailEnseignant;
  let httpTesting: HttpTestingController;

  const API = 'http://localhost:8080/api';

  const mockDetails: ProjetDetails = {
    id: 1, typeProjet: 'RDI', titre: 'Projet IA', description: 'Desc',
    objectifs: 'Objectifs', dateDebut: '2026-01-01', dateFin: '2026-12-31',
    statut: 'SOUMIS_EN_VALIDATION', score: 0, encadrantId: 1,
    encadrantNom: 'Jean Dupont', encadrantEmail: 'jean@esprit.tn',
    equipeId: 100, equipeNom: 'Equipe IA', chefValidateurId: null,
    chefValidateurNom: null, motifRefus: null,
    dateCreation: '2026-01-10T10:00:00', dateValidation: null,
    domaines: ['IA'], technologies: ['Python'], prerequis: ['Math'],
  };

  function createComponent(id: string = '1', url: string = '/frontoffice/mes-projets/1'): void {
    TestBed.configureTestingModule({
      imports: [ProjetDetailEnseignant],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: (key: string) => key === 'id' ? id : null } } },
        },
      ],
    });
    fixture = TestBed.createComponent(ProjetDetailEnseignant);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
  }

  afterEach(() => httpTesting.verify());

  it('should create and load project', () => {
    createComponent();
    fixture.detectChanges();
    const req = httpTesting.expectOne(`${API}/projets/1`);
    req.flush(mockDetails);
    expect(component.projet).toBeTruthy();
    expect(component.projet!.titre).toBe('Projet IA');
    expect(component.isLoading).toBe(false);
  });

  it('handles invalid id', () => {
    createComponent('abc');
    fixture.detectChanges();
    expect(component.errorMessage).toBeTruthy();
    expect(component.isLoading).toBe(false);
  });

  it('handles 403 error', () => {
    createComponent();
    fixture.detectChanges();
    const req = httpTesting.expectOne(`${API}/projets/1`);
    req.flush({}, { status: 403, statusText: 'Forbidden' });
    expect(component.errorMessage).toContain('accès');
    expect(component.isLoading).toBe(false);
  });

  it('handles 404 error', () => {
    createComponent();
    fixture.detectChanges();
    const req = httpTesting.expectOne(`${API}/projets/1`);
    req.flush({}, { status: 404, statusText: 'Not Found' });
    expect(component.errorMessage).toContain('introuvable');
    expect(component.isLoading).toBe(false);
  });

  it('sets default back link to mes-projets', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush(mockDetails);
    expect(component.backLink).toBe('/frontoffice/mes-projets');
    expect(component.backLabel).toBe('Mes projets');
  });

  it('setTab changes active tab', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush(mockDetails);
    expect(component.activeTab).toBe('infos');
    component.setTab('livrables');
    expect(component.activeTab).toBe('livrables');
  });
});
