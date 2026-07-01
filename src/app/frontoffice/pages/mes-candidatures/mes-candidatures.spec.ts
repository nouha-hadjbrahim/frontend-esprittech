import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MesCandidatures } from './mes-candidatures';
import { CandidatureService } from '../../../core/services/candidature.service';
import { Candidature } from '../../../core/models/candidature.model';

const MOCK_CANDIDATURE: Candidature = {
  id: 1,
  sujetId: 10,
  etudiantId: 5,
  etudiantNom: 'Ben Ali',
  etudiantPrenom: 'Sami',
  statut: 'DEPOSEE',
  motifRefus: null,
  messageEtudiant: 'Très motivé',
  dateDepot: '2026-06-27T10:00:00Z',
  dateDecision: null,
  sujetTitre: 'Projet IA',
  sujetCategorie: 'PFE',
  encadrantNom: 'Dr. Martin',
};

describe('MesCandidatures', () => {
  let component: MesCandidatures;
  let fixture: ComponentFixture<MesCandidatures>;
  let candidatureServiceSpy: jasmine.SpyObj<CandidatureService>;

  beforeEach(async () => {
    candidatureServiceSpy = jasmine.createSpyObj('CandidatureService', [
      'getMesCandidatures',
      'retirerMaCandidature',
    ]);
    candidatureServiceSpy.getMesCandidatures.and.returnValue(of([MOCK_CANDIDATURE]));

    await TestBed.configureTestingModule({
      imports: [MesCandidatures],
      providers: [
        provideRouter([]),
        { provide: CandidatureService, useValue: candidatureServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MesCandidatures);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and load candidatures', () => {
    expect(component).toBeTruthy();
    expect(candidatureServiceSpy.getMesCandidatures).toHaveBeenCalled();
    expect(component.filteredCandidatures.length).toBe(1);
  });

  it('canRetirer should be true only for DEPOSEE', () => {
    expect(component.canRetirer(MOCK_CANDIDATURE)).toBeTrue();
    expect(component.canRetirer({ ...MOCK_CANDIDATURE, statut: 'ACCEPTEE' })).toBeFalse();
  });

  it('should filter by search query', () => {
    component.searchQuery = 'inexistant';
    component.onSearchChange();
    expect(component.filteredCandidatures.length).toBe(0);
  });

  it('confirmDelete should call retirerMaCandidature and reload', () => {
    candidatureServiceSpy.retirerMaCandidature.and.returnValue(of(void 0));
    component.openDeleteConfirm(MOCK_CANDIDATURE);
    component.confirmDelete();
    expect(candidatureServiceSpy.retirerMaCandidature).toHaveBeenCalledWith(1);
    expect(candidatureServiceSpy.getMesCandidatures).toHaveBeenCalledTimes(2);
  });

  it('should show load error on failure', () => {
    candidatureServiceSpy.getMesCandidatures.and.returnValue(throwError(() => new Error('fail')));
    component.loadCandidatures();
    expect(component.loadError).toContain('Impossible de charger');
  });
});
