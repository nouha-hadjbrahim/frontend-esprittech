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

  function flushValidProjectWithNoEvaluation(): void {
    httpTesting.expectOne(`${API}/projets/1`).flush(validDetails);
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
    flushHistorique();
    expect(component.backLink).toBe('/frontoffice/mes-projets');
    expect(component.backLabel).toBe('Mes projets');
  });

  it('setTab changes active tab', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush(mockDetails);
    flushLivrables();
    flushHistorique();
    expect(component.activeTab).toBe('infos');
    component.setTab('livrables');
    expect(component.activeTab).toBe('livrables');
  });

  it('treats initial missing evaluation as empty state without technical error', () => {
    createComponent();
    fixture.detectChanges();

    flushValidProjectWithNoEvaluation();
    fixture.detectChanges();

    expect(component.evaluation).toBeNull();
    expect(component.evaluationError).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Aucune évaluation enregistrée');
  });

  it('successful recalculation refreshes evaluation and starts one cooldown', fakeAsync(() => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();

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
    flushValidProjectWithNoEvaluation();

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
    flushValidProjectWithNoEvaluation();

    (component as any).startScoreCooldown(120);
    component.recalculateScore();
    fixture.detectChanges();

    expect(component.evaluationError).toBe('');
    expect(fixture.nativeElement.querySelectorAll('.tab-alert--warning').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.tab-alert--danger').length).toBe(0);
    component.ngOnDestroy();
  });

  it('falls back to sujet evaluation and livrables when catalogue has none', () => {
    const publishedFromSujet: ProjetDetails = {
      ...validDetails,
      sujetId: 42,
      score: 0,
    };
    const sujetEvaluation: EvaluationResponse = {
      ...evaluation,
      id: 99,
      sujetProjetId: 42,
      projetCatalogueId: null,
      evaluationContext: 'SUJET',
      scoreFinal: 91,
    };

    createComponent();
    fixture.detectChanges();

    httpTesting.expectOne(`${API}/projets/1`).flush(publishedFromSujet);
    httpTesting.expectOne(`${API}/projets-catalogue/1/livrables`).flush([]);
    httpTesting.expectOne(`${API}/projets/42/livrables`).flush([
      {
        id: 7,
        sujetProjetId: 42,
        projetTitre: 'Projet IA',
        typeLivrable: 'DOCUMENTATION',
        nom: 'Rapport final',
        description: null,
        originalFileName: 'rapport.pdf',
        objectName: 'obj-7',
        contentType: 'application/pdf',
        size: 2048,
        lienExterne: null,
        deposantId: 1,
        deposantNom: 'Jean Dupont',
        dateDepot: '2026-07-01T10:00:00',
        actif: true,
      },
    ]);
    httpTesting.expectOne(`${API}/sujets/42/affectations`).flush([]);
    httpTesting.expectOne(`${API}/sujet-projets/42`).flush({
      id: 42,
      titre: 'Projet IA',
      categorie: 'RDI',
      description: 'Desc',
      objectifs: 'Obj',
      prerequis: [],
      domaines: ['IA'],
      technologies: ['Python'],
      capaciteAccueil: 2,
      statut: 'REALISATION_TERMINEE',
      scoreFinal: 91,
      eligibleIndustrialisation: true,
      catalogue: true,
      encadrantId: 1,
      encadrantNom: 'Jean Dupont',
      encadrantEmail: 'jean@esprit.tn',
      equipeNom: 'Equipe IA',
      dateCreation: '2026-01-10T10:00:00',
      dateSoumission: null,
      dateValidation: null,
      dateDebutRealisation: null,
      dateTerminaison: '2026-07-01T10:00:00',
      motifInvalidation: null,
    });
    httpTesting.expectOne(`${API}/projets-catalogue/1/evaluation`).flush(
      { message: 'Aucune evaluation trouvee' },
      { status: 404, statusText: 'Not Found' },
    );
    httpTesting.expectOne(`${API}/projets/42/evaluation`).flush(sujetEvaluation);
    flushHistorique();
    fixture.detectChanges();

    expect(component.evaluation?.scoreFinal).toBe(91);
    expect(component.displayedScore).toBe(91);
    expect(component.livrables.length).toBe(1);
    expect(component.livrables[0].fromSujet).toBeTrue();
    expect(component.livrables[0].nom).toBe('Rapport final');
    expect(fixture.nativeElement.textContent).toContain('91');
  });
});
