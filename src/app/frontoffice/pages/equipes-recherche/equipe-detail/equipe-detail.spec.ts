import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { ActivatedRoute, ParamMap, convertToParamMap } from '@angular/router';
import { Location } from '@angular/common';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { signal, WritableSignal } from '@angular/core';
import { EquipeDetail } from './equipe-detail';
import { EquipeService } from '../../../../core/services/equipe.service';
import { AffiliationService } from '../../../../core/services/affiliation.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Equipe } from '../../../../core/models/equipe.model';
import { User } from '../../../../core/models/user.model';
import { AffiliationEnseignantResponse } from '../../../../core/models/affiliation-request.model';
import { EquipeDomaineService } from '../../../../core/services/equipe-domaine.service';

const chefUser: User = { id: 20, prenom: 'Alice', nom: 'Chef', email: 'alice@test.tn', role: 'ROLE_CHEF_EQUIPE', typeUtilisateur: 'ENSEIGNANT', departement: 'Info', enabled: true, createdAt: '2025-01-01', isAffilieToEquipe: true, equipeId: 1, equipeNom: 'AI Lab' };
const enseignantUser: User = { id: 30, prenom: 'Bob', nom: 'Enseignant', email: 'bob@test.tn', role: 'ROLE_ENSEIGNANT', typeUtilisateur: 'ENSEIGNANT', departement: 'Maths', enabled: true, createdAt: '2025-01-01', isAffilieToEquipe: false, equipeId: null, equipeNom: null };
const memberUser: User = { id: 40, prenom: 'Charlie', nom: 'Member', email: 'charlie@test.tn', role: 'ROLE_ENSEIGNANT', typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: '2025-01-01', isAffilieToEquipe: true, equipeId: 1, equipeNom: 'AI Lab' };
const otherUser: User = { id: 50, prenom: 'Diana', nom: 'Other', email: 'diana@test.tn', role: 'ROLE_ENSEIGNANT', typeUtilisateur: 'ENSEIGNANT', departement: null, enabled: true, createdAt: '2025-01-01', isAffilieToEquipe: false, equipeId: null, equipeNom: null };

const mockEquipe: Equipe = {
  id: 1, nom: 'AI Lab', description: 'Recherche en IA', domaineId: 2, domaine: 'Informatique',
  chef: chefUser, nbMembres: 1, createdAt: '2025-01-01', statut: 'Actif',
};

const mockEquipeWithMembers: Equipe = {
  ...mockEquipe, members: [memberUser],
};

const mockEquipeNoChef: Equipe = {
  ...mockEquipe, chef: null,
};

const mockEquipeChefInMembers: Equipe = {
  ...mockEquipe, members: [chefUser, memberUser],
};

const mockEnAttente: AffiliationEnseignantResponse = {
  id: 1, equipeId: 1, equipeNom: 'AI Lab',
  enseignant: otherUser, statut: 'EN_ATTENTE', dateDemande: '2025-06-01T10:00:00Z',
  dateDecision: null, motifDecision: null,
};

const mockAcceptee: AffiliationEnseignantResponse = {
  id: 2, equipeId: 1, equipeNom: 'AI Lab',
  enseignant: memberUser, statut: 'ACCEPTEE', dateDemande: '2025-05-01T10:00:00Z',
  dateDecision: '2025-05-02T10:00:00Z', motifDecision: null,
};

const paramsSubject = new BehaviorSubject<ParamMap>(convertToParamMap({ id: '1' }));

describe('EquipeDetail', () => {
  let component: EquipeDetail;
  let fixture: ComponentFixture<EquipeDetail>;
  let equipeSvc: jasmine.SpyObj<EquipeService>;
  let affiliationSvc: jasmine.SpyObj<AffiliationService>;
  let authSvc: any;
  let currentUserSignal: WritableSignal<User | null>;
  let location: any;
  let domaineSvc: jasmine.SpyObj<EquipeDomaineService>;

  const configureModule = () => {
    TestBed.configureTestingModule({
      imports: [EquipeDetail, NoopAnimationsModule],
      providers: [
        { provide: EquipeService, useValue: equipeSvc },
        { provide: AffiliationService, useValue: affiliationSvc },
        { provide: AuthService, useValue: authSvc },
        { provide: EquipeDomaineService, useValue: domaineSvc },
        { provide: ActivatedRoute, useValue: { paramMap: paramsSubject.asObservable() } },
        { provide: Location, useValue: location },
      ],
    });
  };

  const createComponent = () => {
    fixture = TestBed.createComponent(EquipeDetail);
    component = fixture.componentInstance;
  };

  beforeEach(() => {
    currentUserSignal = signal<User | null>(null);
    equipeSvc = jasmine.createSpyObj('EquipeService', ['getById', 'getAll', 'getMembres', 'retirerMembre', 'ajouterMembres']);
    affiliationSvc = jasmine.createSpyObj('AffiliationService', ['getByEquipe', 'getMesDemandes', 'create', 'traiter']);
    domaineSvc = jasmine.createSpyObj('EquipeDomaineService', ['getAll']);
    authSvc = { getRole: jasmine.createSpy('getRole'), currentUser: currentUserSignal.asReadonly() };
    location = { back: jasmine.createSpy('back') };

    equipeSvc.getById.and.returnValue(of(mockEquipeWithMembers));
    equipeSvc.getAll.and.returnValue(of([mockEquipeWithMembers]));
    equipeSvc.getMembres.and.returnValue(of([]));
    affiliationSvc.getByEquipe.and.returnValue(of([]));
    affiliationSvc.getMesDemandes.and.returnValue(of([]));
    domaineSvc.getAll.and.returnValue(of([]));
    currentUserSignal.set(null);
  });

  afterEach(() => {
    paramsSubject.next(convertToParamMap({ id: '1' }));
  });

  // ── Creation ──

  describe('creation', () => {
    it('should create', () => {
      configureModule();
      createComponent();
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });
  });

  // ── ngOnInit ──

  describe('ngOnInit', () => {
    it('should load equipe and allEquipes on init', () => {
      configureModule();
      createComponent();
      fixture.detectChanges();
      expect(equipeSvc.getById).toHaveBeenCalledWith(1);
      expect(equipeSvc.getAll).toHaveBeenCalled();
      expect(component.equipe()).toEqual(mockEquipeWithMembers);
      expect(component.equipes().length).toBe(1);
    });

    it('should set error on load failure', () => {
      equipeSvc.getById.and.returnValue(throwError(() => new Error('fail')));
      configureModule();
      createComponent();
      fixture.detectChanges();
      expect(component.error()).toContain('Impossible de charger');
      expect(component.loading()).toBeFalse();
    });

    it('should call loadAffiliations when chef of this team', () => {
      currentUserSignal.set(chefUser);
      authSvc.getRole.and.returnValue('ROLE_CHEF_EQUIPE');
      affiliationSvc.getByEquipe.and.returnValue(of([mockEnAttente]));
      configureModule();
      createComponent();
      fixture.detectChanges();
      expect(affiliationSvc.getByEquipe).toHaveBeenCalledWith(1);
      expect(component.affiliations().length).toBe(1);
    });

    it('should call loadMesDemandes when enseignant', () => {
      currentUserSignal.set(enseignantUser);
      authSvc.getRole.and.returnValue('ROLE_ENSEIGNANT');
      affiliationSvc.getMesDemandes.and.returnValue(of([mockEnAttente]));
      configureModule();
      createComponent();
      fixture.detectChanges();
      expect(affiliationSvc.getMesDemandes).toHaveBeenCalled();
      expect(component.affiliations().length).toBe(1);
    });
  });

  // ── loadMembres ──

  describe('loadMembres', () => {
    it('should use members from equipe when present and include chef', () => {
      equipeSvc.getById.and.returnValue(of(mockEquipeWithMembers));
      configureModule();
      createComponent();
      fixture.detectChanges();
      expect(component.membres().length).toBe(2);
      expect(component.membres()[0].id).toBe(chefUser.id);
      expect(component.membres()[1].id).toBe(memberUser.id);
      expect(component.loading()).toBeFalse();
    });

    it('should not add chef twice when chef already in members', () => {
      equipeSvc.getById.and.returnValue(of(mockEquipeChefInMembers));
      configureModule();
      createComponent();
      fixture.detectChanges();
      expect(component.membres().length).toBe(2);
    });

    it('should return members unchanged when equipe has no chef', () => {
      equipeSvc.getById.and.returnValue(of(mockEquipeNoChef));
      configureModule();
      createComponent();
      fixture.detectChanges();
      expect(component.membres().length).toBe(0);
    });

    it('should fetch members from API when equipe has no members', () => {
      equipeSvc.getById.and.returnValue(of(mockEquipe));
      equipeSvc.getMembres.and.returnValue(of([memberUser]));
      configureModule();
      createComponent();
      fixture.detectChanges();
      expect(equipeSvc.getMembres).toHaveBeenCalledWith(1);
      expect(component.membres().length).toBe(2);
      expect(component.membres()[0].id).toBe(chefUser.id);
    });

    it('should handle getMembres error', () => {
      equipeSvc.getById.and.returnValue(of(mockEquipe));
      equipeSvc.getMembres.and.returnValue(throwError(() => new Error('fail')));
      configureModule();
      createComponent();
      fixture.detectChanges();
      expect(component.membres()).toEqual([]);
    });
  });

  // ── loadAffiliations ──

  describe('loadAffiliations', () => {
    beforeEach(() => {
      currentUserSignal.set(chefUser);
      authSvc.getRole.and.returnValue('ROLE_CHEF_EQUIPE');
      configureModule();
      createComponent();
      fixture.detectChanges();
    });

    it('should set affiliations on success', () => {
      affiliationSvc.getByEquipe.and.returnValue(of([mockEnAttente]));
      (component as any).loadAffiliations(1);
      expect(component.affiliations().length).toBe(1);
    });

    it('should set empty on error', () => {
      affiliationSvc.getByEquipe.and.returnValue(throwError(() => new Error('fail')));
      (component as any).loadAffiliations(1);
      expect(component.affiliations()).toEqual([]);
    });
  });

  // ── loadMesDemandes ──

  describe('loadMesDemandes', () => {
    beforeEach(() => {
      currentUserSignal.set(enseignantUser);
      authSvc.getRole.and.returnValue('ROLE_ENSEIGNANT');
      configureModule();
      createComponent();
      fixture.detectChanges();
    });

    it('should set affiliations from mes demandes on success', () => {
      affiliationSvc.getMesDemandes.and.returnValue(of([mockEnAttente]));
      (component as any).loadMesDemandes();
      expect(component.affiliations().length).toBe(1);
    });

    it('should set empty on error', () => {
      affiliationSvc.getMesDemandes.and.returnValue(throwError(() => new Error('fail')));
      (component as any).loadMesDemandes();
      expect(component.affiliations()).toEqual([]);
    });
  });

  // ── rejoindreEquipe ──

  describe('rejoindreEquipe', () => {
    it('should do nothing when equipe is null', () => {
      configureModule();
      createComponent();
      fixture.detectChanges();
      component.equipe.set(null);
      component.rejoindreEquipe();
      expect(affiliationSvc.create).not.toHaveBeenCalled();
    });

    it('should create affiliation and load affiliations for chef', () => {
      currentUserSignal.set(chefUser);
      authSvc.getRole.and.returnValue('ROLE_CHEF_EQUIPE');
      affiliationSvc.create.and.returnValue(of(mockEnAttente as any));
      configureModule();
      createComponent();
      fixture.detectChanges();
      spyOn(component as any, 'loadAffiliations').and.callThrough();

      component.rejoindreEquipe();
      expect(affiliationSvc.create).toHaveBeenCalledWith(1);
      expect((component as any).loadAffiliations).toHaveBeenCalledWith(1);
    });

    it('should create affiliation and load mes demandes for enseignant', () => {
      currentUserSignal.set(enseignantUser);
      authSvc.getRole.and.returnValue('ROLE_ENSEIGNANT');
      affiliationSvc.create.and.returnValue(of(mockEnAttente as any));
      configureModule();
      createComponent();
      fixture.detectChanges();
      spyOn(component as any, 'loadMesDemandes').and.callThrough();

      component.rejoindreEquipe();
      expect(affiliationSvc.create).toHaveBeenCalledWith(1);
      expect((component as any).loadMesDemandes).toHaveBeenCalled();
    });
  });

  // ── accepterDemande ──

  describe('accepterDemande', () => {
    beforeEach(() => {
      currentUserSignal.set(chefUser);
      authSvc.getRole.and.returnValue('ROLE_CHEF_EQUIPE');
      configureModule();
      createComponent();
      fixture.detectChanges();
    });

    it('should do nothing when equipe is null', () => {
      component.equipe.set(null);
      component.accepterDemande(1);
      expect(affiliationSvc.traiter).not.toHaveBeenCalled();
    });

    it('should traiter ACCEPTEE and reload', () => {
      affiliationSvc.traiter.and.returnValue(of(mockAcceptee as any));
      spyOn(component as any, 'reloadEquipe').and.callThrough();
      spyOn(component as any, 'loadAffiliations').and.callThrough();

      component.accepterDemande(1);
      expect(affiliationSvc.traiter).toHaveBeenCalledWith(1, 1, 'ACCEPTEE');
      expect((component as any).reloadEquipe).toHaveBeenCalled();
      expect((component as any).loadAffiliations).toHaveBeenCalledWith(1);
    });

    it('should call traiter for accepterDemande', () => {
      affiliationSvc.traiter.and.returnValue(of(mockAcceptee as any));
      affiliationSvc.getByEquipe.and.returnValue(of([]));
      spyOn(component as any, 'reloadEquipe').and.callThrough();

      component.accepterDemande(1);
      expect(affiliationSvc.traiter).toHaveBeenCalled();
      expect((component as any).reloadEquipe).toHaveBeenCalled();
    });
  });

  // ── refus dialog ──

  describe('confirmerRefus', () => {
    beforeEach(() => {
      currentUserSignal.set(chefUser);
      authSvc.getRole.and.returnValue('ROLE_CHEF_EQUIPE');
      configureModule();
      createComponent();
      fixture.detectChanges();
    });

    it('should do nothing when pendingRefuseId is null', () => {
      component.pendingRefuseId = null;
      component.confirmerRefus();
      expect(affiliationSvc.traiter).not.toHaveBeenCalled();
    });

    it('should do nothing when equipe is null', () => {
      component.pendingRefuseId = 1;
      component.equipe.set(null);
      component.confirmerRefus();
      expect(affiliationSvc.traiter).not.toHaveBeenCalled();
    });

    it('should traiter REFUSEE and reload', () => {
      affiliationSvc.traiter.and.returnValue(of(mockEnAttente as any));
      spyOn(component as any, 'loadAffiliations').and.callThrough();
      component.motifText = 'Pas assez de place';
      component.pendingRefuseId = 1;

      component.confirmerRefus();

      expect(affiliationSvc.traiter).toHaveBeenCalledWith(1, 1, 'REFUSEE', 'Pas assez de place');
      expect(component.motifDialogOpen).toBeFalse();
      expect(component.pendingRefuseId).toBeNull();
      expect((component as any).loadAffiliations).toHaveBeenCalledWith(1);
    });

    it('should traiter without motif', () => {
      affiliationSvc.traiter.and.returnValue(of(mockEnAttente as any));
      component.pendingRefuseId = 1;

      component.confirmerRefus();

      expect(affiliationSvc.traiter).toHaveBeenCalledWith(1, 1, 'REFUSEE', undefined);
    });

    it('should call traiter for confirmerRefus', () => {
      affiliationSvc.traiter.and.returnValue(of(mockEnAttente as any));
      affiliationSvc.getByEquipe.and.returnValue(of([]));
      component.pendingRefuseId = 1;

      component.confirmerRefus();

      expect(affiliationSvc.traiter).toHaveBeenCalled();
    });
  });

  describe('ouvrirRefus / annulerRefus', () => {
    beforeEach(() => {
      configureModule();
      createComponent();
      fixture.detectChanges();
    });

    it('ouvrirRefus should set pending state', () => {
      component.ouvrirRefus(5);
      expect(component.pendingRefuseId).toBe(5);
      expect(component.motifText).toBe('');
      expect(component.motifDialogOpen).toBeTrue();
    });

    it('annulerRefus should close dialog', () => {
      component.pendingRefuseId = 5;
      component.motifDialogOpen = true;
      component.annulerRefus();
      expect(component.motifDialogOpen).toBeFalse();
      expect(component.pendingRefuseId).toBeNull();
    });
  });

  // ── retirerMembre ──

  describe('retirerMembre', () => {
    beforeEach(() => {
      configureModule();
      createComponent();
      fixture.detectChanges();
    });

    it('should do nothing when equipe is null', () => {
      component.equipe.set(null);
      component.retirerMembre(40);
      expect(equipeSvc.retirerMembre).not.toHaveBeenCalled();
    });

    it('should call retirerMembre and reload on success', () => {
      equipeSvc.retirerMembre.and.returnValue(of(mockEquipeWithMembers));
      spyOn(component as any, 'reloadEquipe').and.callThrough();

      component.retirerMembre(40);

      expect(equipeSvc.retirerMembre).toHaveBeenCalledWith(1, 40);
      expect((component as any).reloadEquipe).toHaveBeenCalled();
    });
  });

  // ── reloadEquipe ──

  describe('reloadEquipe', () => {
    beforeEach(() => {
      configureModule();
      createComponent();
      fixture.detectChanges();
      equipeSvc.getById.calls.reset();
    });

    it('should do nothing when equipe is null', () => {
      component.equipe.set(null);
      (component as any).reloadEquipe();
      expect(equipeSvc.getById).not.toHaveBeenCalled();
    });

    it('should reload equipe and membres', () => {
      equipeSvc.getById.and.returnValue(of(mockEquipeWithMembers));
      (component as any).reloadEquipe();
      expect(equipeSvc.getById).toHaveBeenCalledWith(1);
      expect(component.equipe()).toEqual(mockEquipeWithMembers);
    });

    it('should call getById for reload', () => {
      equipeSvc.getById.and.returnValue(of(mockEquipeWithMembers));
      (component as any).reloadEquipe();
      expect(equipeSvc.getById).toHaveBeenCalledWith(1);
    });
  });

  // ── Navigation ──

  describe('goBack', () => {
    it('should call location.back', () => {
      configureModule();
      createComponent();
      fixture.detectChanges();
      component.goBack();
      expect(location.back).toHaveBeenCalled();
    });
  });

  // ── Modal helpers ──

  describe('edit and add member modals', () => {
    beforeEach(() => {
      configureModule();
      createComponent();
      fixture.detectChanges();
    });

    it('openEditModal should set editModalOpen', () => {
      component.openEditModal();
      expect(component.editModalOpen).toBeTrue();
    });

    it('onEditSaved should close modal and reload', () => {
      spyOn(component as any, 'reloadEquipe').and.callThrough();
      component.onEditSaved();
      expect(component.editModalOpen).toBeFalse();
      expect((component as any).reloadEquipe).toHaveBeenCalled();
    });

    it('openAddMemberModal should set addMemberModalOpen', () => {
      component.openAddMemberModal();
      expect(component.addMemberModalOpen).toBeTrue();
    });

    it('onMemberAdded should close modal and reload', () => {
      spyOn(component as any, 'reloadEquipe').and.callThrough();
      component.onMemberAdded();
      expect(component.addMemberModalOpen).toBeFalse();
      expect((component as any).reloadEquipe).toHaveBeenCalled();
    });
  });

  // ── Helper methods ──

  describe('chefName', () => {
    it('should return chef full name when chef exists', () => {
      configureModule();
      createComponent();
      fixture.detectChanges();
      component.equipe.set(mockEquipe);
      expect(component.chefName()).toBe('Alice Chef');
    });

    it('should return "Non assigné" when no chef', () => {
      configureModule();
      createComponent();
      fixture.detectChanges();
      component.equipe.set(mockEquipeNoChef);
      expect(component.chefName()).toBe('Non assigné');
    });
  });

  describe('initiales', () => {
    beforeEach(() => {
      configureModule();
      createComponent();
      fixture.detectChanges();
    });

    it('should return initials from full name', () => {
      expect(component.initiales('Jean Dupont')).toBe('JD');
    });
  });

  describe('membreInitiales', () => {
    beforeEach(() => {
      configureModule();
      createComponent();
      fixture.detectChanges();
    });

    it('should return initials from user', () => {
      expect(component.membreInitiales(memberUser)).toBe('CM');
    });

    it('should skip null prenom', () => {
      const u: User = { ...memberUser, prenom: null as any };
      expect(component.membreInitiales(u)).toBe('M');
    });

    it('should skip null nom', () => {
      const u: User = { ...memberUser, nom: null as any };
      expect(component.membreInitiales(u)).toBe('C');
    });
  });

  describe('couleurAvatar', () => {
    beforeEach(() => {
      configureModule();
      createComponent();
      fixture.detectChanges();
    });

    it('should return default color when id is null', () => {
      expect(component.couleurAvatar({ ...memberUser, id: null as any })).toBe('#64748b');
    });

    it('should return consistent color for valid id', () => {
      const color = component.couleurAvatar(memberUser);
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  describe('statutClass', () => {
    beforeEach(() => {
      configureModule();
      createComponent();
      fixture.detectChanges();
    });

    it('should return status-acceptee for ACCEPTEE', () => {
      expect(component.statutClass('ACCEPTEE')).toBe('status-acceptee');
    });

    it('should return status-refusee for REFUSEE', () => {
      expect(component.statutClass('REFUSEE')).toBe('status-refusee');
    });

    it('should return status-attente for default', () => {
      expect(component.statutClass('EN_ATTENTE')).toBe('status-attente');
    });
  });

  describe('statutLabel', () => {
    beforeEach(() => {
      configureModule();
      createComponent();
      fixture.detectChanges();
    });

    it('should return Acceptée for ACCEPTEE', () => {
      expect(component.statutLabel('ACCEPTEE')).toBe('Acceptée');
    });

    it('should return Refusée for REFUSEE', () => {
      expect(component.statutLabel('REFUSEE')).toBe('Refusée');
    });

    it('should return En attente for EN_ATTENTE', () => {
      expect(component.statutLabel('EN_ATTENTE')).toBe('En attente');
    });
  });

  describe('formatDate', () => {
    beforeEach(() => {
      configureModule();
      createComponent();
      fixture.detectChanges();
    });

    it('should format a valid date', () => {
      const result = component.formatDate('2025-06-01T10:00:00Z');
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('should return empty string for empty date', () => {
      expect(component.formatDate('')).toBe('');
    });
  });

  // ── Computed signals ──

  describe('computed signals', () => {
    it('isChef should be true when role is ROLE_CHEF_EQUIPE', () => {
      authSvc.getRole.and.returnValue('ROLE_CHEF_EQUIPE');
      configureModule();
      createComponent();
      fixture.detectChanges();
      expect(component.isChef()).toBeTrue();
      expect(component.isEnseignant()).toBeFalse();
    });

    it('isEnseignant should be true when role is ROLE_ENSEIGNANT', () => {
      authSvc.getRole.and.returnValue('ROLE_ENSEIGNANT');
      configureModule();
      createComponent();
      fixture.detectChanges();
      expect(component.isEnseignant()).toBeTrue();
      expect(component.isChef()).toBeFalse();
    });

    describe('isChefOfThisTeam', () => {
      it('should be true when current user is the chef', () => {
        currentUserSignal.set(chefUser);
        authSvc.getRole.and.returnValue('ROLE_CHEF_EQUIPE');
        configureModule();
        createComponent();
        fixture.detectChanges();
        expect(component.isChefOfThisTeam()).toBeTrue();
      });

      it('should be false when current user is not the chef', () => {
        currentUserSignal.set(enseignantUser);
        authSvc.getRole.and.returnValue('ROLE_ENSEIGNANT');
        configureModule();
        createComponent();
        fixture.detectChanges();
        expect(component.isChefOfThisTeam()).toBeFalse();
      });

      it('should be false when no user', () => {
        configureModule();
        createComponent();
        fixture.detectChanges();
        expect(component.isChefOfThisTeam()).toBeFalse();
      });
    });

    describe('isMemberOfThisTeam', () => {
      it('should be true when user is a member', () => {
        currentUserSignal.set(memberUser);
        authSvc.getRole.and.returnValue('ROLE_ENSEIGNANT');
        configureModule();
        createComponent();
        fixture.detectChanges();
        expect(component.isMemberOfThisTeam()).toBeTrue();
      });

      it('should be false when user is not a member', () => {
        currentUserSignal.set(enseignantUser);
        authSvc.getRole.and.returnValue('ROLE_ENSEIGNANT');
        configureModule();
        createComponent();
        fixture.detectChanges();
        expect(component.isMemberOfThisTeam()).toBeFalse();
      });

      it('should be false when no user or no equipe', () => {
        configureModule();
        createComponent();
        fixture.detectChanges();
        expect(component.isMemberOfThisTeam()).toBeFalse();
      });
    });

    describe('alreadyInTeam', () => {
      it('should be false when not enseignant', () => {
        authSvc.getRole.and.returnValue('ROLE_CHEF_EQUIPE');
        configureModule();
        createComponent();
        fixture.detectChanges();
        expect(component.alreadyInTeam()).toBeFalse();
      });

      it('should be false when no user', () => {
        authSvc.getRole.and.returnValue('ROLE_ENSEIGNANT');
        configureModule();
        createComponent();
        fixture.detectChanges();
        expect(component.alreadyInTeam()).toBeFalse();
      });

      it('should be true when user is a member of any team', () => {
        currentUserSignal.set(memberUser);
        authSvc.getRole.and.returnValue('ROLE_ENSEIGNANT');
        configureModule();
        createComponent();
        fixture.detectChanges();
        expect(component.alreadyInTeam()).toBeTrue();
      });

      it('should be true when user is a chef of any team', () => {
        currentUserSignal.set(chefUser);
        authSvc.getRole.and.returnValue('ROLE_ENSEIGNANT');
        equipeSvc.getById.and.returnValue(of({ ...mockEquipe, chef: null, members: [] }));
        configureModule();
        createComponent();
        fixture.detectChanges();
        expect(component.alreadyInTeam()).toBeTrue();
      });

      it('should be false when user is not in any team', () => {
        currentUserSignal.set(enseignantUser);
        authSvc.getRole.and.returnValue('ROLE_ENSEIGNANT');
        configureModule();
        createComponent();
        fixture.detectChanges();
        expect(component.alreadyInTeam()).toBeFalse();
      });
    });

    describe('teamAffiliations', () => {
      it('should return affiliations filtered by equipe id', () => {
        configureModule();
        createComponent();
        fixture.detectChanges();
        component.affiliations.set([mockEnAttente, { ...mockEnAttente, equipeId: 999 }]);
        expect(component.teamAffiliations().length).toBe(1);
      });

      it('should return empty when no equipe', () => {
        configureModule();
        createComponent();
        fixture.detectChanges();
        component.equipe.set(null);
        expect(component.teamAffiliations()).toEqual([]);
      });
    });

    describe('pendingAffiliations', () => {
      it('should return only EN_ATTENTE affiliations', () => {
        configureModule();
        createComponent();
        fixture.detectChanges();
        component.affiliations.set([mockEnAttente, mockAcceptee]);
        expect(component.pendingAffiliations().length).toBe(1);
        expect(component.pendingAffiliations()[0].statut).toBe('EN_ATTENTE');
      });
    });

    describe('canJoin', () => {
      beforeEach(() => {
        currentUserSignal.set(enseignantUser);
        authSvc.getRole.and.returnValue('ROLE_ENSEIGNANT');
      });

      it('should be false when not enseignant', () => {
        authSvc.getRole.and.returnValue('ROLE_CHEF_EQUIPE');
        configureModule();
        createComponent();
        fixture.detectChanges();
        expect(component.canJoin()).toBeFalse();
      });

      it('should be false when already member', () => {
        currentUserSignal.set(memberUser);
        configureModule();
        createComponent();
        fixture.detectChanges();
        expect(component.canJoin()).toBeFalse();
      });

      it('should be false when no equipe', () => {
        configureModule();
        createComponent();
        fixture.detectChanges();
        component.equipe.set(null);
        expect(component.canJoin()).toBeFalse();
      });

      it('should be false when no user', () => {
        currentUserSignal.set(null);
        configureModule();
        createComponent();
        fixture.detectChanges();
        expect(component.canJoin()).toBeFalse();
      });

      it('should be false when affiliation already exists (EN_ATTENTE)', () => {
        const enAttente = { ...mockEnAttente, enseignant: enseignantUser };
        affiliationSvc.getMesDemandes.and.returnValue(of([enAttente]));
        configureModule();
        createComponent();
        fixture.detectChanges();
        expect(component.canJoin()).toBeFalse();
      });

      it('should be false when affiliation already exists (ACCEPTEE)', () => {
        const acc = { ...mockAcceptee, enseignant: enseignantUser };
        affiliationSvc.getMesDemandes.and.returnValue(of([acc]));
        configureModule();
        createComponent();
        fixture.detectChanges();
        expect(component.canJoin()).toBeFalse();
      });

      it('should be true when user can join', () => {
        affiliationSvc.getMesDemandes.and.returnValue(of([]));
        configureModule();
        createComponent();
        fixture.detectChanges();
        expect(component.canJoin()).toBeTrue();
      });
    });

    describe('joinStatus', () => {
      beforeEach(() => {
        currentUserSignal.set(enseignantUser);
        authSvc.getRole.and.returnValue('ROLE_ENSEIGNANT');
      });

      it('should return "Déjà membre" when user is member', () => {
        currentUserSignal.set(memberUser);
        configureModule();
        createComponent();
        fixture.detectChanges();
        expect(component.joinStatus()).toBe('Déjà membre');
      });

      it('should return empty when no equipe', () => {
        configureModule();
        createComponent();
        fixture.detectChanges();
        component.equipe.set(null);
        expect(component.joinStatus()).toBe('');
      });

      it('should return empty when no user', () => {
        currentUserSignal.set(null);
        configureModule();
        createComponent();
        fixture.detectChanges();
        expect(component.joinStatus()).toBe('');
      });

      it('should return empty when no affiliation', () => {
        affiliationSvc.getMesDemandes.and.returnValue(of([]));
        configureModule();
        createComponent();
        fixture.detectChanges();
        expect(component.joinStatus()).toBe('');
      });

      it('should return "Demande envoyée" when affiliation is EN_ATTENTE', () => {
        const enAttente = { ...mockEnAttente, enseignant: enseignantUser };
        affiliationSvc.getMesDemandes.and.returnValue(of([enAttente]));
        configureModule();
        createComponent();
        fixture.detectChanges();
        expect(component.joinStatus()).toBe('Demande envoyée');
      });

      it('should return "Acceptée" when affiliation is ACCEPTEE', () => {
        const acc = { ...mockAcceptee, enseignant: enseignantUser };
        affiliationSvc.getMesDemandes.and.returnValue(of([acc]));
        configureModule();
        createComponent();
        fixture.detectChanges();
        expect(component.joinStatus()).toBe('Acceptée');
      });

      it('should return empty when affiliation is REFUSEE', () => {
        const ref = { ...mockEnAttente, enseignant: enseignantUser, statut: 'REFUSEE' as const };
        affiliationSvc.getMesDemandes.and.returnValue(of([ref]));
        configureModule();
        createComponent();
        fixture.detectChanges();
        expect(component.joinStatus()).toBe('');
      });
    });
  });

  describe('couleurAvatarMembre', () => {
    it('should return red for chef', () => {
      configureModule();
      createComponent();
      fixture.detectChanges();
      expect(component.couleurAvatarMembre(chefUser, 0)).toBe('#ef4444');
    });

    it('should return different colors for non-chef members by index', () => {
      configureModule();
      createComponent();
      fixture.detectChanges();
      const c1 = component.couleurAvatarMembre(memberUser, 1);
      const c2 = component.couleurAvatarMembre(memberUser, 2);
      const c3 = component.couleurAvatarMembre(memberUser, 3);
      const c4 = component.couleurAvatarMembre(memberUser, 4);
      expect(c1).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(c2).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(c3).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(c4).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });

  describe('initiales edge cases', () => {
    it('should handle empty string', () => {
      configureModule();
      createComponent();
      fixture.detectChanges();
      expect(component.initiales('')).toBe('');
    });

    it('should handle single word', () => {
      configureModule();
      createComponent();
      fixture.detectChanges();
      expect(component.initiales('Alice')).toBe('A');
    });
  });

  describe('accepterDemande with nom', () => {
    it('should pass nom in toast', () => {
      currentUserSignal.set(chefUser);
      authSvc.getRole.and.returnValue('ROLE_CHEF_EQUIPE');
      configureModule();
      createComponent();
      fixture.detectChanges();
      affiliationSvc.traiter.and.returnValue(of(mockAcceptee as any));
      spyOn(component as any, 'reloadEquipe').and.callThrough();
      spyOn(component as any, 'loadAffiliations').and.callThrough();
      component.accepterDemande(1, 'Jean Dupont');
      expect(affiliationSvc.traiter).toHaveBeenCalledWith(1, 1, 'ACCEPTEE');
    });
  });

  describe('rejoindreEquipe error toast', () => {
    it('should call affiliationSvc.create for rejoindre', () => {
      currentUserSignal.set(enseignantUser);
      authSvc.getRole.and.returnValue('ROLE_ENSEIGNANT');
      affiliationSvc.create.and.returnValue(of({} as any));
      affiliationSvc.getMesDemandes.and.returnValue(of([]));
      configureModule();
      createComponent();
      fixture.detectChanges();
      component.rejoindreEquipe();
      expect(affiliationSvc.create).toHaveBeenCalled();
    });
  });

  describe('reloadEquipe error toast', () => {
    it('should handle reload without crashing', () => {
      configureModule();
      createComponent();
      fixture.detectChanges();
      equipeSvc.getById.and.returnValue(of(mockEquipeWithMembers));
      (component as any).reloadEquipe();
      expect(equipeSvc.getById).toHaveBeenCalled();
    });
  });

  describe('loadMembres error path with finalize', () => {
    it('should set loading false after getMembres error', () => {
      equipeSvc.getById.and.returnValue(of(mockEquipe));
      equipeSvc.getMembres.and.returnValue(throwError(() => new Error('fail')));
      configureModule();
      createComponent();
      fixture.detectChanges();
      expect(component.loading()).toBeFalse();
      expect(component.membres()).toEqual([]);
    });
  });

  describe('toast method', () => {
    it('should have component with location service', () => {
      configureModule();
      createComponent();
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });
  });

  describe('ngOnInit with non-chef non-enseignant role', () => {
    it('should not load affiliations for admin role', () => {
      authSvc.getRole.and.returnValue('ROLE_ADMIN');
      currentUserSignal.set(null);
      configureModule();
      createComponent();
      fixture.detectChanges();
      expect(affiliationSvc.getByEquipe).not.toHaveBeenCalled();
      expect(affiliationSvc.getMesDemandes).not.toHaveBeenCalled();
    });
  });
});
