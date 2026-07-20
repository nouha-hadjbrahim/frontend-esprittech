import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TextareaComponent } from './textarea.component';

describe('TextareaComponent', () => {
  let component: TextareaComponent;
  let fixture: ComponentFixture<TextareaComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [TextareaComponent] });
    fixture = TestBed.createComponent(TextareaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call onChange on input event', () => {
    const spy = jasmine.createSpy('onChange');
    component.registerOnChange(spy);
    const event = { target: { value: 'hello' } } as unknown as Event;
    component.onInput(event);
    expect(component.value).toBe('hello');
    expect(spy).toHaveBeenCalledWith('hello');
  });

  it('should call onTouched on blur', () => {
    const spy = jasmine.createSpy('onTouched');
    component.registerOnTouched(spy);
    component.onBlur();
    expect(spy).toHaveBeenCalled();
  });

  it('should write value', () => {
    component.writeValue('test');
    expect(component.value).toBe('test');
  });

  it('should write null as empty string', () => {
    component.writeValue(null as any);
    expect(component.value).toBe('');
  });

  it('should set disabled state', () => {
    component.setDisabledState(true);
    expect(component.disabled).toBeTrue();
  });

  it('should have default values', () => {
    expect(component.placeholder).toBe('');
    expect(component.disabled).toBeFalse();
    expect(component.rows).toBe(3);
  });
});
