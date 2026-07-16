import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { CandidatureIndustrialisation } from '../../../core/models/industrialisation.model';
import { AuthService } from '../../../core/services/auth.service';
import { IndustrialisationService } from '../../../core/services/industrialisation.service';
import { DemandesIndustrialisation } from './demandes-industrialisation';

describe('DemandesIndustrialisation', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let industrialisationService: jasmine.SpyObj<IndustrialisationService>;

  const createDemande = (
    overrides: Partial<CandidatureIndustrialisation> = {},
  ): CandidatureIndustrialisation => ({
    id: 10,
    projetId: 42,
    projetTitre: 'Plateforme IoT',
    projetStatut: 'REALISATION_TERMINEE',
    projetCategorie: 'Innovation',
    projetDomaine: 'IoT',
    projetDescription: 'Supervision connectee des capteurs industriels.',
    projetObjectifs: null,
    projetTechnologies: null,
    projetPrerequis: null,
    projetDateCreation: null,
    projetDateSoumission: null,
    projetDateValidation: null,
    projetDateTerminaison: null,
    scoreEvaluationProjet: 80,
    eligibleIndustrialisation: true,
    bloqueParEliminatoire: false,
    hasEliminatoryWarnings: false,
    eliminatoryWarningsCount: 0,
    eliminatoryWarningsDetails: [],
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
    commentaire: 'Demande prioritaire',
    reponses: [],
    livrables: [],
    historique: [],
    latestEvaluation: null,
    warnings: [],
    ...overrides,
  });

  const demandes = [
    createDemande(),
    createDemande({
      id: 11,
      projetId: 43,
      projetTitre: 'ERP Finance',
      typeIndustrialisation: 'EXTERNE',
      statut: 'GO',
      decisionGoNoGo: true,
      orientation: 'DSI',
      motifDecision: 'Industrialisation validee par la CI.',
      dateDecisionCI: '2026-02-03T00:00:00Z',
    }),
    createDemande({
      id: 12,
      projetId: 44,
      projetTitre: 'Portail Recherche',
      typeIndustrialisation: 'INTERNE',
      statut: 'NO_GO',
      decisionGoNoGo: false,
      motifDecision: 'Livrables insuffisants pour industrialisation.',
      scoreEvaluationProjet: 45,
      eligibleIndustrialisation: false,
    }),
  ];

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['getRole']);
    industrialisationService = jasmine.createSpyObj<IndustrialisationService>('IndustrialisationService', ['mesDemandes']);

    authService.getRole.and.returnValue('ROLE_ENSEIGNANT');
    industrialisationService.mesDemandes.and.returnValue(of(demandes));

    TestBed.configureTestingModule({
      imports: [DemandesIndustrialisation],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        { provide: IndustrialisationService, useValue: industrialisationService },
      ],
    });
  });

  function createComponent(): ComponentFixture<DemandesIndustrialisation> {
    const fixture = TestBed.createComponent(DemandesIndustrialisation);
    fixture.detectChanges();
    return fixture;
  }

  it('should load current user requests for non-CI users', () => {
    const fixture = createComponent();

    expect(fixture.componentInstance.isCi).toBeFalse();
    expect(industrialisationService.mesDemandes).toHaveBeenCalled();
    expect(fixture.componentInstance.demandes()).toEqual(demandes);
    expect(fixture.componentInstance.filteredDemandes()).toEqual(demandes);
    expect(fixture.componentInstance.loading()).toBeFalse();
  });

  it('should display the loading state while waiting for requests', () => {
    const requests$ = new Subject<CandidatureIndustrialisation[]>();
    industrialisationService.mesDemandes.and.returnValue(requests$.asObservable());

    const fixture = TestBed.createComponent(DemandesIndustrialisation);
    fixture.detectChanges();

    expect(fixture.componentInstance.loading()).toBeTrue();
    expect(fixture.nativeElement.querySelector('.loading-list')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.skeleton-card').length).toBe(3);

    requests$.next([demandes[0]]);
    fixture.detectChanges();

    expect(fixture.componentInstance.loading()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Plateforme IoT');
  });

  it('should display an error state when loading requests fails', () => {
    industrialisationService.mesDemandes.and.returnValue(throwError(() => new Error('boom')));
    const fixture = createComponent();

    expect(fixture.componentInstance.error()).toBe('Impossible de charger vos demandes.');
    expect(fixture.componentInstance.loading()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('Chargement impossible');
    expect(fixture.nativeElement.textContent).toContain('Réessayer');
  });

  it('should filter requests by project title search', () => {
    const fixture = createComponent();

    fixture.componentInstance.searchTerm = 'finance';
    fixture.detectChanges();

    expect(fixture.componentInstance.filteredDemandes().map((demande) => demande.projetTitre)).toEqual(['ERP Finance']);
    expect(fixture.nativeElement.textContent).toContain('1 demande(s) affichée(s) sur 3');
  });

  it('should filter requests by status', () => {
    const fixture = createComponent();

    fixture.componentInstance.statusFilter = 'GO';
    fixture.detectChanges();

    expect(fixture.componentInstance.filteredDemandes().length).toBe(1);
    expect(fixture.componentInstance.filteredDemandes()[0].statut).toBe('GO');
  });

  it('should filter requests by project type', () => {
    const fixture = createComponent();

    fixture.componentInstance.typeFilter = 'EXTERNE';
    fixture.detectChanges();

    expect(fixture.componentInstance.filteredDemandes().length).toBe(1);
    expect(fixture.componentInstance.filteredDemandes()[0].typeIndustrialisation).toBe('EXTERNE');
  });

  it('should reset filters and restore all requests', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    component.searchTerm = 'finance';
    component.statusFilter = 'GO';
    component.typeFilter = 'EXTERNE';
    expect(component.filteredDemandes().length).toBe(1);

    component.resetFilters();
    fixture.detectChanges();

    expect(component.searchTerm).toBe('');
    expect(component.statusFilter).toBe('');
    expect(component.typeFilter).toBe('');
    expect(component.filteredDemandes()).toEqual(demandes);
  });

  it('should return the correct label and class for GO', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component.statusLabel('GO')).toBe('Go');
    expect(component.statusClass('GO')).toBe('status-pill--go');
    expect(component.statusPresentation('GO').icon).toBe('GO');
  });

  it('should return the correct label and class for NO_GO', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component.statusLabel('NO_GO')).toBe('No Go');
    expect(component.statusClass('NO_GO')).toBe('status-pill--nogo');
    expect(component.statusPresentation('NO_GO').icon).toBe('NO');
  });

  it('should return the correct label and class for submitted or pending requests', () => {
    const fixture = createComponent();
    const component = fixture.componentInstance;

    expect(component.statusLabel('SOUMISE')).toBe('Soumise');
    expect(component.statusClass('SOUMISE')).toBe('status-pill--pending');
    expect(component.statusClass('A_COMPLETER')).toBe('status-pill--pending');
  });

  it('should display the decision reason only for decided requests', () => {
    industrialisationService.mesDemandes.and.returnValue(of([demandes[0], demandes[1]]));
    const fixture = createComponent();

    expect(fixture.nativeElement.querySelectorAll('.decision-box').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Motif de décision');
    expect(fixture.nativeElement.textContent).toContain('Industrialisation validee par la CI.');
  });

  it('should display pending text for undecided requests', () => {
    industrialisationService.mesDemandes.and.returnValue(of([demandes[0]]));
    const fixture = createComponent();

    expect(fixture.nativeElement.textContent).toContain("En attente de décision de la cellule d'industrialisation.");
    expect(fixture.nativeElement.textContent).not.toContain('Motif de décision');
  });

  it('should display the empty API state when no request exists', () => {
    industrialisationService.mesDemandes.and.returnValue(of([]));
    const fixture = createComponent();

    expect(fixture.componentInstance.demandes()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain("Aucune demande d'industrialisation.");
  });

  it('should display the filtered empty state when no request matches filters', () => {
    industrialisationService.mesDemandes.and.returnValue(of([demandes[0]]));
    const fixture = createComponent();

    fixture.componentInstance.searchTerm = 'sans resultat';
    fixture.detectChanges();

    expect(fixture.componentInstance.filteredDemandes()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Aucune demande ne correspond aux filtres sélectionnés.');
    expect(fixture.nativeElement.textContent).toContain('Réinitialiser les filtres');
  });

  it('should keep the existing CI workspace navigation for CI users', () => {
    authService.getRole.and.returnValue('ROLE_CI');
    const fixture = createComponent();

    expect(fixture.componentInstance.isCi).toBeTrue();
    expect(industrialisationService.mesDemandes).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain("Ouvrir l'espace CI");
    expect(fixture.nativeElement.textContent).toContain("Aller à l'espace CI");
  });

  it('should render safely when optional fields are null or missing', () => {
    const sparseDemande = createDemande({
      projetCategorie: null,
      projetDomaine: null,
      projetDescription: null,
      scoreEvaluationProjet: null,
      eligibleIndustrialisation: null,
      bloqueParEliminatoire: null,
      latestEvaluation: null,
      orientation: null,
      motifDecision: null,
      commentaire: null,
      warnings: undefined,
    });
    industrialisationService.mesDemandes.and.returnValue(of([sparseDemande]));

    const fixture = createComponent();

    expect(fixture.componentInstance.filteredDemandes().length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Aucun descriptif disponible pour cette demande.');
    expect(fixture.nativeElement.textContent).toContain('Non calcule');
    expect(fixture.nativeElement.textContent).toContain('Non renseignee');
  });
});
