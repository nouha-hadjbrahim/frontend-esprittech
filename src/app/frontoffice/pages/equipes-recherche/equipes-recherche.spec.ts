import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { EquipesRecherche } from './equipes-recherche';
import { EquipeService } from '../../../core/services/equipe.service';
import { AffiliationService } from '../../../core/services/affiliation.service';
import { AuthService } from '../../../core/services/auth.service';
import { Equipe } from '../../../core/models/equipe.model';
import { User } from '../../../core/models/user.model';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    nom: 'Dupont',
    prenom: 'Jean',
    email: 'jean.dupont@example.com',
    role: 'ROLE_ENSEIGNANT',
    typeUtilisateur: 'ENSEIGNANT',
    departement: 'Informatique',
    enabled: true,
    createdAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeEquipe(overrides: Partial<Equipe> = {}): Equipe {
  return {
    id: 10,
    nom: 'Equipe Alpha',
    description: 'Recherche en IA',
    chef: makeUser({ id: 5, nom: 'Chef', prenom: 'Ali', email: 'ali.chef@example.com', role: 'ROLE_CHEF_EQUIPE' }),
    nbMembres: 3,
    createdAt: '2025-06-01T00:00:00Z',
    domaineId: 1,
    domaine: 'Intelligence Artificielle',
    statut: 'Actif',
    members: [],
    ...overrides,
  };
}

describe('EquipesRecherche', () => {
  let component: EquipesRecherche;
  let fixture: ComponentFixture<EquipesRecherche>;
  let equipeService: jasmine.SpyObj<EquipeService>;
  let affiliationService: jasmine.SpyObj<AffiliationService>;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    equipeService = jasmine.createSpyObj('EquipeService', ['getAll', 'getById', 'retirerMembre']);
    affiliationService = jasmine.createSpyObj('AffiliationService', ['getAll', 'getMesDemandes', 'getByEquipe', 'create']);
    authService = jasmine.createSpyObj('AuthService', ['getRole', 'isAffilieToEquipe', 'equipeId']);
    Object.defineProperty(authService, 'currentUser', { value: signal(makeUser()), writable: false });

    equipeService.getAll.and.returnValue(of([makeEquipe()]));
    affiliationService.getAll.and.returnValue(of([]));
    affiliationService.getMesDemandes.and.returnValue(of([]));
    affiliationService.getByEquipe.and.returnValue(of([]));
    authService.getRole.and.returnValue('ROLE_ENSEIGNANT');
    authService.isAffilieToEquipe.and.returnValue(true);
    authService.equipeId.and.returnValue(10);

    await TestBed.configureTestingModule({
      imports: [EquipesRecherche],
      providers: [
        { provide: EquipeService, useValue: equipeService },
        { provide: AffiliationService, useValue: affiliationService },
        { provide: AuthService, useValue: authService },
        { provide: ActivatedRoute, useValue: { snapshot: { data: {}, paramMap: { get: () => null } } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EquipesRecherche);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load equipes on init', () => {
    expect(equipeService.getAll).toHaveBeenCalled();
  });

  it('should handle load error', () => {
    equipeService.getAll.and.returnValue(throwError(() => new Error('fail')));
    (component as any).loadData();
    expect(component.loading()).toBeFalse();
  });
});
