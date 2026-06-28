import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { SujetsDisponibles } from './sujets-disponibles';
import { SujetProjetService } from '../../../../core/services/sujet-projet.service';
import { CandidatureService } from '../../../../core/services/candidature.service';
import { AuthService } from '../../../../core/services/auth.service';

describe('SujetsDisponibles', () => {
  let component: SujetsDisponibles;
  let fixture: ComponentFixture<SujetsDisponibles>;
  let sujetServiceSpy: jasmine.SpyObj<SujetProjetService>;
  let candidatureServiceSpy: jasmine.SpyObj<CandidatureService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  const mockSujets: any[] = [
    {
      id: 1, titre: 'IA Project', categorie: 'STAGE_INGENIEUR',
      domaines: ['Intelligence Artificielle'], technologies: ['Python'],
      encadrantNom: 'Dr. Martin', capaciteAccueil: 2,
      statut: 'CANDIDATURE_OUVERTE',
      dateCreation: '2026-06-01T00:00:00Z',
      dateSoumission: '2026-06-01T00:00:00Z',
    },
    {
      id: 2, titre: 'Web App', categorie: 'PFE',
      domaines: ['Web'], technologies: ['Angular', 'Spring'],
      encadrantNom: 'Dr. Sami', capaciteAccueil: 1,
      statut: 'CANDIDATURE_OUVERTE',
      dateCreation: '2026-06-02T00:00:00Z',
      dateSoumission: '2026-06-02T00:00:00Z',
    },
  ];

  const mockCandidatures: any[] = [
    { id: 10, sujetId: 1, statut: 'DEPOSEE' },
  ];

  beforeEach(async () => {
    sujetServiceSpy = jasmine.createSpyObj('SujetProjetService', ['getSujetsDisponibles']);
    candidatureServiceSpy = jasmine.createSpyObj('CandidatureService', ['getMesCandidatures']);
    authServiceSpy = jasmine.createSpyObj('AuthService', ['getRole']);

    sujetServiceSpy.getSujetsDisponibles.and.returnValue(of(mockSujets));
    candidatureServiceSpy.getMesCandidatures.and.returnValue(of(mockCandidatures));
    authServiceSpy.getRole.and.returnValue('ROLE_ETUDIANT');

    await TestBed.configureTestingModule({
      imports: [SujetsDisponibles],
      providers: [
        provideRouter([]),
        { provide: SujetProjetService, useValue: sujetServiceSpy },
        { provide: CandidatureService, useValue: candidatureServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SujetsDisponibles);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load sujets on init', () => {
    expect(sujetServiceSpy.getSujetsDisponibles).toHaveBeenCalled();
    expect(component.sujets.length).toBe(2);
    expect(component.filteredSujets.length).toBe(2);
    expect(component.isLoading).toBeFalse();
  });

  it('should load mes candidatures on init', () => {
    expect(candidatureServiceSpy.getMesCandidatures).toHaveBeenCalled();
    expect(component.mesCandidaturesSujetIds.has(1)).toBeTrue();
    expect(component.mesCandidaturesSujetIds.has(2)).toBeFalse();
  });

  it('dejaPostule should return true for sujet already applied to', () => {
    expect(component.dejaPostule(mockSujets[0])).toBeTrue();
  });

  it('dejaPostule should return false for sujet not applied to', () => {
    expect(component.dejaPostule(mockSujets[1])).toBeFalse();
  });

  // ── Search filter ─────────────────────────────────────────────────
  it('should filter sujets by search query on domain', () => {
    component.searchQuery = 'intelligence';
    component.onSearchChange();
    expect(component.filteredSujets.length).toBe(1);
    expect(component.filteredSujets[0].id).toBe(1);
  });

  it('should filter sujets by technology', () => {
    component.searchQuery = 'angular';
    component.onSearchChange();
    expect(component.filteredSujets.length).toBe(1);
    expect(component.filteredSujets[0].id).toBe(2);
  });

  it('should show all sujets when search is cleared', () => {
    component.searchQuery = 'angular';
    component.onSearchChange();
    component.searchQuery = '';
    component.onSearchChange();
    expect(component.filteredSujets.length).toBe(2);
  });

  // ── Sort ─────────────────────────────────────────────────────────
  it('should sort by most recent by default', () => {
    expect(component.filteredSujets[0].id).toBe(2); // newer date first
  });

  it('should sort oldest first when sortOrder is ancien', () => {
    component.onSortChange('ancien');
    expect(component.filteredSujets[0].id).toBe(1);
  });

  // ── Modal state ───────────────────────────────────────────────────
  it('ouvrirPostuler should set selectedSujet and show modal', () => {
    component.ouvrirPostuler(mockSujets[0]);
    expect(component.showPostulerModal).toBeTrue();
    expect(component.selectedSujet).toEqual(mockSujets[0]);
  });

  it('fermerPostuler should hide modal and clear selectedSujet', () => {
    component.ouvrirPostuler(mockSujets[0]);
    component.fermerPostuler();
    expect(component.showPostulerModal).toBeFalse();
    expect(component.selectedSujet).toBeNull();
  });

  it('onCandidatureSoumise should close modal and reload candidatures', () => {
    component.ouvrirPostuler(mockSujets[0]);
    component.onCandidatureSoumise();
    expect(component.showPostulerModal).toBeFalse();
    expect(candidatureServiceSpy.getMesCandidatures).toHaveBeenCalledTimes(2); // init + after submit
  });

  // ── Error handling ────────────────────────────────────────────────
  it('should handle error when loading sujets fails', () => {
    sujetServiceSpy.getSujetsDisponibles.and.returnValue(throwError(() => new Error('Network error')));
    component.loadSujets();
    expect(component.sujets.length).toBe(0);
    expect(component.isLoading).toBeFalse();
  });

  // ── Modal open/close ───────────────────────────────────────────────
  it('openModal should set isModalOpen to true', () => {
    component.openModal();
    expect(component.isModalOpen).toBeTrue();
  });

  it('closeModal should set isModalOpen to false', () => {
    component.openModal();
    component.closeModal();
    expect(component.isModalOpen).toBeFalse();
  });

  it('onSujetSaved should close modal and reload sujets', () => {
    component.openModal();
    component.onSujetSaved();
    expect(component.isModalOpen).toBeFalse();
    expect(sujetServiceSpy.getSujetsDisponibles).toHaveBeenCalledTimes(2);
  });
});
