import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProjetCard } from '../../../core/models/projet-catalogue.model';
import { ValidationProjets } from './validation-projets';
import { environment } from '../../../../environments/environment';

describe('ValidationProjets', () => {
  let fixture: ComponentFixture<ValidationProjets>;
  let component: ValidationProjets;
  let httpTesting: HttpTestingController;

  const API = environment.apiUrl;

  const mockCards: ProjetCard[] = [
    {
      id: 1, typeProjet: 'RDI', titre: 'Projet IA', description: 'Desc IA',
      statut: 'SOUMIS_EN_VALIDATION', score: 0, encadrantId: 1, encadrantNom: 'Jean Dupont',
      equipeId: 100, equipeNom: 'Equipe IA', dateDebut: '2026-01-01', dateFin: '2026-12-31',
      dateCreation: '2026-01-15T10:00:00', domaines: ['IA'], technologies: ['Python'],
    },
    {
      id: 2, typeProjet: 'PFE', titre: 'Projet Web', description: 'Desc Web',
      statut: 'SOUMIS_EN_VALIDATION', score: 0, encadrantId: 2, encadrantNom: 'Alice Martin',
      equipeId: 100, equipeNom: 'Equipe IA', dateDebut: '2026-03-01', dateFin: '2026-09-01',
      dateCreation: '2026-02-01T08:00:00', domaines: ['Web'], technologies: ['Angular'],
    },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ValidationProjets],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(ValidationProjets);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  function flushAValider(data: ProjetCard[] = mockCards): void {
    const req = httpTesting.expectOne(`${API}/projets/a-valider`);
    req.flush(data);
  }

  it('should create', () => {
    fixture.detectChanges();
    flushAValider();
    expect(component).toBeTruthy();
  });

  it('loads projects on init', () => {
    fixture.detectChanges();
    flushAValider();
    expect(component.projets.length).toBe(2);
    expect(component.isLoading).toBe(false);
  });

  it('handles load error', () => {
    fixture.detectChanges();
    const req = httpTesting.expectOne(`${API}/projets/a-valider`);
    req.error(new ProgressEvent('error'));
    expect(component.errorMessage).toBeTruthy();
    expect(component.isLoading).toBe(false);
  });

  // ── Validation workflow ────────────────────────────────────────────

  it('demanderValidation sets target', () => {
    fixture.detectChanges();
    flushAValider();
    component.demanderValidation(mockCards[0]);
    expect(component.validerTarget).toBe(mockCards[0]);
  });

  it('annulerValidation clears target', () => {
    fixture.detectChanges();
    flushAValider();
    component.demanderValidation(mockCards[0]);
    component.annulerValidation();
    expect(component.validerTarget).toBeNull();
  });

  it('confirmerValidation calls service and reloads', () => {
    fixture.detectChanges();
    flushAValider();

    component.demanderValidation(mockCards[0]);
    component.confirmerValidation();

    const valReq = httpTesting.expectOne(`${API}/projets/1/valider`);
    expect(valReq.request.method).toBe('PUT');
    valReq.flush({});

    flushAValider([mockCards[1]]);
    expect(component.projets.length).toBe(1);
    expect(component.successMessage).toBeTruthy();
  });

  it('confirmerValidation handles error', () => {
    fixture.detectChanges();
    flushAValider();

    component.demanderValidation(mockCards[0]);
    component.confirmerValidation();

    const valReq = httpTesting.expectOne(`${API}/projets/1/valider`);
    valReq.flush({ detail: 'Erreur serveur' }, { status: 409, statusText: 'Conflict' });

    expect(component.errorMessage).toBeTruthy();
    expect(component.actionLoadingId).toBeNull();
  });

  it('confirmerValidation with no target does nothing', () => {
    fixture.detectChanges();
    flushAValider();
    component.confirmerValidation();
    httpTesting.expectNone(`${API}/projets/1/valider`);
  });

  // ── Refus workflow ─────────────────────────────────────────────────

  it('ouvrirMotif sets target and resets text', () => {
    fixture.detectChanges();
    flushAValider();
    component.ouvrirMotif(mockCards[0]);
    expect(component.motifTargetId).toBe(1);
    expect(component.motifText).toBe('');
  });

  it('annulerMotif clears state', () => {
    fixture.detectChanges();
    flushAValider();
    component.ouvrirMotif(mockCards[0]);
    component.motifText = 'Some text';
    component.annulerMotif();
    expect(component.motifTargetId).toBeNull();
    expect(component.motifText).toBe('');
  });

  it('motifInvalide returns true for short text', () => {
    component.motifText = 'abc';
    expect(component.motifInvalide).toBe(true);
  });

  it('motifInvalide returns false for valid text', () => {
    component.motifText = 'Projet incomplet, manque les objectifs';
    expect(component.motifInvalide).toBe(false);
  });

  it('confirmerRefus calls service and reloads', () => {
    fixture.detectChanges();
    flushAValider();

    component.ouvrirMotif(mockCards[1]);
    component.motifText = 'Projet incomplet';
    component.confirmerRefus();

    const refReq = httpTesting.expectOne(`${API}/projets/2/refuser`);
    expect(refReq.request.method).toBe('PUT');
    expect(refReq.request.body).toEqual({ motifRefus: 'Projet incomplet' });
    refReq.flush({});

    flushAValider([mockCards[0]]);
    expect(component.projets.length).toBe(1);
    expect(component.successMessage).toBeTruthy();
  });

  it('confirmerRefus with invalid motif does nothing', () => {
    fixture.detectChanges();
    flushAValider();

    component.ouvrirMotif(mockCards[0]);
    component.motifText = 'ab';
    component.confirmerRefus();

    httpTesting.expectNone(`${API}/projets/1/refuser`);
    expect(component.rejectError).toBeTruthy();
  });

  it('confirmerRefus with no target does nothing', () => {
    fixture.detectChanges();
    flushAValider();

    component.motifText = 'Valid motif text';
    component.confirmerRefus();

    httpTesting.expectNone(`${API}/projets/1/refuser`);
  });

  it('confirmerRefus handles error', () => {
    fixture.detectChanges();
    flushAValider();

    component.ouvrirMotif(mockCards[0]);
    component.motifText = 'Valid motif text';
    component.confirmerRefus();

    const refReq = httpTesting.expectOne(`${API}/projets/1/refuser`);
    refReq.flush({ detail: 'Conflit' }, { status: 409, statusText: 'Conflict' });

    expect(component.errorMessage).toBeTruthy();
    expect(component.actionLoadingId).toBeNull();
  });
});
