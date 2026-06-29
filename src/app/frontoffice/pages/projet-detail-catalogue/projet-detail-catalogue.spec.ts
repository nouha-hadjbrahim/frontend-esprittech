import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { ProjetDetails } from '../../../core/models/projet-catalogue.model';
import { ProjetDetailCatalogue } from './projet-detail-catalogue';

describe('ProjetDetailCatalogue', () => {
  let fixture: ComponentFixture<ProjetDetailCatalogue>;
  let component: ProjetDetailCatalogue;
  let httpTesting: HttpTestingController;

  const API = 'http://localhost:8080/api';

  const mockDetails: ProjetDetails = {
    id: 1, typeProjet: 'RDI', titre: 'Projet IA', description: 'Desc',
    objectifs: 'Objectifs', dateDebut: '2026-01-01', dateFin: '2026-12-31',
    statut: 'VALIDE', score: 85, encadrantId: 1,
    encadrantNom: 'Jean Dupont', encadrantEmail: 'jean@esprit.tn',
    equipeId: 100, equipeNom: 'Equipe IA', chefValidateurId: 10,
    chefValidateurNom: 'Alice Martin', motifRefus: null,
    dateCreation: '2026-01-10T10:00:00', dateValidation: '2026-02-15T14:30:00',
    domaines: ['IA'], technologies: ['Python'], prerequis: ['Math'],
  };

  function createComponent(id: string = '1'): void {
    TestBed.configureTestingModule({
      imports: [ProjetDetailCatalogue],
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
    fixture = TestBed.createComponent(ProjetDetailCatalogue);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
  }

  afterEach(() => httpTesting.verify());

  it('should create and load project', () => {
    createComponent();
    fixture.detectChanges();
    const req = httpTesting.expectOne(`${API}/catalogue/1`);
    req.flush(mockDetails);
    expect(component.projet).toBeTruthy();
    expect(component.projet!.score).toBe(85);
    expect(component.isLoading).toBe(false);
  });

  it('handles invalid id', () => {
    createComponent('abc');
    fixture.detectChanges();
    expect(component.errorMessage).toBeTruthy();
    expect(component.isLoading).toBe(false);
  });

  it('handles load error', () => {
    createComponent();
    fixture.detectChanges();
    const req = httpTesting.expectOne(`${API}/catalogue/1`);
    req.error(new ProgressEvent('error'));
    expect(component.errorMessage).toContain('introuvable');
    expect(component.isLoading).toBe(false);
  });

  it('has 6 tabs', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/catalogue/1`).flush(mockDetails);
    expect(component.tabs.length).toBe(6);
    expect(component.tabs[0].id).toBe('infos');
  });

  it('activeTabLabel returns correct label', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/catalogue/1`).flush(mockDetails);
    expect(component.activeTabLabel).toBe('Informations');
    component.setTab('candidatures');
    expect(component.activeTabLabel).toBe('Candidatures');
  });

  it('setTab changes active tab', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/catalogue/1`).flush(mockDetails);
    component.setTab('livrables');
    expect(component.activeTab).toBe('livrables');
  });

  it('default active tab is infos', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/catalogue/1`).flush(mockDetails);
    expect(component.activeTab).toBe('infos');
  });
});
