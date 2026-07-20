import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ModifierEquipeModal } from './modifier-equipe-modal';
import { EquipeService } from '../../../../core/services/equipe.service';
import { EquipeDomaineService } from '../../../../core/services/equipe-domaine.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { Equipe } from '../../../../core/models/equipe.model';
import { EquipeDomaine } from '../../../../core/models/equipe-domaine.model';

describe('ModifierEquipeModal', () => {
  let component: ModifierEquipeModal;
  let fixture: ComponentFixture<ModifierEquipeModal>;

  const mockEquipe: Equipe = {
    id: 42,
    nom: 'Alpha',
    description: 'Description Alpha',
    domaineId: 1,
    chef: { id: 7 },
  } as Equipe;

  const mockDomaines: EquipeDomaine[] = [
    { id: 1, nom: 'IA' } as EquipeDomaine,
    { id: 2, nom: 'Web' } as EquipeDomaine,
  ];

  const equipeSvcSpy = {
    modifier: jasmine.createSpy('modifier').and.returnValue(of(undefined)),
  };
  const domaineSvcSpy = {
    getAll: jasmine.createSpy('getAll').and.returnValue(of(mockDomaines)),
  };
  const snackSpy = {
    open: jasmine.createSpy('open'),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModifierEquipeModal],
      providers: [
        { provide: EquipeService, useValue: equipeSvcSpy },
        { provide: EquipeDomaineService, useValue: domaineSvcSpy },
        { provide: MatSnackBar, useValue: snackSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ModifierEquipeModal);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    equipeSvcSpy.modifier.calls.reset();
    domaineSvcSpy.getAll.calls.reset();
    snackSpy.open.calls.reset();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('isInvalid', () => {
    it('should return false when field has not been touched', () => {
      component.form.controls.nom.setValue('');
      expect(component.isInvalid('nom')).toBeFalse();
    });

    it('should return true for nom when empty and touched', () => {
      component.form.controls.nom.setValue('');
      component.form.controls.nom.markAsTouched();
      expect(component.isInvalid('nom')).toBeTrue();
    });

    it('should return true for domaineId when 0 and touched', () => {
      component.form.controls.domaineId.setValue(0);
      component.form.controls.domaineId.markAsTouched();
      expect(component.isInvalid('domaineId')).toBeTrue();
    });

    it('should return false for valid nom', () => {
      component.form.controls.nom.setValue('Test Team');
      component.form.controls.nom.markAsTouched();
      expect(component.isInvalid('nom')).toBeFalse();
    });

    it('should return false for description with valid maxLength', () => {
      component.form.controls.description.setValue('short');
      component.form.controls.description.markAsTouched();
      expect(component.isInvalid('description')).toBeFalse();
    });
  });

  describe('modalTitle', () => {
    it('should return title with equipe name', () => {
      component.equipe = mockEquipe;
      expect(component.modalTitle).toBe('Modifier l\u2019équipe « Alpha »');
    });

    it('should return title with empty name when equipe is undefined', () => {
      component.equipe = undefined as any;
      expect(component.modalTitle).toBe('Modifier l\u2019équipe « »');
    });
  });

  describe('ngOnChanges', () => {
    beforeEach(() => {
      component.equipe = mockEquipe;
    });

    it('should load domaines on first open', fakeAsync(() => {
      component.isOpen = true;
      component.ngOnChanges();
      tick();
      expect(domaineSvcSpy.getAll).toHaveBeenCalledTimes(1);
      expect(component.domaines).toEqual(mockDomaines);
    }));

    it('should not load domaines again on subsequent opens', fakeAsync(() => {
      component.isOpen = true;
      component.ngOnChanges();
      tick();
      component.ngOnChanges();
      tick();
      expect(domaineSvcSpy.getAll).toHaveBeenCalledTimes(1);
    }));

    it('should patch form values from equipe', fakeAsync(() => {
      component.isOpen = true;
      component.ngOnChanges();
      tick();
      expect(component.form.value.nom).toBe('Alpha');
      expect(component.form.value.description).toBe('Description Alpha');
      expect(component.form.value.domaineId).toBe(1);
    }));

    it('should patch description as empty string when null', fakeAsync(() => {
      component.equipe = { ...mockEquipe, description: null } as Equipe;
      component.isOpen = true;
      component.ngOnChanges();
      tick();
      expect(component.form.value.description).toBe('');
    }));

    it('should clear errorMessage', fakeAsync(() => {
      component.errorMessage = 'previous error';
      component.isOpen = true;
      component.ngOnChanges();
      tick();
      expect(component.errorMessage).toBe('');
    }));

    it('should do nothing when isOpen is false', () => {
      component.isOpen = false;
      component.ngOnChanges();
      expect(domaineSvcSpy.getAll).not.toHaveBeenCalled();
    });

    it('should do nothing when equipe is undefined', () => {
      component.isOpen = true;
      component.equipe = undefined as any;
      component.ngOnChanges();
      expect(domaineSvcSpy.getAll).not.toHaveBeenCalled();
    });
  });

  describe('loadDomaines', () => {
    it('should set errorMessage on error', fakeAsync(() => {
      domaineSvcSpy.getAll.and.returnValue(throwError(() => new Error('fail')));
      component.equipe = mockEquipe;
      component.isOpen = true;
      component.ngOnChanges();
      tick();
      expect(component.errorMessage).toBe('Erreur lors du chargement des domaines.');
      expect(snackSpy.open).toHaveBeenCalledWith(
        'Erreur lors du chargement des domaines', '✕',
        { duration: 3500, panelClass: ['snack-error'] }
      );
    }));
  });

  describe('close', () => {
    it('should clear errorMessage and emit closed', () => {
      component.errorMessage = 'some error';
      spyOn(component.closed, 'emit');
      component.close();
      expect(component.errorMessage).toBe('');
      expect(component.closed.emit).toHaveBeenCalled();
    });
  });

  describe('onOverlayClick', () => {
    it('should call close when target has modal-overlay class', () => {
      spyOn(component, 'close');
      const event = {
        target: { classList: { contains: (cls: string) => cls === 'modal-overlay' } },
      } as unknown as MouseEvent;
      component.onOverlayClick(event);
      expect(component.close).toHaveBeenCalled();
    });

    it('should not call close when target does not have modal-overlay class', () => {
      spyOn(component, 'close');
      const event = {
        target: { classList: { contains: () => false } },
      } as unknown as MouseEvent;
      component.onOverlayClick(event);
      expect(component.close).not.toHaveBeenCalled();
    });
  });

  describe('submit', () => {
    beforeEach(() => {
      component.equipe = mockEquipe;
    });

    it('should mark all as touched when form is invalid', () => {
      component.form.controls.nom.setValue('');
      spyOn(component.form, 'markAllAsTouched');
      component.submit();
      expect(component.form.markAllAsTouched).toHaveBeenCalled();
      expect(equipeSvcSpy.modifier).not.toHaveBeenCalled();
    });

    it('should call equipeSvc.modifier with correct payload on valid form', fakeAsync(() => {
      component.isOpen = true;
      component.ngOnChanges();
      tick();

      component.submit();
      tick();

      expect(component.isSubmitting).toBeFalse();
      expect(equipeSvcSpy.modifier).toHaveBeenCalledWith(42, {
        nom: 'Alpha',
        description: 'Description Alpha',
        domaineId: 1,
        chefId: 7,
      });
    }));

    it('should emit saved and show success snack on success', fakeAsync(() => {
      spyOn(component.saved, 'emit');
      component.isOpen = true;
      component.ngOnChanges();
      tick();

      component.submit();
      tick();

      expect(component.saved.emit).toHaveBeenCalled();
      expect(snackSpy.open).toHaveBeenCalledWith(
        'Équipe mise à jour', '✕',
        { duration: 3500, panelClass: ['snack-success'] }
      );
    }));

    it('should set errorMessage and show error snack on failure', fakeAsync(() => {
      equipeSvcSpy.modifier.and.returnValue(throwError(() => new Error('fail')));
      component.isOpen = true;
      component.ngOnChanges();
      tick();

      component.submit();
      tick();

      expect(component.isSubmitting).toBeFalse();
      expect(component.errorMessage).toBe('Erreur lors de la modification. Vérifiez que le backend est démarré.');
      expect(snackSpy.open).toHaveBeenCalledWith(
        'Erreur lors de la modification', '✕',
        { duration: 3500, panelClass: ['snack-error'] }
      );
    }));

    it('should set description to null when empty', fakeAsync(() => {
      component.equipe = { ...mockEquipe, description: '' } as Equipe;
      component.form.patchValue({ nom: 'Alpha', description: '', domaineId: 1 });
      component.form.controls.nom.updateValueAndValidity();

      component.submit();
      tick();

      const payload = equipeSvcSpy.modifier.calls.argsFor(0)[1];
      expect(payload.description).toBeNull();
    }));
  });

  describe('couleurDomaine', () => {
    it('should return transparent for id 0', () => {
      expect(component.couleurDomaine(0)).toBe('transparent');
    });

    it('should return transparent for undefined', () => {
      expect(component.couleurDomaine(undefined)).toBe('transparent');
    });

    it('should return a color for valid id', () => {
      const color = component.couleurDomaine(1);
      expect(color).toBeTruthy();
      expect(color).not.toBe('transparent');
    });

    it('should wrap around when id exceeds color array length', () => {
      const colors = ['#E63946', '#0ea5e9', '#10b981', '#f59e0b', '#6366f1', '#8b5cf6', '#ec4899'];
      const id = colors.length + 1;
      expect(component.couleurDomaine(id)).toBe(colors[id % colors.length]);
    });
  });
});
