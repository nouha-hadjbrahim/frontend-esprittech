import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { of, throwError, Subject } from 'rxjs';
import { DeposerSujetModal } from './deposer-sujet-modal';
import { SujetProjetService } from '../../../../core/services/sujet-projet.service';
import { AdminService } from '../../../../core/services/admin.service';
import { SujetReferenceService } from '../../../../core/services/sujet-reference.service';
import { AuthService } from '../../../../core/services/auth.service';
import { User } from '../../../../core/models/user.model';
import { SujetProjet } from '../../../../core/models/sujet-projet.model';

function makeUser(overrides?: Partial<User>): User {
  return {
    id: 1, nom: 'Dupont', prenom: 'Jean', email: 'j@esprit.tn',
    role: 'ROLE_ENSEIGNANT', typeUtilisateur: 'ENSEIGNANT',
    departement: null, enabled: true, createdAt: null,
    isAffilieToEquipe: false, equipeId: null, equipeNom: null,
    ...overrides,
  };
}

function makeSujet(overrides?: Partial<SujetProjet>): SujetProjet {
  return {
    id: 42, titre: 'Sujet Test', categorie: 'PFE', description: 'Description test avec assez de caractères',
    objectifs: 'Objectifs du sujet avec assez de caractères', prerequis: ['Prereq1'],
    domaines: ['Domaine1'], technologies: ['Java'], capaciteAccueil: 2,
    statut: 'VALIDE', scoreFinal: null, eligibleIndustrialisation: false,
    hasEliminatoryWarnings: null, eliminatoryWarningsCount: null, catalogue: true,
    encadrantId: 5, encadrantNom: 'Encadrant Test', encadrantEmail: 'enc@esprit.tn',
    equipeNom: 'Equipe1', dateCreation: '', dateSoumission: null, dateValidation: null,
    dateDebutRealisation: null, dateTerminaison: null, motifInvalidation: null,
    nombreMembresActifs: 0, ...overrides,
  };
}

describe('DeposerSujetModal', () => {
  let component: DeposerSujetModal;
  let fixture: ComponentFixture<DeposerSujetModal>;
  let sujetService: jasmine.SpyObj<SujetProjetService>;
  let adminService: jasmine.SpyObj<AdminService>;
  let referenceService: jasmine.SpyObj<SujetReferenceService>;
  let currentUser: ReturnType<typeof signal<User | null>>;

  beforeEach(() => {
    currentUser = signal<User | null>(makeUser());
    sujetService = jasmine.createSpyObj<SujetProjetService>('SujetProjetService', [
      'getTechnologies', 'getDomainesSuggestions', 'getPrerequisSuggestions',
      'creerSujet', 'modifierSujet',
    ]);
    adminService = jasmine.createSpyObj<AdminService>('AdminService', [
      'chercherEncadrants', 'updateSujet', 'createSujet',
    ]);
    referenceService = jasmine.createSpyObj<SujetReferenceService>('SujetReferenceService', [
      'getPage', 'suggestDomaine', 'suggestPrerequis', 'suggestTechnologie',
    ]);
    sujetService.getTechnologies.and.returnValue(of(['Java', 'Python']));
    sujetService.getDomainesSuggestions.and.returnValue(of(['Web', 'AI']));
    sujetService.getPrerequisSuggestions.and.returnValue(of(['Soft skills']));
    referenceService.getPage.and.returnValue(of({
      content: [], page: 0, size: 1000, totalElements: 0, totalPages: 0, first: true, last: true,
    }));

    TestBed.configureTestingModule({
      imports: [DeposerSujetModal],
      providers: [
        { provide: SujetProjetService, useValue: sujetService },
        { provide: AdminService, useValue: adminService },
        { provide: SujetReferenceService, useValue: referenceService },
        { provide: AuthService, useValue: { currentUser } },
      ],
    });
    fixture = TestBed.createComponent(DeposerSujetModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // --- Getters ---

  describe('isEditMode', () => {
    it('should return false when no editSujet', () => {
      expect(component.isEditMode).toBeFalse();
    });
    it('should return true when editSujet is set', () => {
      component.editSujet = makeSujet();
      expect(component.isEditMode).toBeTrue();
    });
  });

  describe('modalTitle', () => {
    it('should return "Modifier le sujet" in edit mode', () => {
      component.editSujet = makeSujet();
      expect(component.modalTitle).toBe('Modifier le sujet');
    });
    it('should return "Ajouter un sujet" in adminCreateMode', () => {
      component.adminCreateMode = true;
      expect(component.modalTitle).toBe('Ajouter un sujet');
    });
    it('should return "Déposer un sujet" by default', () => {
      expect(component.modalTitle).toBe('Déposer un sujet');
    });
  });

  describe('submitLabel', () => {
    it('should return "Soumettre le sujet" by default', () => {
      expect(component.submitLabel).toBe('Soumettre le sujet');
    });
    it('should return "Enregistrer les modifications" in edit mode', () => {
      component.editSujet = makeSujet();
      expect(component.submitLabel).toBe('Enregistrer les modifications');
    });
    it('should return "Publier le sujet" in adminCreateMode', () => {
      component.adminCreateMode = true;
      expect(component.submitLabel).toBe('Publier le sujet');
    });
    it('should return "Envoi..." when submitting', () => {
      component.isSubmitting = true;
      expect(component.submitLabel).toBe('Envoi...');
    });
    it('should return "Enregistrement..." when submitting in edit mode', () => {
      component.isSubmitting = true;
      component.editSujet = makeSujet();
      expect(component.submitLabel).toBe('Enregistrement...');
    });
    it('should return "Publication..." when submitting in adminCreateMode', () => {
      component.isSubmitting = true;
      component.adminCreateMode = true;
      expect(component.submitLabel).toBe('Publication...');
    });
  });

  describe('encadrantName', () => {
    it('should return selectedEncadrant name when set', () => {
      component.selectedEncadrant = makeUser({ prenom: 'Ali', nom: 'Ben' });
      expect(component.encadrantName).toBe('Ali Ben');
    });
    it('should return encadrantDisplayName when selectedEncadrant is null', () => {
      component.selectedEncadrant = null;
      component.encadrantDisplayName = 'Dr. Principal';
      expect(component.encadrantName).toBe('Dr. Principal');
    });
    it('should fall back to currentUser name', () => {
      component.selectedEncadrant = null;
      component.encadrantDisplayName = '';
      expect(component.encadrantName).toBe('Jean Dupont');
    });
    it('should return empty when no user', () => {
      currentUser.set(null);
      component.selectedEncadrant = null;
      component.encadrantDisplayName = '';
      expect(component.encadrantName).toBe('');
    });
  });

  describe('showEncadrantPicker', () => {
    it('should return true only when adminCreateMode and not edit', () => {
      component.adminCreateMode = true;
      expect(component.showEncadrantPicker).toBeTrue();
    });
    it('should return false when edit mode', () => {
      component.adminCreateMode = true;
      component.editSujet = makeSujet();
      expect(component.showEncadrantPicker).toBeFalse();
    });
    it('should return false when not adminCreateMode', () => {
      expect(component.showEncadrantPicker).toBeFalse();
    });
  });

  describe('isPageLayout', () => {
    it('should return true for page layout', () => {
      component.layout = 'page';
      expect(component.isPageLayout).toBeTrue();
    });
    it('should return false for modal layout', () => {
      expect(component.isPageLayout).toBeFalse();
    });
  });

  describe('isVisible', () => {
    it('should return true when layout is page', () => {
      component.layout = 'page';
      expect(component.isVisible).toBeTrue();
    });
    it('should return true when isOpen is true', () => {
      component.isOpen = true;
      expect(component.isVisible).toBeTrue();
    });
    it('should return false when modal layout and not open', () => {
      expect(component.isVisible).toBeFalse();
    });
  });

  // --- Form validation ---

  describe('isInvalid', () => {
    it('should return false when control is pristine', () => {
      expect(component.isInvalid('titre')).toBeFalse();
    });
    it('should return true when control is touched and invalid', () => {
      component.form.controls.titre.markAsTouched();
      expect(component.isInvalid('titre')).toBeTrue();
    });
    it('should return false when control is touched and valid', () => {
      component.form.controls.titre.setValue('Valid Title');
      component.form.controls.titre.markAsTouched();
      expect(component.isInvalid('titre')).toBeFalse();
    });
  });

  // --- Domaine/Prerequis/Technologies validation ---

  describe('domaine/prerequis/technologies validation', () => {
    it('isDomaineInvalid should be false when not touched', () => {
      expect(component.isDomaineInvalid()).toBeFalse();
    });
    it('isDomaineInvalid should be true when touched and empty', () => {
      component.domaineTouched = true;
      expect(component.isDomaineInvalid()).toBeTrue();
    });
    it('isDomaineInvalid should be false when touched and has items', () => {
      component.domaineTouched = true;
      component.domaineSelected = ['Web'];
      expect(component.isDomaineInvalid()).toBeFalse();
    });
    it('isPrerequisInvalid should be false when not touched', () => {
      expect(component.isPrerequisInvalid()).toBeFalse();
    });
    it('isPrerequisInvalid should be true when touched and empty', () => {
      component.prerequisTouched = true;
      expect(component.isPrerequisInvalid()).toBeTrue();
    });
    it('isTechnologiesInvalid should be false when not touched', () => {
      expect(component.isTechnologiesInvalid()).toBeFalse();
    });
    it('isTechnologiesInvalid should be true when touched and empty', () => {
      component.technologiesTouched = true;
      expect(component.isTechnologiesInvalid()).toBeTrue();
    });
  });

  // --- selectCategorie / isCategorieActive ---

  describe('selectCategorie and isCategorieActive', () => {
    it('should default to PFE', () => {
      expect(component.isCategorieActive('PFE')).toBeTrue();
      expect(component.isCategorieActive('STAGE_INGENIEUR')).toBeFalse();
    });
    it('should change categorie', () => {
      component.selectCategorie('RDI');
      expect(component.isCategorieActive('RDI')).toBeTrue();
      expect(component.isCategorieActive('PFE')).toBeFalse();
    });
  });

  // --- Options change callbacks ---

  describe('onDomaineOptionsChange / onPrerequisOptionsChange', () => {
    it('should update domaineOptions', () => {
      component.onDomaineOptionsChange(['New1', 'New2']);
      expect(component.domaineOptions).toEqual(['New1', 'New2']);
    });
    it('should update prerequisOptions', () => {
      component.onPrerequisOptionsChange(['Prereq1']);
      expect(component.prerequisOptions).toEqual(['Prereq1']);
    });
  });

  // --- onDomaineAdded / onPrerequisAdded ---

  describe('onDomaineAdded', () => {
    it('should persist and reload domaines', fakeAsync(() => {
      referenceService.suggestDomaine.and.returnValue(of({ id: 99, nom: 'NewDomaine', dateCreation: '' }));
      sujetService.getDomainesSuggestions.and.returnValue(of(['Web', 'AI', 'NewDomaine']));

      component.onDomaineAdded('NewDomaine');
      tick();

      expect(referenceService.suggestDomaine).toHaveBeenCalledWith('NewDomaine');
      expect(component.domaineSelected).toContain('NewDomaine');
      expect(component.domaineTouched).toBeTrue();
    }));

    it('should set error message on persist failure', fakeAsync(() => {
      referenceService.suggestDomaine.and.returnValue(throwError(() => new Error('fail')));

      component.onDomaineAdded('BadDomaine');
      tick();

      expect(component.errorMessage).toContain("Impossible d'ajouter");
      expect(component.addingReference).toBeFalse();
    }));
  });

  describe('onPrerequisAdded', () => {
    it('should persist and reload prerequis', fakeAsync(() => {
      referenceService.suggestPrerequis.and.returnValue(of({ id: 99, nom: 'NewPrereq', dateCreation: '' }));
      sujetService.getPrerequisSuggestions.and.returnValue(of(['Soft skills', 'NewPrereq']));

      component.onPrerequisAdded('NewPrereq');
      tick();

      expect(referenceService.suggestPrerequis).toHaveBeenCalledWith('NewPrereq');
      expect(component.prerequisSelected).toContain('NewPrereq');
      expect(component.prerequisTouched).toBeTrue();
    }));
  });

  describe('onDomaineSelectedChange / onPrerequisSelectedChange', () => {
    it('should update domaineSelected and mark touched', () => {
      component.onDomaineSelectedChange(['Web', 'AI']);
      expect(component.domaineSelected).toEqual(['Web', 'AI']);
      expect(component.domaineTouched).toBeTrue();
    });
    it('should update prerequisSelected and mark touched', () => {
      component.onPrerequisSelectedChange(['Hard skills']);
      expect(component.prerequisSelected).toEqual(['Hard skills']);
      expect(component.prerequisTouched).toBeTrue();
    });
  });

  // --- Technology methods ---

  describe('addTechnology', () => {
    it('should not add empty string', () => {
      component.newTechnology = '   ';
      component.addTechnology();
      expect(component.selectedTechnologies.size).toBe(0);
    });

    it('should not add duplicate technology', () => {
      component.technologies = ['Java'];
      component.newTechnology = 'Java';
      component.addTechnology();
      expect(component.selectedTechnologies.size).toBe(0);
    });

    it('should add new technology via reference service', fakeAsync(() => {
      referenceService.suggestTechnologie.and.returnValue(of({ id: 1, nom: 'Rust', dateCreation: '' }));
      sujetService.getTechnologies.and.returnValue(of(['Java', 'Python', 'Rust']));

      component.newTechnology = 'Rust';
      component.addTechnology();
      tick();

      expect(referenceService.suggestTechnologie).toHaveBeenCalledWith('Rust');
      expect(component.selectedTechnologies.has('Rust')).toBeTrue();
      expect(component.newTechnology).toBe('');
      expect(component.technologiesTouched).toBeTrue();
    }));
  });

  describe('onTechnologyKeydown', () => {
    it('should call addTechnology on Enter', () => {
      const spy = spyOn(component, 'addTechnology');
      const event = new KeyboardEvent('keydown', { key: 'Enter' });
      component.onTechnologyKeydown(event);
      expect(spy).toHaveBeenCalled();
    });
    it('should not call addTechnology on other keys', () => {
      const spy = spyOn(component, 'addTechnology');
      const event = new KeyboardEvent('keydown', { key: 'a' });
      component.onTechnologyKeydown(event);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('toggleTechnology / isTechnologySelected', () => {
    it('should add technology when toggling', () => {
      component.toggleTechnology('Java');
      expect(component.isTechnologySelected('Java')).toBeTrue();
      expect(component.technologiesTouched).toBeTrue();
    });
    it('should remove technology when toggling again', () => {
      component.toggleTechnology('Java');
      component.toggleTechnology('Java');
      expect(component.isTechnologySelected('Java')).toBeFalse();
    });
  });

  // --- Capacite ---

  describe('incrementCapacite / decrementCapacite', () => {
    it('should increment capacite', () => {
      component.form.controls.capaciteAccueil.setValue(3);
      component.incrementCapacite();
      expect(component.form.controls.capaciteAccueil.value).toBe(4);
    });
    it('should not increment past 50', () => {
      component.form.controls.capaciteAccueil.setValue(50);
      component.incrementCapacite();
      expect(component.form.controls.capaciteAccueil.value).toBe(50);
    });
    it('should decrement capacite', () => {
      component.form.controls.capaciteAccueil.setValue(3);
      component.decrementCapacite();
      expect(component.form.controls.capaciteAccueil.value).toBe(2);
    });
    it('should not decrement below 1', () => {
      component.form.controls.capaciteAccueil.setValue(1);
      component.decrementCapacite();
      expect(component.form.controls.capaciteAccueil.value).toBe(1);
    });
  });

  // --- close ---

  describe('close', () => {
    it('should emit closed when visible', () => {
      const spy = spyOn(component.closed, 'emit');
      component.isOpen = true;
      component.close();
      expect(spy).toHaveBeenCalled();
    });
    it('should not emit when not visible', () => {
      const spy = spyOn(component.closed, 'emit');
      component.isOpen = false;
      component.layout = 'modal';
      component.close();
      expect(spy).not.toHaveBeenCalled();
    });
    it('should reset submitting state and error message', () => {
      component.isOpen = true;
      component.isSubmitting = true;
      component.errorMessage = 'error';
      component.close();
      expect(component.isSubmitting).toBeFalse();
      expect(component.errorMessage).toBe('');
    });
  });

  // --- onFormEnter ---

  describe('onFormEnter', () => {
    it('should prevent default for non-textarea', () => {
      const event = new Event('keydown');
      Object.defineProperty(event, 'target', { value: { tagName: 'INPUT' } });
      const spy = spyOn(event, 'preventDefault');
      component.onFormEnter(event);
      expect(spy).toHaveBeenCalled();
    });
    it('should not prevent default for textarea', () => {
      const event = new Event('keydown');
      Object.defineProperty(event, 'target', { value: { tagName: 'TEXTAREA' } });
      const spy = spyOn(event, 'preventDefault');
      component.onFormEnter(event);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  // --- submit ---

  describe('submit', () => {
    beforeEach(() => {
      component.form.controls.titre.setValue('Mon Sujet');
      component.form.controls.description.setValue('Description suffisamment longue pour validation');
      component.form.controls.objectifs.setValue('Objectifs suffisamment longs pour validation');
      component.domaineSelected = ['Web'];
      component.prerequisSelected = ['Soft skills'];
      component.selectedTechnologies.add('Java');
    });

    it('should set error when form is invalid', () => {
      component.form.controls.titre.setValue('');
      component.submit();
      expect(component.errorMessage).toContain('Veuillez remplir tous les champs');
    });

    it('should set error when no encadrant in adminCreateMode', () => {
      component.adminCreateMode = true;
      component.selectedEncadrant = null;
      component.submit();
      expect(component.errorMessage).toContain('encadrant');
    });

    it('should set error when no domaines', () => {
      component.domaineSelected = [];
      component.submit();
      expect(component.errorMessage).toContain('domaine');
    });

    it('should set error when no prerequis', () => {
      component.prerequisSelected = [];
      component.submit();
      expect(component.errorMessage).toContain('prérequis');
    });

    it('should set error when no technologies', () => {
      component.selectedTechnologies.clear();
      component.submit();
      expect(component.errorMessage).toContain('technologie');
    });

    it('should call creerSujet on successful normal submit', () => {
      sujetService.creerSujet.and.returnValue(of(makeSujet()));
      const spy = spyOn(component.saved, 'emit');

      component.submit();

      expect(sujetService.creerSujet).toHaveBeenCalled();
      expect(spy).toHaveBeenCalled();
    });

    it('should call adminService.updateSujet in adminMode edit', () => {
      component.adminMode = true;
      component.editSujet = makeSujet({ id: 42 });
      adminService.updateSujet.and.returnValue(of(makeSujet()));
      const spy = spyOn(component.saved, 'emit');

      component.submit();

      expect(adminService.updateSujet).toHaveBeenCalledWith(42, jasmine.any(Object));
      expect(spy).toHaveBeenCalled();
    });

    it('should call sujetProjetService.modifierSujet in non-admin edit', () => {
      component.editSujet = makeSujet({ id: 42 });
      sujetService.modifierSujet.and.returnValue(of(makeSujet()));
      const spy = spyOn(component.saved, 'emit');

      component.submit();

      expect(sujetService.modifierSujet).toHaveBeenCalledWith(42, jasmine.any(Object));
      expect(spy).toHaveBeenCalled();
    });

    it('should call adminService.createSujet in adminCreateMode', () => {
      component.adminCreateMode = true;
      component.selectedEncadrant = makeUser({ id: 5 });
      adminService.createSujet.and.returnValue(of(makeSujet()));
      const spy = spyOn(component.saved, 'emit');

      component.submit();

      expect(adminService.createSujet).toHaveBeenCalledWith(jasmine.objectContaining({ encadrantId: 5 }));
      expect(spy).toHaveBeenCalled();
    });

    it('should handle submit error', () => {
      sujetService.creerSujet.and.returnValue(throwError(() => new Error('fail')));
      component.submit();
      expect(component.errorMessage).toBeTruthy();
      expect(component.isSubmitting).toBeFalse();
    });
  });

  // --- resolveSubmitError ---

  describe('resolveSubmitError', () => {
    it('should return string body from HttpErrorResponse', () => {
      const err = new HttpErrorResponse({ error: 'Something went wrong', status: 500 });
      expect(component['resolveSubmitError'](err)).toBe('Something went wrong');
    });

    it('should return message from object body', () => {
      const err = new HttpErrorResponse({ error: { message: 'Bad request details' }, status: 400 });
      expect(component['resolveSubmitError'](err)).toBe('Bad request details');
    });

    it('should return detail from object body when no message', () => {
      const err = new HttpErrorResponse({ error: { detail: 'Detail info' }, status: 400 });
      expect(component['resolveSubmitError'](err)).toBe('Detail info');
    });

    it('should return 401 session expired message', () => {
      const err = new HttpErrorResponse({ error: null, status: 401 });
      expect(component['resolveSubmitError'](err)).toContain('Session expirée');
    });

    it('should return 400 invalid data message', () => {
      const err = new HttpErrorResponse({ error: null, status: 400 });
      expect(component['resolveSubmitError'](err)).toContain('Données invalides');
    });

    it('should return generic edit error for non-HttpErrorResponse', () => {
      component.editSujet = makeSujet();
      expect(component['resolveSubmitError'](new Error('fail'))).toContain('modification');
    });

    it('should return generic adminCreate error', () => {
      component.adminCreateMode = true;
      expect(component['resolveSubmitError'](new Error('fail'))).toContain('publication');
    });

    it('should return generic create error by default', () => {
      expect(component['resolveSubmitError'](new Error('fail'))).toContain('envoi');
    });

    it('should ignore empty string body', () => {
      const err = new HttpErrorResponse({ error: '   ', status: 500 });
      expect(component['resolveSubmitError'](err)).toContain('envoi');
    });

    it('should ignore empty message/detail in object body', () => {
      const err = new HttpErrorResponse({ error: { message: '', detail: '   ' }, status: 500 });
      expect(component['resolveSubmitError'](err)).toContain('envoi');
    });
  });

  // --- onDocumentMouseDown ---

  describe('onDocumentMouseDown', () => {
    it('should close dropdown when clicking outside', () => {
      component.showEncadrantDropdown = true;
      const wrapEl = document.createElement('div');
      component.encadrantPickerWrap = { nativeElement: wrapEl } as any;
      component.onDocumentMouseDown({ target: document.createElement('div') } as unknown as MouseEvent);
      expect(component.showEncadrantDropdown).toBeFalse();
    });

    it('should not close dropdown when clicking inside', () => {
      const wrapEl = document.createElement('div');
      const child = document.createElement('span');
      wrapEl.appendChild(child);
      component.encadrantPickerWrap = { nativeElement: wrapEl } as any;
      component.showEncadrantDropdown = true;
      component.onDocumentMouseDown({ target: child } as unknown as MouseEvent);
      expect(component.showEncadrantDropdown).toBeTrue();
    });

    it('should do nothing when showEncadrantDropdown is false', () => {
      component.showEncadrantDropdown = false;
      component.onDocumentMouseDown({ target: document.createElement('div') } as unknown as MouseEvent);
      expect(component.showEncadrantDropdown).toBeFalse();
    });

    it('should do nothing when encadrantPickerWrap is not set', () => {
      component.showEncadrantDropdown = true;
      component.encadrantPickerWrap = undefined;
      component.onDocumentMouseDown({ target: document.createElement('div') } as unknown as MouseEvent);
      expect(component.showEncadrantDropdown).toBeTrue();
    });
  });

  // --- Encadrant methods ---

  describe('selectEncadrant / clearEncadrant', () => {
    it('should set selectedEncadrant and close dropdown', () => {
      const user = makeUser({ id: 5, prenom: 'Ali', nom: 'Ben' });
      component.selectEncadrant(user);
      expect(component.selectedEncadrant).toBe(user);
      expect(component.showEncadrantDropdown).toBeFalse();
      expect(component.encadrantQuery).toBe('');
      expect(component.encadrantTouched).toBeTrue();
    });

    it('should clear selectedEncadrant', () => {
      component.selectedEncadrant = makeUser();
      const event = new MouseEvent('click');
      spyOn(event, 'stopPropagation');
      spyOn(component, 'focusEncadrantInput');
      component.clearEncadrant(event);
      expect(component.selectedEncadrant).toBeNull();
      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.focusEncadrantInput).toHaveBeenCalled();
    });
  });

  describe('encadrantInitials / encadrantAvatarColor', () => {
    it('should return initials', () => {
      expect(component.encadrantInitials(makeUser({ prenom: 'Alice', nom: 'Ben' }))).toBe('AB');
    });

    it('should return a color from palette', () => {
      const color = component.encadrantAvatarColor(makeUser({ id: 3 }));
      expect(color).toBeTruthy();
    });
  });

  describe('isEncadrantInvalid', () => {
    it('should return false when not touched', () => {
      expect(component.isEncadrantInvalid()).toBeFalse();
    });
    it('should return true when touched and no encadrant', () => {
      component.encadrantTouched = true;
      component.selectedEncadrant = null;
      expect(component.isEncadrantInvalid()).toBeTrue();
    });
    it('should return false when touched and encadrant selected', () => {
      component.encadrantTouched = true;
      component.selectedEncadrant = makeUser();
      expect(component.isEncadrantInvalid()).toBeFalse();
    });
  });

  // --- onEncadrantQueryChange ---

  describe('onEncadrantQueryChange', () => {
    it('should update state and show dropdown', () => {
      component.onEncadrantQueryChange('test');
      expect(component.showEncadrantDropdown).toBeTrue();
      expect(component.encadrantHighlightIndex).toBe(0);
    });
  });

  // --- onEncadrantKeydown ---

  describe('onEncadrantKeydown', () => {
    beforeEach(() => {
      component.showEncadrantDropdown = true;
      component.encadrantCandidates = [
        makeUser({ id: 1, prenom: 'A', nom: 'B' }),
        makeUser({ id: 2, prenom: 'C', nom: 'D' }),
      ];
    });

    it('should increment highlight on ArrowDown', () => {
      component.encadrantHighlightIndex = 0;
      component.onEncadrantKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      expect(component.encadrantHighlightIndex).toBe(1);
    });

    it('should not increment past last candidate', () => {
      component.encadrantHighlightIndex = 1;
      component.onEncadrantKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      expect(component.encadrantHighlightIndex).toBe(1);
    });

    it('should decrement highlight on ArrowUp', () => {
      component.encadrantHighlightIndex = 1;
      component.onEncadrantKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      expect(component.encadrantHighlightIndex).toBe(0);
    });

    it('should not decrement below 0', () => {
      component.encadrantHighlightIndex = 0;
      component.onEncadrantKeydown(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      expect(component.encadrantHighlightIndex).toBe(0);
    });

    it('should select candidate on Enter', () => {
      component.encadrantHighlightIndex = 0;
      component.onEncadrantKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(component.selectedEncadrant).toBeTruthy();
      expect(component.showEncadrantDropdown).toBeFalse();
    });

    it('should close dropdown on Escape', () => {
      component.onEncadrantKeydown(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(component.showEncadrantDropdown).toBeFalse();
    });

    it('should do nothing when dropdown is closed', () => {
      component.showEncadrantDropdown = false;
      component.onEncadrantKeydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      expect(component.encadrantHighlightIndex).toBe(0);
    });

    it('should do nothing when no candidates', () => {
      component.encadrantCandidates = [];
      component.onEncadrantKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(component.selectedEncadrant).toBeNull();
    });
  });

  // --- focusEncadrantInput ---

  describe('focusEncadrantInput', () => {
    it('should focus the input element', () => {
      const input = document.createElement('input');
      spyOn(input, 'focus');
      component.encadrantInputRef = { nativeElement: input } as any;
      component.focusEncadrantInput();
      expect(input.focus).toHaveBeenCalled();
    });

    it('should do nothing when ref is undefined', () => {
      component.encadrantInputRef = undefined;
      component.focusEncadrantInput();
    });
  });

  // --- loadSuggestions ---

  describe('loadSuggestions', () => {
    it('should use admin references when adminMode', () => {
      component.adminMode = true;
      component['loadSuggestions']();
      expect(referenceService.getPage).toHaveBeenCalled();
    });

    it('should use admin references when adminCreateMode', () => {
      component.adminCreateMode = true;
      component['loadSuggestions']();
      expect(referenceService.getPage).toHaveBeenCalled();
    });

    it('should use subject service when not admin', () => {
      component['loadSuggestions']();
      expect(sujetService.getTechnologies).toHaveBeenCalled();
      expect(sujetService.getDomainesSuggestions).toHaveBeenCalled();
      expect(sujetService.getPrerequisSuggestions).toHaveBeenCalled();
    });

    it('should fall back to default technologies on error', fakeAsync(() => {
      sujetService.getTechnologies.and.returnValue(throwError(() => new Error('fail')));
      sujetService.getDomainesSuggestions.and.returnValue(of([]));
      sujetService.getPrerequisSuggestions.and.returnValue(of([]));

      component['loadSuggestions']();
      tick();

      expect(component.technologies.length).toBeGreaterThan(0);
    }));
  });

  // --- ngOnChanges ---

  describe('ngOnChanges', () => {
    it('should reset submitting when isOpen changes to false', () => {
      component.isSubmitting = true;
      component.ngOnChanges({ isOpen: { currentValue: false, previousValue: true } as any });
      expect(component.isSubmitting).toBeFalse();
    });

    it('should populate form when opened with editSujet', () => {
      const sujet = makeSujet();
      component.editSujet = sujet;
      component.ngOnChanges({
        isOpen: { currentValue: true, previousValue: false } as any,
        editSujet: { currentValue: sujet, previousValue: undefined } as any,
      });
      expect(component.form.controls.titre.value).toBe(sujet.titre);
    });

    it('should reset form when opened without editSujet', () => {
      component.form.controls.titre.setValue('old');
      component.ngOnChanges({
        isOpen: { currentValue: true, previousValue: false } as any,
      });
      expect(component.form.controls.titre.value).toBe('');
    });

    it('should search encadrants when opened in adminCreateMode', fakeAsync(() => {
      component.adminCreateMode = true;
      adminService.chercherEncadrants.and.returnValue(of({
        content: [], page: 0, size: 6, totalElements: 0, totalPages: 0, first: true, last: true,
      }));

      component.ngOnChanges({
        isOpen: { currentValue: true, previousValue: false } as any,
      });
      tick(300);
    }));
  });

  // --- populateForm ---

  describe('populateForm', () => {
    it('should set form values from sujet', () => {
      const sujet = makeSujet({ titre: 'Test Title', categorie: 'RDI', description: 'Desc', objectifs: 'Obj', capaciteAccueil: 5 });
      component['populateForm'](sujet);
      expect(component.form.controls.titre.value).toBe('Test Title');
      expect(component.form.controls.categorie.value).toBe('RDI');
      expect(component.form.controls.capaciteAccueil.value).toBe(5);
      expect(component.domaineSelected).toEqual(sujet.domaines);
      expect(component.selectedTechnologies.size).toBe(sujet.technologies.length);
    });

    it('should add missing options to lists', () => {
      const sujet = makeSujet({ domaines: ['ExtraDomaine'], prerequis: ['ExtraPrereq'], technologies: ['ExtraTech'] });
      component['populateForm'](sujet);
      expect(component.domaineOptions).toContain('ExtraDomaine');
      expect(component.prerequisOptions).toContain('ExtraPrereq');
      expect(component.technologies).toContain('ExtraTech');
    });
  });

  // --- resetForm ---

  describe('resetForm', () => {
    it('should reset all form fields and state', () => {
      component.form.controls.titre.setValue('something');
      component.isSubmitting = true;
      component.domaineSelected = ['Web'];
      component.selectedTechnologies.add('Java');
      component.errorMessage = 'error';

      component['resetForm']();

      expect(component.form.controls.titre.value).toBe('');
      expect(component.isSubmitting).toBeFalse();
      expect(component.domaineSelected).toEqual([]);
      expect(component.selectedTechnologies.size).toBe(0);
      expect(component.errorMessage).toBe('');
      expect(component.selectedEncadrant).toBeNull();
      expect(component.showEncadrantDropdown).toBeFalse();
    });
  });

  // --- ngOnInit ---

  describe('ngOnInit', () => {
    it('should load suggestions on init', () => {
      const spy = spyOn<any>(component, 'loadSuggestions');
      component.ngOnInit();
      expect(spy).toHaveBeenCalled();
    });
  });

  // --- persistReference guard ---

  describe('persistReference guard', () => {
    it('should not persist when addingReference is true', fakeAsync(() => {
      component.addingReference = true;
      component.onDomaineAdded('test');
      tick();
      expect(referenceService.suggestDomaine).not.toHaveBeenCalled();
    }));
  });

  // --- reloadDomaines in admin mode ---

  describe('reloadDomaines in admin mode', () => {
    it('should use referenceService in admin mode', fakeAsync(() => {
      component.adminMode = true;
      referenceService.suggestDomaine.and.returnValue(of({ id: 1, nom: 'd', dateCreation: '' }));
      referenceService.getPage.and.returnValue(of({
        content: [{ id: 1, nom: 'NewD', dateCreation: '' }],
        page: 0, size: 1000, totalElements: 1, totalPages: 1, first: true, last: true,
      }));

      component.onDomaineAdded('d');
      tick();

      expect(component.domaineOptions).toContain('NewD');
    }));
  });

  // --- reloadPrerequis in admin mode ---

  describe('reloadPrerequis in admin mode', () => {
    it('should use referenceService in admin mode', fakeAsync(() => {
      component.adminMode = true;
      referenceService.suggestPrerequis.and.returnValue(of({ id: 1, nom: 'p', dateCreation: '' }));
      referenceService.getPage.and.returnValue(of({
        content: [{ id: 1, nom: 'NewP', dateCreation: '' }],
        page: 0, size: 1000, totalElements: 1, totalPages: 1, first: true, last: true,
      }));

      component.onPrerequisAdded('p');
      tick();

      expect(component.prerequisOptions).toContain('NewP');
    }));
  });

  // --- reloadTechnologies in admin mode ---

  describe('addTechnology in admin mode', () => {
    it('should use referenceService in admin mode', fakeAsync(() => {
      component.adminMode = true;
      referenceService.suggestTechnologie.and.returnValue(of({ id: 1, nom: 'Kotlin', dateCreation: '' }));
      referenceService.getPage.and.returnValue(of({
        content: [{ id: 1, nom: 'Kotlin', dateCreation: '' }],
        page: 0, size: 1000, totalElements: 1, totalPages: 1, first: true, last: true,
      }));

      component.newTechnology = 'Kotlin';
      component.addTechnology();
      tick();

      expect(component.selectedTechnologies.has('Kotlin')).toBeTrue();
    }));
  });

  // --- setupEncadrantSearch error path ---

  describe('setupEncadrantSearch error', () => {
    it('should clear candidates on search error', fakeAsync(() => {
      component.adminCreateMode = true;
      adminService.chercherEncadrants.and.returnValue(throwError(() => new Error('fail')));

      component.onEncadrantQueryChange('bad');
      tick(300);

      expect(component.encadrantCandidates).toEqual([]);
      expect(component.encadrantLoading).toBeFalse();
    }));
  });

  // --- setupEncadrantSearch filters selected encadrant ---

  describe('setupEncadrantSearch filters selected', () => {
    it('should filter out selectedEncadrant from candidates', fakeAsync(() => {
      const selected = makeUser({ id: 5 });
      const candidate = makeUser({ id: 5 });
      const other = makeUser({ id: 6 });
      component.adminCreateMode = true;
      component.selectedEncadrant = selected;
      adminService.chercherEncadrants.and.returnValue(of({
        content: [candidate, other],
        page: 0, size: 6, totalElements: 2, totalPages: 1, first: true, last: true,
      }));

      component.onEncadrantQueryChange('test');
      tick(300);

      expect(component.encadrantCandidates.length).toBe(1);
      expect(component.encadrantCandidates[0].id).toBe(6);
    }));
  });
});
