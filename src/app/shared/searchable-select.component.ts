import {
  Component, Input, Output, EventEmitter,
  ElementRef, HostListener, HostBinding, ViewChild,
  DoCheck, OnDestroy, Optional, Self, inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ControlValueAccessor, NgControl } from '@angular/forms';
import { MatFormFieldControl, MatFormField } from '@angular/material/form-field';
import { coerceBooleanProperty } from '@angular/cdk/coercion';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [{ provide: MatFormFieldControl, useExisting: SearchableSelectComponent }],
  template: `
    <div class="ss-wrap" [class.open]="isOpen">
      <div class="ss-input-wrap" (click)="openDropdown()">
        <input #searchInput
          type="text"
          class="ss-input"
          [placeholder]="inputPlaceholder"
          [(ngModel)]="searchText"
          [attr.name]="'select-search-' + id"
          (input)="onSearch()"
          (focus)="openDropdown()"
          (keydown.arrowDown)="onArrowDown($event)"
          (keydown.arrowUp)="onArrowUp($event)"
          (keydown.enter)="onEnter($event)"
          (keydown.escape)="close()"
          role="combobox"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck="false"
          data-lpignore="true"
          data-form-type="other"
          data-1p-ignore>
        <svg class="ss-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      @if (isOpen && filtered.length > 0) {
        <div class="ss-dropdown">
          @for (item of filtered; track trackValue(item); let i = $index) {
            <div class="ss-option"
              [class.highlighted]="i === highlightIndex"
              (mousedown)="selectItem(item)"
              (mouseenter)="highlightIndex = i">
              {{ item[labelKey] }}
            </div>
          }
        </div>
      }
      @if (isOpen && filtered.length === 0 && searchText.length > 0) {
        <div class="ss-dropdown">
          <div class="ss-empty">Sin resultados</div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; position: relative; }
    .ss-wrap { position: relative; }
    .ss-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .ss-input {
      width: 100%;
      padding: 9px 28px 9px 10px;
      border: 1px solid var(--border, #d1d5db);
      border-radius: 8px;
      font-size: 13px;
      background: var(--card-bg, #fff);
      color: var(--text-primary, #1e293b);
      outline: none;
      transition: border-color .15s;
      text-transform: uppercase;
    }
    .ss-input:focus { border-color: #F5820A; }
    .ss-chevron {
      position: absolute;
      right: 8px;
      color: var(--text-muted, #94a3b8);
      pointer-events: none;
      transition: transform .2s;
    }
    .ss-wrap.open .ss-chevron { transform: rotate(180deg); }
    .ss-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      max-height: 200px;
      overflow-y: auto;
      background: var(--card-bg, #fff);
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 8px;
      box-shadow: 0 6px 20px rgba(0,0,0,.1);
      z-index: 50;
    }
    .ss-option {
      padding: 8px 10px;
      font-size: 12.5px;
      color: var(--text-primary, #334155);
      cursor: pointer;
      transition: background .1s;
    }
    .ss-option:hover, .ss-option.highlighted {
      background: #fff7ed;
      color: var(--text-primary, #14213d);
    }
    .ss-empty {
      padding: 10px;
      font-size: 12px;
      color: var(--text-muted, #94a3b8);
      text-align: center;
      font-style: italic;
    }
    .ss-dropdown::-webkit-scrollbar { width: 5px; }
    .ss-dropdown::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

    /* Dentro de un mat-form-field el contenedor aporta el outline/label,
       así que el input propio pierde borde, fondo y padding para no duplicar. */
    :host-context(.mat-mdc-form-field) { display: block; }
    :host-context(.mat-mdc-form-field) .ss-input {
      border: none; background: transparent; border-radius: 0;
      padding: 0 24px 0 0; font-size: 14px; color: var(--mat-sys-on-surface, #373435);
    }
    :host-context(.mat-mdc-form-field) .ss-input:focus { border: none; }
    :host-context(.mat-mdc-form-field) .ss-chevron { right: 2px; }
    /* Dentro de un mat-form-field el desplegable arranca más abajo para no
       pisar el subtítulo (mat-error/hint) que queda bajo el input. */
    :host-context(.mat-mdc-form-field) .ss-dropdown { z-index: 1000; top: calc(100% + 22px); }
  `],
})
export class SearchableSelectComponent
  implements ControlValueAccessor, MatFormFieldControl<any>, DoCheck, OnDestroy {
  private static seq = 0;

  @Input() items: any[] = [];
  @Input() valueKey = 'id';
  @Input() labelKey = 'descripcion';
  @Input() nullOption: string | null = null;
  @Output() selectionChange = new EventEmitter<any>();

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  searchText = '';
  isOpen = false;
  highlightIndex = 0;
  filtered: any[] = [];

  // ── MatFormFieldControl ────────────────────────────────────────────────
  readonly stateChanges = new Subject<void>();
  readonly controlType = 'app-searchable-select';
  @HostBinding() id = `app-searchable-select-${SearchableSelectComponent.seq++}`;
  focused = false;
  errorState = false;
  ngControl: NgControl | null = null;

  private _value: any = null;
  private _placeholder = 'Buscar...';
  private _required = false;
  private _disabled = false;
  private onChange: (v: any) => void = () => {};
  private onTouched: () => void = () => {};

  get value(): any { return this._value; }
  set value(val: any) { this._value = val; this.stateChanges.next(); }

  @Input()
  get placeholder(): string { return this._placeholder; }
  set placeholder(v: string) { this._placeholder = v; this.stateChanges.next(); }

  @Input()
  get required(): boolean { return this._required; }
  set required(v: boolean | string) { this._required = coerceBooleanProperty(v); this.stateChanges.next(); }

  @Input()
  get disabled(): boolean { return this._disabled; }
  set disabled(v: boolean | string) { this._disabled = coerceBooleanProperty(v); this.stateChanges.next(); }

  get empty(): boolean { return this._value == null || this._value === '' || this._value === 0; }
  get shouldLabelFloat(): boolean { return this.focused || !this.empty; }

  setDescribedByIds(ids: string[]): void {
    this.el.nativeElement.setAttribute('aria-describedby', ids.join(' '));
  }
  onContainerClick(): void { this.openDropdown(); }

  ngDoCheck(): void {
    if (this.ngControl) {
      const next = !!(this.ngControl.invalid && (this.ngControl.touched || this.ngControl.dirty));
      if (next !== this.errorState) { this.errorState = next; this.stateChanges.next(); }
    }
  }
  ngOnDestroy(): void { this.stateChanges.complete(); }

  writeValue(val: any): void {
    this._value = val;
    this.syncLabel();
    this.stateChanges.next();
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this._disabled = d; this.stateChanges.next(); }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event): void {
    if (!this.el.nativeElement.contains(e.target)) this.close();
  }

  constructor(
    private el: ElementRef,
    @Optional() @Self() ngControl: NgControl,
    @Optional() private matField: MatFormField,
  ) {
    this.ngControl = ngControl;
    if (ngControl) { ngControl.valueAccessor = this; }
  }

  /** Dentro de un mat-form-field el placeholder sólo se muestra al enfocar,
      para no solaparse con la etiqueta flotante en reposo. */
  get inputPlaceholder(): string {
    if (this.matField && !this.isOpen && this.empty) return '';
    return this._placeholder;
  }

  trackValue(item: any): any {
    return item[this.valueKey];
  }

  openDropdown(): void {
    this.isOpen = true;
    this.focused = true;
    this.searchText = '';
    this.filter();
    this.highlightIndex = 0;
    this.elevateHostField(true);
    this.stateChanges.next();
  }

  close(): void {
    this.isOpen = false;
    this.focused = false;
    this.syncLabel();
    this.onTouched();
    this.elevateHostField(false);
    this.stateChanges.next();
  }

  /** Cuando el buscador vive dentro de un mat-form-field, cada campo es su
      propio contexto de apilamiento y el desplegable quedaría detrás de los
      campos siguientes. Elevamos el campo anfitrión mientras está abierto. */
  private elevateHostField(on: boolean): void {
    if (!this.matField) return;
    const field = (this.el.nativeElement as HTMLElement).closest('.mat-mdc-form-field') as HTMLElement | null;
    if (!field) return;
    field.style.position = 'relative';
    field.style.zIndex = on ? '1000' : '';
  }

  onSearch(): void {
    this.filter();
    this.highlightIndex = 0;
  }

  private filter(): void {
    const q = this.searchText.toUpperCase().trim();
    let all = this.items || [];
    if (this.nullOption) {
      all = [{ [this.valueKey]: 0, [this.labelKey]: this.nullOption }, ...all];
    }
    if (!q) {
      this.filtered = all;
      return;
    }
    this.filtered = all.filter(i =>
      ((i[this.labelKey] || '') as string).toUpperCase().includes(q)
    );
  }

  selectItem(item: any): void {
    this._value = item[this.valueKey];
    this.searchText = item[this.labelKey] || '';
    this.onChange(this._value);
    this.selectionChange.emit(this._value);
    this.isOpen = false;
    this.focused = false;
    this.stateChanges.next();
  }

  onArrowDown(e: Event): void {
    e.preventDefault();
    if (this.highlightIndex < this.filtered.length - 1) this.highlightIndex++;
  }

  onArrowUp(e: Event): void {
    e.preventDefault();
    if (this.highlightIndex > 0) this.highlightIndex--;
  }

  onEnter(e: Event): void {
    e.preventDefault();
    if (this.filtered[this.highlightIndex]) {
      this.selectItem(this.filtered[this.highlightIndex]);
    }
  }

  private syncLabel(): void {
    let all = this.items || [];
    if (this.nullOption) {
      all = [{ [this.valueKey]: 0, [this.labelKey]: this.nullOption }, ...all];
    }
    const found = all.find(i => +i[this.valueKey] === +this._value);
    this.searchText = found ? found[this.labelKey] : '';
  }

  ngOnChanges(): void {
    this.syncLabel();
  }
}
