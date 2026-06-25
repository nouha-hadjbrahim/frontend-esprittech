import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  inject,
} from '@angular/core';

export interface FilterOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-filter-dropdown',
  imports: [],
  templateUrl: './filter-dropdown.html',
  styleUrl: './filter-dropdown.css',
})
export class FilterDropdown {
  private readonly elementRef = inject(ElementRef);

  @Input({ required: true }) label!: string;
  @Input({ required: true }) options!: FilterOption[];
  @Input() value = '';
  @Input() defaultValue = '';
  @Input() showSortIcon = false;
  @Output() valueChange = new EventEmitter<string>();

  isOpen = false;

  get displayLabel(): string {
    if (!this.value || this.value === this.defaultValue) {
      return this.label;
    }
    return this.options.find((o) => o.value === this.value)?.label ?? this.label;
  }

  get isActive(): boolean {
    return this.value !== this.defaultValue;
  }

  toggle(event: Event): void {
    event.stopPropagation();
    this.isOpen = !this.isOpen;
  }

  select(option: FilterOption, event: Event): void {
    event.stopPropagation();
    this.valueChange.emit(option.value);
    this.isOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }
}
