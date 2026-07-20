import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { ProjetDetails } from '../../../core/models/projet-catalogue.model';
import { EvaluationResponse } from '../../../core/models/evaluation.model';
import { ProjetDetailCatalogue } from './projet-detail-catalogue';
import { environment } from '../../../../environments/environment';

describe('ProjetDetailCatalogue', () => {
  let fixture: ComponentFixture<ProjetDetailCatalogue>;
  let component: ProjetDetailCatalogue;
  let httpTesting: HttpTestingController;

  const API = environment.apiUrl;

  const mockDetails: ProjetDetails = {
    id: 1, sujetId: 42, typeProjet: 'RDI', titre: 'Projet IA', description: 'Desc',
    objectifs: 'Objectifs', dateDebut: '2026-01-01', dateFin: '2026-12-31',
    statut: 'VALIDE', score: 85, encadrantId: 1,
    encadrantNom: 'Jean Dupont', encadrantEmail: 'jean@esprit.tn',
    equipeId: 100, equipeNom: 'Equipe IA', chefEquipeNom: 'Alice Martin',
    chefValidateurId: 10, chefValidateurNom: 'Alice Martin', motifRefus: null,
    dateCreation: '2026-01-10T10:00:00', dateValidation: '2026-02-15T14:30:00',
    domaines: ['IA'], technologies: ['Python'], prerequis: ['Math'],
  };

  const mockEvaluation: EvaluationResponse = {
    id: 9,
    sujetProjetId: 42,
    scoreFinal: 85,
    eligibleIndustrialisation: true,
    bloqueParEliminatoire: false,
    hasEliminatoryWarnings: false,
    eliminatoryWarningsCount: 0,
    resultats: [],
    dateCalcul: '2026-03-01T10:00:00',
    commentaire: 'ok',
  };

  const inheritedLivrable = {
    id: 99,
    projetId: 1,
    projetTitre: 'Projet IA',
    typeLivrable: 'RAPPORT',
    nom: 'Rapport final',
    description: null,
    originalFileName: 'rapport.pdf',
    objectName: 'livrables/42/rapport.pdf',
    contentType: 'application/pdf',
    size: 10,
    lienExterne: null,
    deposantId: 1,
    deposantNom: 'Jean Dupont',
    dateDepot: '2026-02-01T10:00:00',
    actif: true,
    fromSujet: true,
  } as const;

  const directLivrable = {
    id: 12,
    projetId: 1,
    projetTitre: 'Projet IA',
    typeLivrable: 'DOCUMENTATION',
    nom: 'Documentation projet',
    description: null,
    originalFileName: 'doc.pdf',
    objectName: 'livrables-catalogue/1/doc.pdf',
    contentType: 'application/pdf',
    size: 20,
    lienExterne: null,
    deposantId: 1,
    deposantNom: 'Jean Dupont',
    dateDepot: '2026-03-01T10:00:00',
    actif: true,
    fromSujet: false,
  } as const;

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

  function flushDetailExtras(
    evaluation: EvaluationResponse | null = mockEvaluation,
    livrables = [inheritedLivrable],
  ): void {
    httpTesting.expectOne(`${API}/catalogue/1/evaluation`).flush(
      evaluation ?? {},
      evaluation ? { status: 200, statusText: 'OK' } : { status: 404, statusText: 'Not Found' },
    );
    httpTesting.expectOne(`${API}/catalogue/1/livrables`).flush(livrables);
  }

  afterEach(() => httpTesting.verify());

  it('should create and load project', () => {
    createComponent();
    fixture.detectChanges();
    const req = httpTesting.expectOne(`${API}/catalogue/1`);
    req.flush(mockDetails);
    flushDetailExtras();
    expect(component.projet).toBeTruthy();
    expect(component.projet!.score).toBe(85);
    expect(component.isLoading).toBe(false);
  });

  it('loads evaluation and sujet livrables after terminaison publish', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/catalogue/1`).flush(mockDetails);
    flushDetailExtras();
    expect(component.evaluation?.scoreFinal).toBe(85);
    expect(component.livrables.length).toBe(1);
    expect(component.livrables[0].fromSujet).toBe(true);
    expect(component.displayedScore).toBe('85');
  });

  it('shows Non calculé when no evaluation exists', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/catalogue/1`).flush({ ...mockDetails, score: 0 });
    httpTesting.expectOne(`${API}/catalogue/1/evaluation`).flush({}, { status: 404, statusText: 'Not Found' });
    httpTesting.expectOne(`${API}/catalogue/1/livrables`).flush([]);
    expect(component.evaluation).toBeNull();
    expect(component.displayedScore).toBe('Non calculé');
  });

  it('displays inherited and direct project deliverables together', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/catalogue/1`).flush(mockDetails);
    flushDetailExtras(mockEvaluation, [directLivrable, inheritedLivrable]);
    fixture.detectChanges();

    expect(component.livrables.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('doc.pdf');
    expect(fixture.nativeElement.textContent).toContain('rapport.pdf');
  });

  it('does not require a sujetProjet on the detail payload to show project deliverables', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/catalogue/1`).flush({ ...mockDetails, sujetId: null });
    flushDetailExtras(mockEvaluation, [directLivrable]);
    fixture.detectChanges();

    expect(component.errorMessage).toBe('');
    expect(component.livrables.length).toBe(1);
    expect(component.livrables[0].fromSujet).toBeFalse();
  });

  it('renders duplicate deliverables only once', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/catalogue/1`).flush(mockDetails);
    flushDetailExtras(mockEvaluation, [
      directLivrable,
      { ...inheritedLivrable, objectName: directLivrable.objectName, nom: 'Doublon' },
    ]);
    fixture.detectChanges();

    expect(component.livrables.length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.livrable-list__item').length).toBe(1);
    expect(component.livrables[0].nom).toBe('Documentation projet');
  });

  it('uses the published download endpoint with the original deliverable id and source flag', () => {
    createComponent();
    component.projet = mockDetails;

    expect(component.downloadLivrable(inheritedLivrable))
      .toBe(`${API}/catalogue/1/livrables/99/download?fromSujet=true`);
    expect(component.downloadLivrable(directLivrable))
      .toBe(`${API}/catalogue/1/livrables/12/download`);
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

  it('derives the porteur initial from encadrantNom', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/catalogue/1`).flush(mockDetails);
    flushDetailExtras();
    expect(component.encadrantInitiale).toBe('J');
  });
});
