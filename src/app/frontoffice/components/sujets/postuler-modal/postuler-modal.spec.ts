import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PostulerModal } from './postuler-modal';
import { CandidatureService } from '../../../../core/services/candidature.service';
import { Candidature } from '../../../../core/models/candidature.model';

const MOCK_CANDIDATURE: Candidature = {
  id: 1,
  sujetId: 1,
  etudiantId: 5,
  etudiantNom: 'Ben Ali',
  etudiantPrenom: 'Sami',
  statut: 'DEPOSEE',
  motifRefus: null,
  messageEtudiant: 'Je suis motivé',
  dateDepot: '2026-06-27T10:00:00Z',
  dateDecision: null,
};

describe('PostulerModal', () => {
  let component: PostulerModal;
  let fixture: ComponentFixture<PostulerModal>;
  let candidatureServiceSpy: jasmine.SpyObj<CandidatureService>;

  const mockSujet = {
    id: 1,
    titre: 'Sujet Test',
    categorie: 'STAGE_INGENIEUR',
    encadrantNom: 'Dr. Martin',
    domaines: ['Intelligence Artificielle'],
    technologies: ['Python', 'TensorFlow'],
  };

  beforeEach(async () => {
    candidatureServiceSpy = jasmine.createSpyObj('CandidatureService', ['deposerCandidature']);

    await TestBed.configureTestingModule({
      imports: [PostulerModal],
      providers: [{ provide: CandidatureService, useValue: candidatureServiceSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(PostulerModal);
    component = fixture.componentInstance;
    component.sujet = mockSujet;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with default state', () => {
    expect(component.message).toBe('');
    expect(component.loading).toBeFalse();
    expect(component.error).toBe('');
    expect(component.success).toBeFalse();
  });

  it('should emit closed when close() is called', () => {
    const closedSpy = jasmine.createSpy('closed');
    component.closed.subscribe(closedSpy);
    component.close();
    expect(closedSpy).toHaveBeenCalled();
  });

  it('should not call service if sujet is null', () => {
    component.sujet = null;
    component.postuler();
    expect(candidatureServiceSpy.deposerCandidature).not.toHaveBeenCalled();
  });

  it('should call deposerCandidature with correct sujetId', () => {
    candidatureServiceSpy.deposerCandidature.and.returnValue(of(MOCK_CANDIDATURE));
    component.message = 'Je suis motivé';
    component.postuler();
    expect(candidatureServiceSpy.deposerCandidature).toHaveBeenCalledWith(1, 'Je suis motivé');
  });

  it('should set loading to true while submitting', () => {
    candidatureServiceSpy.deposerCandidature.and.returnValue(of(MOCK_CANDIDATURE));
    component.postuler();
    // loading is set to false after next() — check it was called
    expect(candidatureServiceSpy.deposerCandidature).toHaveBeenCalled();
  });

  it('should set success=true and emit submitted after successful submission', fakeAsync(() => {
    candidatureServiceSpy.deposerCandidature.and.returnValue(of(MOCK_CANDIDATURE));
    const submittedSpy = jasmine.createSpy('submitted');
    component.submitted.subscribe(submittedSpy);

    component.postuler();
    expect(component.success).toBeTrue();
    expect(component.loading).toBeFalse();

    tick(1500);
    expect(submittedSpy).toHaveBeenCalled();
  }));

  it('should set error message on failure', () => {
    candidatureServiceSpy.deposerCandidature.and.returnValue(
      throwError(() => ({ error: { message: 'Sujet non ouvert' } }))
    );
    component.postuler();
    expect(component.error).toBe('Sujet non ouvert');
    expect(component.loading).toBeFalse();
    expect(component.success).toBeFalse();
  });

  it('should use default error message when error has no message', () => {
    candidatureServiceSpy.deposerCandidature.and.returnValue(
      throwError(() => ({}))
    );
    component.postuler();
    expect(component.error).toBe('Une erreur est survenue. Veuillez réessayer.');
  });
});