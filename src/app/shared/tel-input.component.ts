import {
  Component, ElementRef, HostBinding, Input, OnDestroy, inject,
} from '@angular/core';
import { ControlValueAccessor, NgControl } from '@angular/forms';
import { MatFormFieldControl } from '@angular/material/form-field';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Subject } from 'rxjs';

/**
 * Control de teléfono/celular para `mat-form-field` (patrón "custom control" de
 * Material v19, sin Signal Forms).
 *
 * Muestra el número en tres segmentos `###–###–##` (8 dígitos, formato local)
 * con auto-avance entre campos, pero expone el valor como un **string de dígitos**
 * para no cambiar el contrato con el backend. Participa de las validaciones
 * reactivas: el `mat-error` responde al estado del control (`errorState`).
 */
@Component({
  selector: 'app-tel-input',
  standalone: true,
  template: `
    <div class="tel-wrap" (focusin)="onFocusIn()" (focusout)="onFocusOut($event)">
      <input #s1 class="tel-seg" inputmode="numeric" maxlength="3" [value]="seg1"
             [disabled]="disabled" [attr.placeholder]="focused ? placeholderSeg(3) : ''"
             (focus)="selectAll($event)" (input)="onSeg(1, $event, s2)">
      <span class="tel-sep">–</span>
      <input #s2 class="tel-seg" inputmode="numeric" maxlength="3" [value]="seg2"
             [disabled]="disabled" [attr.placeholder]="focused ? placeholderSeg(3) : ''"
             (focus)="selectAll($event)" (input)="onSeg(2, $event, s3)"
             (keydown.backspace)="onBackspace(2, s1, $event)">
      <span class="tel-sep">–</span>
      <input #s3 class="tel-seg last" inputmode="numeric" maxlength="2" [value]="seg3"
             [disabled]="disabled" [attr.placeholder]="focused ? placeholderSeg(2) : ''"
             (focus)="selectAll($event)" (input)="onSeg(3, $event)"
             (keydown.backspace)="onBackspace(3, s2, $event)">
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; }
    .tel-wrap { display: flex; align-items: center; gap: 2px; width: 100%; }
    .tel-seg {
      border: none; background: transparent; outline: none; font: inherit;
      color: var(--mat-sys-on-surface, #373435); padding: 4px 2px; text-align: center;
      width: 4ch; letter-spacing: 2px; border-radius: 4px; cursor: text;
    }
    .tel-seg:focus { background: var(--mat-sys-primary-container, #fde8d0); }
    .tel-seg.last { width: 3ch; }
    .tel-seg::placeholder { color: var(--mat-sys-on-surface-variant, #cfcfcf); letter-spacing: 2px; }
    .tel-sep { color: var(--mat-sys-on-surface-variant, #9a9a9a); user-select: none; }
  `],
  providers: [{ provide: MatFormFieldControl, useExisting: TelInputComponent }],
})
export class TelInputComponent implements MatFormFieldControl<string>, ControlValueAccessor, OnDestroy {
  private static seq = 0;

  readonly stateChanges = new Subject<void>();
  readonly controlType = 'app-tel-input';
  @HostBinding() id = `app-tel-input-${TelInputComponent.seq++}`;

  focused = false;
  touched = false;

  seg1 = '';
  seg2 = '';
  seg3 = '';

  private _placeholder = '';
  private _required = false;
  private _disabled = false;
  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  private elRef = inject<ElementRef<HTMLElement>>(ElementRef);
  ngControl = inject(NgControl, { optional: true, self: true });

  constructor() {
    if (this.ngControl) { this.ngControl.valueAccessor = this; }
  }

  @Input()
  get value(): string { return this.seg1 + this.seg2 + this.seg3; }
  set value(val: string | null) {
    const d = this.soloDigitos(val ?? '');
    this.seg1 = d.slice(0, 3); this.seg2 = d.slice(3, 6); this.seg3 = d.slice(6, 8);
    this.stateChanges.next();
  }

  @Input()
  get placeholder(): string { return this._placeholder; }
  set placeholder(v: string) { this._placeholder = v; this.stateChanges.next(); }

  @Input()
  get required(): boolean { return this._required; }
  set required(v: boolean | string) { this._required = coerceBooleanProperty(v); this.stateChanges.next(); }

  @Input()
  get disabled(): boolean { return this._disabled; }
  set disabled(v: boolean | string) { this._disabled = coerceBooleanProperty(v); this.stateChanges.next(); }

  get empty(): boolean { return !this.seg1 && !this.seg2 && !this.seg3; }
  // La etiqueta flota siempre: así no se superpone con el placeholder de
  // formato (000–000–00) cuando el campo está vacío y sin foco.
  get shouldLabelFloat(): boolean { return true; }
  get errorState(): boolean {
    return !!(this.ngControl?.invalid && (this.ngControl?.touched || this.touched));
  }

  placeholderSeg(n: number): string { return '0'.repeat(n); }

  onSeg(idx: number, e: Event, next?: HTMLInputElement): void {
    const max = idx === 3 ? 2 : 3;
    const el = e.target as HTMLInputElement;
    const v = this.soloDigitos(el.value).slice(0, max);
    el.value = v;
    if (idx === 1) this.seg1 = v; else if (idx === 2) this.seg2 = v; else this.seg3 = v;
    this.emit();
    if (next && v.length >= max) { next.focus(); }
  }

  onBackspace(idx: number, prev: HTMLInputElement, e: Event): void {
    const el = e.target as HTMLInputElement;
    if (!el.value) { prev.focus(); }
  }

  /** Al enfocar un segmento se selecciona su contenido para poder sobrescribir
      de un tiro (facilita la edición de un segmento ya lleno). */
  selectAll(e: FocusEvent): void {
    const el = e.target as HTMLInputElement;
    setTimeout(() => el.select());
  }

  onFocusIn(): void {
    if (!this.focused) { this.focused = true; this.stateChanges.next(); }
  }
  onFocusOut(e: FocusEvent): void {
    if (!this.elRef.nativeElement.contains(e.relatedTarget as Node)) {
      this.focused = false; this.touched = true; this.onTouched(); this.stateChanges.next();
    }
  }

  setDescribedByIds(ids: string[]): void {
    this.elRef.nativeElement.setAttribute('aria-describedby', ids.join(' '));
  }
  onContainerClick(): void {
    const inputs = Array.from(this.elRef.nativeElement.querySelectorAll('input')) as HTMLInputElement[];
    if (!inputs.length) return;
    // Enfoca el primer segmento vacío; si están todos llenos, el último.
    const target = inputs.find(i => !i.value) ?? inputs[inputs.length - 1];
    target.focus();
  }

  writeValue(v: string | null): void {
    const d = this.soloDigitos(v ?? '');
    this.seg1 = d.slice(0, 3); this.seg2 = d.slice(3, 6); this.seg3 = d.slice(6, 8);
    this.stateChanges.next();
  }
  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this._disabled = d; this.stateChanges.next(); }

  private emit(): void { this.onChange(this.value); this.stateChanges.next(); }
  private soloDigitos(v: string): string { return (v || '').replace(/\D/g, ''); }

  ngOnDestroy(): void { this.stateChanges.complete(); }
}
