import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-manuales-imprimir',
  standalone: true,
  imports: [MatIconModule],
  template: `
    @if (isAdmin) {
      <button class="print-manual" type="button" (click)="printManual()" aria-label="Descargar manual en PDF">
        <mat-icon aria-hidden="true">picture_as_pdf</mat-icon> Descargar
      </button>
    }
  `,
  styles: [`
    :host{display:flex;flex:0 0 auto;align-items:center;margin-left:auto}
    .print-manual{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:38px;padding:0 13px;border:1px solid #e6b080;border-radius:8px;background:#fff8f1;color:#a95715;font:inherit;font-size:11px;font-weight:700;white-space:nowrap;cursor:pointer;transition:background .15s,border-color .15s}
    .print-manual:hover{border-color:#d87926;background:#fff1e3}
    .print-manual mat-icon{width:18px;height:18px;font-size:18px;line-height:18px}
    @media print{:host{display:none!important}}
  `],
})
export class ManualesImprimirComponent {
  private readonly auth = inject(AuthService);
  get isAdmin(): boolean { return this.auth.rol?.id_rol === 2; }

  printManual(): void {
    if (!this.isAdmin) return;
    const generatedLabel = new Intl.DateTimeFormat('es-BO', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(new Date());
    document.documentElement.style.setProperty('--manual-generated-date', `"Generado: ${generatedLabel}"`);
    window.print();
  }
}
