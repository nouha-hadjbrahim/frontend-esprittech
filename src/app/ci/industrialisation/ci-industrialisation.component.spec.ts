import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CandidatureIndustrialisation, IndustrialisationScore } from '../../core/models/industrialisation.model';
import { IndustrialisationService } from '../../core/services/industrialisation.service';
import { LivrableService } from '../../core/services/livrable.service';
import { CiIndustrialisationComponent } from './ci-industrialisation.component';

describe('CiIndustrialisationComponent', () => {
  let component: CiIndustrialisationComponent;
  let fixture: ComponentFixture<CiIndustrialisationComponent>;
  let industrialisationService: jasmine.SpyObj<IndustrialisationService>;
  let livrableService: jasmine.SpyObj<LivrableService>;

  const candidature: CandidatureIndustrialisation = {
    id: 11,
    projetId: 42,
    projetTitre: 'Plateforme IoT',
    projetStatut: 'REALISATION_TERMINEE',
    projetCategorie: 'RDI',
    projetDomaine: 'IoT',
    projetDescription: 'Desc',
    projetTechnologies: 'Angular, Spring Boot',
    demandeurNom: 'Jean Dupont',
    demandeurId: 7,
    typeIndustrialisation: 'INTERNE',
    statut: 'SOUMISE',
    dateDemande: '2026-01-01T00:00:00Z',
    dateSoumission: '2026-01-02T00:00:00Z',
    dateReceptionCI: null,
    ciDecideurId: null,
    ciDecideurNom: null,
    dateDecisionCI: null,
    decisionGoNoGo: null,
    orientation: null,
    motifDecision: null,
    commentaire: null,
    scoreEvaluationProjet: 80,
    eligibleIndustrialisation: true,
    bloqueParEliminatoire: false,
    livrables: [],
    reponses: [],
    historique: [],
    latestEvaluation: {
      id: 1,
      sujetProjetId: 42,
      scoreFinal: 80,
      eligibleIndustrialisation: true,
      bloqueParEliminatoire: false,
      dateCalcul: '2026-01-02T00:00:00Z',
      commentaire: '',
      calculatedBy: 'SYSTEM',
      recalculationReason: null,
      resultats: [],
    },
  };

  const score: IndustrialisationScore = {
    candidatureId: 11,
    projetId: 42,
    scoreFinal: 82,
    decisionRecommandee: 'GO',
    estBloqueParEliminatoire: false,
    blocagesEliminatoires: [],
    scoreQuestions: 80,
    scoreLivrables: 90,
    scoreCriteresNotes: 75,
    detailsCalcul: [
      { composant: 'QUESTIONNAIRE', reference: 'Q1', libelle: 'Question', score: 80, poids: 1, statut: 'OK', details: '', revueManuelleRequise: false },
    ],
    elementsManquants: [],
    message: 'GO recommande',
  };

  beforeEach(async () => {
    industrialisationService = jasmine.createSpyObj<IndustrialisationService>('IndustrialisationService', [
      'findCiRequests',
      'getCiDetail',
      'getCiScore',
      'decideGo',
      'decideNoGo',
    ]);
    livrableService = jasmine.createSpyObj<LivrableService>('LivrableService', ['downloadUrl']);
    industrialisationService.findCiRequests.and.returnValue(of([candidature]));
    industrialisationService.getCiDetail.and.returnValue(of(candidature));
    industrialisationService.getCiScore.and.returnValue(of(score));
    industrialisationService.decideGo.and.returnValue(of(candidature));
    industrialisationService.decideNoGo.and.returnValue(of(candidature));
    livrableService.downloadUrl.and.returnValue('http://download/1');

    await TestBed.configureTestingModule({
      imports: [CiIndustrialisationComponent],
      providers: [
        { provide: IndustrialisationService, useValue: industrialisationService },
        { provide: LivrableService, useValue: livrableService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CiIndustrialisationComponent);
    component = fixture.componentInstance;
  });

  it('should load requests and auto-open the first detail', () => {
    component.ngOnInit();

    expect(industrialisationService.findCiRequests).toHaveBeenCalled();
    expect(component.demandes().length).toBe(1);
    expect(component.selected()?.id).toBe(11);
    expect(component.score()?.scoreFinal).toBe(82);
  });

  it('should show missing livrables warning on CI detail', () => {
    component.selected.set({ ...candidature, warnings: [] });
    component.score.set(score);

    fixture.detectChanges();

    expect(component.submissionWarnings(component.selected())).toContain(component.missingLivrablesWarning);
    expect(fixture.nativeElement.textContent).toContain(component.missingLivrablesWarning);
    expect(fixture.nativeElement.querySelector('.alert--warning')?.textContent).toContain(component.missingLivrablesWarning);
  });

  it('should filter, compute labels and utility values', () => {
    component.demandes.set([candidature]);
    component.searchTerm = 'plateforme';
    expect(component.displayedDemandes().length).toBe(1);

    expect(component.statusLabel('GO' as never)).toBe('GO confirme');
    expect(component.statusClass('NO_GO' as never)).toBe('status-pill--nogo');
    expect(component.scoreClass(candidature)).toBe('score-card--success');
    expect(component.requestReference(candidature)).toBe('CI-0011');
    expect(component.projectYear(candidature)).toBe('2026');
    expect(component.technologyTags(candidature)).toEqual(['Angular', 'Spring Boot']);
    expect(component.initials(candidature)).toBe('PI');
    expect(component.downloadLivrable(1)).toBe('http://download/1');
    expect(component.livrableActionLabel({ objectName: 'obj' } as never)).toBe('Telecharger');
    expect(component.answerValue({ valeurBoolean: true } as never)).toBe('Oui');
    expect(component.blockingCriteriaCount(candidature)).toBe(0);
    expect(component.recommendation(candidature)).toBe('GO recommande');
    expect(component.recommendationExplanation(candidature)).toContain('GO');
    expect(component.analysisIssueCount(candidature)).toBe(0);
    expect(component.decisionLabel('NO_GO')).toBe('NO GO');
    expect(component.decisionClass('A_INSTRUIRE')).toBe('status-pill--instruction');
    expect(component.manualReviewCount(score)).toBe(0);
    expect(component.componentLabel('LIVRABLES')).toBe('Livrables');
  });

  it('should validate and execute decisions', fakeAsync(() => {
    component.selected.set(candidature);
    component.openDecision('GO');
    expect(component.decisionMode).toBe('GO');
    component.decideGo();
    expect(component.error()).toBe('Orientation obligatoire.');

    component.orientation = 'DSI';
    component.commentaire = 'Go';
    component.decideGo();
    expect(industrialisationService.decideGo).toHaveBeenCalledWith(11, { orientation: 'DSI', commentaire: 'Go' });

    tick(2500);

    component.selected.set(candidature);
    component.openDecision('NO_GO');
    component.decideNoGo();
    expect(component.error()).toBe('Motif obligatoire.');

    component.motif = 'No go';
    component.decideNoGo();
    expect(industrialisationService.decideNoGo).toHaveBeenCalledWith(11, { motif: 'No go' });
  }));

  it('should expose loading and error states', () => {
    industrialisationService.findCiRequests.and.returnValue(throwError(() => new Error('boom')));
    component.load();
    expect(component.error()).toBe('Impossible de charger les demandes.');
  });

  it('should compute domains, instruction counts, filters and sort orders', () => {
    const older = {
      ...candidature,
      id: 8,
      projetTitre: 'Ancien projet',
      projetDomaine: 'AI',
      statut: 'GO',
      scoreEvaluationProjet: 40,
      latestEvaluation: null,
      dateDemande: '2025-01-01T00:00:00Z',
      dateSoumission: null,
    } as CandidatureIndustrialisation;
    const noDomain = { ...candidature, id: 9, projetDomaine: '  ' } as CandidatureIndustrialisation;
    component.demandes.set([older, candidature, noDomain]);

    expect(component.domaines()).toEqual(['AI', 'IoT']);
    expect(component.demandesEnInstruction()).toBe(2);

    component.searchTerm = 'plateforme';
    expect(component.displayedDemandes().map((demande) => demande.id)).toEqual([11, 9]);

    component.searchTerm = '';
    component.domaineFilter = 'AI';
    expect(component.displayedDemandes().map((demande) => demande.id)).toEqual([8]);

    component.domaineFilter = '';
    component.sortBy = 'score-desc';
    expect(component.displayedDemandes()[0].id).toBe(11);

    component.sortBy = 'score-asc';
    expect(component.displayedDemandes()[0].id).toBe(8);

    component.sortBy = 'title-asc';
    expect(component.displayedDemandes()[0].id).toBe(8);
  });

  it('should handle detail and decision service errors', () => {
    industrialisationService.getCiDetail.and.returnValue(throwError(() => new Error('boom')));

    component.openDetail(11);

    expect(component.error()).toBe('Impossible de charger le detail.');
    expect(component.detailLoading()).toBeFalse();

    component.selected.set(candidature);
    component.orientation = 'DSI';
    industrialisationService.decideGo.and.returnValue(throwError(() => ({ error: { detail: 'Go refuse' } })));
    component.decideGo();
    expect(component.error()).toBe('Go refuse');

    industrialisationService.decideGo.and.returnValue(throwError(() => new Error('boom')));
    component.decideGo();
    expect(component.error()).toBe('Decision Go impossible.');

    component.motif = 'Motif';
    industrialisationService.decideNoGo.and.returnValue(throwError(() => ({ error: { detail: 'No go refuse' } })));
    component.decideNoGo();
    expect(component.error()).toBe('No go refuse');

    industrialisationService.decideNoGo.and.returnValue(throwError(() => new Error('boom')));
    component.decideNoGo();
    expect(component.error()).toBe('Decision No Go impossible.');
  });

  it('should open/close decision and livrables modals and finish after a decision', fakeAsync(() => {
    component.openLivrablesModal();
    expect(component.livrablesModalOpen).toBeTrue();
    component.closeLivrablesModal();
    expect(component.livrablesModalOpen).toBeFalse();

    component.openDecision('GO');
    expect(component.decisionMode).toBe('GO');
    component.closeDecision();
    expect(component.decisionMode).toBeNull();

    component.afterDecision(candidature, 'Decision enregistree.');
    expect(component.selected()).toBe(candidature);
    expect(component.message()).toBe('Decision enregistree.');
    expect(industrialisationService.findCiRequests).toHaveBeenCalled();

    tick(2500);
    expect(component.message()).toBeNull();
  }));

  it('should cover status, score and recommendation fallback branches', () => {
    const blocked = {
      ...candidature,
      id: 12,
      eligibleIndustrialisation: false,
      bloqueParEliminatoire: true,
      latestEvaluation: {
        ...candidature.latestEvaluation!,
        scoreFinal: 50,
        evaluationComplete: false,
        resultats: [
          { id: 1, critereId: 1, critereLibelle: 'Git', typeCritere: 'ELIMINATOIRE', reponseEliminatoire: 'NOT_OK', ruleConfigured: false },
        ],
      },
    } as CandidatureIndustrialisation;
    const lowScore = { ...candidature, id: 13, scoreEvaluationProjet: 40, latestEvaluation: null } as CandidatureIndustrialisation;
    const noDate = { ...candidature, id: 14, projetDateCreation: null, dateDemande: '' } as CandidatureIndustrialisation;

    component.score.set({ ...score, candidatureId: 12, decisionRecommandee: 'NO_GO', estBloqueParEliminatoire: true });
    expect(component.scoreValue(blocked)).toBe(score.scoreFinal);
    expect(component.scoreClass(blocked)).toBe('score-card--danger');
    expect(component.recommendation(blocked)).toBe('NO GO recommande');
    expect(component.recommendationExplanation(blocked)).toBe(score.message);

    component.score.set({ ...score, candidatureId: 12, decisionRecommandee: 'A_INSTRUIRE', estBloqueParEliminatoire: false });
    expect(component.recommendation(blocked)).toBe('A instruire');

    component.score.set(null);
    const reviewRequired = {
      ...candidature,
      eligibleIndustrialisation: true,
      latestEvaluation: {
        ...candidature.latestEvaluation!,
        eligibilityStatus: 'REVIEW_REQUIRED',
        mlStatus: 'PARTIAL_ANALYSIS',
        validationStatus: 'PENDING',
        finalValidatedScore: null,
      },
    } as CandidatureIndustrialisation;
    expect(component.eligibilityDisplay(reviewRequired)).toBe('Revue requise');
    expect(component.scoreTitle(reviewRequired)).toBe('Score provisoire');
    expect(component.scoreValue(blocked)).toBe(50);
    expect(component.scoreClass(blocked)).toBe('score-card--warning');
    expect(component.scoreClass(lowScore)).toBe('score-card--warning');
    expect(component.blockingCriteriaCount(blocked)).toBe(1);
    expect(component.blockingCriteriaCount({ ...blocked, latestEvaluation: null })).toBe(1);
    expect(component.recommendation(blocked)).toBe('Analyse nécessaire');
    expect(component.recommendation({ ...candidature, latestEvaluation: { ...candidature.latestEvaluation!, evaluationComplete: false } })).toBe('Analyse nécessaire');
    expect(component.recommendation({ ...candidature, latestEvaluation: null })).toBe('GO recommande');
    expect(component.recommendation(lowScore)).toBe('Analyse nécessaire');
    expect(component.recommendationExplanation(blocked)).toContain('Alerte éliminatoire');
    expect(component.recommendationExplanation({ ...candidature, latestEvaluation: { ...candidature.latestEvaluation!, evaluationComplete: false } })).toContain('Analyse nécessaire');
    expect(component.analysisIssueCount(blocked)).toBe(1);

    expect(component.statusLabel('REFUSEE')).toBe('NO GO');
    expect(component.statusLabel('RECUE_PAR_CI')).toBe('En instruction');
    expect(component.statusLabel('BROUILLON')).toBe('Brouillon');
    expect(component.statusClass('GO')).toBe('status-pill--go');
    expect(component.canDecide(null)).toBeFalse();
    expect(component.canDecide({ ...candidature, statut: 'GO' })).toBeFalse();
    expect(component.projectYear(noDate)).toBe('-');
  });

  it('should cover utility formatting branches', () => {
    expect(component.formatSize(null)).toBe('-');
    expect(component.formatSize(512)).toBe('1 Ko');
    expect(component.formatSize(2 * 1024 * 1024)).toBe('2.0 Mo');
    expect(component.livrableActionLabel({ objectName: null } as never)).toBe('Ouvrir');
    expect(component.answerValue({ valeurTexte: 'Texte' } as never)).toBe('Texte');
    expect(component.answerValue({ valeurUrl: 'https://example.com' } as never)).toBe('https://example.com');
    expect(component.answerValue({ valeurNumerique: 12 } as never)).toBe('12');
    expect(component.answerValue({ valeurBoolean: false } as never)).toBe('Non');
    expect(component.answerValue({ preuveOriginalFileName: 'preuve.pdf' } as never)).toBe('preuve.pdf');
    expect(component.answerValue({ reponseEliminatoire: 'OK' } as never)).toBe('OK');
    expect(component.answerValue({} as never)).toBe('-');
    expect(component.initials({ ...candidature, projetTitre: '   ' })).toBe('CI');
    expect(component.technologyTags({ ...candidature, projetTechnologies: 'A; B\nC,D,E,F,G' })).toEqual(['A', 'B', 'C', 'D', 'E', 'F']);
    expect(component.manualReviewCount({ ...score, detailsCalcul: [{ ...score.detailsCalcul[0], revueManuelleRequise: true }] })).toBe(1);
    expect(component.manualReviewCount(null)).toBe(0);
    expect(component.componentLabel('QUESTIONNAIRE_Q1')).toBe('Questionnaire');
    expect(component.componentLabel('CRITERES_NOTES')).toBe('Critères notés');
    expect(component.componentLabel('AUTRE')).toBe('AUTRE');
    expect(component.decisionLabel('A_INSTRUIRE')).toBe('A instruire');
    expect(component.decisionClass('GO')).toBe('status-pill--go');
    expect(component.decisionClass('NO_GO')).toBe('status-pill--nogo');
  });
});
