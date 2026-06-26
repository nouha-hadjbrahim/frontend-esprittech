import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-editable-options-field',
  imports: [FormsModule],
  templateUrl: './editable-options.html',
  styleUrl: './editable-options.css',
})
export class EditableOptionsField {
  @Input({ required: true }) label!: string;
  @Input() options: string[] = [];
  @Input() selected: string[] = [];
  @Input() allowMultiSelect = true;
  @Input() allowRemove = true;
  @Output() optionsChange = new EventEmitter<string[]>();
  @Output() selectedChange = new EventEmitter<string[]>();
  @Output() optionAdded = new EventEmitter<string>();

  newOption = '';

  isSelected(option: string): boolean {
    return this.selected.includes(option);
  }

  toggleOption(option: string): void {
    if (this.allowMultiSelect) {
      const next = this.isSelected(option)
        ? this.selected.filter((item) => item !== option)
        : [...this.selected, option];
      this.selectedChange.emit(next);
      return;
    }

    this.selectedChange.emit(this.isSelected(option) ? [] : [option]);
  }

  removeOption(option: string, event: Event): void {
    event.stopPropagation();
    const nextOptions = this.options.filter((item) => item !== option);
    const nextSelected = this.selected.filter((item) => item !== option);
    this.optionsChange.emit(nextOptions);
    if (nextSelected.length !== this.selected.length) {
      this.selectedChange.emit(nextSelected);
    }
  }

  addOption(): void {
    const value = this.newOption.trim();
    if (!value || this.options.includes(value)) {
      return;
    }

    if (!this.allowRemove) {
      this.optionAdded.emit(value);
      this.newOption = '';
      return;
    }

    const nextOptions = [...this.options, value];
    this.optionsChange.emit(nextOptions);

    if (this.allowMultiSelect) {
      this.selectedChange.emit([...this.selected, value]);
    } else {
      this.selectedChange.emit([value]);
    }

    this.newOption = '';
  }

  onAddKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addOption();
    }
  }
}
