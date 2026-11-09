import { CommonModule } from '@angular/common';
import { Component, Inject, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { BankingService, CuentaBanco, MovimientoBanco } from '../../../core/banking.service';
import { BankLogoComponent } from '../shared/bank-logo.component';
import { SnackSwal } from '../shared/notify';

@Component({
  selector: 'app-bancos-movimientos-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatSelectModule],
  templateUrl: './movimientos-dialog.component.html',
  styles: [`
    :host { display:block; color:var(--text-primary,#14213d); }
    .dialog-shell { display:flex; flex-direction:column; max-height:88vh; overflow:hidden; border-radius:16px; background:#fff; }
    .dialog-header { display:flex; align-items:center; gap:14px; padding:19px 24px 16px; border-bottom:1px solid #e8edf3; background:#fff; }
    .dialog-icon { display:grid; place-items:center; flex:0 0 44px; width:44px; height:44px; border:1px solid #dbeafe; border-radius:12px; color:#2563a6; background:#eff6ff; }
    .dialog-heading { flex:1; min-width:0; }
    .dialog-heading h2 { margin:0; color:#14213d; font-size:18px; font-weight:700; letter-spacing:-.2px; }
    .dialog-heading p { margin:5px 0 0; color:#718096; font-size:12px; }
    .account-select { width:230px; margin-left:auto; }
    .account-select .mat-mdc-form-field-subscript-wrapper { display:none; }
    .header-actions { display:flex; align-items:center; gap:6px; }
    .header-actions button { width:38px; height:38px; border-radius:10px; }
    .header-actions .print-action { color:#2563a6; background:#eff6ff; }
    .header-actions .print-action:hover:not(:disabled) { background:#dbeafe; }
    .header-actions .export-action { color:#a85412; background:#fff4e8; }
    .header-actions .export-action:hover:not(:disabled) { background:#ffead2; }
    .header-actions button:disabled { color:#aab4c2; background:#f3f5f7; }
    .dialog-content { max-height:none; margin:0; overflow:auto; padding:18px 24px 20px; background:#fff; }
    .filter-toolbar { display:grid; grid-template-columns:repeat(2,minmax(150px,1fr)) minmax(190px,1.2fr) auto; gap:12px; align-items:center; }
    .filter-toolbar mat-form-field { width:100%; }
    .filter-actions { display:flex; gap:8px; }
    .quick-ranges { display:flex; align-items:center; gap:5px; margin:0 0 16px; flex-wrap:wrap; }
    .quick-ranges span { color:var(--text-muted,#73819a); font-size:12px; margin-right:4px; }
    .quick-ranges button { min-width:0; border-radius:8px; color:#a85412; }
    .report-totals { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin:0 0 16px; }
    .total-card { padding:12px 15px; border:1px solid #e3e9f0; border-radius:11px; background:#fbfcfe; }
    .total-card span { display:block; margin-bottom:4px; color:var(--text-muted,#73819a); font-size:11px; }
    .total-card strong { font-size:15px; font-variant-numeric:tabular-nums; }
    .total-card.charge strong { color:#c2410c; }
    .total-card.credit strong { color:#0f766e; }
    .total-card.balance strong { color:#1d4ed8; }
    .total-card.ending { background:#f0fdfa; border-color:#ccebe5; }
    .total-card.ending strong { color:#0f766e; }
    .table-wrap { max-height:44vh; overflow:auto; border:1px solid #e1e7ef; border-radius:11px; background:#fff; }
    table { width:100%; border-collapse:collapse; font-size:12px; }
    th { position:sticky; top:0; z-index:1; padding:11px 13px; color:#64748b; background:#f5f7fa; text-align:left; font-size:10px; font-weight:700; letter-spacing:.35px; text-transform:uppercase; white-space:nowrap; }
    td { padding:11px 13px; border-top:1px solid #edf1f5; color:#334155; vertical-align:top; }
    tbody tr:hover { background:#fafcff; }
    td.amount, th.amount { text-align:right; white-space:nowrap; font-variant-numeric:tabular-nums; }
    td.amount.credit { color:#0f766e; font-weight:700; }
    td.amount.charge { color:#c2410c; font-weight:700; }
    td.balance { color:#14213d; font-weight:600; }
    .movement-kind { display:inline-block; margin-bottom:4px; padding:2px 7px; border-radius:999px; color:#52627a; background:#f1f5f9; font-size:10px; font-weight:600; }
    .movement-kind.anchor { color:#5b6472; background:#e9edf2; }
    .muted { color:#94a3b8; }
    .receipt-cell { width:90px; text-align:center; }
    .receipt-button { color:#2563a6; background:#eff6ff; }
    .receipt-button:hover { color:#174b82; background:#dbeafe; }
    .receipt-button:disabled { color:#b7c0cc; background:#f4f6f8; }
    .empty-state, .loading-state { display:flex; align-items:center; justify-content:center; gap:10px; min-height:130px; color:var(--text-muted,#73819a); }
    .report-footer { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:11px; color:#718096; font-size:11px; }
    .dialog-footer { display:flex; justify-content:flex-end; gap:10px; padding:13px 24px; border-top:1px solid #e8edf3; background:#fff; }
    .dialog-footer button { min-height:38px; border-radius:9px; }
    @media(max-width:760px) { .filter-toolbar { grid-template-columns:1fr 1fr; } .filter-actions { grid-column:1/-1; justify-content:flex-end; } .dialog-header,.dialog-content { padding-left:16px; padding-right:16px; } .dialog-header { gap:9px; } .dialog-footer { padding-left:16px; padding-right:16px; } .table-wrap { max-height:50vh; } }
    @media(max-width:760px) { .report-totals { grid-template-columns:repeat(2,minmax(0,1fr)); } }
    @media(max-width:760px) { .account-select { width:190px; } }
    @media(max-width:520px) { .filter-toolbar { grid-template-columns:1fr; } .report-totals { grid-template-columns:1fr 1fr; } .dialog-heading h2 { font-size:16px; } }
  `],
})
export class MovimientosDialogComponent {
  private banking = inject(BankingService);
  private snack = inject(SnackSwal);
  private dialogRef = inject(MatDialogRef<MovimientosDialogComponent>);

  movimientos: MovimientoBanco[] = [];
  totales: { cargos: number; abonos: number; neto: number } | null = null;
  saldoPeriodo: { desde: string; hasta: string; saldo_inicial: number; saldo_final: number } | null = null;
  filasReporte: Array<{ movimiento: MovimientoBanco; saldo: number }> = [];
  cargando = false;
  error = '';
  filtros = { desde: this.fechaLocal(new Date()).slice(0, 8) + '01', hasta: this.fechaLocal(new Date()), tipo: 'TODO' };
  readonly cuentasDisponibles: CuentaBanco[];
  cuenta: CuentaBanco;

  constructor(@Inject(MAT_DIALOG_DATA) data: CuentaBanco | { entidad: string; cuentas: CuentaBanco[] }) {
    this.cuentasDisponibles = 'cuentas' in data ? data.cuentas : [data];
    this.cuenta = this.cuentasDisponibles[0];
    this.cargar();
  }

  cambiarCuenta(cuenta: CuentaBanco): void {
    if (cuenta === this.cuenta) return;
    this.cuenta = cuenta;
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = '';
    const filtros: { desde?: string; hasta?: string; cuenta: string; entidad: number; moneda: number; limite: number } = {
      cuenta: this.cuenta.num_cuenta,
      entidad: this.cuenta.id_entidad,
      moneda: this.cuenta.id_moneda,
      limite: 2000,
    };
    if (this.filtros.desde) filtros.desde = this.filtros.desde;
    if (this.filtros.hasta) filtros.hasta = this.filtros.hasta;
    this.banking.movimientos(filtros).subscribe({
      next: r => {
        this.movimientos = r.movimientos;
        this.totales = r.totales;
        this.saldoPeriodo = r.saldo_periodo ?? null;
        this.calcularSaldosFilas();
        this.cargando = false;
      },
      error: e => { this.error = e.message || 'No se pudieron cargar los movimientos.'; this.cargando = false; },
    });
  }

  rangoRapido(rango: 'hoy' | 'semana' | 'mes'): void {
    const hoy = new Date();
    const inicio = new Date(hoy);
    if (rango === 'hoy') inicio.setTime(hoy.getTime());
    else if (rango === 'semana') inicio.setDate(hoy.getDate() - 6);
    else inicio.setDate(1);
    this.filtros.desde = this.fechaLocal(inicio);
    this.filtros.hasta = this.fechaLocal(hoy);
    this.cargar();
  }

  limpiar(): void {
    const hoy = new Date();
    this.filtros = { desde: `${this.fechaLocal(hoy).slice(0, 8)}01`, hasta: this.fechaLocal(hoy), tipo: 'TODO' };
    this.cargar();
  }

  get movimientosVisibles(): Array<{ movimiento: MovimientoBanco; saldo: number }> {
    const codigos = this.filtros.tipo === 'TODO' ? null : this.filtros.tipo.split(',');
    return codigos ? this.filasReporte.filter(f => codigos.includes(f.movimiento.conciliacion)) : this.filasReporte;
  }

  get totalesVisibles(): { cargos: number; abonos: number } {
    let cargos = 0; let abonos = 0;
    for (const { movimiento: m } of this.movimientosVisibles) {
      if (m.conciliacion === 'A' || m.conciliacion === 'C') continue;
      if (m.monto >= 0) abonos += m.monto; else cargos += Math.abs(m.monto);
    }
    return { cargos, abonos };
  }

  get reporteLimitado(): boolean { return this.movimientos.length >= 2000; }

  private calcularSaldosFilas(): void {
    const ordenados = [...this.movimientos].sort((a, b) => this.fechaOrden(a.fecha).localeCompare(this.fechaOrden(b.fecha)));
    let saldo = this.saldoPeriodo?.saldo_inicial ?? 0;
    this.filasReporte = ordenados.map(m => {
      if (m.conciliacion === 'A' || m.conciliacion === 'C') saldo = m.monto;
      else saldo += m.monto;
      return { movimiento: m, saldo };
    });
  }

  private fechaOrden(fecha: string): string { return fecha.replace(' ', 'T'); }
  private fechaLocal(fecha: Date): string { return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`; }

  exportarCsv(): void {
    if (!this.movimientosVisibles.length) return;
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const filas = [
      ['ESTADO DE CUENTA'],
      ['Banco', this.cuenta.entidad],
      ['Agencia / sucursal', this.cuenta.agencia],
      ['Número de cuenta', this.cuenta.num_cuenta],
      ['Producto', this.cuenta.tipo_cuenta],
      ['Moneda', this.cuenta.moneda],
      ['Período', `${this.fechaCorta(this.filtros.desde)} al ${this.fechaCorta(this.filtros.hasta)}`],
      ['Saldo inicial', this.saldoPeriodo?.saldo_inicial ?? 0],
      ['Cargos', this.totalesVisibles.cargos],
      ['Abonos', this.totalesVisibles.abonos],
      ['Saldo final', this.saldoPeriodo?.saldo_final ?? this.cuenta.saldo],
      [],
      ['Fecha', 'Hora', 'Nro. cheque', 'Descripción', 'Importe', 'Saldo', 'Información complementaria', 'Sucursal', 'Nro. referencia', 'Nro. lote'].map(esc).join(','),
    ].map(row => Array.isArray(row) ? row.map(esc).join(',') : '').filter((row, index) => row || index === 11);
    for (const { movimiento: m, saldo } of this.movimientosVisibles) {
      const esArqueo = m.conciliacion === 'A' || m.conciliacion === 'C';
      filas.push([this.fechaSolo(m.fecha), this.horaSolo(m.fecha), this.numeroCheque(m), esArqueo ? m.tipo : m.tipo, esArqueo ? '' : m.monto.toFixed(2), saldo.toFixed(2), m.glosa || '', this.cuenta.agencia, this.numeroReferencia(m), this.numeroLote(m)].map(esc).join(','));
    }
    const blob = new Blob(['\ufeff' + filas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `movimientos-${this.cuenta.num_cuenta}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.snack.open('Reporte CSV generado', 'OK', { duration: 3000 });
  }

  imprimirReporte(): void {
    const filas = this.movimientosVisibles.map(({ movimiento: m, saldo }) => {
      const arqueo = m.conciliacion === 'A' || m.conciliacion === 'C';
      const importe = arqueo ? '—' : `${m.monto < 0 ? '−' : '+'} ${this.formatear(Math.abs(m.monto))} ${this.cuenta.moneda}`;
      return `<tr><td>${this.html(this.fechaSolo(m.fecha))}</td><td>${this.html(this.horaSolo(m.fecha))}</td><td>${this.html(this.numeroCheque(m))}</td><td>${this.html(arqueo ? m.tipo : m.tipo)}</td><td class="num ${!arqueo && m.monto < 0 ? 'debit' : 'credit'}">${importe}</td><td class="num">${this.formatear(saldo)} ${this.html(this.cuenta.moneda)}</td><td>${this.html(m.glosa || '—')}</td><td>${this.html(this.cuenta.agencia)}</td><td>${this.html(this.numeroReferencia(m))}</td><td>${this.html(this.numeroLote(m))}</td></tr>`;
    }).join('');
    const totales = this.totalesVisibles;
    const inicial = this.saldoPeriodo?.saldo_inicial ?? 0;
    const final = this.saldoPeriodo?.saldo_final ?? this.cuenta.saldo;
    const logoPath = BankLogoComponent.logoPathFor(this.cuenta.entidad);
    const baseUrl = document.querySelector('base')?.href || document.baseURI;
    const logoEntidad = logoPath ? new URL(logoPath, baseUrl).href : null;
    const logoGambarte = new URL('gambarte-logo.png', baseUrl).href;
    const ventana = window.open('', '_blank');
    if (!ventana) {
      this.snack.open('El navegador bloqueó la ventana de impresión.', 'OK', { duration: 4000 });
      return;
    }
    ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Estado de cuenta ${this.html(this.cuenta.num_cuenta)}</title><style>
      @page{size:A4 landscape;margin:9mm}*{box-sizing:border-box}body{font:8px Arial,sans-serif;color:#102a52;margin:0}h1{font-size:17px;margin:0 0 3px;color:#132b4c}.brand{font-size:14px;font-weight:800;letter-spacing:.5px;color:#f07822}.muted{color:#73839d;font-size:8px}.heading{display:grid;grid-template-columns:1fr 2fr 1fr;align-items:center;gap:12px;border-bottom:1px solid #cbd5e1;padding:0 2px 7px;margin-bottom:7px;break-inside:avoid;min-height:48px}.heading-left{display:flex;align-items:center;justify-content:flex-start;min-width:0}.heading-center{text-align:center}.heading-right{display:flex;align-items:center;justify-content:flex-end}.entity-logo{max-width:76px;max-height:42px;object-fit:contain}.gambarte-logo{max-width:132px;max-height:38px;object-fit:contain}.entity-name{font-size:10px;font-weight:700;color:#132b4c}.generated{margin-top:4px}.title{text-align:center;font-weight:800;font-size:14px;margin:4px 0 9px;letter-spacing:.5px}.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 36px;border-top:1px solid #e2e8f0;padding:8px 2px;margin-bottom:8px;break-inside:avoid}.meta-item{display:grid;grid-template-columns:130px 1fr;gap:5px}.meta-item b{font-weight:700}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin:8px 0 10px;padding:4px 2px;border-bottom:1px solid #e2e8f0}.card{border:0;border-radius:0;padding:3px 0;background:transparent}.card span{display:block;color:#71819a;font-size:7px;margin-bottom:2px}.card strong{font-size:10px}.green{color:#00877b}.orange{color:#d34313}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:7px}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}th{text-align:left;background:#edf1f6;color:#56677f;font-size:6.5px;text-transform:uppercase;letter-spacing:.2px}th,td{padding:4px 4px;border-bottom:1px solid #dce3ec;vertical-align:top;overflow-wrap:anywhere}th:nth-child(1),td:nth-child(1){width:9%}th:nth-child(2),td:nth-child(2){width:6%}th:nth-child(3),td:nth-child(3){width:5%}th:nth-child(4),td:nth-child(4){width:12%}th:nth-child(5),td:nth-child(5){width:10%}th:nth-child(6),td:nth-child(6){width:11%}th:nth-child(7),td:nth-child(7){width:23%}th:nth-child(8),td:nth-child(8){width:10%}th:nth-child(9),td:nth-child(9){width:7%}th:nth-child(10),td:nth-child(10){width:7%}.num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}.debit{color:#d34313}.credit{color:#00877b}.section-title{font-size:10px;font-weight:700;margin:9px 0 5px}.note{margin-top:6px;color:#73839d;font-size:7px}@media print{button{display:none}}
      </style></head><body><header class="heading"><div class="heading-left">${logoEntidad ? `<img class="entity-logo" src="${this.html(logoEntidad)}" alt="${this.html(this.cuenta.entidad)}">` : `<span class="entity-name">${this.html(this.cuenta.entidad)}</span>`}</div><div class="heading-center"><div class="muted">Detalle del movimiento · Información básica</div><div class="muted generated">Generado: ${new Date().toLocaleString('es-BO')}</div></div><div class="heading-right"><img class="gambarte-logo" src="${this.html(logoGambarte)}" alt="Gambarte"></div></header><h1 class="title">ESTADO DE CUENTA</h1>
      <section class="meta-grid"><div class="meta-item"><b>Cliente Nro.:</b><span>—</span></div><div class="meta-item"><b>Banco:</b><span>${this.html(this.cuenta.entidad)}</span></div><div class="meta-item"><b>Nombre / titular:</b><span>—</span></div><div class="meta-item"><b>Número de cuenta:</b><span>${this.html(this.cuenta.num_cuenta)}</span></div><div class="meta-item"><b>Producto:</b><span>${this.html(this.cuenta.tipo_cuenta || '—')}</span></div><div class="meta-item"><b>Moneda:</b><span>${this.html(this.cuenta.moneda)}</span></div><div class="meta-item"><b>Estado de cuenta:</b><span>Activa</span></div><div class="meta-item"><b>Agencia / sucursal:</b><span>${this.html(this.cuenta.agencia)}</span></div><div class="meta-item"><b>Desde:</b><span>${this.fechaCorta(this.filtros.desde)}</span></div><div class="meta-item"><b>Hasta:</b><span>${this.fechaCorta(this.filtros.hasta)}</span></div><div class="meta-item"><b>Saldo inicial:</b><span>${this.formatear(inicial)} ${this.html(this.cuenta.moneda)}</span></div><div class="meta-item"><b>Cargos:</b><span class="orange">${this.formatear(totales.cargos)} ${this.html(this.cuenta.moneda)}</span></div><div class="meta-item"><b>Abonos:</b><span class="green">${this.formatear(totales.abonos)} ${this.html(this.cuenta.moneda)}</span></div><div class="meta-item"><b>Saldo final:</b><span class="green">${this.formatear(final)} ${this.html(this.cuenta.moneda)}</span></div><div class="meta-item"><b>Registros:</b><span>${this.movimientosVisibles.length}${this.reporteLimitado ? ' (límite de 2.000)' : ''}</span></div></section>
      <div class="section-title">Detalle de movimientos</div><table><thead><tr><th>Fecha</th><th>Hora</th><th>Nro. cheque</th><th>Descripción</th><th>Importe</th><th>Saldo</th><th>Info. complementaria</th><th>Sucursal</th><th>Nro. ref.</th><th>Nro. lote</th></tr></thead><tbody>${filas}</tbody></table><div class="note">Las aperturas y cierres son referencias de saldo, no movimientos de dinero. Los números de cheque, referencia y lote se muestran cuando existen en el detalle del movimiento.</div><script>window.onload=()=>window.print();</script></body></html>`);
    ventana.document.close();
  }

  private formatear(valor: number): string { return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor); }
  private fechaSolo(fecha: string): string { const [anio, mes, dia] = fecha.slice(0, 10).split('-'); return dia && mes && anio ? `${dia}/${mes}/${anio}` : fecha; }
  private horaSolo(fecha: string): string { return fecha.replace('T', ' ').split(' ')[1]?.slice(0, 8) || '—'; }
  private numeroCheque(mov: MovimientoBanco): string { return /(?:CHEQUE|CHQ)\s*#?\s*(\d+)/i.exec(mov.glosa || '')?.[1] || '—'; }
  private numeroReferencia(mov: MovimientoBanco): string { return /#\s*([A-Z0-9-]+)/i.exec(mov.glosa || '')?.[1] || '—'; }
  private numeroLote(mov: MovimientoBanco): string { return /\bLOTE\s*#?\s*([A-Z0-9-]+)/i.exec(mov.glosa || '')?.[1] || '—'; }
  fechaCorta(fecha: string): string { const [anio, mes, dia] = fecha.split('-'); return `${dia}/${mes}/${anio}`; }
  private html(valor: string): string { return valor.replace(/[&<>"']/g, caracter => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[caracter] || caracter)); }

  tieneComprobante(movimiento: MovimientoBanco): boolean {
    return !!(movimiento.comprobante_path || movimiento.comprobante_url);
  }

  verComprobante(movimiento: MovimientoBanco): void {
    if (movimiento.comprobante_url) {
      window.open(movimiento.comprobante_url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!movimiento.comprobante_path) return;
    const ventana = window.open('', '_blank');
    this.banking.descargarComprobante(movimiento.comprobante_path).subscribe({
      next: archivo => {
        const url = URL.createObjectURL(archivo);
        if (ventana) {
          ventana.location.href = url;
          window.setTimeout(() => URL.revokeObjectURL(url), 60000);
        } else {
          URL.revokeObjectURL(url);
          this.snack.open('Permite las ventanas emergentes para ver el comprobante.', 'OK', { duration: 4000 });
        }
      },
      error: e => {
        ventana?.close();
        this.snack.open(e.message || 'No se pudo abrir el comprobante.', 'OK', { duration: 5000 });
      },
    });
  }

  cerrar(): void { this.dialogRef.close(); }
}
