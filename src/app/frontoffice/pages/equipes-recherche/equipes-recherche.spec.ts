import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { EquipesRecherche } from './equipes-recherche';
import { EquipeService } from '../../../core/services/equipe.service';
import { AffiliationService } from '../../../core/services/affiliation.service';
import { AuthService } from '../../../core/services/auth.service';

describe('EquipesRecherche', () => {
  beforeEach(() => {
    const currentUser = signal(null);
    const equipeSvc = jasmine.createSpyObj<EquipeService>('EquipeService', ['getAll', 'retirerMembre']);
    const affiliationSvc = jasmine.createSpyObj<AffiliationService>('AffiliationService', [
      'getByEquipe',
      'getMesDemandes',
      'traiter',
      'create',
    ]);
    const authSvc = {
      currentUser: currentUser.asReadonly(),
      getRole: jasmine.createSpy('getRole').and.returnValue('ROLE_ENSEIGNANT'),
    };

    equipeSvc.getAll.and.returnValue(of([]));
    affiliationSvc.getByEquipe.and.returnValue(of([]));
    affiliationSvc.getMesDemandes.and.returnValue(of([]));

    TestBed.configureTestingModule({
      imports: [EquipesRecherche],
      providers: [
        { provide: EquipeService, useValue: equipeSvc },
        { provide: AffiliationService, useValue: affiliationSvc },
        { provide: AuthService, useValue: authSvc },
        { provide: ActivatedRoute, useValue: { snapshot: { data: {} } } },
      ],
    });
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(EquipesRecherche);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });
});
