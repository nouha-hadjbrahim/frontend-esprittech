import { Component, Input, forwardRef, HostBinding, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => InputComponent),
    multi: true,
  }],
  template: `
    <input
      #inputEl
      [type]="type"
      [placeholder]="placeholder"
      [disabled]="disabled"
      [value]="value"
      (input)="onInput($event)"
      (blur)="onBlur()"
      class="input-el"
    />
  `,
  styles: [`
    :host {
      display: flex;
      width: 100%;
    }
    .input-el {
      flex: 1;
      height: 2.25rem;
      width: 100%;
      border-radius: calc(var(--radius) - 2px);
      border: 1px solid var(--input);
      background: transparent;
      padding: 0 0.75rem;
      font-size: 0.875rem;
      font-family: inherit;
      color: var(--foreground);
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
      box-sizing: border-box;
    }
    .input-el::placeholder { color: var(--muted-foreground); }
    .input-el:focus { border-color: var(--ring); box-shadow: 0 0 0 1px var(--ring); }
    .input-el:disabled { cursor: not-allowed; opacity: 0.5; }
  `]
})
export class InputComponent implements ControlValueAccessor {
  @Input() type = 'text';
  @Input() placeholder = '';
  @Input() disabled = false;

  value = '';
  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  onInput(event: Event) {
    this.value = (event.target as HTMLInputElement).value;
    this.onChange(this.value);
  }

  onBlur() { this.onTouched(); }

  writeValue(v: string) { this.value = v ?? ''; }
  registerOnChange(fn: any) { this.onChange = fn; }
  registerOnTouched(fn: any) { this.onTouched = fn; }
  setDisabledState(isDisabled: boolean) { this.disabled = isDisabled; }
}
