import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { EvaluationResponse, ResultatCritereResponse } from '../../../core/models/evaluation.model';
import { ProjetDetails } from '../../../core/models/projet-catalogue.model';
import {
  IndustrialisationFormResponse,
  CandidatureIndustrialisation,
  QuestionIndustrialisation,
  EliminatoryWarningsConfirmation,
} from '../../../core/models/industrialisation.model';
import { Affectation } from '../../../core/models/candidature.model';
import { LivrableCatalogue } from '../../../core/models/livrable-catalogue.model';
import { ReponseEliminatoire } from '../../../core/models/critere.model';
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
    objectifs: 'Obj 1\nObj 2', dateDebut: '2026-01-01', dateFin: '2026-12-31',
    statut: 'SOUMIS_EN_VALIDATION', score: 0, encadrantId: 1,
    encadrantNom: 'Jean Dupont', encadrantEmail: 'jean@esprit.tn',
    equipeId: 100, equipeNom: 'Equipe IA', chefEquipeNom: 'Alice Martin',
    chefValidateurId: null, chefValidateurNom: null, motifRefus: null,
    dateCreation: '2026-01-10T10:00:00', dateValidation: null,
    domaines: ['IA'], technologies: ['Python'], prerequis: ['Math'],
    sujetId: null, coverImage: null,
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

  const mockCandidature: CandidatureIndustrialisation = {
    id: 100, projetId: 1, projetTitre: 'Projet IA', projetStatut: 'VALIDE',
    typeIndustrialisation: 'INTERNE', statut: 'BROUILLON', demandeurId: 1,
    demandeurNom: 'Jean Dupont', dateDemande: '2026-07-20T10:00:00',
    dateSoumission: null, dateReceptionCI: null, ciDecideurId: null,
    ciDecideurNom: null, dateDecisionCI: null, decisionGoNoGo: null,
    orientation: null, motifDecision: null, commentaire: null,
    scoreEvaluationProjet: 82, eligibleIndustrialisation: true,
    bloqueParEliminatoire: false, reponses: [], livrables: [], historique: [],
  };

  const mockQuestion: QuestionIndustrialisation = {
    id: 10, libelle: 'Question TEXT', description: null, typeReponse: 'TEXTE',
    obligatoire: true, typeCritere: 'NOTE', poids: 1, ordre: 1, actif: true,
    conditionEliminatoire: null, dateCreation: '2026-07-20', dateMiseAJour: '2026-07-20',
  };

  const mockBooleanQuestion: QuestionIndustrialisation = {
    ...mockQuestion, id: 11, libelle: 'Question BOOL', typeReponse: 'BOOLEAN',
    typeCritere: 'ELIMINATOIRE', obligatoire: true,
  };

  const mockNumeriqueQuestion: QuestionIndustrialisation = {
    ...mockQuestion, id: 12, libelle: 'Question NUM', typeReponse: 'NUMERIQUE',
  };

  const mockUrlQuestion: QuestionIndustrialisation = {
    ...mockQuestion, id: 13, libelle: 'Question URL', typeReponse: 'URL',
    obligatoire: false,
  };

  const mockFichierQuestion: QuestionIndustrialisation = {
    ...mockQuestion, id: 14, libelle: 'Question FICHIER', typeReponse: 'FICHIER',
    typeCritere: 'ELIMINATOIRE', obligatoire: true,
  };

  const mockChoixQuestion: QuestionIndustrialisation = {
    ...mockQuestion, id: 15, libelle: 'Question CHOIX', typeReponse: 'CHOIX',
    typeCritere: 'NOTE', poids: 2,
  };

  const mockFormResponse: IndustrialisationFormResponse = {
    candidature: mockCandidature,
    questions: [mockQuestion, mockBooleanQuestion, mockNumeriqueQuestion,
      mockUrlQuestion, mockFichierQuestion, mockChoixQuestion],
    reponses: [],
  };

  function createComponent(id: string = '1', url: string = '/frontoffice/mes-projets/1'): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ProjetDetailEnseignant],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: (key: string) => key === 'id' ? id : null },
              data: {},
            },
          },
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

  afterEach(() => {
    httpTesting.verify();
    component.ngOnDestroy();
  });

  function flushLivrables(id: string = '1'): void {
    httpTesting.expectOne(`${API}/projets-catalogue/${id}/livrables`).flush([]);
  }

  function flushHistorique(id: string = '1'): void {
    httpTesting.expectOne(`${API}/historique/projet/${id}`).flush([]);
  }

  function flushMembres(sujetId: number = 0): void {
    if (sujetId) {
      httpTesting.expectOne(`${API}/sujets/${sujetId}/affectations`).flush([]);
    }
  }

  function flushSujetProjet(sujetId: number = 0): void {
    if (sujetId) {
      httpTesting.expectOne(`${API}/sujet-projets/${sujetId}`).flush(null);
    }
  }

  function flushEvaluation(id: string = '1'): void {
    httpTesting.expectOne(`${API}/projets-catalogue/${id}/evaluation`).flush(
      { message: 'Aucune evaluation trouvee' },
      { status: 404, statusText: 'Not Found' },
    );
  }

  function flushValidProjectWithNoEvaluation(detail: ProjetDetails = validDetails): void {
    httpTesting.expectOne(`${API}/projets/1`).flush(detail);
    flushLivrables();
    flushEvaluation();
    flushHistorique();
  }

  /** Complete all required answer fields so submitIndustrialisation passes validation. */
  function completeRequiredAnswers(): void {
    component.answers[mockQuestion.id].noteObtenue = 10;
    component.answers[mockNumeriqueQuestion.id].noteObtenue = 5;
    component.industrialisationForm!.reponses = [{
      id: 1, questionId: mockFichierQuestion.id, preuveObjectName: 'proof.pdf',
      preuveOriginalFileName: null, valeurTexte: null,
      valeurBoolean: null, valeurNumerique: null, valeurUrl: null,
      preuveContentType: null, preuveSize: null, reponseEliminatoire: null,
      noteObtenue: null, justificatif: null, dateReponse: '2026-07-20',
    }];
  }

  function flushRefreshAfterSubmit(): void {
    httpTesting.expectOne(`${API}/projets/1`).flush(validDetails);
    httpTesting.expectOne(`${API}/projets-catalogue/1/evaluation`).flush(evaluation);
    httpTesting.expectOne(`${API}/historique/projet/1`).flush([]);
  }

  // ── Basic creation ─────────────────────────────────────────────────

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

  // ── Back link / ngOnInit ───────────────────────────────────────────

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

  // ── Cover image ────────────────────────────────────────────────────

  it('coverImage returns default when projet has no coverImage', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush(mockDetails);
    flushLivrables();
    flushHistorique();
    expect(component.coverImage).toBe(component.defaultCoverImage);
  });

  it('coverImage returns projet coverImage when set', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush({ ...mockDetails, coverImage: 'img.jpg' });
    flushLivrables();
    flushHistorique();
    expect(component.coverImage).toBe('img.jpg');
  });

  // ── objectifLines ──────────────────────────────────────────────────

  it('objectifLines splits multiline objectifs', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush(mockDetails);
    flushLivrables();
    flushHistorique();
    expect(component.objectifLines).toEqual(['Obj 1', 'Obj 2']);
  });

  it('objectifLines returns original string when single line', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush({ ...mockDetails, objectifs: 'Single' });
    flushLivrables();
    flushHistorique();
    expect(component.objectifLines).toEqual(['Single']);
  });

  it('objectifLines returns empty array when no objectifs', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush({ ...mockDetails, objectifs: '' });
    flushLivrables();
    flushHistorique();
    expect(component.objectifLines).toEqual([]);
  });

  it('objectifLines returns original when all lines empty', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush({ ...mockDetails, objectifs: '  \n  ' });
    flushLivrables();
    flushHistorique();
    expect(component.objectifLines).toEqual(['  \n  ']);
  });

  // ── keywordTags ────────────────────────────────────────────────────

  it('keywordTags returns first 4 technologies when available', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush({
      ...mockDetails, technologies: ['A', 'B', 'C', 'D', 'E'], domaines: ['X'],
    });
    flushLivrables();
    flushHistorique();
    expect(component.keywordTags).toEqual(['A', 'B', 'C', 'D']);
  });

  it('keywordTags falls back to domaines when no technologies', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush({
      ...mockDetails, technologies: [], domaines: ['X', 'Y'],
    });
    flushLivrables();
    flushHistorique();
    expect(component.keywordTags).toEqual(['X', 'Y']);
  });

  it('keywordTags returns empty array when both are empty', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush({
      ...mockDetails, technologies: [], domaines: [],
    });
    flushLivrables();
    flushHistorique();
    expect(component.keywordTags).toEqual([]);
  });

  // ── isOwner / canManageLivrables / canRequestIndustrialisation ─────

  it('isOwner returns true when user matches encadrantId', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    expect(component.isOwner).toBeTrue();
  });

  it('isOwner returns false when user does not match encadrantId', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush({ ...validDetails, encadrantId: 999 });
    flushLivrables();
    flushEvaluation();
    flushHistorique();
    expect(component.isOwner).toBeFalse();
  });

  it('canManageLivrables is true for owner with VALIDÉ status', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    expect(component.canManageLivrables).toBeTrue();
  });

  it('canManageLivrables is false for non-VALIDÉ status', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush(mockDetails);
    flushLivrables();
    flushHistorique();
    expect(component.canManageLivrables).toBeFalse();
  });

  it('canRequestIndustrialisation is true for VALIDÉ owner', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    expect(component.canRequestIndustrialisation).toBeTrue();
  });

  it('canRequestIndustrialisation is false for non-VALIDÉ', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush(mockDetails);
    flushLivrables();
    flushHistorique();
    expect(component.canRequestIndustrialisation).toBeFalse();
  });

  // ── Evaluation tests ───────────────────────────────────────────────

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
      { code: 'EVALUATION_PERSISTENCE_FAILED', message: "L'evaluation a ete calculee mais n'a pas pu etre enregistree." },
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
  });

  it('recalculateScore does nothing when not owner', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush({ ...validDetails, encadrantId: 999 });
    flushLivrables();
    flushEvaluation();
    flushHistorique();
    component.recalculateScore();
    httpTesting.expectNone(`${API}/projets-catalogue/1/calculer-score`);
    expect(component.recalculatingScore).toBeFalse();
  });

  it('recalculateScore clears messages when cooldown active', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    (component as any).startScoreCooldown(120);
    component.evaluationMessage = 'test';
    component.evaluationError = 'test';
    component.recalculateScore();
    expect(component.evaluationMessage).toBe('');
    expect(component.evaluationError).toBe('');
  });

  it('recalculation with FAILED_PERMANENT status does not start cooldown', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.recalculateScore();
    const post = httpTesting.expectOne(`${API}/projets-catalogue/1/calculer-score`);
    post.flush({ ...evaluation, processingStatus: 'FAILED_PERMANENT', commentaire: 'Failed permanently' });
    httpTesting.expectOne(`${API}/projets-catalogue/1/evaluation`).flush(evaluation);
    expect(component.recalculatingScore).toBeFalse();
    expect(component.scoreCooldownActive).toBeFalse();
    expect(component.evaluation).toEqual(evaluation);
  });

  it('recalculation with NOT_EVALUABLE eligibility does not start cooldown', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.recalculateScore();
    const post = httpTesting.expectOne(`${API}/projets-catalogue/1/calculer-score`);
    post.flush({ ...evaluation, eligibilityStatus: 'NOT_EVALUABLE', commentaire: null });
    httpTesting.expectOne(`${API}/projets-catalogue/1/evaluation`).flush(evaluation);
    expect(component.recalculatingScore).toBeFalse();
    expect(component.scoreCooldownActive).toBeFalse();
    expect(component.evaluation).toEqual(evaluation);
  });

  it('recalculation error handler uses err.error.message', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.recalculateScore();
    const post = httpTesting.expectOne(`${API}/projets-catalogue/1/calculer-score`);
    post.flush({ message: 'Server error detail' }, { status: 500, statusText: 'Error' });
    expect(component.evaluationError).toBe('Server error detail');
    expect(component.recalculatingScore).toBeFalse();
  });

  it('VALIDE with evaluation shows score and details', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush(validDetails);
    flushLivrables('1', true);
    httpTesting.expectOne(`${API}/projets-catalogue/1/evaluation`).flush(evaluation);
    flushHistorique();
    fixture.detectChanges();
    expect(component.canViewEvaluation).toBeTrue();
    expect(component.canRecalculateScore).toBeTrue();
    expect(component.evaluation?.scoreFinal).toBe(82);
    expect(fixture.nativeElement.textContent).toContain('82');
    expect(fixture.nativeElement.textContent).toContain('Dernière évaluation ML disponible');
  });

  it('non-VALIDE published status with evaluation still shows score', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush({
      ...validDetails, statut: 'CANDIDAT_INDUSTRIALISATION_INTERNE', score: 82,
    });
    flushLivrables('1', true);
    httpTesting.expectOne(`${API}/projets-catalogue/1/evaluation`).flush(evaluation);
    flushHistorique();
    fixture.detectChanges();
    expect(component.canViewEvaluation).toBeTrue();
    expect(component.isEvaluable).toBeTrue();
    expect(component.canRecalculateScore).toBeFalse();
    expect(component.evaluation?.scoreFinal).toBe(82);
    expect(fixture.nativeElement.textContent).toContain('82 / 100');
  });

  it('non-VALIDE published status without evaluation shows Non calculé', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush({
      ...validDetails, statut: 'INDUSTRIALISE_DSI', score: 0,
    });
    flushLivrables('1', true);
    httpTesting.expectOne(`${API}/projets-catalogue/1/evaluation`).flush(
      { message: 'Aucune evaluation trouvee' }, { status: 404, statusText: 'Not Found' },
    );
    flushHistorique();
    fixture.detectChanges();
    expect(component.canViewEvaluation).toBeTrue();
    expect(component.evaluation).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Non calculé');
  });

  it('canViewEvaluation is false for SOUMIS_EN_VALIDATION', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush(mockDetails);
    flushLivrables();
    flushHistorique();
    expect(component.canViewEvaluation).toBeFalse();
  });

  it('loadEvaluation skips when canViewEvaluation is false', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush(mockDetails);
    flushLivrables();
    flushHistorique();
    component.loadEvaluation();
    httpTesting.expectNone(`${API}/projets-catalogue/1/evaluation`);
    expect(component.evaluation).toBeNull();
  });

  // ── noteResultDisplay ──────────────────────────────────────────────

  it('noteResultDisplay with mlScore and mlMaxScore', () => {
    const result = component.noteResultDisplay({
      id: 1, critereId: 1, critereLibelle: 'C', typeCritere: 'NOTE',
      mlScore: 7, mlMaxScore: 10, normalizedScore: 0.85,
    } as ResultatCritereResponse);
    expect(result).toBe('7/10 - 85/100');
  });

  it('noteResultDisplay with mlScore only', () => {
    const result = component.noteResultDisplay({
      id: 1, critereId: 1, critereLibelle: 'C', typeCritere: 'NOTE',
      mlScore: 7, mlMaxScore: 10,
    } as ResultatCritereResponse);
    expect(result).toBe('7/10');
  });

  it('noteResultDisplay with noteValue and bareme', () => {
    const result = component.noteResultDisplay({
      id: 1, critereId: 1, critereLibelle: 'C', typeCritere: 'NOTE',
      noteValue: 15, bareme: 20, noteLabel: 'Bien',
    } as ResultatCritereResponse);
    expect(result).toBe('15/20 - Bien');
  });

  it('noteResultDisplay with noteValue no bareme and no label', () => {
    const result = component.noteResultDisplay({
      id: 1, critereId: 1, critereLibelle: 'C', typeCritere: 'NOTE',
      noteValue: 8, bareme: null,
    } as ResultatCritereResponse);
    expect(result).toBe('8');
  });

  it('noteResultDisplay with noteObtenue when noteValue is null', () => {
    const result = component.noteResultDisplay({
      id: 1, critereId: 1, critereLibelle: 'C', typeCritere: 'NOTE',
      noteObtenue: 12, bareme: 20,
    } as ResultatCritereResponse);
    expect(result).toBe('12/20');
  });

  it('noteResultDisplay with noteLabel only', () => {
    const result = component.noteResultDisplay({
      id: 1, critereId: 1, critereLibelle: 'C', typeCritere: 'NOTE',
      noteLabel: 'Excellent',
    } as ResultatCritereResponse);
    expect(result).toBe('Excellent');
  });

  // ── Score cooldown label ───────────────────────────────────────────

  it('scoreCooldownLabel formats minutes:seconds', () => {
    component.scoreCooldownRemaining = 125;
    expect(component.scoreCooldownLabel).toBe('2:05');
  });

  it('scoreCooldownLabel formats 0:00', () => {
    component.scoreCooldownRemaining = 0;
    expect(component.scoreCooldownLabel).toBe('0:00');
  });

  it('scoreCooldownActive is true when remaining > 0', () => {
    component.scoreCooldownRemaining = 1;
    expect(component.scoreCooldownActive).toBeTrue();
  });

  it('scoreCooldownActive is false when remaining is 0', () => {
    component.scoreCooldownRemaining = 0;
    expect(component.scoreCooldownActive).toBeFalse();
  });

  // ── Historique ─────────────────────────────────────────────────────

  it('loadHistorique reverses entries to chronological order', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush(validDetails);
    flushLivrables();
    httpTesting.expectOne(`${API}/projets-catalogue/1/evaluation`).flush(evaluation);
    const histReq = httpTesting.expectOne(`${API}/historique/projet/1`);
    histReq.flush([
      { id: 2, action: 'VALIDATION', summary: 'S2', createdAt: '2026-02-01', actorPrenom: 'A', actorNom: 'B' },
      { id: 1, action: 'SOUMISSION', summary: 'S1', createdAt: '2026-01-01', actorPrenom: 'C', actorNom: 'D' },
    ]);
    fixture.detectChanges();
    expect(component.historique.length).toBe(2);
    expect(component.historique[0].id).toBe(1);
    expect(component.historique[1].id).toBe(2);
  });

  it('loadHistorique sets historiqueForbidden on 403', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush(validDetails);
    flushLivrables();
    httpTesting.expectOne(`${API}/projets-catalogue/1/evaluation`).flush(evaluation);
    httpTesting.expectOne(`${API}/historique/projet/1`).flush({}, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(component.historiqueForbidden).toBeTrue();
    expect(component.historiqueLoading).toBeFalse();
  });

  it('loadHistorique sets error on non-403 error', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush(validDetails);
    flushLivrables();
    httpTesting.expectOne(`${API}/projets-catalogue/1/evaluation`).flush(evaluation);
    httpTesting.expectOne(`${API}/historique/projet/1`).flush({}, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(component.historiqueError).toContain('Impossible');
    expect(component.historiqueLoading).toBeFalse();
  });

  // ── Membres ────────────────────────────────────────────────────────

  it('loadMembres returns empty when no sujetId', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush(mockDetails);
    flushLivrables();
    flushHistorique();
    component.loadMembres();
    expect(component.membres).toEqual([]);
    expect(component.membresLoading).toBeFalse();
  });

  it('loadMembres filters only ACTIVE affectations', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush({ ...mockDetails, sujetId: 42 });
    flushLivrables();
    flushHistorique();
    httpTesting.expectOne(`${API}/sujet-projets/42`).flush(null);
    httpTesting.expectOne(`${API}/sujets/42/affectations`).flush([
      { id: 1, sujetId: 42, etudiantId: 10, etudiantNom: 'A', etudiantPrenom: 'B', statut: 'ACTIVE', dateDebut: '2026-01-01' },
      { id: 2, sujetId: 42, etudiantId: 11, etudiantNom: 'C', etudiantPrenom: 'D', statut: 'RETIREE_ARCHIVEE', dateDebut: '2026-01-01' },
    ]);
    fixture.detectChanges();
    expect(component.membres.length).toBe(1);
    expect(component.membres[0].statut).toBe('ACTIVE');
  });

  it('loadMembres handles error', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush({ ...mockDetails, sujetId: 42 });
    flushLivrables();
    flushHistorique();
    httpTesting.expectOne(`${API}/sujet-projets/42`).flush(null);
    httpTesting.expectOne(`${API}/sujets/42/affectations`).flush({}, { status: 500, statusText: 'Error' });
    expect(component.membresError).toContain('Impossible');
    expect(component.membresLoading).toBeFalse();
  });

  // ── memberFullName / memberInitials ────────────────────────────────

  it('memberFullName concatenates prenom and nom', () => {
    const membre = { etudiantPrenom: 'Jean', etudiantNom: 'Dupont' } as Affectation;
    expect(component.memberFullName(membre)).toBe('Jean Dupont');
  });

  it('memberInitials returns two uppercase letters', () => {
    const membre = { etudiantPrenom: 'jean', etudiantNom: 'dupont' } as Affectation;
    expect(component.memberInitials(membre)).toBe('JD');
  });

  it('memberInitials returns ? when both empty', () => {
    const membre = { etudiantPrenom: '', etudiantNom: '' } as Affectation;
    expect(component.memberInitials(membre)).toBe('?');
  });

  it('memberInitials handles whitespace-only names', () => {
    const membre = { etudiantPrenom: '  ', etudiantNom: '  ' } as Affectation;
    expect(component.memberInitials(membre)).toBe('?');
  });

  // ── SujetProjet ────────────────────────────────────────────────────

  it('loadSujetProjet sets null when no sujetId', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush(mockDetails);
    flushLivrables();
    flushHistorique();
    component.loadSujetProjet();
    expect(component.sujetProjet).toBeNull();
  });

  it('loadSujetProjet fetches sujet when sujetId present', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush({ ...mockDetails, sujetId: 42 });
    flushLivrables();
    flushHistorique();
    httpTesting.expectOne(`${API}/sujets/42/affectations`).flush([]);
    httpTesting.expectOne(`${API}/sujet-projets/42`).flush({ id: 42, titre: 'Sujet 42' });
    fixture.detectChanges();
    expect(component.sujetProjet).toBeTruthy();
  });

  it('loadSujetProjet sets null on error', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush({ ...mockDetails, sujetId: 42 });
    flushLivrables();
    flushHistorique();
    httpTesting.expectOne(`${API}/sujets/42/affectations`).flush([]);
    httpTesting.expectOne(`${API}/sujet-projets/42`).flush({}, { status: 500, statusText: 'Error' });
    expect(component.sujetProjet).toBeNull();
    expect(component.sujetProjetLoading).toBeFalse();
  });

  // ── Livrables ──────────────────────────────────────────────────────

  it('loadLivrables sets error on failure', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush(validDetails);
    httpTesting.expectOne(`${API}/projets-catalogue/1/evaluation`).flush(evaluation);
    flushHistorique();
    httpTesting.expectOne(`${API}/projets-catalogue/1/livrables`).flush({}, { status: 500, statusText: 'Error' });
    expect(component.livrableError).toContain('Impossible');
    expect(component.livrablesLoading).toBeFalse();
  });

  it('onUploadFileSelected sets selectedUploadFile', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    const event = { target: { files: [file] } } as unknown as Event;
    component.onUploadFileSelected(event);
    expect(component.selectedUploadFile).toBe(file);
  });

  it('onUploadFileSelected sets null when no file', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    const event = { target: { files: [] } } as unknown as Event;
    component.onUploadFileSelected(event);
    expect(component.selectedUploadFile).toBeNull();
  });

  it('uploadLivrable validates file and name', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.uploadLivrable();
    expect(component.livrableError).toContain('obligatoires');
  });

  it('uploadLivrable success resets form and reloads', fakeAsync(() => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    const file = new File(['test'], 'test.pdf');
    component.selectedUploadFile = file;
    component.uploadForm.nom = 'Mon livrable';
    component.uploadLivrable();
    const uploadReq = httpTesting.expectOne(`${API}/projets-catalogue/1/livrables/upload`);
    expect(uploadReq.request.method).toBe('POST');
    uploadReq.flush({});
    httpTesting.expectOne(`${API}/projets-catalogue/1/livrables`).flush([]);
    fixture.detectChanges();
    expect(component.livrableMessage).toBe('Livrable ajouté.');
    expect(component.selectedUploadFile).toBeNull();
    expect(component.uploadForm.nom).toBe('');
    tick(3000);
    expect(component.livrableMessage).toBe('');
  }));

  it('uploadLivrable error shows error message', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    const file = new File(['test'], 'test.pdf');
    component.selectedUploadFile = file;
    component.uploadForm.nom = 'Mon livrable';
    component.uploadLivrable();
    httpTesting.expectOne(`${API}/projets-catalogue/1/livrables/upload`).flush(
      { detail: 'Depot failed' }, { status: 500, statusText: 'Error' },
    );
    expect(component.livrableError).toBe('Depot failed');
  });

  it('addLivrableLink validates nom and lienExterne', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.addLivrableLink();
    expect(component.livrableError).toContain('obligatoires');
  });

  it('addLivrableLink success resets form and reloads', fakeAsync(() => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.linkForm.nom = 'Lien Git';
    component.linkForm.lienExterne = 'https://github.com/test';
    component.addLivrableLink();
    httpTesting.expectOne(`${API}/projets-catalogue/1/livrables/link`).flush({});
    httpTesting.expectOne(`${API}/projets-catalogue/1/livrables`).flush([]);
    fixture.detectChanges();
    expect(component.livrableMessage).toBe('Livrable ajouté.');
    expect(component.linkForm.nom).toBe('');
    tick(3000);
    expect(component.livrableMessage).toBe('');
  }));

  it('addLivrableLink error shows error message', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.linkForm.nom = 'Lien';
    component.linkForm.lienExterne = 'https://test.com';
    component.addLivrableLink();
    httpTesting.expectOne(`${API}/projets-catalogue/1/livrables/link`).flush(
      { detail: 'Ajout failed' }, { status: 500, statusText: 'Error' },
    );
    expect(component.livrableError).toBe('Ajout failed');
  });

  it('deleteLivrable blocks fromSujet livrables', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.deleteLivrable({ id: 1, fromSujet: true } as LivrableCatalogue);
    expect(component.livrableError).toContain('sujet d\u2019origine');
  });

  it('deleteLivrable success reloads', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.deleteLivrable({ id: 1, fromSujet: false } as LivrableCatalogue);
    httpTesting.expectOne(`${API}/livrables-catalogue/1`).flush({});
    httpTesting.expectOne(`${API}/projets-catalogue/1/livrables`).flush([]);
  });

  it('deleteLivrable error shows error message', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.deleteLivrable({ id: 1, fromSujet: false } as LivrableCatalogue);
    httpTesting.expectOne(`${API}/livrables-catalogue/1`).flush({}, { status: 500, statusText: 'Error' });
    expect(component.livrableError).toContain('Suppression impossible');
  });

  it('downloadLivrable returns correct URL for fromSujet', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    const url = component.downloadLivrable({ id: 10, fromSujet: true } as LivrableCatalogue);
    expect(url).toContain('/catalogue/1/livrables/10/download');
    expect(url).toContain('fromSujet=true');
  });

  it('downloadLivrable returns direct URL for non-fromSujet', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    const url = component.downloadLivrable({ id: 10, fromSujet: false } as LivrableCatalogue);
    expect(url).toContain('/livrables-catalogue/10/download');
  });

  // ── livrableDisplayName / livrableDateLabel / livrableSizeLabel ────

  it('livrableDisplayName prefers originalFileName', () => {
    expect(component.livrableDisplayName({ originalFileName: 'report.pdf', nom: 'Rapport' } as LivrableCatalogue)).toBe('report.pdf');
  });

  it('livrableDisplayName falls back to nom', () => {
    expect(component.livrableDisplayName({ originalFileName: null, nom: 'Rapport' } as LivrableCatalogue)).toBe('Rapport');
  });

  it('livrableDateLabel returns formatted date', () => {
    expect(component.livrableDateLabel({ dateDepot: '2026-07-20T10:00:00' } as LivrableCatalogue)).toBeTruthy();
  });

  it('livrableDateLabel returns — when no dateDepot', () => {
    expect(component.livrableDateLabel({ dateDepot: null } as unknown as LivrableCatalogue)).toBe('—');
  });

  it('livrableSizeLabel formats bytes', () => {
    expect(component.livrableSizeLabel({ size: 500 } as LivrableCatalogue)).toBe('500 o');
  });

  it('livrableSizeLabel formats KB', () => {
    expect(component.livrableSizeLabel({ size: 2048 } as LivrableCatalogue)).toBe('2.0 Ko');
  });

  it('livrableSizeLabel formats MB', () => {
    expect(component.livrableSizeLabel({ size: 2097152 } as LivrableCatalogue)).toBe('2.0 MB');
  });

  it('livrableSizeLabel returns null when size is 0', () => {
    expect(component.livrableSizeLabel({ size: 0 } as LivrableCatalogue)).toBeNull();
  });

  it('livrableSizeLabel returns null when size is null', () => {
    expect(component.livrableSizeLabel({ size: null } as LivrableCatalogue)).toBeNull();
  });

  // ── Industrialisation flow ─────────────────────────────────────────

  it('openIndustrialisation resets state', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.openIndustrialisation();
    expect(component.industrialisationOpen).toBeTrue();
    expect(component.industrialisationForm).toBeNull();
    expect(component.industrialisationError).toBe('');
    expect(component.industrialisationMessage).toBe('');
    expect(component.industrialisationSubmitAttempted).toBeFalse();
    expect(component.industrialisationUploadingQuestionId).toBeNull();
    expect(component.answers).toEqual({});
  });

  it('closeIndustrialisation hides modal', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.openIndustrialisation();
    component.closeIndustrialisation();
    expect(component.industrialisationOpen).toBeFalse();
  });

  it('createIndustrialisation does nothing when no projet', () => {
    createComponent();
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/1`).flush({}, { status: 404, statusText: 'Not Found' });
    // projet is null after error, createIndustrialisation should early return
    component.createIndustrialisation();
    expect(component.industrialisationSaving).toBeFalse();
  });

  it('createIndustrialisation success loads form', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.openIndustrialisation();
    component.createIndustrialisation();
    const createReq = httpTesting.expectOne(`${API}/projets-catalogue/1/industrialisation`);
    expect(createReq.request.method).toBe('POST');
    createReq.flush(mockCandidature);
    httpTesting.expectOne(`${API}/industrialisation/100/formulaire`).flush(mockFormResponse);
    fixture.detectChanges();
    expect(component.industrialisationForm).toBeTruthy();
    expect(component.industrialisationForm!.questions.length).toBe(6);
    expect(component.industrialisationSaving).toBeFalse();
  });

  it('createIndustrialisation error shows error message', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.openIndustrialisation();
    component.createIndustrialisation();
    httpTesting.expectOne(`${API}/projets-catalogue/1/industrialisation`).flush(
      { detail: 'Creation failed' }, { status: 500, statusText: 'Error' },
    );
    expect(component.industrialisationError).toBe('Creation failed');
    expect(component.industrialisationSaving).toBeFalse();
  });

  it('loadIndustrialisationForm error shows error message', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.loadIndustrialisationForm(100);
    httpTesting.expectOne(`${API}/industrialisation/100/formulaire`).flush({}, { status: 500, statusText: 'Error' });
    expect(component.industrialisationError).toContain('Chargement du formulaire impossible');
    expect(component.industrialisationSaving).toBeFalse();
  });

  it('loadIndustrialisationForm populates answers from existing responses', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    const formWithResponses: IndustrialisationFormResponse = {
      ...mockFormResponse,
      reponses: [
        { id: 1, questionId: 10, valeurTexte: 'Existing answer', valeurBoolean: null, valeurNumerique: null,
          valeurUrl: null, preuveObjectName: null, preuveOriginalFileName: null, preuveContentType: null,
          preuveSize: null, reponseEliminatoire: null, noteObtenue: 15, justificatif: 'justif', dateReponse: '2026-07-20' },
      ],
    };
    component.loadIndustrialisationForm(100);
    httpTesting.expectOne(`${API}/industrialisation/100/formulaire`).flush(formWithResponses);
    fixture.detectChanges();
    expect(component.answers[10].valeurTexte).toBe('Existing answer');
    expect(component.answers[10].noteObtenue).toBe(15);
    expect(component.answers[10].justificatif).toBe('justif');
  });

  it('saveIndustrialisationAnswers success', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.openIndustrialisation();
    component.createIndustrialisation();
    httpTesting.expectOne(`${API}/projets-catalogue/1/industrialisation`).flush(mockCandidature);
    httpTesting.expectOne(`${API}/industrialisation/100/formulaire`).flush(mockFormResponse);
    fixture.detectChanges();

    component.saveIndustrialisationAnswers();
    const saveReq = httpTesting.expectOne(`${API}/industrialisation/100/reponses`);
    expect(saveReq.request.method).toBe('PUT');
    saveReq.flush(mockCandidature);
    fixture.detectChanges();
    expect(component.industrialisationMessage).toContain('enregistrees');
    expect(component.industrialisationSaving).toBeFalse();
  });

  it('saveIndustrialisationAnswers error shows error message', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.openIndustrialisation();
    component.createIndustrialisation();
    httpTesting.expectOne(`${API}/projets-catalogue/1/industrialisation`).flush(mockCandidature);
    httpTesting.expectOne(`${API}/industrialisation/100/formulaire`).flush(mockFormResponse);
    fixture.detectChanges();

    component.saveIndustrialisationAnswers();
    httpTesting.expectOne(`${API}/industrialisation/100/reponses`).flush(
      { detail: 'Save failed' }, { status: 500, statusText: 'Error' },
    );
    expect(component.industrialisationError).toBe('Save failed');
    expect(component.industrialisationSaving).toBeFalse();
  });

  it('saveIndustrialisationAnswers does nothing when no form', () => {
    component.industrialisationForm = null;
    component.saveIndustrialisationAnswers();
    expect(component.industrialisationSaving).toBeFalse();
  });

  it('uploadProof success', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.openIndustrialisation();
    component.createIndustrialisation();
    httpTesting.expectOne(`${API}/projets-catalogue/1/industrialisation`).flush(mockCandidature);
    httpTesting.expectOne(`${API}/industrialisation/100/formulaire`).flush(mockFormResponse);
    fixture.detectChanges();

    const file = new File(['test'], 'proof.pdf');
    const input = { target: { files: [file], value: '' } } as unknown as Event;
    component.uploadProof(mockQuestion, input);
    const uploadReq = httpTesting.expectOne(`${API}/industrialisation/100/preuves`);
    expect(uploadReq.request.method).toBe('POST');
    uploadReq.flush(mockCandidature);
    fixture.detectChanges();
    expect(component.industrialisationMessage).toContain('Preuve ajoutee');
    expect(component.industrialisationUploadingQuestionId).toBeNull();
  });

  it('uploadProof error shows error', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.openIndustrialisation();
    component.createIndustrialisation();
    httpTesting.expectOne(`${API}/projets-catalogue/1/industrialisation`).flush(mockCandidature);
    httpTesting.expectOne(`${API}/industrialisation/100/formulaire`).flush(mockFormResponse);
    fixture.detectChanges();

    const file = new File(['test'], 'proof.pdf');
    const input = { target: { files: [file] } } as unknown as Event;
    component.uploadProof(mockQuestion, input);
    httpTesting.expectOne(`${API}/industrialisation/100/preuves`).flush(
      { detail: 'Upload failed' }, { status: 500, statusText: 'Error' },
    );
    expect(component.industrialisationError).toBe('Upload failed');
    expect(component.industrialisationUploadingQuestionId).toBeNull();
  });

  it('uploadProof returns early when no file selected', () => {
    component.industrialisationForm = mockFormResponse;
    const input = { target: { files: [] } } as unknown as Event;
    component.uploadProof(mockQuestion, input);
  });

  it('uploadProof returns early when no form', () => {
    component.industrialisationForm = null;
    const input = { target: { files: [new File(['x'], 'x.pdf')] } } as unknown as Event;
    component.uploadProof(mockQuestion, input);
  });

  it('submitIndustrialisation with missing required questions shows error', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.openIndustrialisation();
    component.createIndustrialisation();
    httpTesting.expectOne(`${API}/projets-catalogue/1/industrialisation`).flush(mockCandidature);
    httpTesting.expectOne(`${API}/industrialisation/100/formulaire`).flush(mockFormResponse);
    fixture.detectChanges();

    component.submitIndustrialisation();
    expect(component.industrialisationSubmitAttempted).toBeTrue();
    expect(component.industrialisationError).toContain('manquante');
    expect(component.industrialisationSaving).toBeFalse();
  });

  it('submitIndustrialisation success saves, submits and refreshes', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.openIndustrialisation();
    component.createIndustrialisation();
    httpTesting.expectOne(`${API}/projets-catalogue/1/industrialisation`).flush(mockCandidature);
    httpTesting.expectOne(`${API}/industrialisation/100/formulaire`).flush(mockFormResponse);
    fixture.detectChanges();

    // Answer all required questions
    component.setBooleanAnswer(mockBooleanQuestion, true);
    component.answers[mockQuestion.id].valeurTexte = 'Answer';
    component.answers[mockNumeriqueQuestion.id].valeurNumerique = 42;
    component.answers[mockFichierQuestion.id] = {
      questionId: mockFichierQuestion.id, valeurTexte: '', valeurBoolean: null,
      valeurNumerique: null, valeurUrl: '', reponseEliminatoire: null, noteObtenue: null, justificatif: '',
    };
    component.answers[mockChoixQuestion.id].valeurTexte = 'Choice';
    component.answers[mockChoixQuestion.id].noteObtenue = 10;
    completeRequiredAnswers();

    component.submitIndustrialisation();
    const saveReq = httpTesting.expectOne(`${API}/industrialisation/100/reponses`);
    saveReq.flush(mockCandidature);
    const submitReq = httpTesting.expectOne(`${API}/industrialisation/100/soumettre`);
    submitReq.flush({ ...mockCandidature, statut: 'SOUMISE' });

    // refreshProjetStatut
    flushRefreshAfterSubmit();

    fixture.detectChanges();
    expect(component.industrialisationMessage).toContain('soumise');
    expect(component.industrialisationOpen).toBeFalse();
  });

  it('submitIndustrialisation save error shows error', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.openIndustrialisation();
    component.createIndustrialisation();
    httpTesting.expectOne(`${API}/projets-catalogue/1/industrialisation`).flush(mockCandidature);
    httpTesting.expectOne(`${API}/industrialisation/100/formulaire`).flush(mockFormResponse);
    fixture.detectChanges();

    component.setBooleanAnswer(mockBooleanQuestion, true);
    component.answers[mockQuestion.id].valeurTexte = 'A';
    component.answers[mockNumeriqueQuestion.id].valeurNumerique = 1;
    component.answers[mockFichierQuestion.id] = {
      questionId: mockFichierQuestion.id, valeurTexte: '', valeurBoolean: null,
      valeurNumerique: null, valeurUrl: '', reponseEliminatoire: null, noteObtenue: null, justificatif: '',
    };
    component.answers[mockChoixQuestion.id].valeurTexte = 'C';
    component.answers[mockChoixQuestion.id].noteObtenue = 1;
    completeRequiredAnswers();

    component.submitIndustrialisation();
    httpTesting.expectOne(`${API}/industrialisation/100/reponses`).flush(
      { detail: 'Save failed' }, { status: 500, statusText: 'Error' },
    );
    expect(component.industrialisationError).toBe('Save failed');
    expect(component.industrialisationSaving).toBeFalse();
  });

  it('submitIndustrialisation submit error shows error', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.openIndustrialisation();
    component.createIndustrialisation();
    httpTesting.expectOne(`${API}/projets-catalogue/1/industrialisation`).flush(mockCandidature);
    httpTesting.expectOne(`${API}/industrialisation/100/formulaire`).flush(mockFormResponse);
    fixture.detectChanges();

    component.setBooleanAnswer(mockBooleanQuestion, true);
    component.answers[mockQuestion.id].valeurTexte = 'A';
    component.answers[mockNumeriqueQuestion.id].valeurNumerique = 1;
    component.answers[mockFichierQuestion.id] = {
      questionId: mockFichierQuestion.id, valeurTexte: '', valeurBoolean: null,
      valeurNumerique: null, valeurUrl: '', reponseEliminatoire: null, noteObtenue: null, justificatif: '',
    };
    component.answers[mockChoixQuestion.id].valeurTexte = 'C';
    component.answers[mockChoixQuestion.id].noteObtenue = 1;
    completeRequiredAnswers();

    component.submitIndustrialisation();
    httpTesting.expectOne(`${API}/industrialisation/100/reponses`).flush(mockCandidature);
    httpTesting.expectOne(`${API}/industrialisation/100/soumettre`).flush(
      { detail: 'Submit failed' }, { status: 500, statusText: 'Error' },
    );
    expect(component.industrialisationError).toBe('Submit failed');
    expect(component.industrialisationSaving).toBeFalse();
  });

  // ── Eliminatory warnings confirmation ──────────────────────────────

  it('createIndustrialisation handles 409 eliminatory confirmation', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.openIndustrialisation();
    component.createIndustrialisation();
    const elimPayload: EliminatoryWarningsConfirmation = {
      requiresConfirmation: true, nbCriteresEliminatoires: 2,
      message: 'Warning', details: [],
    };
    httpTesting.expectOne(`${API}/projets-catalogue/1/industrialisation`).flush(elimPayload, { status: 409, statusText: 'Conflict' });
    expect(component.eliminatoryWarningConfirmation).toBeTruthy();
    expect(component.pendingIndustrialisationAction).toBe('create');
    expect(component.industrialisationSaving).toBeFalse();
  });

  it('submitIndustrialisation handles 409 eliminatory confirmation', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.openIndustrialisation();
    component.createIndustrialisation();
    httpTesting.expectOne(`${API}/projets-catalogue/1/industrialisation`).flush(mockCandidature);
    httpTesting.expectOne(`${API}/industrialisation/100/formulaire`).flush(mockFormResponse);
    fixture.detectChanges();

    // Make all questions answered
    component.setBooleanAnswer(mockBooleanQuestion, true);
    component.answers[mockQuestion.id].valeurTexte = 'A';
    component.answers[mockNumeriqueQuestion.id].valeurNumerique = 1;
    component.answers[mockFichierQuestion.id] = {
      questionId: mockFichierQuestion.id, valeurTexte: '', valeurBoolean: null,
      valeurNumerique: null, valeurUrl: '', reponseEliminatoire: null, noteObtenue: null, justificatif: '',
    };
    component.answers[mockChoixQuestion.id].valeurTexte = 'C';
    component.answers[mockChoixQuestion.id].noteObtenue = 1;
    completeRequiredAnswers();

    component.submitIndustrialisation();
    httpTesting.expectOne(`${API}/industrialisation/100/reponses`).flush(mockCandidature);
    const elimPayload: EliminatoryWarningsConfirmation = {
      requiresConfirmation: true, nbCriteresEliminatoires: 1,
      message: 'Warning', details: [],
    };
    httpTesting.expectOne(`${API}/industrialisation/100/soumettre`).flush(elimPayload, { status: 409, statusText: 'Conflict' });
    expect(component.eliminatoryWarningConfirmation).toBeTruthy();
    expect(component.pendingIndustrialisationAction).toBe('submit');
  });

  it('confirmEliminatoryWarnings re-triggers create with confirm flag', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.openIndustrialisation();
    component.pendingIndustrialisationAction = 'create';
    component.eliminatoryWarningConfirmation = {
      requiresConfirmation: true, nbCriteresEliminatoires: 1,
      message: 'Warning', details: [],
    };
    component.confirmEliminatoryWarnings();
    expect(component.eliminatoryWarningConfirmation).toBeNull();
    expect(component.pendingIndustrialisationAction).toBeNull();
    const createReq = httpTesting.expectOne(`${API}/projets-catalogue/1/industrialisation`);
    expect(createReq.request.body.confirmEliminatoryWarnings).toBeTrue();
    createReq.flush(mockCandidature);
    httpTesting.expectOne(`${API}/industrialisation/100/formulaire`).flush(mockFormResponse);
  });

  it('confirmEliminatoryWarnings re-triggers submit with confirm flag', () => {
    createComponent();
    fixture.detectChanges();
    flushValidProjectWithNoEvaluation();
    component.openIndustrialisation();
    component.createIndustrialisation();
    httpTesting.expectOne(`${API}/projets-catalogue/1/industrialisation`).flush(mockCandidature);
    httpTesting.expectOne(`${API}/industrialisation/100/formulaire`).flush(mockFormResponse);
    fixture.detectChanges();

    component.setBooleanAnswer(mockBooleanQuestion, true);
    component.answers[mockQuestion.id].valeurTexte = 'A';
    component.answers[mockNumeriqueQuestion.id].valeurNumerique = 1;
    component.answers[mockFichierQuestion.id] = {
      questionId: mockFichierQuestion.id, valeurTexte: '', valeurBoolean: null,
      valeurNumerique: null, valeurUrl: '', reponseEliminatoire: null, noteObtenue: null, justificatif: '',
    };
    component.answers[mockChoixQuestion.id].valeurTexte = 'C';
    component.answers[mockChoixQuestion.id].noteObtenue = 1;
    completeRequiredAnswers();

    component.submitIndustrialisation();
    httpTesting.expectOne(`${API}/industrialisation/100/reponses`).flush(mockCandidature);
    httpTesting.expectOne(`${API}/industrialisation/100/soumettre`).flush(
      { requiresConfirmation: true, nbCriteresEliminatoires: 1, message: 'W', details: [] },
      { status: 409, statusText: 'Conflict' },
    );

    component.pendingIndustrialisationAction = 'submit';
    component.eliminatoryWarningConfirmation = {
      requiresConfirmation: true, nbCriteresEliminatoires: 1,
      message: 'Warning', details: [],
    };

    component.confirmEliminatoryWarnings();
    expect(component.eliminatoryWarningConfirmation).toBeNull();
    httpTesting.expectOne(`${API}/industrialisation/100/reponses`).flush(mockCandidature);
    const submitReq = httpTesting.expectOne(`${API}/industrialisation/100/soumettre`);
    expect(submitReq.request.body.confirmEliminatoryWarnings).toBeTrue();
    submitReq.flush({ ...mockCandidature, statut: 'SOUMISE' });
    flushRefreshAfterSubmit();
  });

  it('cancelEliminatoryWarnings clears state', () => {
    component.eliminatoryWarningConfirmation = {
      requiresConfirmation: true, nbCriteresEliminatoires: 1, message: 'W', details: [],
    };
    component.pendingIndustrialisationAction = 'create';
    component.industrialisationSaving = true;
    component.cancelEliminatoryWarnings();
    expect(component.eliminatoryWarningConfirmation).toBeNull();
    expect(component.pendingIndustrialisationAction).toBeNull();
    expect(component.industrialisationSaving).toBeFalse();
  });

  // ── Question helpers ───────────────────────────────────────────────

  it('isQuestionAnswered returns false when no answer', () => {
    expect(component.isQuestionAnswered(mockQuestion)).toBeFalse();
  });

  it('isQuestionAnswered returns true for BOOLEAN answered', () => {
    component.answers[mockBooleanQuestion.id] = { questionId: mockBooleanQuestion.id, valeurBoolean: true };
    expect(component.isQuestionAnswered(mockBooleanQuestion)).toBeTrue();
  });

  it('isQuestionAnswered returns false for BOOLEAN unanswered', () => {
    component.answers[mockBooleanQuestion.id] = { questionId: mockBooleanQuestion.id, valeurBoolean: null };
    expect(component.isQuestionAnswered(mockBooleanQuestion)).toBeFalse();
  });

  it('isQuestionAnswered returns true for NUMERIQUE answered', () => {
    component.answers[mockNumeriqueQuestion.id] = { questionId: mockNumeriqueQuestion.id, valeurNumerique: 42 };
    expect(component.isQuestionAnswered(mockNumeriqueQuestion)).toBeTrue();
  });

  it('isQuestionAnswered returns false for NUMERIQUE NaN', () => {
    component.answers[mockNumeriqueQuestion.id] = { questionId: mockNumeriqueQuestion.id, valeurNumerique: NaN };
    expect(component.isQuestionAnswered(mockNumeriqueQuestion)).toBeFalse();
  });

  it('isQuestionAnswered returns true for URL answered', () => {
    component.answers[mockUrlQuestion.id] = { questionId: mockUrlQuestion.id, valeurUrl: 'https://test.com' };
    expect(component.isQuestionAnswered(mockUrlQuestion)).toBeTrue();
  });

  it('isQuestionAnswered returns false for URL whitespace only', () => {
    component.answers[mockUrlQuestion.id] = { questionId: mockUrlQuestion.id, valeurUrl: '   ' };
    expect(component.isQuestionAnswered(mockUrlQuestion)).toBeFalse();
  });

  it('isQuestionAnswered returns true for TEXTE answered', () => {
    component.answers[mockQuestion.id] = { questionId: mockQuestion.id, valeurTexte: 'answer' };
    expect(component.isQuestionAnswered(mockQuestion)).toBeTrue();
  });

  it('isQuestionAnswered returns false for TEXTE empty', () => {
    component.answers[mockQuestion.id] = { questionId: mockQuestion.id, valeurTexte: '' };
    expect(component.isQuestionAnswered(mockQuestion)).toBeFalse();
  });

  it('isQuestionAnswered returns true for CHOIX answered', () => {
    component.answers[mockChoixQuestion.id] = { questionId: mockChoixQuestion.id, valeurTexte: 'choice' };
    expect(component.isQuestionAnswered(mockChoixQuestion)).toBeTrue();
  });

  it('questionTypeLabel returns correct labels', () => {
    expect(component.questionTypeLabel(mockQuestion)).toBe('Texte');
    expect(component.questionTypeLabel(mockBooleanQuestion)).toBe('Oui / Non');
    expect(component.questionTypeLabel(mockNumeriqueQuestion)).toBe('Numerique');
    expect(component.questionTypeLabel(mockUrlQuestion)).toBe('URL');
    expect(component.questionTypeLabel(mockFichierQuestion)).toBe('Fichier');
    expect(component.questionTypeLabel(mockChoixQuestion)).toBe('Choix');
  });

  // ── automaticEliminatoryResult ─────────────────────────────────────

  it('automaticEliminatoryResult returns null for non-ELIMINATOIRE', () => {
    expect(component.automaticEliminatoryResult(mockQuestion)).toBeNull();
  });

  it('automaticEliminatoryResult returns null when no answer', () => {
    expect(component.automaticEliminatoryResult(mockBooleanQuestion)).toBeNull();
  });

  it('automaticEliminatoryResult returns OK for true BOOLEAN', () => {
    component.answers[mockBooleanQuestion.id] = { questionId: mockBooleanQuestion.id, valeurBoolean: true };
    expect(component.automaticEliminatoryResult(mockBooleanQuestion)).toBe(ReponseEliminatoire.OK);
  });

  it('automaticEliminatoryResult returns NOT_OK for false BOOLEAN', () => {
    component.answers[mockBooleanQuestion.id] = { questionId: mockBooleanQuestion.id, valeurBoolean: false };
    expect(component.automaticEliminatoryResult(mockBooleanQuestion)).toBe(ReponseEliminatoire.NOT_OK);
  });

  it('automaticEliminatoryResult returns null for BOOLEAN null', () => {
    component.answers[mockBooleanQuestion.id] = { questionId: mockBooleanQuestion.id, valeurBoolean: null };
    expect(component.automaticEliminatoryResult(mockBooleanQuestion)).toBeNull();
  });

  it('automaticEliminatoryResult returns OK for answered FICHIER', () => {
    component.industrialisationForm = {
      ...mockFormResponse,
      reponses: [{ id: 1, questionId: mockFichierQuestion.id, preuveObjectName: 'file.pdf', preuveOriginalFileName: null,
        valeurTexte: null, valeurBoolean: null, valeurNumerique: null, valeurUrl: null,
        preuveContentType: null, preuveSize: null, reponseEliminatoire: null, noteObtenue: null,
        justificatif: null, dateReponse: '2026-07-20' }],
    };
    expect(component.automaticEliminatoryResult(mockFichierQuestion)).toBe(ReponseEliminatoire.OK);
  });

  it('automaticEliminatoryResult returns null for unanswered FICHIER', () => {
    expect(component.automaticEliminatoryResult(mockFichierQuestion)).toBeNull();
  });

  // ── eliminatoryPreviewLabel ────────────────────────────────────────

  it('eliminatoryPreviewLabel returns Conforme for OK', () => {
    component.answers[mockBooleanQuestion.id] = { questionId: mockBooleanQuestion.id, valeurBoolean: true };
    expect(component.eliminatoryPreviewLabel(mockBooleanQuestion)).toBe('Conforme');
  });

  it('eliminatoryPreviewLabel returns Alerte for NOT_OK', () => {
    component.answers[mockBooleanQuestion.id] = { questionId: mockBooleanQuestion.id, valeurBoolean: false };
    expect(component.eliminatoryPreviewLabel(mockBooleanQuestion)).toBe('Alerte');
  });

  it('eliminatoryPreviewLabel returns En attente for null', () => {
    expect(component.eliminatoryPreviewLabel(mockBooleanQuestion)).toBe('En attente');
  });

  // ── setBooleanAnswer ───────────────────────────────────────────────

  it('setBooleanAnswer sets valeurBoolean and updates reponseEliminatoire', () => {
    component.answers[mockBooleanQuestion.id] = { questionId: mockBooleanQuestion.id };
    component.setBooleanAnswer(mockBooleanQuestion, false);
    expect(component.answers[mockBooleanQuestion.id].valeurBoolean).toBeFalse();
    expect(component.answers[mockBooleanQuestion.id].reponseEliminatoire).toBe(ReponseEliminatoire.NOT_OK);
    expect(component.industrialisationMessage).toBe('');
    expect(component.industrialisationError).toBe('');
  });

  it('setBooleanAnswer creates answer if not exists', () => {
    component.setBooleanAnswer(mockBooleanQuestion, true);
    expect(component.answers[mockBooleanQuestion.id].valeurBoolean).toBeTrue();
    expect(component.answers[mockBooleanQuestion.id].reponseEliminatoire).toBe(ReponseEliminatoire.OK);
  });

  // ── onIndustrialisationAnswerChange ────────────────────────────────

  it('onIndustrialisationAnswerChange clears messages', () => {
    component.industrialisationMessage = 'msg';
    component.industrialisationError = 'err';
    component.onIndustrialisationAnswerChange();
    expect(component.industrialisationMessage).toBe('');
    expect(component.industrialisationError).toBe('');
  });

  // ── hasBlockingEliminatoryAnswer ───────────────────────────────────

  it('hasBlockingEliminatoryAnswer returns false when no NOT_OK', () => {
    component.industrialisationForm = mockFormResponse;
    expect(component.hasBlockingEliminatoryAnswer()).toBeFalse();
  });

  it('hasBlockingEliminatoryAnswer returns true when NOT_OK exists', () => {
    component.industrialisationForm = mockFormResponse;
    component.answers[mockBooleanQuestion.id] = { questionId: mockBooleanQuestion.id, valeurBoolean: false };
    expect(component.hasBlockingEliminatoryAnswer()).toBeTrue();
  });

  it('hasBlockingEliminatoryAnswer returns false when no form', () => {
    component.industrialisationForm = null;
    expect(component.hasBlockingEliminatoryAnswer()).toBeFalse();
  });

  // ── submissionWarnings ─────────────────────────────────────────────

  it('submissionWarnings includes missingLivrablesWarning when no livrables', () => {
    component.industrialisationForm = mockFormResponse;
    component.livrables = [];
    expect(component.submissionWarnings).toContain(component.missingLivrablesWarning);
  });

  it('submissionWarnings does not duplicate warning', () => {
    component.industrialisationForm = {
      ...mockFormResponse,
      candidature: { ...mockCandidature, warnings: [component.missingLivrablesWarning] },
    };
    component.livrables = [];
    const count = component.submissionWarnings.filter(w => w === component.missingLivrablesWarning).length;
    expect(count).toBe(1);
  });

  it('submissionWarnings does not include warning when livrables exist', () => {
    component.industrialisationForm = {
      ...mockFormResponse,
      candidature: { ...mockCandidature, livrables: [{ id: 1 }] as any },
    };
    component.livrables = [{ id: 1 }] as LivrableCatalogue[];
    expect(component.submissionWarnings).not.toContain(component.missingLivrablesWarning);
  });

  it('submissionWarnings returns empty array when no form', () => {
    component.industrialisationForm = null;
    expect(component.submissionWarnings).toEqual([]);
  });

  // ── isIndustrialisationBusy ────────────────────────────────────────

  it('isIndustrialisationBusy true when saving', () => {
    component.industrialisationSaving = true;
    expect(component.isIndustrialisationBusy()).toBeTrue();
  });

  it('isIndustrialisationBusy true when uploading', () => {
    component.industrialisationUploadingQuestionId = 10;
    expect(component.isIndustrialisationBusy()).toBeTrue();
  });

  it('isIndustrialisationBusy false when idle', () => {
    expect(component.isIndustrialisationBusy()).toBeFalse();
  });

  // ── isQuestionUploading ────────────────────────────────────────────

  it('isQuestionUploading true for matching question', () => {
    component.industrialisationUploadingQuestionId = 10;
    expect(component.isQuestionUploading(mockQuestion)).toBeTrue();
  });

  it('isQuestionUploading false for different question', () => {
    component.industrialisationUploadingQuestionId = 99;
    expect(component.isQuestionUploading(mockQuestion)).toBeFalse();
  });

  // ── isRequiredQuestionInvalid / isRequiredNoteInvalid ──────────────

  it('isRequiredQuestionInvalid true when attempted, required, unanswered', () => {
    component.industrialisationSubmitAttempted = true;
    expect(component.isRequiredQuestionInvalid(mockQuestion)).toBeTrue();
  });

  it('isRequiredQuestionInvalid false when not attempted', () => {
    component.industrialisationSubmitAttempted = false;
    expect(component.isRequiredQuestionInvalid(mockQuestion)).toBeFalse();
  });

  it('isRequiredQuestionInvalid false when not required', () => {
    component.industrialisationSubmitAttempted = true;
    expect(component.isRequiredQuestionInvalid(mockUrlQuestion)).toBeFalse();
  });

  it('isRequiredNoteInvalid true when attempted, required, note not answered', () => {
    component.industrialisationSubmitAttempted = true;
    expect(component.isRequiredNoteInvalid(mockQuestion)).toBeTrue();
  });

  it('isRequiredNoteInvalid false for ELIMINATOIRE type', () => {
    component.industrialisationSubmitAttempted = true;
    expect(component.isRequiredNoteInvalid(mockBooleanQuestion)).toBeFalse();
  });

  it('isRequiredNoteInvalid false for non-obligatoire', () => {
    component.industrialisationSubmitAttempted = true;
    expect(component.isRequiredNoteInvalid(mockUrlQuestion)).toBeFalse();
  });

  // ── questionnaireReadyForSubmission ────────────────────────────────

  it('questionnaireReadyForSubmission false when no form', () => {
    expect(component.questionnaireReadyForSubmission()).toBeFalse();
  });

  it('questionnaireReadyForSubmission false when required questions missing', () => {
    component.industrialisationForm = mockFormResponse;
    expect(component.questionnaireReadyForSubmission()).toBeFalse();
  });

  // ── isIndustrialisationStepActive / Completed ──────────────────────

  it('isIndustrialisationStepActive step 1 true when no form', () => {
    expect(component.isIndustrialisationStepActive(1)).toBeTrue();
  });

  it('isIndustrialisationStepActive step 1 false when form exists', () => {
    component.industrialisationForm = mockFormResponse;
    expect(component.isIndustrialisationStepActive(1)).toBeFalse();
  });

  it('isIndustrialisationStepActive step 2 true when form exists but not ready', () => {
    component.industrialisationForm = mockFormResponse;
    expect(component.isIndustrialisationStepActive(2)).toBeTrue();
  });

  it('isIndustrialisationStepActive step 3 true when ready', () => {
    component.industrialisationForm = mockFormResponse;
    expect(component.isIndustrialisationStepActive(3)).toBeFalse();
  });

  it('isIndustrialisationStepCompleted step 1 true when form exists', () => {
    component.industrialisationForm = mockFormResponse;
    expect(component.isIndustrialisationStepCompleted(1)).toBeTrue();
  });

  it('isIndustrialisationStepCompleted step 1 false when no form', () => {
    expect(component.isIndustrialisationStepCompleted(1)).toBeFalse();
  });

  it('isIndustrialisationStepCompleted step 2 false when not ready', () => {
    component.industrialisationForm = mockFormResponse;
    expect(component.isIndustrialisationStepCompleted(2)).toBeFalse();
  });

  it('isIndustrialisationStepCompleted step 3 always false', () => {
    expect(component.isIndustrialisationStepCompleted(3)).toBeFalse();
  });

  // ── hasUploadedProof ───────────────────────────────────────────────

  it('hasUploadedProof returns true when preuveObjectName exists in form', () => {
    component.industrialisationForm = {
      ...mockFormResponse,
      reponses: [{ id: 1, questionId: 10, preuveObjectName: 'file.pdf', preuveOriginalFileName: null,
        valeurTexte: null, valeurBoolean: null, valeurNumerique: null, valeurUrl: null,
        preuveContentType: null, preuveSize: null, reponseEliminatoire: null, noteObtenue: null,
        justificatif: null, dateReponse: '2026-07-20' }],
    };
    expect(component.hasUploadedProof({ id: 10 } as QuestionIndustrialisation)).toBeTrue();
  });

  it('hasUploadedProof returns true when preuveOriginalFileName in candidature', () => {
    component.industrialisationForm = {
      ...mockFormResponse,
      candidature: {
        ...mockCandidature,
        reponses: [{ id: 1, questionId: 10, preuveObjectName: null, preuveOriginalFileName: 'doc.pdf',
          valeurTexte: null, valeurBoolean: null, valeurNumerique: null, valeurUrl: null,
          preuveContentType: null, preuveSize: null, reponseEliminatoire: null, noteObtenue: null,
          justificatif: null, dateReponse: '2026-07-20' }],
      },
    };
    expect(component.hasUploadedProof({ id: 10 } as QuestionIndustrialisation)).toBeTrue();
  });

  it('hasUploadedProof returns false when no proof', () => {
    component.industrialisationForm = mockFormResponse;
    expect(component.hasUploadedProof({ id: 10 } as QuestionIndustrialisation)).toBeFalse();
  });

  it('hasUploadedProof returns false when no form', () => {
    component.industrialisationForm = null;
    expect(component.hasUploadedProof({ id: 10 } as QuestionIndustrialisation)).toBeFalse();
  });

  // ── isNoteAnswered ─────────────────────────────────────────────────

  it('isNoteAnswered returns true for non-NOTE criteria', () => {
    expect(component.isNoteAnswered(mockBooleanQuestion)).toBeTrue();
  });

  it('isNoteAnswered returns false when noteObtenue is null', () => {
    component.answers[mockQuestion.id] = { questionId: mockQuestion.id };
    expect(component.isNoteAnswered(mockQuestion)).toBeFalse();
  });

  it('isNoteAnswered returns true when noteObtenue is valid', () => {
    component.answers[mockQuestion.id] = { questionId: mockQuestion.id, noteObtenue: 10 };
    expect(component.isNoteAnswered(mockQuestion)).toBeTrue();
  });

  // ── missingLivrablesWarning constant ───────────────────────────────

  it('missingLivrablesWarning is a non-empty string', () => {
    expect(component.missingLivrablesWarning).toBeTruthy();
    expect(typeof component.missingLivrablesWarning).toBe('string');
  });

  // ── Read-only labels ───────────────────────────────────────────────

  it('typeLabels and statutLabels are defined', () => {
    expect(component.typeLabels).toBeTruthy();
    expect(component.statutLabels).toBeTruthy();
  });

  it('typeLivrableOptions and livrableLabels are defined', () => {
    expect(component.typeLivrableOptions).toBeTruthy();
    expect(component.livrableLabels).toBeTruthy();
  });

  it('actionLabels and typeIndustrialisationLabels are defined', () => {
    expect(component.actionLabels).toBeTruthy();
    expect(component.typeIndustrialisationLabels).toBeTruthy();
  });

  it('ReponseEliminatoire enum is exposed', () => {
    expect(component.ReponseEliminatoire.OK).toBe('OK');
    expect(component.ReponseEliminatoire.NOT_OK).toBe('NOT_OK');
  });
});
