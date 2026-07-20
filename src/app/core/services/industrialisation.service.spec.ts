import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { IndustrialisationService } from './industrialisation.service';

describe('IndustrialisationService', () => {
  let service: IndustrialisationService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), IndustrialisationService],
    });
    service = TestBed.inject(IndustrialisationService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should create and fetch industrialisation requests', () => {
    const createRequest = { typeIndustrialisation: 'INTERNE' as never, commentaire: 'Test' };
    service.create(12, createRequest as never).subscribe();
    const createReq = http.expectOne(`${environment.apiUrl}/projets/12/industrialisation`);
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual(createRequest);
    createReq.flush({ id: 1 });

    service.getFormulaire(1).subscribe();
    const formReq = http.expectOne(`${environment.apiUrl}/industrialisation/1/formulaire`);
    expect(formReq.request.method).toBe('GET');
    formReq.flush({ candidature: {}, questions: [], reponses: [] });

    service.getDetail(1).subscribe();
    const detailReq = http.expectOne(`${environment.apiUrl}/industrialisation/1`);
    expect(detailReq.request.method).toBe('GET');
    detailReq.flush({ id: 1 });

    const responseBody = { reponses: [{ questionId: 3, valeurBoolean: true, justificatif: 'Lien Git', reponseEliminatoire: 'OK' }] };
    service.saveReponses(1, responseBody as never).subscribe();
    const saveReq = http.expectOne(`${environment.apiUrl}/industrialisation/1/reponses`);
    expect(saveReq.request.method).toBe('PUT');
    expect(saveReq.request.body).toEqual(responseBody);
    saveReq.flush({ id: 1 });

    const file = new File(['preuve'], 'preuve.pdf', { type: 'application/pdf' });
    service.uploadPreuve(1, 3, file).subscribe();
    const proofReq = http.expectOne(`${environment.apiUrl}/industrialisation/1/preuves`);
    expect(proofReq.request.method).toBe('POST');
    const proofBody = proofReq.request.body as FormData;
    expect(proofBody.get('questionId')).toBe('3');
    expect(proofBody.get('file')).toEqual(file);
    proofReq.flush({ id: 1 });

    service.soumettre(1).subscribe();
    const submitReq = http.expectOne(`${environment.apiUrl}/industrialisation/1/soumettre`);
    expect(submitReq.request.method).toBe('POST');
    expect(submitReq.request.body).toEqual({});
    submitReq.flush({ id: 1 });

    service.soumettre(1, { confirmEliminatoryWarnings: true }).subscribe();
    const confirmedSubmitReq = http.expectOne(`${environment.apiUrl}/industrialisation/1/soumettre`);
    expect(confirmedSubmitReq.request.method).toBe('POST');
    expect(confirmedSubmitReq.request.body).toEqual({ confirmEliminatoryWarnings: true });
    confirmedSubmitReq.flush({ id: 1 });

    service.mesDemandes().subscribe();
    const demandesReq = http.expectOne(`${environment.apiUrl}/industrialisation/mes-demandes`);
    expect(demandesReq.request.method).toBe('GET');
    demandesReq.flush([]);
  });

  it('should query CI endpoints and decide go or no-go', () => {
    service.findCiRequests({ statut: 'SOUMISE' as never, type: 'EXTERNE' as never }).subscribe();
    const listReq = http.expectOne((req) => req.url === `${environment.apiUrl}/ci/industrialisation`);
    expect(listReq.request.params.get('statut')).toBe('SOUMISE');
    expect(listReq.request.params.get('type')).toBe('EXTERNE');
    listReq.flush([]);

    service.getCiDetail(5).subscribe();
    const detailReq = http.expectOne(`${environment.apiUrl}/ci/industrialisation/5`);
    expect(detailReq.request.method).toBe('GET');
    detailReq.flush({ id: 5 });

    service.getCiScore(5).subscribe();
    const scoreReq = http.expectOne(`${environment.apiUrl}/ci/industrialisation/5/score`);
    expect(scoreReq.request.method).toBe('GET');
    expect(scoreReq.request.url).not.toContain('/sujets/');
    expect(scoreReq.request.url).not.toContain('/projets/5/');
    scoreReq.flush({ candidatureId: 5 });

    service.getCiScore(18).subscribe();
    const convertedScoreReq = http.expectOne(`${environment.apiUrl}/ci/industrialisation/18/score`);
    expect(convertedScoreReq.request.url).toBe(`${environment.apiUrl}/ci/industrialisation/18/score`);
    convertedScoreReq.flush({ candidatureId: 18, projetId: 55, scoreFinal: 84 });

    service.decideGo(5, { orientation: 'DSI' as never, commentaire: 'Go' }).subscribe();
    const goReq = http.expectOne(`${environment.apiUrl}/ci/industrialisation/5/go`);
    expect(goReq.request.method).toBe('POST');
    expect(goReq.request.body).toEqual({ orientation: 'DSI', commentaire: 'Go' });
    goReq.flush({ id: 5 });

    service.decideNoGo(5, { motif: 'No go' }).subscribe();
    const noGoReq = http.expectOne(`${environment.apiUrl}/ci/industrialisation/5/no-go`);
    expect(noGoReq.request.method).toBe('POST');
    expect(noGoReq.request.body).toEqual({ motif: 'No go' });
    noGoReq.flush({ id: 5 });
  });

  it('should manage the questionnaire admin endpoints', () => {
    service.findQuestions().subscribe();
    const findReq = http.expectOne(`${environment.apiUrl}/admin/industrialisation/questions`);
    expect(findReq.request.method).toBe('GET');
    findReq.flush([]);

    service.findActiveQuestions().subscribe();
    const activeReq = http.expectOne(`${environment.apiUrl}/admin/industrialisation/questions/actives`);
    expect(activeReq.request.method).toBe('GET');
    activeReq.flush([]);

    const questionRequest = {
      libelle: 'Git disponible ?',
      description: 'Liens attendus',
      typeReponse: 'BOOLEAN',
      obligatoire: true,
      typeCritere: 'ELIMINATOIRE',
      poids: null,
      ordre: 1,
      actif: true,
      conditionEliminatoire: true,
    };
    service.createQuestion(questionRequest as never).subscribe();
    const createReq = http.expectOne(`${environment.apiUrl}/admin/industrialisation/questions`);
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.body).toEqual(questionRequest);
    createReq.flush({ id: 1 });

    service.updateQuestion(1, questionRequest as never).subscribe();
    const updateReq = http.expectOne(`${environment.apiUrl}/admin/industrialisation/questions/1`);
    expect(updateReq.request.method).toBe('PUT');
    updateReq.flush({ id: 1 });

    service.activateQuestion(1).subscribe();
    const activateReq = http.expectOne(`${environment.apiUrl}/admin/industrialisation/questions/1/activer`);
    expect(activateReq.request.method).toBe('PATCH');
    expect(activateReq.request.body).toEqual({});
    activateReq.flush(null);

    service.deactivateQuestion(1).subscribe();
    const deactivateReq = http.expectOne(`${environment.apiUrl}/admin/industrialisation/questions/1/desactiver`);
    expect(deactivateReq.request.method).toBe('PATCH');
    expect(deactivateReq.request.body).toEqual({});
    deactivateReq.flush(null);

    service.findAllAdminRequests().subscribe();
    const adminReq = http.expectOne(`${environment.apiUrl}/admin/industrialisation`);
    expect(adminReq.request.method).toBe('GET');
    adminReq.flush([]);
  });
});
