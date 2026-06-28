// ADD this test inside the existing describe('CandidatureService') block
// in candidature.service.spec.ts

// it('getLivrablesParSujet should GET from correct URL', () => {
//   service.getLivrablesParSujet(2).subscribe();
//   const req = httpMock.expectOne(`${BASE}/sujets/2/livrables`);
//   expect(req.request.method).toBe('GET');
//   req.flush([]);
// });

// ─── OR paste the complete updated file below ───────────────────────

import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { CandidatureService } from './candidature.service';

describe('CandidatureService', () => {
  let service: CandidatureService;
  let httpMock: HttpTestingController;

  const BASE = 'http://localhost:8080/api';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CandidatureService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CandidatureService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('ouvrirCandidatures should POST to correct URL', () => {
    service.ouvrirCandidatures(5).subscribe();
    httpMock.expectOne(`${BASE}/sujets/5/ouvrir-candidatures`).flush(null);
  });

  it('fermerCandidatures should POST to correct URL', () => {
    service.fermerCandidatures(5).subscribe();
    httpMock.expectOne(`${BASE}/sujets/5/fermer-candidatures`).flush(null);
  });

  it('deposerCandidature should POST sujetId and message', () => {
    service.deposerCandidature(3, 'Je suis motivé').subscribe();
    const req = httpMock.expectOne(`${BASE}/sujets/3/candidatures`);
    expect(req.request.body.sujetId).toBe(3);
    expect(req.request.body.messageEtudiant).toBe('Je suis motivé');
    req.flush({});
  });

  it('deposerCandidature should not include messageEtudiant if empty', () => {
    service.deposerCandidature(3, '   ').subscribe();
    const req = httpMock.expectOne(`${BASE}/sujets/3/candidatures`);
    expect(req.request.body.messageEtudiant).toBeUndefined();
    req.flush({});
  });

  it('accepterCandidature should POST to correct URL', () => {
    service.accepterCandidature(10).subscribe();
    httpMock.expectOne(`${BASE}/candidatures/10/accepter`).flush({});
  });

  it('refuserCandidature should POST motifRefus', () => {
    service.refuserCandidature(10, 'Profil insuffisant').subscribe();
    const req = httpMock.expectOne(`${BASE}/candidatures/10/refuser`);
    expect(req.request.body.motifRefus).toBe('Profil insuffisant');
    req.flush({});
  });

  it('retirerEtudiant should POST motifRetrait', () => {
    service.retirerEtudiant(7, 'Abandon').subscribe();
    const req = httpMock.expectOne(`${BASE}/affectations/7/retirer`);
    expect(req.request.body.motifRetrait).toBe('Abandon');
    req.flush({});
  });

  it('declarerTerminaison should POST to correct URL', () => {
    service.declarerTerminaison(5).subscribe();
    httpMock.expectOne(`${BASE}/projets/5/terminer`).flush(null);
  });

  it('getCandidaturesParSujet should GET from correct URL', () => {
    service.getCandidaturesParSujet(2).subscribe();
    httpMock.expectOne(`${BASE}/sujets/2/candidatures`).flush([]);
  });

  it('getMesCandidatures should GET from correct URL', () => {
    service.getMesCandidatures().subscribe();
    httpMock.expectOne(`${BASE}/candidatures/mes-candidatures`).flush([]);
  });

  it('getAffectationsParSujet should GET from correct URL', () => {
    service.getAffectationsParSujet(2).subscribe();
    httpMock.expectOne(`${BASE}/sujets/2/affectations`).flush([]);
  });

  // ── Previously missing ────────────────────────────────────────────
  it('getLivrablesParSujet should GET from correct URL', () => {
    service.getLivrablesParSujet(2).subscribe();
    const req = httpMock.expectOne(`${BASE}/sujets/2/livrables`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
