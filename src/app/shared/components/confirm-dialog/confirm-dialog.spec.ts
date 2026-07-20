import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDialog } from './confirm-dialog';

describe('ConfirmDialog', () => {
  let component: ConfirmDialog;
  let fixture: ComponentFixture<ConfirmDialog>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ConfirmDialog],
    });

    fixture = TestBed.createComponent(ConfirmDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('onOverlayClick', () => {
    it('should call cancel when clicking the overlay', () => {
      spyOn(component, 'cancel');
      const overlayEl = document.createElement('div');
      overlayEl.className = 'confirm-overlay';

      component.onOverlayClick({ target: overlayEl } as unknown as MouseEvent);

      expect(component.cancel).toHaveBeenCalled();
    });

    it('should not call cancel when clicking a child element', () => {
      spyOn(component, 'cancel');
      const childEl = document.createElement('div');

      component.onOverlayClick({ target: childEl } as unknown as MouseEvent);

      expect(component.cancel).not.toHaveBeenCalled();
    });
  });

  describe('confirm', () => {
    it('should emit confirmed when not loading', () => {
      spyOn(component.confirmed, 'emit');
      component.loading = false;

      component.confirm();

      expect(component.confirmed.emit).toHaveBeenCalled();
    });

    it('should not emit confirmed when loading', () => {
      spyOn(component.confirmed, 'emit');
      component.loading = true;

      component.confirm();

      expect(component.confirmed.emit).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('should emit cancelled when not loading', () => {
      spyOn(component.cancelled, 'emit');
      component.loading = false;

      component.cancel();

      expect(component.cancelled.emit).toHaveBeenCalled();
    });

    it('should not emit cancelled when loading', () => {
      spyOn(component.cancelled, 'emit');
      component.loading = true;

      component.cancel();

      expect(component.cancelled.emit).not.toHaveBeenCalled();
    });
  });
});
