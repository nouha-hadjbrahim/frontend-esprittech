import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DialogueConfirmationComponent } from './dialogue-confirmation.component';

describe('DialogueConfirmationComponent', () => {
  let fixture: ComponentFixture<DialogueConfirmationComponent>;
  let component: DialogueConfirmationComponent;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<DialogueConfirmationComponent>>;

  function create(message: string = 'Êtes-vous sûr ?'): void {
    dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
    TestBed.configureTestingModule({
      imports: [DialogueConfirmationComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: MAT_DIALOG_DATA, useValue: message },
      ],
    });
    fixture = TestBed.createComponent(DialogueConfirmationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('should create with injected message', () => {
    create('Supprimer cet élément ?');
    expect(component).toBeTruthy();
    expect(component.message).toBe('Supprimer cet élément ?');
  });

  it('should expose dialogRef as public ref', () => {
    create();
    expect(component.ref).toBe(dialogRefSpy);
  });

  it('cancel button closes dialog with false', () => {
    create();
    component.ref.close(false);
    expect(dialogRefSpy.close).toHaveBeenCalledWith(false);
  });

  it('confirm button closes dialog with true', () => {
    create();
    component.ref.close(true);
    expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
  });

  it('renders the message text in the template', () => {
    create('Message de test');
    expect(fixture.nativeElement.textContent).toContain('Message de test');
  });

  it('renders Annuler and Confirmer buttons', () => {
    create();
    expect(fixture.nativeElement.textContent).toContain('Annuler');
    expect(fixture.nativeElement.textContent).toContain('Confirmer');
  });

  it('handles empty message', () => {
    create('');
    expect(component.message).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Annuler');
  });
});
