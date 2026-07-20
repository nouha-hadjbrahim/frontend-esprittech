import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { EvaluationResponse } from '../../../core/models/evaluation.model';
import { ProjetDetails } from '../../../core/models/projet-catalogue.model';
import { AuthService } from '../../../core/services/auth.service';
import { ProjetDetailEnseignant } from './projet-detail-enseignant';
import { environment } from '../../../../environments/environment';

describe('ProjetDetailEnseignant', () => {
  let fixture: ComponentFixture<ProjetDetailEnseignant>;
  let component: ProjetDetailEnseignant;
  let httpTesting: HttpTestingController;

  const API = environment.apiUrl;

  const mockDetails: ProjetDetails = {
    id: 1, typeProjet: 'RDI', titre: 'Projet IA', description: 'Desc',
    objectifs: 'Objectifs', dateDebut: '2026-01-01', dateFin: '2026-12-31',
    statut: 'SOUMIS_EN_VALIDATION', score: 0, encadrantId: 1,
    encadrantNom: 'Jean Dupont', encadrantEmail: 'jean@esprit.tn',
    equipeId: 100, equipeNom: 'Equipe IA', chefEquipeNom: 'Alice Martin',
    chefValidateurId: null, chefValidateurNom: null, motifRefus: null,
    dateCreation: '2026-01-10T10:00:00', dateValidation: null,
    domaines: ['IA'], technologies: ['Python'], prerequis: ['Math'],
    sujetId: null,
  };

  const validDetails: ProjetDetails = {
    ...mockDetails,
    statut: 'VALIDE',
  };

  const candidateDetails: ProjetDetails = {
    ...mockDetails,
    statut: 'CANDIDAT_INDUSTRIALISATION_INTERNE',
    score: 82,
  };

  const evaluation: EvaluationResponse = {
    id: 10,
    sujetProjetId: null,
    projetCatalogueId: 1,
    evaluationContext: 'PROJET_CATALOGUE',
    scoreFinal: 82,
    eligibleIndustrialisation: true,
    bloqueParEliminatoire: false,
    dateCalcul: '2026-07-16T10:00:00',
    commentaire: 'Evaluation OK',
    calculatedBy: 'ROLE_ENSEIGNANT Jean Dupont',
    recalculationReason: 'Recalcul manuel projet catalogue',
    resultats: [],
    mlStatus: 'COMPLETED_WITH_WARNINGS',
    mlGlobalConfidence: 0.7975,
    processingStatus: 'PROCESSED',
    eligibilityStatus: 'ELIGIBLE',
  };

  const evaluationWithDetails: EvaluationResponse = {
    ...evaluation,
    resultats: [
      {
        id: 101,
        critereId: 20,
        critereLibelle: 'Qualite technique',
        typeCritere: 'NOTE',
        noteObtenue: 4.1,
        scorePondere: 16.4,
        poids: 4,
        commentaire: 'Architecture et tests couverts',
        evidenceSummary: 'Rapport technique et depot Git',
        confidence: 0.88,
        criterionStatus: 'SCORED',
        recommendations: ['Ajouter une preuve de deploiement'],
        ruleConfigured: true,
      },
    ],
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
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({
              id: 1,
              nom: 'Dupont',
              prenom: 'Jean',
              email: 'jean@esprit.tn',
              role: 'ROLE_ENSEIGNANT',
              typeUtilisateur: 'ENSEIGNANT',
              departement: null,
              enabled: true,
              createdAt: null,
            }),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(ProjetDetailEnseignant);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
  }

  afterEach(() => httpTesting.verify());

  /** Après le chargement du projet, le composant charge aussi ses livrables. */
  function flushLivrables(id: string = '1'): void {
    httpTesting.expectOne(`${API}/projets-catalogue/${id}/livrables`).flush([]);
  }

  function flushHistorique(id: string = '1'): void {
    httpTesting.expectOne(`${API}/historique/projet/${id}`).flush([]);
  }

  function flushProjectWithNoEvaluation(details: ProjetDetails = validDetails): void {
    httpTesting.expectOne(`${API}/projets/1`).flush(details);
    flushLivrables();
    httpTesting.expectOne(`${API}/projets-catalogue/1/evaluation`).flush(
      { message: 'Aucune evaluation trouvee' },
      { status: 404, statusText: 'Not Found' },
    );
    flushHistorique();
  }

  it('should create and load project', () => {
    createComponent();
    fixture.detectChanges();
    const req = httpTesting.expectOne(`${API}/projets/1`);
    req.flush(mockDetails);
    flushLivrables();
    httpTesting.expectOne(`${API}/projets-catalogue/1/evaluation`).flush(
      { message: 'Aucune evaluation trouvee' },
      { status: 404, statusText: 'Not Found' },
    );
    flushHistorique();
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
    flushLivrables();
    httpTesting.expectOne(`${API}/projets-catalogue/1/evaluation`).flush(
      { message: 'Aucune evaluation trouvee' },
      { status: 404, statusText: 'Not Found' },
    );
    flushHistorique();
    expect(component.backLink).toBe('/frontoffice/mes-projets');
    expect(component.backLabel).toBe('Mes projets');
  });

  it('setTab changes active tab', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush(mockDetails);
    flushLivrables();
    httpTesting.expectOne(`${API}/projets-catalogue/1/evaluation`).flush(
      { message: 'Aucune evaluation trouvee' },
      { status: 404, statusText: 'Not Found' },
    );
    flushHistorique();
    expect(component.activeTab).toBe('infos');
    component.setTab('livrables');
    expect(component.activeTab).toBe('livrables');
  });

  it('treats initial missing evaluation as empty state without technical error', () => {
    createComponent();
    fixture.detectChanges();

    flushProjectWithNoEvaluation();
    fixture.detectChanges();

    expect(component.evaluation).toBeNull();
    expect(component.evaluationError).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Aucune évaluation enregistrée');
  });

  it('shows score and criterion details for a VALIDE project with an evaluation', () => {
    createComponent();
    fixture.detectChanges();

    httpTesting.expectOne(`${API}/projets/1`).flush(validDetails);
    flushLivrables();
    httpTesting.expectOne(`${API}/projets-catalogue/1/evaluation`).flush(evaluationWithDetails);
    flushHistorique();
    fixture.detectChanges();

    expect(component.evaluation).toEqual(evaluationWithDetails);
    expect(fixture.nativeElement.textContent).toContain('82 / 100');
    expect(fixture.nativeElement.textContent).toContain('Qualite technique');
    expect(fixture.nativeElement.textContent).toContain('Rapport technique et depot Git');
  });

  it('shows persisted score and criterion details for a non-VALIDE project with an evaluation', () => {
    createComponent();
    fixture.detectChanges();

    httpTesting.expectOne(`${API}/projets/1`).flush(candidateDetails);
    flushLivrables();
    httpTesting.expectOne(`${API}/projets-catalogue/1/evaluation`).flush(evaluationWithDetails);
    flushHistorique();
    fixture.detectChanges();

    expect(component.projet?.statut).toBe('CANDIDAT_INDUSTRIALISATION_INTERNE');
    expect(component.canRecalculateScore).toBeFalse();
    expect(component.evaluation).toEqual(evaluationWithDetails);
    expect(fixture.nativeElement.textContent).toContain('82 / 100');
    expect(fixture.nativeElement.textContent).toContain('Qualite technique');
  });

  it('shows non calculated for a non-VALIDE project without an evaluation', () => {
    createComponent();
    fixture.detectChanges();

    flushProjectWithNoEvaluation(candidateDetails);
    fixture.detectChanges();

    expect(component.projet?.statut).toBe('CANDIDAT_INDUSTRIALISATION_INTERNE');
    expect(component.evaluation).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Non calculé');
  });

  it('keeps score and details visible after a status refresh changes VALIDE to another status', () => {
    createComponent();
    fixture.detectChanges();

    httpTesting.expectOne(`${API}/projets/1`).flush(validDetails);
    flushLivrables();
    httpTesting.expectOne(`${API}/projets-catalogue/1/evaluation`).flush(evaluationWithDetails);
    flushHistorique();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Qualite technique');

    (component as any).refreshProjetStatut();
    httpTesting.expectOne(`${API}/projets/1`).flush(candidateDetails);
    expect(component.evaluation).toEqual(evaluationWithDetails);
    httpTesting.expectOne(`${API}/projets-catalogue/1/evaluation`).flush(evaluationWithDetails);
    flushHistorique();
    fixture.detectChanges();

    expect(component.projet?.statut).toBe('CANDIDAT_INDUSTRIALISATION_INTERNE');
    expect(component.evaluation).toEqual(evaluationWithDetails);
    expect(fixture.nativeElement.textContent).toContain('82 / 100');
    expect(fixture.nativeElement.textContent).toContain('Qualite technique');
  });

  it('successful recalculation refreshes evaluation and starts one cooldown', fakeAsync(() => {
    createComponent();
    fixture.detectChanges();
    flushProjectWithNoEvaluation();

    component.recalculateScore();
    const post = httpTesting.expectOne(`${API}/projets-catalogue/1/calculer-score`);
    expect(post.request.method).toBe('POST');
    post.flush(evaluation);

    httpTesting.expectOne(`${API}/projets-catalogue/1/evaluation`).flush(evaluation);
    fixture.detectChanges();

    expect(component.evaluation).toEqual(evaluation);
    expect(component.evaluationError).toBe('');
    expect(component.scoreCooldownActive).toBeTrue();
    expect(fixture.nativeElement.textContent).not.toContain('Aucune évaluation enregistrée');
    expect(fixture.nativeElement.querySelectorAll('.tab-alert--warning').length).toBe(1);

    component.ngOnDestroy();
    tick(3000);
    expect(component.scoreCooldownRemaining).toBe(0);
  }));

  it('failed recalculation restores the button and does not start cooldown', () => {
    createComponent();
    fixture.detectChanges();
    flushProjectWithNoEvaluation();

    component.recalculateScore();
    const post = httpTesting.expectOne(`${API}/projets-catalogue/1/calculer-score`);
    post.flush(
      {
        code: 'EVALUATION_PERSISTENCE_FAILED',
        message: "L'evaluation a ete calculee mais n'a pas pu etre enregistree.",
      },
      { status: 500, statusText: 'Server Error' },
    );
    fixture.detectChanges();

    expect(component.recalculatingScore).toBeFalse();
    expect(component.scoreCooldownActive).toBeFalse();
    expect(component.evaluationError).toContain("n'a pas pu etre enregistree");
    expect(fixture.nativeElement.querySelectorAll('.tab-alert--danger').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.tab-alert--warning').length).toBe(0);
  });

  it('does not render duplicate cooldown alerts when already cooling down', () => {
    createComponent();
    fixture.detectChanges();
    flushProjectWithNoEvaluation();

    (component as any).startScoreCooldown(120);
    component.recalculateScore();
    fixture.detectChanges();

    expect(component.evaluationError).toBe('');
    expect(fixture.nativeElement.querySelectorAll('.tab-alert--warning').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.tab-alert--danger').length).toBe(0);
    component.ngOnDestroy();
  });
});
