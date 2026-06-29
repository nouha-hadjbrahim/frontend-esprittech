import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AjouterProjetModal } from './ajouter-projet-modal';

describe('AjouterProjetModal', () => {
  let fixture: ComponentFixture<AjouterProjetModal>;
  let component: AjouterProjetModal;
  let httpTesting: HttpTestingController;

  const API = 'http://localhost:8080/api';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AjouterProjetModal],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(AjouterProjetModal);
    component = fixture.componentInstance;
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  function flushReferences(): void {
    httpTesting.expectOne(`${API}/projets/references/domaines`).flush([{ id: 1, nom: 'IA' }]);
    httpTesting.expectOne(`${API}/projets/references/technologies`).flush([{ id: 1, nom: 'Spring' }]);
    httpTesting.expectOne(`${API}/projets/references/prerequis`).flush([{ id: 1, nom: 'Java' }]);
  }

  it('should create', () => {
    fixture.detectChanges();
    flushReferences();
    expect(component).toBeTruthy();
  });

  it('loads references on init', () => {
    fixture.detectChanges();
    flushReferences();
    expect(component.domaines.length).toBe(1);
    expect(component.technologies.length).toBe(1);
    expect(component.prerequis.length).toBe(1);
  });

  it('form is invalid when empty', () => {
    fixture.detectChanges();
    flushReferences();
    expect(component.form.invalid).toBe(true);
  });

  it('form validates required fields', () => {
    fixture.detectChanges();
    flushReferences();

    component.form.controls.titre.setValue('Projet Test');
    component.form.controls.description.setValue('Description longue du projet');
    component.form.controls.objectifs.setValue('Objectifs du projet');
    component.form.controls.dateDebut.setValue('2026-01-01');
    component.form.controls.dateFin.setValue('2026-12-31');

    expect(component.form.valid).toBe(true);
  });

  it('titre min length validation', () => {
    fixture.detectChanges();
    flushReferences();
    component.form.controls.titre.setValue('AB');
    component.form.controls.titre.markAsTouched();
    expect(component.isInvalid('titre')).toBe(true);
  });

  it('description min length validation', () => {
    fixture.detectChanges();
    flushReferences();
    component.form.controls.description.setValue('Short');
    component.form.controls.description.markAsTouched();
    expect(component.isInvalid('description')).toBe(true);
  });

  it('dateRange validator detects invalid range', () => {
    fixture.detectChanges();
    flushReferences();
    component.form.controls.dateDebut.setValue('2026-12-31');
    component.form.controls.dateFin.setValue('2026-01-01');
    component.form.controls.dateFin.markAsTouched();
    expect(component.isDateRangeInvalid).toBe(true);
  });

  it('dateRange validator accepts valid range', () => {
    fixture.detectChanges();
    flushReferences();
    component.form.controls.dateDebut.setValue('2026-01-01');
    component.form.controls.dateFin.setValue('2026-12-31');
    expect(component.form.hasError('dateRange')).toBe(false);
  });

  // ── Chip selections ─────────────────────────────────────────────

  it('toggleDomaine adds and removes', () => {
    fixture.detectChanges();
    flushReferences();
    component.toggleDomaine(1);
    expect(component.selectedDomaines.has(1)).toBe(true);
    component.toggleDomaine(1);
    expect(component.selectedDomaines.has(1)).toBe(false);
  });

  it('toggleTechnologie adds and removes', () => {
    fixture.detectChanges();
    flushReferences();
    component.toggleTechnologie(1);
    expect(component.selectedTechnologies.has(1)).toBe(true);
    component.toggleTechnologie(1);
    expect(component.selectedTechnologies.has(1)).toBe(false);
  });

  it('togglePrerequis adds and removes', () => {
    fixture.detectChanges();
    flushReferences();
    component.togglePrerequis(1);
    expect(component.selectedPrerequis.has(1)).toBe(true);
    component.togglePrerequis(1);
    expect(component.selectedPrerequis.has(1)).toBe(false);
  });

  it('isDomainesInvalid when touched and empty', () => {
    fixture.detectChanges();
    flushReferences();
    component.domainesTouched = true;
    expect(component.isDomainesInvalid).toBe(true);
    component.toggleDomaine(1);
    expect(component.isDomainesInvalid).toBe(false);
  });

  it('isTechnologiesInvalid when touched and empty', () => {
    fixture.detectChanges();
    flushReferences();
    component.technologiesTouched = true;
    expect(component.isTechnologiesInvalid).toBe(true);
    component.toggleTechnologie(1);
    expect(component.isTechnologiesInvalid).toBe(false);
  });

  // ── Type selection ─────────────────────────────────────────────

  it('selectType changes form value', () => {
    fixture.detectChanges();
    flushReferences();
    component.selectType('RDI');
    expect(component.form.controls.typeProjet.value).toBe('RDI');
    expect(component.isTypeActive('RDI')).toBe(true);
    expect(component.isTypeActive('PFE')).toBe(false);
  });

  // ── Submit ─────────────────────────────────────────────────────

  it('submit with invalid form does not call API', () => {
    fixture.detectChanges();
    flushReferences();
    component.submit();
    httpTesting.expectNone(`${API}/projets`);
  });

  it('submit with valid form calls API', () => {
    fixture.detectChanges();
    flushReferences();

    component.form.controls.titre.setValue('Projet Test');
    component.form.controls.description.setValue('Description longue du projet');
    component.form.controls.objectifs.setValue('Objectifs');
    component.form.controls.dateDebut.setValue('2026-01-01');
    component.form.controls.dateFin.setValue('2026-12-31');
    component.toggleDomaine(1);
    component.toggleTechnologie(1);

    const savedSpy = spyOn(component.saved, 'emit');
    component.submit();

    const req = httpTesting.expectOne(`${API}/projets`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.titre).toBe('Projet Test');
    expect(req.request.body.domainesIds).toEqual([1]);
    req.flush({});

    expect(savedSpy).toHaveBeenCalled();
    expect(component.isSubmitting).toBe(false);
  });

  it('submit handles backend error', () => {
    fixture.detectChanges();
    flushReferences();

    component.form.controls.titre.setValue('Projet Test');
    component.form.controls.description.setValue('Description longue du projet');
    component.form.controls.objectifs.setValue('Objectifs');
    component.form.controls.dateDebut.setValue('2026-01-01');
    component.form.controls.dateFin.setValue('2026-12-31');
    component.toggleDomaine(1);
    component.toggleTechnologie(1);

    component.submit();

    const req = httpTesting.expectOne(`${API}/projets`);
    req.flush(
      { detail: 'Erreur serveur', errors: { titre: 'Titre déjà utilisé' } },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(component.errorMessage).toBe('Erreur serveur');
    expect(component.fieldErrors['titre']).toBe('Titre déjà utilisé');
    expect(component.isSubmitting).toBe(false);
  });

  // ── Close / overlay ───────────────────────────────────────────

  it('close emits closed event', () => {
    fixture.detectChanges();
    flushReferences();
    const closeSpy = spyOn(component.closed, 'emit');
    component.close();
    expect(closeSpy).toHaveBeenCalled();
  });

  it('handles reference load errors gracefully', () => {
    fixture.detectChanges();
    httpTesting.expectOne(`${API}/projets/references/domaines`).error(new ProgressEvent('error'));
    httpTesting.expectOne(`${API}/projets/references/technologies`).error(new ProgressEvent('error'));
    httpTesting.expectOne(`${API}/projets/references/prerequis`).error(new ProgressEvent('error'));
    expect(component.domaines).toEqual([]);
    expect(component.technologies).toEqual([]);
    expect(component.prerequis).toEqual([]);
  });

  it('resetForm on isOpen change', () => {
    fixture.detectChanges();
    flushReferences();

    component.toggleDomaine(1);
    component.form.controls.titre.setValue('Something');

    component.isOpen = true;
    component.ngOnChanges({
      isOpen: { currentValue: true, previousValue: false, firstChange: false, isFirstChange: () => false },
    });

    expect(component.form.controls.titre.value).toBe('');
    expect(component.selectedDomaines.size).toBe(0);
  });
});
