import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { IndustrialisationService } from '../../core/services/industrialisation.service';
import { LivrableService } from '../../core/services/livrable.service';
import { CiIndustrialisationComponent } from './ci-industrialisation.component';

describe('CiIndustrialisationComponent', () => {
  let component: CiIndustrialisationComponent;
  let fixture: ComponentFixture<CiIndustrialisationComponent>;
  let industrialisationService: jasmine.SpyObj<IndustrialisationService>;
  let livrableService: jasmine.SpyObj<LivrableService>;

  const candidature = {
    id: 11,
    projetTitre: 'Plateforme IoT',
    projetStatut: 'REALISATION_TERMINEE',
    projetCategorie: 'RDI',
    projetDomaine: 'IoT',
    projetDescription: 'Desc',
    projetTechnologies: 'Angular, Spring Boot',
    demandeurNom: 'Jean Dupont',
    typeIndustrialisation: 'INTERNE',
    statut: 'SOUMISE',
    dateDemande: '2026-01-01T00:00:00Z',
    dateSoumission: '2026-01-02T00:00:00Z',
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
  } as never;

  const score = {
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
  } as never;

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
    expect(component.nonConfiguredCount(candidature)).toBe(0);
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
});
