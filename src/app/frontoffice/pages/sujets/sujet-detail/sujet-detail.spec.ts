import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Affectation } from '../../../../core/models/candidature.model';
import { ReponseEliminatoire } from '../../../../core/models/critere.model';
import { CandidatureIndustrialisation, IndustrialisationFormResponse, QuestionIndustrialisation } from '../../../../core/models/industrialisation.model';
import { SujetProjet } from '../../../../core/models/sujet-projet.model';
import { AuthService } from '../../../../core/services/auth.service';
import { CandidatureService } from '../../../../core/services/candidature.service';
import { EvaluationService } from '../../../../core/services/evaluation.service';
import { HistoriqueService } from '../../../../core/services/historique.service';
import { IndustrialisationService } from '../../../../core/services/industrialisation.service';
import { LivrableService } from '../../../../core/services/livrable.service';
import { SujetProjetService } from '../../../../core/services/sujet-projet.service';
import { SujetDetail } from './sujet-detail';

describe('SujetDetail industrialisation warnings', () => {
  let component: SujetDetail;
  let fixture: ComponentFixture<SujetDetail>;
  let sujetProjetService: jasmine.SpyObj<SujetProjetService>;
  let authService: jasmine.SpyObj<AuthService>;
  let evaluationService: jasmine.SpyObj<EvaluationService>;
  let livrableService: jasmine.SpyObj<LivrableService>;
  let industrialisationService: jasmine.SpyObj<IndustrialisationService>;
  let candidatureService: jasmine.SpyObj<CandidatureService>;
  let historiqueService: jasmine.SpyObj<HistoriqueService>;

  const sujet: SujetProjet = {
    id: 42,
    titre: 'Plateforme IoT',
    categorie: 'RDI',
    description: 'Desc',
    objectifs: 'Obj',
    prerequis: [],
    domaines: ['IoT'],
    technologies: ['Angular'],
    capaciteAccueil: 1,
    statut: 'REALISATION_TERMINEE',
    scoreFinal: 80,
    eligibleIndustrialisation: true,
    hasEliminatoryWarnings: true,
    eliminatoryWarningsCount: 1,
    catalogue: false,
    encadrantId: 7,
    encadrantNom: 'Ali Mansour',
    encadrantEmail: null,
    equipeNom: null,
    dateCreation: '2026-01-01T00:00:00Z',
    dateSoumission: null,
    dateValidation: null,
    dateDebutRealisation: null,
    dateTerminaison: null,
    motifInvalidation: null,
  };

  const candidature: CandidatureIndustrialisation = {
    id: 11,
    projetId: 42,
    projetTitre: 'Plateforme IoT',
    projetStatut: 'REALISATION_TERMINEE',
    scoreEvaluationProjet: 80,
    eligibleIndustrialisation: true,
    bloqueParEliminatoire: true,
    hasEliminatoryWarnings: true,
    eliminatoryWarningsCount: 1,
    eliminatoryWarningsDetails: ['Depot Git disponible ? - Reponse non conforme'],
    typeIndustrialisation: 'INTERNE',
    statut: 'BROUILLON',
    demandeurId: 7,
    demandeurNom: 'Ali Mansour',
    dateDemande: '2026-01-02T00:00:00Z',
    dateSoumission: null,
    dateReceptionCI: null,
    ciDecideurId: null,
    ciDecideurNom: null,
    dateDecisionCI: null,
    decisionGoNoGo: null,
    orientation: null,
    motifDecision: null,
    commentaire: null,
    reponses: [],
    livrables: [],
    historique: [],
    latestEvaluation: null,
  };

  const question: QuestionIndustrialisation = {
    id: 5,
    libelle: 'Depot Git disponible ?',
    description: null,
    typeReponse: 'BOOLEAN',
    obligatoire: true,
    typeCritere: 'ELIMINATOIRE',
    poids: null,
    ordre: 1,
    actif: true,
    conditionEliminatoire: true,
    dateCreation: '2026-01-01T00:00:00Z',
    dateMiseAJour: '2026-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    sujetProjetService = jasmine.createSpyObj<SujetProjetService>('SujetProjetService', ['getSujetById']);
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getRole', 'currentUser', 'equipeNom']);
    evaluationService = jasmine.createSpyObj<EvaluationService>('EvaluationService', ['getLatestEvaluation', 'calculateScore']);
    livrableService = jasmine.createSpyObj<LivrableService>('LivrableService', ['findByProjet', 'downloadUrl']);
    candidatureService = jasmine.createSpyObj<CandidatureService>('CandidatureService', [
      'getCandidaturesParSujet',
      'getAffectationsParSujet',
      'retirerEtudiant',
    ]);
    historiqueService = jasmine.createSpyObj<HistoriqueService>('HistoriqueService', ['getBySujet']);
    industrialisationService = jasmine.createSpyObj<IndustrialisationService>('IndustrialisationService', [
      'create',
      'getFormulaire',
      'saveReponses',
      'soumettre',
      'uploadPreuve',
    ]);

    sujetProjetService.getSujetById.and.returnValue(of(sujet));
    authService.getRole.and.returnValue('ROLE_ENSEIGNANT');
    authService.currentUser.and.returnValue({ id: 7 } as never);
    authService.equipeNom.and.returnValue(null);
    evaluationService.getLatestEvaluation.and.returnValue(throwError(() => ({ status: 404 })));
    livrableService.findByProjet.and.returnValue(of([]));
    livrableService.downloadUrl.and.returnValue('http://download/1');
    candidatureService.getCandidaturesParSujet.and.returnValue(of([]));
    candidatureService.getAffectationsParSujet.and.returnValue(of([]));
    candidatureService.retirerEtudiant.and.returnValue(of({
      id: 1,
      sujetId: 42,
      etudiantId: 1,
      etudiantNom: 'Test',
      etudiantPrenom: 'User',
      statut: 'RETIREE_ARCHIVEE',
      dateDebut: '2026-01-01T00:00:00Z',
      dateRetrait: '2026-01-02T00:00:00Z',
      motifRetrait: 'test',
    } as Affectation));
    historiqueService.getBySujet.and.returnValue(of([]));
    industrialisationService.saveReponses.and.returnValue(of(candidature));
    industrialisationService.soumettre.and.returnValues(
      throwError(() => ({
        status: 409,
        error: {
          requiresConfirmation: true,
          nbCriteresEliminatoires: 1,
          message: 'Etes-vous sur de continuer ?',
          details: [{ source: 'QUESTIONNAIRE', referenceId: 5, libelle: 'Depot Git disponible ?', raison: 'Reponse non conforme' }],
        },
      })),
      of({ ...candidature, statut: 'SOUMISE' })
    );

    await TestBed.configureTestingModule({
      imports: [SujetDetail],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => '42' } } } },
        { provide: SujetProjetService, useValue: sujetProjetService },
        { provide: AuthService, useValue: authService },
        { provide: EvaluationService, useValue: evaluationService },
        { provide: LivrableService, useValue: livrableService },
        { provide: IndustrialisationService, useValue: industrialisationService },
        { provide: CandidatureService, useValue: candidatureService },
        { provide: HistoriqueService, useValue: historiqueService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SujetDetail);
    component = fixture.componentInstance;
    component.sujet = sujet;
    component.industrialisationForm = {
      candidature,
      questions: [question],
      reponses: [],
    } as IndustrialisationFormResponse;
    component.answers[5] = {
      questionId: 5,
      valeurBoolean: false,
      reponseEliminatoire: ReponseEliminatoire.NOT_OK,
    };
  });

  it('should show backend confirmation payload on 409 and retry with confirmation', () => {
    component.submitIndustrialisation();

    expect(component.eliminatoryWarningConfirmation?.requiresConfirmation).toBeTrue();
    expect(component.pendingIndustrialisationAction).toBe('submit');
    expect(industrialisationService.soumettre).toHaveBeenCalledWith(11, { confirmEliminatoryWarnings: false });

    component.confirmEliminatoryWarnings();

    expect(industrialisationService.soumettre).toHaveBeenCalledWith(11, { confirmEliminatoryWarnings: true });
    expect(component.eliminatoryWarningConfirmation).toBeNull();
    expect(component.pendingIndustrialisationAction).toBeNull();
  });

  it('should show missing livrables warning and keep submit enabled', () => {
    component.industrialisationOpen = true;
    component.livrables = [];
    component.industrialisationForm = {
      candidature: { ...candidature, warnings: [] },
      questions: [question],
      reponses: [],
    } as IndustrialisationFormResponse;
    component.answers[5] = {
      questionId: 5,
      valeurBoolean: false,
      reponseEliminatoire: ReponseEliminatoire.NOT_OK,
    };

    fixture.detectChanges();

    expect(component.submissionWarnings).toContain(component.missingLivrablesWarning);
    expect(component.canSubmitIndustrialisation()).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain(component.missingLivrablesWarning);

    const submitButton = (Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[])
      .find((button) => button.textContent?.includes('Soumettre a la CI'));
    expect(submitButton?.disabled).toBeFalse();
  });

  it('should not show a success banner when recalculation returns a non-evaluable evaluation', () => {
    evaluationService.calculateScore.and.returnValue(of({
      scoreFinal: null,
      eligibleIndustrialisation: false,
      hasEliminatoryWarnings: false,
      processingStatus: 'FAILED_PERMANENT',
      eligibilityStatus: 'NOT_EVALUABLE',
      commentaire: 'Evaluation impossible avec les informations disponibles.',
    } as any));

    component.sujet = sujet;
    component.recalculateScore();

    expect(component.evaluationMessage).toBe('');
    expect(component.evaluationError).toContain('Evaluation impossible');
  });
});
