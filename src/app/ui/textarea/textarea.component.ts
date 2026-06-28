import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-textarea',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => TextareaComponent),
    multi: true,
  }],
  template: `
    <textarea
      #taEl
      [placeholder]="placeholder"
      [disabled]="disabled"
      [rows]="rows"
      [value]="value"
      (input)="onInput($event)"
      (blur)="onBlur()"
      class="ta-el"
    ></textarea>
  `,
  styles: [`
    :host { display: flex; width: 100%; }
    .ta-el {
      flex: 1;
      min-height: 3.75rem;
      width: 100%;
      border-radius: calc(var(--radius) - 2px);
      border: 1px solid var(--input);
      background: transparent;
      padding: 0.5rem 0.75rem;
      font-size: 0.875rem;
      font-family: inherit;
      color: var(--foreground);
      outline: none;
      resize: vertical;
      transition: border-color 0.15s, box-shadow 0.15s;
      box-sizing: border-box;
    }
    .ta-el::placeholder { color: var(--muted-foreground); }
    .ta-el:focus { border-color: var(--ring); box-shadow: 0 0 0 1px var(--ring); }
    .ta-el:disabled { cursor: not-allowed; opacity: 0.5; }
  `]
})
export class TextareaComponent implements ControlValueAccessor {
  @Input() placeholder = '';
  @Input() disabled = false;
  @Input() rows = 3;

  value = '';
  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  onInput(event: Event) {
    this.value = (event.target as HTMLTextAreaElement).value;
    this.onChange(this.value);
  }

  onBlur() { this.onTouched(); }

  writeValue(v: string) { this.value = v ?? ''; }
  registerOnChange(fn: any) { this.onChange = fn; }
  registerOnTouched(fn: any) { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean) { this.disabled = isDisabled; }
}
