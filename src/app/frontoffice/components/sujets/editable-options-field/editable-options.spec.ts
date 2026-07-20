import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditableOptionsField } from './editable-options';

describe('EditableOptionsField', () => {
  let component: EditableOptionsField;
  let fixture: ComponentFixture<EditableOptionsField>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditableOptionsField],
    }).compileComponents();

    fixture = TestBed.createComponent(EditableOptionsField);
    component = fixture.componentInstance;
    component.label = 'Technologies';
    component.options = ['Angular', 'React', 'Vue'];
    component.selected = ['Angular'];
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should check isSelected', () => {
    expect(component.isSelected('Angular')).toBeTrue();
    expect(component.isSelected('React')).toBeFalse();
  });

  it('should toggle option in multi-select mode', () => {
    spyOn(component.selectedChange, 'emit');
    component.allowMultiSelect = true;
    component.toggleOption('React');
    expect(component.selectedChange.emit).toHaveBeenCalledWith(['Angular', 'React']);

    component.selected = ['Angular', 'React'];
    component.toggleOption('Angular');
    expect(component.selectedChange.emit).toHaveBeenCalledWith(['React']);
  });

  it('should toggle option in single-select mode', () => {
    spyOn(component.selectedChange, 'emit');
    component.allowMultiSelect = false;
    component.toggleOption('React');
    expect(component.selectedChange.emit).toHaveBeenCalledWith(['React']);

    component.selected = ['React'];
    component.toggleOption('React');
    expect(component.selectedChange.emit).toHaveBeenCalledWith([]);
  });

  it('should remove option', () => {
    spyOn(component.optionsChange, 'emit');
    spyOn(component.selectedChange, 'emit');
    const event = new Event('click');
    component.removeOption('Angular', event);
    expect(component.optionsChange.emit).toHaveBeenCalledWith(['React', 'Vue']);
    expect(component.selectedChange.emit).toHaveBeenCalledWith([]);
  });

  it('should remove option without changing selected if not in selected', () => {
    spyOn(component.optionsChange, 'emit');
    spyOn(component.selectedChange, 'emit');
    const event = new Event('click');
    component.removeOption('React', event);
    expect(component.optionsChange.emit).toHaveBeenCalledWith(['Angular', 'Vue']);
    expect(component.selectedChange.emit).not.toHaveBeenCalled();
  });

  it('should add option with allowRemove=true', () => {
    spyOn(component.optionsChange, 'emit');
    spyOn(component.selectedChange, 'emit');
    component.newOption = 'TypeScript';
    component.addOption();
    expect(component.optionsChange.emit).toHaveBeenCalledWith(['Angular', 'React', 'Vue', 'TypeScript']);
    expect(component.selectedChange.emit).toHaveBeenCalledWith(['Angular', 'TypeScript']);
    expect(component.newOption).toBe('');
  });

  it('should add option in single-select mode', () => {
    spyOn(component.selectedChange, 'emit');
    component.allowMultiSelect = false;
    component.newOption = 'TypeScript';
    component.addOption();
    expect(component.selectedChange.emit).toHaveBeenCalledWith(['TypeScript']);
  });

  it('should not add empty option', () => {
    spyOn(component.optionsChange, 'emit');
    component.newOption = '  ';
    component.addOption();
    expect(component.optionsChange.emit).not.toHaveBeenCalled();
  });

  it('should not add duplicate option', () => {
    spyOn(component.optionsChange, 'emit');
    component.newOption = 'Angular';
    component.addOption();
    expect(component.optionsChange.emit).not.toHaveBeenCalled();
  });

  it('should add option with allowRemove=false emitting optionAdded', () => {
    spyOn(component.optionAdded, 'emit');
    spyOn(component.optionsChange, 'emit');
    component.allowRemove = false;
    component.newOption = 'Svelte';
    component.addOption();
    expect(component.optionAdded.emit).toHaveBeenCalledWith('Svelte');
    expect(component.optionsChange.emit).not.toHaveBeenCalled();
    expect(component.newOption).toBe('');
  });

  it('should handle onAddKeydown with Enter', () => {
    spyOn(component, 'addOption');
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    component.onAddKeydown(event);
    expect(component.addOption).toHaveBeenCalled();
  });

  it('should not call addOption on other keys', () => {
    spyOn(component, 'addOption');
    const event = new KeyboardEvent('keydown', { key: 'Space' });
    component.onAddKeydown(event);
    expect(component.addOption).not.toHaveBeenCalled();
  });
});
