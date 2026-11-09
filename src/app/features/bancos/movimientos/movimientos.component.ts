import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BankingService, CuentaBanco, MovimientoBanco } from '../../../core/banking.service';
import { BancosStore } from '../bancos.store';
import { BankLogoComponent } from '../shared/bank-logo.component';
import { MovimientosDialogComponent } from './movimientos-dialog.component';
import { SnackSwal } from '../shared/notify';

/** Movimientos bancarios con filtros, rangos rápidos y totales. */
@Component({
  selector: 'app-bancos-movimientos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, MatDialogModule, BankLogoComponent],
  styleUrls: ['../bancos-ui.scss', './movimientos.component.scss'],
  templateUrl: './movimientos.component.html',
})
export class MovimientosComponent implements OnInit {
  store = inject(BancosStore);
  private banking = inject(BankingService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private snack = inject(SnackSwal);

  movimientos: MovimientoBanco[] = [];
  totalesMov: { cargos: number; abonos: number; neto: number } | null = null;
  filtrosAbiertos = false;
  cargandoMovimientos = false;
  errorMovimientos = '';
  resumenAbierto = false;
  filtros = {
    desde: '', hasta: '', cuenta: '', entidad: 0, moneda: 0,
    conciliacion: 'TODO', monto_min: null as number | null, monto_max: null as number | null, texto: '',
  };

  ngOnInit(): void {
    this.rangoMesActual();
    this.store.cargarCatalogos();
    this.store.refrescarCuentas();
    // Drill-down desde Cuentas: ?cuenta=NNN preselecciona el filtro.
    const cuenta = this.route.snapshot.queryParamMap.get('cuenta');
    if (cuenta) { this.filtros.cuenta = cuenta; this.filtrosAbiertos = true; }
    this.loadMovimientos();
  }

  loadMovimientos(): void {
    this.cargandoMovimientos = true;
    this.errorMovimientos = '';
    const f: any = {};
    if (this.filtros.desde) f.desde = this.filtros.desde;
    if (this.filtros.hasta) f.hasta = this.filtros.hasta;
    if (this.filtros.cuenta) f.cuenta = this.filtros.cuenta;
    if (this.filtros.entidad) f.entidad = this.filtros.entidad;
    if (this.filtros.moneda) f.moneda = this.filtros.moneda;
    if (this.filtros.conciliacion && this.filtros.conciliacion !== 'TODO') f.conciliacion = this.filtros.conciliacion;
    if (this.filtros.monto_min !== null) f.monto_min = this.filtros.monto_min;
    if (this.filtros.monto_max !== null) f.monto_max = this.filtros.monto_max;
    if (this.filtros.texto) f.texto = this.filtros.texto;
    this.banking.movimientos(f).subscribe({
      next: r => { this.movimientos = r.movimientos; this.totalesMov = r.totales; this.cargandoMovimientos = false; },
      error: e => { this.errorMovimientos = e.message || 'Error al cargar movimientos'; this.cargandoMovimientos = false; },
    });
  }

  limpiarFiltros(): void {
    this.filtros = { desde: '', hasta: '', cuenta: '', entidad: 0, moneda: 0, conciliacion: 'TODO', monto_min: null, monto_max: null, texto: '' };
    this.rangoMesActual();
    this.loadMovimientos();
  }

  private rangoMesActual(): void {
    const hoy = new Date();
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    this.filtros.desde = iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    this.filtros.hasta = iso(hoy);
  }

  rangoRapido(cual: 'hoy' | 'semana' | 'mes'): void {
    const hoy = new Date();
    // Fecha local (no UTC): toISOString() desplazaría el día en zonas con offset
    // negativo como Bolivia (UTC-4).
    const iso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (cual === 'hoy') {
      this.filtros.desde = iso(hoy); this.filtros.hasta = iso(hoy);
    } else if (cual === 'semana') {
      const ini = new Date(hoy); ini.setDate(hoy.getDate() - 6);
      this.filtros.desde = iso(ini); this.filtros.hasta = iso(hoy);
    } else {
      const ini = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      this.filtros.desde = iso(ini); this.filtros.hasta = iso(hoy);
    }
    this.loadMovimientos();
  }

  get filtrosActivos(): number {
    let n = 0;
    if (this.filtros.desde) n++;
    if (this.filtros.hasta) n++;
    if (this.filtros.cuenta) n++;
    if (this.filtros.entidad) n++;
    if (this.filtros.moneda) n++;
    if (this.filtros.conciliacion && this.filtros.conciliacion !== 'TODO') n++;
    if (this.filtros.monto_min !== null) n++;
    if (this.filtros.monto_max !== null) n++;
    if (this.filtros.texto) n++;
    return n;
  }

  get cuentasDeMovimientos(): { num_cuenta: string; entidad: string; moneda: string }[] {
    const map = new Map<string, { num_cuenta: string; entidad: string; moneda: string }>();
    for (const c of this.store.cuentas()) map.set(c.num_cuenta, { num_cuenta: c.num_cuenta, entidad: c.entidad, moneda: c.moneda });
    return Array.from(map.values()).sort((a, b) => a.num_cuenta.localeCompare(b.num_cuenta));
  }

  get monedasDisponibles(): { id: number; abrev: string }[] {
    const map = new Map<number, string>();
    for (const c of this.store.cuentas()) map.set(c.id_moneda, c.moneda);
    return Array.from(map.entries()).map(([id, abrev]) => ({ id, abrev })).sort((a, b) => a.abrev.localeCompare(b.abrev));
  }

  get entidadesDisponibles(): { id: number; nombre: string }[] {
    const map = new Map<number, string>();
    for (const c of this.store.cuentas()) map.set(c.id_entidad, c.entidad);
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get monedas(): string[] { return [...new Set(this.store.cuentas().map(c => c.moneda))].sort(); }

  get filasSaldo(): Array<{ id_entidad: number; entidad: string; cuentas: number; porMoneda: Record<string, number> }> {
    const entidades = new Map<number, { id_entidad: number; entidad: string; cuentas: number; porMoneda: Record<string, number> }>();
    for (const cuenta of this.store.cuentas()) {
      let fila = entidades.get(cuenta.id_entidad);
      if (!fila) { fila = { id_entidad: cuenta.id_entidad, entidad: cuenta.entidad, cuentas: 0, porMoneda: {} }; entidades.set(cuenta.id_entidad, fila); }
      fila.cuentas++;
      fila.porMoneda[cuenta.moneda] = (fila.porMoneda[cuenta.moneda] || 0) + cuenta.saldo;
    }
    return [...entidades.values()].sort((a, b) => a.entidad.localeCompare(b.entidad));
  }

  verMovimientosBanco(idEntidad: number): void {
    const cuentas: CuentaBanco[] = this.store.cuentas()
      .filter(cuenta => cuenta.id_entidad === idEntidad)
      .sort((a, b) => a.moneda.localeCompare(b.moneda) || a.num_cuenta.localeCompare(b.num_cuenta));
    if (!cuentas.length) return;
    this.dialog.open(MovimientosDialogComponent, {
      data: { entidad: cuentas[0].entidad, cuentas },
      width: 'min(1100px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '92vh',
      autoFocus: false,
      panelClass: 'bank-movements-dialog-panel',
    });
  }

  totalMoneda(moneda: string): number { return this.store.cuentas().filter(c => c.moneda === moneda).reduce((s, c) => s + c.saldo, 0); }

  exportarCsv(): void {
    if (!this.movimientos.length) return;
    const esc = (valor: unknown) => `"${String(valor ?? '').replace(/"/g, '""')}"`;
    const columnas = ['Fecha', 'Entidad financiera', 'Cuenta', 'Moneda', 'Movimiento', 'Detalle', 'Importe', 'Usuario'];
    const filas = this.movimientos.map(m => [m.fecha, m.entidad, m.num_cuenta, m.moneda, m.tipo, m.glosa, m.monto.toFixed(2), m.usuario].map(esc).join(','));
    const blob = new Blob(['\ufeff' + [columnas.map(esc).join(','), ...filas].join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `movimientos-bancarios-${new Date().toISOString().slice(0, 10)}.csv`;
    enlace.click();
    URL.revokeObjectURL(url);
    this.snack.open('Movimientos exportados a CSV', 'OK', { duration: 3000 });
  }

  imprimirReporte(): void {
    if (!this.movimientos.length) return;
    const esc = (valor: unknown) => String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));
    const formato = (valor: number) => new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(valor);
    const filas = this.movimientos.map(m => {
      const fecha = this.fechaMovimiento(m.fecha).split(', ');
      return `<tr><td>${esc(fecha[0])}</td><td class="nowrap">${esc(fecha[1] || '—')}</td><td><strong>${esc(m.entidad)}</strong><small>${esc(m.num_cuenta)} · ${esc(m.moneda)}</small></td><td>${esc(m.tipo)}</td><td>${esc(m.glosa || '—')}</td><td class="amount ${m.monto < 0 ? 'debit' : 'credit'}">${m.monto < 0 ? '−' : '+'} ${formato(Math.abs(m.monto))} ${esc(m.moneda)}</td><td>${esc(m.usuario || '—')}</td></tr>`;
    }).join('');
    const base = document.querySelector('base')?.href || document.baseURI;
    const logoGambarte = new URL('gambarte-logo.png', base).href;
    const ventana = window.open('', '_blank');
    if (!ventana) { this.snack.open('El navegador bloqueó la ventana de impresión.', 'OK', { duration: 4000 }); return; }
    const rango = this.filtros.desde && this.filtros.hasta
      ? `${this.fechaCorta(this.filtros.desde)} al ${this.fechaCorta(this.filtros.hasta)}`
      : this.filtros.desde
        ? `Desde ${this.fechaCorta(this.filtros.desde)}`
        : this.filtros.hasta
          ? `Hasta ${this.fechaCorta(this.filtros.hasta)}`
          : 'Sin filtro de fechas';
    const fechaGeneracion = new Intl.DateTimeFormat('es-BO', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date());
    const entidad = this.entidadesDisponibles.find(item => item.id === this.filtros.entidad)?.nombre || 'Todas';
    const moneda = this.monedasDisponibles.find(item => item.id === this.filtros.moneda)?.abrev || 'Todas';
    const tipo = ({ 'TODO': 'Todos', 'ST,ET,RT': 'Traspasos', 'DE,DB,SE,RB': 'Depósitos y retiros', 'CC,IC': 'Cheques', 'DR,SR': 'Remesas', 'A,C': 'Apertura / Cierre', 'TF,QC': 'Transferencias y QR' } as Record<string, string>)[this.filtros.conciliacion] || 'Todos';
    const filtrosExtra = [this.filtros.monto_min !== null ? `Monto mínimo: ${formato(this.filtros.monto_min)}` : '', this.filtros.monto_max !== null ? `Monto máximo: ${formato(this.filtros.monto_max)}` : '', this.filtros.texto ? `Búsqueda: ${this.filtros.texto}` : ''].filter(Boolean).join(' · ') || '—';
    ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Movimientos bancarios</title><style>
      *{box-sizing:border-box}body{margin:0;padding:24px;font:10px Arial,sans-serif;color:#102a52}.heading{display:grid;grid-template-columns:1fr 2fr 1fr;align-items:center;gap:12px;min-height:50px;padding:0 2px 8px;border-bottom:1px solid #cbd5e1}.heading-center{text-align:center;color:#71819a;font-size:8px;line-height:1.6}.heading-right{display:flex;justify-content:flex-end}.logo{max-width:132px;max-height:38px;object-fit:contain}.title{text-align:center;margin:8px 0 10px;font-size:14px;font-weight:800;letter-spacing:.5px}.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px 35px;padding:8px 2px;margin-bottom:9px;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0}.meta-item{display:grid;grid-template-columns:115px 1fr;gap:5px;min-width:0}.meta-item b{font-weight:700}.muted{color:#73839d;font-size:8px}.table-title{margin:9px 0 5px;font-size:10px;font-weight:700}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8px}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}th{padding:6px 5px;background:#edf1f6;color:#56677f;text-align:left;font-size:7px;text-transform:uppercase;letter-spacing:.2px}td{padding:5px;border-bottom:1px solid #dce3ec;vertical-align:top;overflow-wrap:anywhere}td small{display:block;margin-top:2px;color:#71819a;font-size:7px}.nowrap{white-space:nowrap}.amount{text-align:right;white-space:nowrap;font-weight:700}.debit{color:#c2410c}.credit{color:#0f766e}.footer{margin-top:7px;color:#73819a;font-size:7px}@page{size:A4 landscape;margin:10mm}@media print{body{padding:0}}
      </style></head><body><header class="heading"><div></div><div class="heading-center">Movimientos bancarios · Información del período<br>Generado: ${esc(fechaGeneracion)}</div><div class="heading-right"><img class="logo" src="${esc(logoGambarte)}" alt="Gambarte"></div></header><h1 class="title">MOVIMIENTOS BANCARIOS</h1><section class="meta-grid"><div class="meta-item"><b>Período:</b><span>${esc(rango)}</span></div><div class="meta-item"><b>Registros:</b><span>${this.movimientos.length}</span></div><div class="meta-item"><b>Entidad financiera:</b><span>${esc(entidad)}</span></div><div class="meta-item"><b>Cuenta:</b><span>${esc(this.filtros.cuenta || 'Todas')}</span></div><div class="meta-item"><b>Moneda:</b><span>${esc(moneda)}</span></div><div class="meta-item"><b>Tipo de movimiento:</b><span>${esc(tipo)}</span></div><div class="meta-item"><b>Filtros adicionales:</b><span>${esc(filtrosExtra)}</span></div></section><div class="table-title">Detalle de movimientos</div><table><thead><tr><th style="width:8%">Fecha</th><th style="width:8%">Hora</th><th style="width:17%">Entidad / cuenta</th><th style="width:13%">Movimiento</th><th style="width:32%">Detalle</th><th style="width:14%;text-align:right">Importe</th><th style="width:8%">Usuario</th></tr></thead><tbody>${filas}</tbody></table><div class="footer">Los importes se expresan en la moneda de cada movimiento.</div><script>window.onload=()=>window.print();</script></body></html>`);
    ventana.document.close();
  }

  private fechaMovimiento(fecha: string): string {
    const normalizada = new Date(fecha.replace(' ', 'T'));
    return Number.isNaN(normalizada.getTime()) ? fecha : new Intl.DateTimeFormat('es-BO', { dateStyle: 'short', timeStyle: 'short' }).format(normalizada);
  }

  private fechaCorta(fecha: string): string {
    const [anio, mes, dia] = fecha.split('-');
    return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
  }

}
