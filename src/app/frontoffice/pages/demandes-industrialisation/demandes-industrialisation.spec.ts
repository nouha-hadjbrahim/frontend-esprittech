import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CandidatureIndustrialisation } from '../../../core/models/industrialisation.model';
import { AuthService } from '../../../core/services/auth.service';
import { IndustrialisationService } from '../../../core/services/industrialisation.service';
import { DemandesIndustrialisation } from './demandes-industrialisation';

describe('DemandesIndustrialisation', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let industrialisationService: jasmine.SpyObj<IndustrialisationService>;

  const demande: CandidatureIndustrialisation = {
    id: 10,
    projetId: 42,
    projetTitre: 'Plateforme IoT',
    projetStatut: 'REALISATION_TERMINEE',
    scoreEvaluationProjet: 80,
    eligibleIndustrialisation: true,
    bloqueParEliminatoire: false,
    typeIndustrialisation: 'INTERNE',
    statut: 'SOUMISE',
    demandeurId: 7,
    demandeurNom: 'Jean Dupont',
    dateDemande: '2026-01-01T00:00:00Z',
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
  };

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getRole']);
    industrialisationService = jasmine.createSpyObj<IndustrialisationService>('IndustrialisationService', ['mesDemandes']);

    authService.getRole.and.returnValue('ROLE_ENSEIGNANT');
    industrialisationService.mesDemandes.and.returnValue(of([demande]));

    TestBed.configureTestingModule({
      imports: [DemandesIndustrialisation],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: IndustrialisationService, useValue: industrialisationService },
      ],
    });
  });

  it('should load current user requests for non-CI users', () => {
    const fixture = TestBed.createComponent(DemandesIndustrialisation);
    fixture.detectChanges();

    expect(fixture.componentInstance.isCi).toBeFalse();
    expect(industrialisationService.mesDemandes).toHaveBeenCalled();
    expect(fixture.componentInstance.demandes()).toEqual([demande]);
    expect(fixture.componentInstance.loading()).toBeFalse();
  });

  it('should not load personal requests for CI users', () => {
    authService.getRole.and.returnValue('ROLE_CI');
    const fixture = TestBed.createComponent(DemandesIndustrialisation);
    fixture.detectChanges();

    expect(fixture.componentInstance.isCi).toBeTrue();
    expect(industrialisationService.mesDemandes).not.toHaveBeenCalled();
    expect(fixture.componentInstance.loading()).toBeFalse();
  });

  it('should expose an error when loading requests fails', () => {
    industrialisationService.mesDemandes.and.returnValue(throwError(() => new Error('boom')));
    const fixture = TestBed.createComponent(DemandesIndustrialisation);
    fixture.detectChanges();

    expect(fixture.componentInstance.error()).toBe('Impossible de charger vos demandes.');
    expect(fixture.componentInstance.loading()).toBeFalse();
  });
});
