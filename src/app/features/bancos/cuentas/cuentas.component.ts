import { Component, effect, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';
import { SnackSwal } from '../shared/notify';
import {
  BankingService, CuentaBanco, CuentaBancaEstado, EstadoBanca, GrupoBanca,
} from '../../../core/banking.service';
import { BancosStore } from '../bancos.store';
import { BankLogoComponent } from '../shared/bank-logo.component';
import { ConciliacionComponent } from '../conciliacion/conciliacion.component';
import { MovimientosDialogComponent } from '../movimientos/movimientos-dialog.component';

interface GrupoCuentas {
  entidad: string;
  id_entidad: number;
  cuentas: CuentaBanco[];
  monedas: GrupoMoneda[];
}

interface GrupoMoneda {
  moneda: string;
  id_moneda: number;
  cuentas: CuentaBanco[];
  saldo: number;
}

/** Vista integrada de cuentas, saldos y arqueo diario de banca. */
@Component({
  selector: 'app-bancos-cuentas',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, MatButtonModule, MatCardModule, MatDialogModule,
    MatChipsModule, MatFormFieldModule, MatIconModule, MatInputModule,
    MatProgressSpinnerModule, MatSelectModule, BankLogoComponent, ConciliacionComponent,
  ],
  styleUrls: ['../bancos-ui.scss'],
  templateUrl: './cuentas.component.html',
  styles: [`
    .account-toolbar { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
    .account-toolbar .filter-field { flex:1 1 210px; min-width:190px; }
    .account-toolbar .bank-filter { flex:1.35 1 290px; }
    .account-toolbar .currency-filter { flex:.8 1 190px; }
    .account-toolbar .account-search { flex:1 1 240px; }
    .filter-option { display:flex; align-items:center; gap:9px; }
    .filter-option mat-icon { color:var(--text-muted); }
    .loading-card { display:flex; min-height:168px; align-items:center; justify-content:center; gap:13px; border-color:#e3e9f0; background:linear-gradient(135deg,#fff 0%,#f8fbff 100%); }
    .loading-card mat-spinner { --mdc-circular-progress-active-indicator-color:#f07822; flex:0 0 auto; }
    .loading-copy { display:grid; gap:4px; }
    .loading-copy strong { color:var(--text-primary); font-size:14px; font-weight:700; }
    .loading-copy span { color:var(--text-muted); font-size:12px; }
    .group-card { margin:0 0 14px; border-color:var(--border); background:var(--card-bg); }
    .group-header { display:flex; align-items:center; gap:12px; flex-wrap:wrap; padding:4px 0 14px; }
    .group-title { flex:1; min-width:150px; }
    .group-title h3 { margin:0; color:var(--text-primary); font-size:15px; font-weight:700; }
    .group-title small { color:var(--text-muted); }
    .entity-totals { display:flex; align-items:center; gap:16px; flex-wrap:wrap; color:var(--text-secondary); font-size:13px; }
    .entity-totals strong { color:var(--text-primary); font-size:15px; font-variant-numeric:tabular-nums; }
    .currency-section + .currency-section { border-top:1px solid var(--border-light); margin-top:18px; padding-top:14px; }
    .currency-header { display:flex; align-items:center; gap:16px; flex-wrap:wrap; margin-bottom:10px; padding:0 2px 10px; border-bottom:1px solid var(--border-light); }
    .currency-title { flex:1; min-width:150px; }
    .currency-title h4 { margin:0; color:var(--text-primary); font-size:14px; font-weight:700; }
    .currency-title span { color:var(--text-muted); font-size:12px; }
    .group-actions { display:flex; align-items:center; justify-content:flex-end; gap:8px; flex-wrap:wrap; }
    .group-actions button { min-height:38px; border-radius:10px; font-weight:600; }
    .open-action { --mdc-outlined-button-outline-color:#15803d; --mdc-outlined-button-label-text-color:#15803d; border:1px solid #15803d; color:#15803d; }
    .open-action:hover:not(:disabled) { --mdc-outlined-button-container-color:#f0fdf4; background-color:#f0fdf4; }
    .close-action { --mdc-outlined-button-outline-color:#dc2626; --mdc-outlined-button-label-text-color:#b91c1c; border:1px solid #dc2626; color:#b91c1c; }
    .close-action:hover:not(:disabled) { --mdc-outlined-button-container-color:#fef2f2; background-color:#fef2f2; }
    .bank-account-list { border-top:1px solid var(--border-light); }
    .bank-account-row { display:grid; grid-template-columns:38px minmax(170px,1fr) minmax(130px,auto) minmax(170px,190px) minmax(100px,auto) minmax(176px,auto); align-items:center; gap:12px; min-height:82px; padding:12px 14px; border-bottom:1px solid var(--border-light); border-left:3px solid var(--info-text); background:var(--card-bg); }
    .bank-account-row.est-aprobado { border-left-color:var(--success-text,#15803d); }
    .bank-account-row.est-pendiente { border-left-color:var(--warning-text,#b45309); }
    .bank-account-row.est-rechazado { border-left-color:var(--error-text,#dc2626); }
    .bank-account-row.est-anulado { border-left-color:var(--text-muted,#64748b); }
    .bank-account-row:last-child { border-bottom:0; }
    .bank-account-row:hover { background:var(--hover-bg); }
    .bank-account-icon { display:grid; place-items:center; flex:0 0 38px; width:38px; height:38px; border-radius:10px; color:var(--info-text); background:var(--info-bg); }
    .est-aprobado .bank-account-icon { color:var(--success-text,#15803d); background:var(--success-bg,#dcfce7); }
    .est-pendiente .bank-account-icon { color:var(--warning-text,#b45309); background:var(--warning-bg,#fef3c7); }
    .est-rechazado .bank-account-icon { color:var(--error-text,#dc2626); background:var(--error-bg,#fecaca); }
    .est-anulado .bank-account-icon { color:var(--text-muted,#64748b); background:var(--hover-bg,#f1f5f9); }
    .bank-account-icon mat-icon { width:20px; height:20px; font-size:20px; }
    .bank-account-summary { min-width:0; display:grid; gap:5px; }
    .bank-account-title { display:flex; align-items:center; gap:8px; flex-wrap:wrap; color:var(--text-primary); }
    .bank-account-title strong { font-size:13px; }
    .bank-account-summary small, .bank-account-balance span, .bank-account-difference span { color:var(--text-muted); font-size:11px; }
    .bank-account-balance, .bank-account-difference { display:grid; gap:4px; justify-items:end; text-align:right; white-space:nowrap; }
    .bank-account-balance strong, .bank-account-difference strong { color:var(--text-primary); font-size:13px; font-variant-numeric:tabular-nums; }
    .bank-account-counted { display:flex; align-items:center; justify-content:flex-end; gap:8px; min-width:0; }
    .bank-account-counted > .b-muted { text-align:right; line-height:1.4; }
    .bank-account-actions { display:flex; align-items:center; justify-content:flex-end; gap:4px; }
    .bank-account-actions button { border-radius:9px; transition:background-color .15s ease, color .15s ease, transform .15s ease; }
    .bank-account-actions button mat-icon { margin-right:4px; }
    .bank-account-actions button span { font-size:11px; font-weight:600; }
    .bank-account-actions button:hover { transform:translateY(-1px); }
    .bank-account-actions .movement-action { color:#2563a6; background:#eef5fc; }
    .bank-account-actions .movement-action:hover { color:#174d83; background:#dceafb; }
    .bank-account-actions .reconcile-action { color:#a85412; background:#fff3e8; }
    .bank-account-actions .reconcile-action:hover { color:#873d08; background:#ffe5cf; }
    .bank-account-actions button:focus-visible { outline:2px solid currentColor; outline-offset:2px; }
    .estado-badge { display:inline-flex; align-items:center; width:max-content; flex:none; padding:2px 9px; border-radius:12px; font-size:10px; line-height:1.35; font-weight:600; }
    .estado-badge.est-pendiente { background:#fff4d6 !important; color:#92400e; border:1px solid #f5d98a; }
    .estado-badge.est-aprobado { background:#e9f8ef !important; color:#166534; border:1px solid #a7e8ba; }
    .estado-badge.est-rechazado { background:#fceaea !important; color:#991b1b; border:1px solid #f2b6b6; }
    .estado-badge.est-anulado { background:#eef2f6 !important; color:#475569; border:1px solid #cbd5e1; }
    .foreign-row { opacity:.82; }
    .inline-reconciliation { margin:8px 0 2px; padding:12px; border:1px solid var(--border); border-radius:10px; background:var(--hover-bg); }
    .empty-state { display:grid; place-items:center; gap:8px; padding:34px 16px; text-align:center; color:var(--text-muted); }
    .empty-state mat-icon { width:34px; height:34px; font-size:34px; }
    .positive { color:var(--success-text); } .negative { color:var(--error-text); }
    @media(max-width:1100px) { .bank-account-row { grid-template-columns:38px minmax(0,1fr) auto; gap:10px; } .bank-account-summary { grid-column:2/4; grid-row:1; } .bank-account-balance { grid-column:2; grid-row:2; justify-items:start; text-align:left; } .bank-account-counted { grid-column:3; grid-row:2; justify-content:flex-end; flex-wrap:wrap; } .bank-account-difference { grid-column:2; grid-row:3; justify-items:start; text-align:left; } .bank-account-actions { grid-column:3; grid-row:3; } }
    @media(max-width:700px) { .entity-totals { width:100%; padding-left:54px; } .currency-header { align-items:flex-start; } }
  `],
})
export class CuentasComponent implements OnInit {
  store = inject(BancosStore);
  private banking = inject(BankingService);
  private snack = inject(SnackSwal);
  private dialog = inject(MatDialog);

  busqueda = '';
  bancosSeleccionados: number[] = [];
  monedaSeleccionada = 0;
  cargandoActividad = true;
  banca: EstadoBanca | null = null;
  cargandoBanca = false;
  errorBanca = '';
  guardando = false;
  conciliando: string | null = null;
  private clavesSoportadas: string[] = [];
  private claveCuentasActividad: string | null = null;
  readonly trackCuenta = (_: number, cuenta: CuentaBanco) => `${cuenta.id_agencia}:${cuenta.num_cuenta}:${cuenta.id_moneda}`;

  constructor() {
    effect(() => {
      const cargando = this.store.cargandoCuentas();
      const cuentas = this.store.cuentas().filter(c => c.propia);
      if (cargando) return;
      const ids = Array.from(new Set(cuentas.map(c => c.id_entidad))).sort((a, b) => a - b);
      const key = ids.join(',');
      if (key === this.claveCuentasActividad) return;
      this.claveCuentasActividad = key;
      if (!ids.length) {
        this.bancosSeleccionados = [];
        this.cargandoActividad = false;
        return;
      }
      this.buscarBancosConActividad(ids);
    });
  }

  ngOnInit(): void {
    // Esta vista operativa trabaja solo con la agencia del cajero.
    if (this.store.verTodas()) this.store.verTodas.set(false);
    this.store.cargarCatalogos();
    this.store.refrescarCuentas();
    this.loadBanca();
    this.banking.conciliacionCatalogos().subscribe({
      next: r => this.clavesSoportadas = r.bancos.map(b => b.clave),
      error: () => { /* la conciliación simplemente no se ofrece */ },
    });
  }

  actualizar(): void {
    this.claveCuentasActividad = null;
    this.store.refrescarCuentas();
    this.loadBanca();
  }

  private buscarBancosConActividad(ids: number[]): void {
    this.cargandoActividad = true;
    const hasta = this.fechaLocal(new Date());
    const inicio = new Date();
    inicio.setDate(inicio.getDate() - 30);
    const desde = this.fechaLocal(inicio);
    forkJoin(ids.map(entidad => this.banking.movimientos({ desde, hasta, entidad }))).subscribe({
      next: resultados => {
        const activos = new Set<number>();
        for (const resultado of resultados) {
          for (const movimiento of resultado.movimientos) activos.add(movimiento.id_entidad);
        }
        this.bancosSeleccionados = Array.from(activos).sort((a, b) => a - b);
        this.cargandoActividad = false;
      },
      error: () => {
        // No ocultar cuentas si el servicio de actividad no está disponible.
        this.bancosSeleccionados = ids;
        this.cargandoActividad = false;
        this.snack.open('No se pudo consultar la actividad reciente; se muestran todos los bancos.', 'OK', { duration: 5000 });
      },
    });
  }

  private fechaLocal(fecha: Date): string {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }

  get bancosDisponibles(): { id: number; nombre: string }[] {
    const bancos = new Map<number, string>();
    for (const cuenta of this.store.cuentas().filter(c => c.propia)) bancos.set(cuenta.id_entidad, cuenta.entidad);
    return Array.from(bancos, ([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  get monedasDisponibles(): { id: number; nombre: string }[] {
    const monedas = new Map<number, string>();
    for (const cuenta of this.store.cuentas().filter(c => c.propia)) monedas.set(cuenta.id_moneda, cuenta.moneda);
    return Array.from(monedas, ([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  bancosSeleccionadosLabel(): string {
    if (this.cargandoActividad) return 'Buscando actividad reciente…';
    if (!this.bancosSeleccionados.length) return 'Ningún banco seleccionado';
    if (this.bancosSeleccionados.length === this.bancosDisponibles.length) return 'Todos los bancos';
    return `${this.bancosSeleccionados.length} banco(s) seleccionado(s)`;
  }

  private get cuentasFiltradas(): CuentaBanco[] {
    const q = this.busqueda.trim().toLowerCase();
    const cuentas = this.store.cuentas().filter(c => c.propia
      && this.bancosSeleccionados.includes(c.id_entidad)
      && (!this.monedaSeleccionada || c.id_moneda === this.monedaSeleccionada));
    if (!q) return cuentas;
    return cuentas.filter(c => (c.num_cuenta || '').toLowerCase().includes(q));
  }

  get grupos(): GrupoCuentas[] {
    const map = new Map<string, GrupoCuentas>();
    for (const c of this.cuentasFiltradas) {
      const idEntidad = String(c.id_entidad);
      let g = map.get(idEntidad);
      if (!g) {
        g = { entidad: c.entidad, id_entidad: c.id_entidad, cuentas: [], monedas: [] };
        map.set(idEntidad, g);
      }
      g.cuentas.push(c);
      let moneda = g.monedas.find(m => m.id_moneda === c.id_moneda);
      if (!moneda) {
        moneda = { moneda: c.moneda, id_moneda: c.id_moneda, cuentas: [], saldo: 0 };
        g.monedas.push(moneda);
      }
      moneda.cuentas.push(c);
      moneda.saldo += c.saldo;
    }
    return Array.from(map.values())
      .map(g => ({ ...g, monedas: g.monedas.sort((a, b) => a.moneda.localeCompare(b.moneda)) }))
      .sort((a, b) => a.entidad.localeCompare(b.entidad));
  }

  grupoBancaDeGrupo(grupo: GrupoMoneda, idEntidad: number): GrupoBanca | undefined {
    return this.banca?.grupos.find(g => g.id_entidad === idEntidad && g.id_moneda === grupo.id_moneda);
  }

  getEstado(cuenta: CuentaBanco): CuentaBancaEstado | undefined {
    return this.banca?.cuentas.find(c => c.id_agencia === cuenta.id_agencia && c.id_entidad === cuenta.id_entidad
      && c.id_moneda === cuenta.id_moneda && c.num_cuenta === cuenta.num_cuenta);
  }

  cuentasDeGrupo(g: GrupoBanca): CuentaBancaEstado[] {
    return this.banca?.cuentas.filter(c => g.claves.includes(c.clave)) ?? [];
  }

  pendientesDeAbrir(g: GrupoBanca): number {
    return this.cuentasDeGrupo(g).filter(c => c.estado === 'sin_abrir').length;
  }

  abiertasDeGrupo(g: GrupoBanca): number {
    return this.cuentasDeGrupo(g).filter(c => c.estado === 'abierta').length;
  }

  diferenciaApertura(cuenta: CuentaBancaEstado): number {
    return Number((Number(cuenta.saldo_apertura ?? cuenta.saldo_actual) - Number(cuenta.saldo_actual)).toFixed(2));
  }

  estadoLabel(estado?: string): string {
    if (estado === 'abierta') return 'Abierta';
    if (estado === 'cerrada') return 'Cerrada';
    if (estado === 'parcial') return 'Parcial';
    if (estado === 'fuera') return 'Solo consulta';
    if (estado === 'cargando') return 'Cargando';
    if (estado === 'no_disponible') return 'No disponible';
    return 'Sin abrir';
  }

  estadoClass(estado?: string): string {
    if (estado === 'abierta' || estado === 'cerrada') return 'est-aprobado';
    if (estado === 'parcial' || estado === 'sin_abrir' || estado === 'cargando') return 'est-pendiente';
    if (estado === 'no_disponible') return 'est-anulado';
    return 'est-anulado';
  }

  bancaEstado(cuenta: CuentaBanco): string {
    if (!cuenta.propia) return 'fuera';
    if (!this.banca) return this.cargandoBanca ? 'cargando' : 'no_disponible';
    return this.getEstado(cuenta)?.estado ?? 'no_disponible';
  }

  private clavesParaAbrir(g: GrupoBanca): string[] {
    return this.cuentasDeGrupo(g).filter(c => c.estado === 'sin_abrir').map(c => c.clave);
  }

  private clavesParaCerrar(g: GrupoBanca): string[] {
    return this.cuentasDeGrupo(g).filter(c => c.estado === 'abierta').map(c => c.clave);
  }

  abrirGrupo(g: GrupoBanca): void { void this.solicitarApertura(this.clavesParaAbrir(g)); }

  abrirTodo(): void {
    if (!this.banca) return;
    void this.solicitarApertura(this.banca.cuentas.filter(c => c.estado === 'sin_abrir').map(c => c.clave));
  }

  private estilizarDialogoBanca(): void {
    const popup = Swal.getPopup();
    if (!popup) return;
    const style = document.createElement('style');
    style.textContent = `
      .banking-swal-popup { max-width:calc(100vw - 32px)!important; padding:24px!important; border-radius:18px!important; color:#14213d; box-shadow:0 24px 70px rgba(15,23,42,.22)!important; }
      .banking-swal-title { margin:0 0 8px!important; color:#14213d!important; font-size:22px!important; font-weight:750!important; letter-spacing:-.4px; }
      .close-banking-dialog { max-height:60vh; margin:0!important; padding:4px 2px!important; overflow:auto; text-align:left; }
      .close-banking-list { display:grid; gap:10px; }
      .close-banking-item { display:grid; grid-template-columns:1fr 1fr; gap:12px 16px; padding:16px; border:1px solid #e2e8f0; border-radius:13px; background:#fbfcfe; }
      .close-banking-account { grid-column:1/-1; display:flex; align-items:center; justify-content:space-between; gap:14px; padding-bottom:12px; border-bottom:1px solid #e8edf3; color:#14213d; }
      .close-banking-account strong { display:grid; gap:4px; font-size:17px; font-weight:700; font-variant-numeric:tabular-nums; }
      .close-banking-account .account-caption { color:#73819a; font-size:10px; font-weight:600; letter-spacing:.45px; text-transform:uppercase; }
      .close-banking-account .account-primary { display:flex; align-items:baseline; gap:10px; flex-wrap:wrap; }
      .close-banking-account .account-entity { color:#64748b; font-size:12px; font-weight:600; font-variant-numeric:normal; }
      .close-banking-account > span { display:flex; align-items:center; gap:8px; color:#718096; font-size:11px; text-align:right; }
      .close-banking-account > span b { padding:4px 8px; border-radius:999px; color:#245c8f; background:#eaf3fc; font-size:10px; }
      .close-banking-field { display:grid; gap:6px; min-width:0; }
      .close-banking-field label { color:#52627a; font-size:11px; font-weight:600; }
      .close-banking-field label small { color:#8b98aa; font-size:10px; font-weight:400; }
      .close-banking-field .swal2-input { box-sizing:border-box; width:100%; height:42px; margin:0!important; padding:0 12px; border:1px solid #d7dee8; border-radius:8px; background:#fff; color:#14213d; font-size:13px; box-shadow:none; }
      .close-banking-field .swal2-input:focus { border-color:#72a8d8; box-shadow:0 0 0 3px rgba(37,99,166,.12); }
      .banking-swal-actions { gap:9px!important; margin-top:18px!important; }
      .banking-swal-actions button { min-height:42px; padding:0 18px!important; border-radius:9px!important; font-size:13px!important; font-weight:650!important; }
      .banking-open-confirm { border:1px solid #15803d!important; background:#fff!important; color:#15803d!important; }
      .banking-open-confirm:hover { background:#f0fdf4!important; }
      .banking-close-confirm { background:#b91c1c!important; }
      .banking-close-confirm:hover { background:#991b1b!important; }
      .banking-cancel-button { border:1px solid #d7dee8!important; background:#fff!important; color:#475569!important; }
      .banking-cancel-button:hover { background:#f8fafc!important; }
      @media(max-width:560px) { .banking-swal-popup { padding:19px!important; } .banking-swal-title { font-size:19px!important; } .close-banking-item { grid-template-columns:1fr; gap:10px; padding:13px; } .close-banking-account { grid-column:auto; align-items:flex-start; flex-direction:column; gap:8px; } .close-banking-account > span { flex-wrap:wrap; text-align:left; } }
    `;
    popup.appendChild(style);
  }

  private async solicitarApertura(claves: string[]): Promise<void> {
    const cuentas = this.banca?.cuentas.filter(c => claves.includes(c.clave)) ?? [];
    if (!cuentas.length) {
      this.errorBanca = 'No hay cuentas pendientes de apertura.';
      return;
    }
    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]!);
    const html = `<div class="close-banking-list">${cuentas.map((cuenta, index) => `
      <section class="close-banking-item">
        <div class="close-banking-account"><strong><span class="account-caption">Cuenta bancaria</span><span class="account-primary"><span class="account-number">${escapeHtml(cuenta.num_cuenta)}</span><span class="account-entity">${escapeHtml(cuenta.entidad)}</span></span></strong><span>${escapeHtml(this.cuentaBancoDe(cuenta)?.agencia || 'Agencia')} <b>${escapeHtml(cuenta.moneda)}</b></span></div>
        <div class="close-banking-field"><label for="open-amount-${index}">Saldo contado <small>· ${escapeHtml(cuenta.moneda)} · obligatorio</small></label><input id="open-amount-${index}" class="swal2-input close-banking-amount" type="number" min="0" step="0.01" value="${Number(cuenta.saldo_actual).toFixed(2)}"></div>
        <div class="close-banking-field"><label for="open-reason-${index}">Observación <small>· opcional</small></label><input id="open-reason-${index}" class="swal2-input close-banking-reason" type="text" maxlength="160" placeholder="Añade una nota de apertura"></div>
      </section>`).join('')}</div>`;
    const result = await Swal.fire({
      title: `Abrir cuentas · ${cuentas.length === 1 ? cuentas[0].moneda : 'varias monedas'}`,
      html,
      width: cuentas.length > 1 ? 720 : 540,
      showCancelButton: true,
      confirmButtonText: 'Confirmar apertura',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      customClass: { popup: 'banking-swal-popup', title: 'banking-swal-title', htmlContainer: 'close-banking-dialog', actions: 'banking-swal-actions', confirmButton: 'banking-open-confirm', cancelButton: 'banking-cancel-button' },
      didOpen: () => this.estilizarDialogoBanca(),
      preConfirm: () => {
        const montos: { [k: string]: number } = {};
        const glosas: { [k: string]: string } = {};
        const popup = Swal.getPopup();
        if (!popup) return false;
        for (const [index, cuenta] of cuentas.entries()) {
          const amountInput = popup.querySelector<HTMLInputElement>(`#open-amount-${index}`);
          const reasonInput = popup.querySelector<HTMLInputElement>(`#open-reason-${index}`);
          const amount = Number(amountInput?.value);
          if (!amountInput?.value.trim() || !Number.isFinite(amount) || amount < 0) {
            Swal.showValidationMessage(`Ingresa un saldo contado válido para la cuenta ${cuenta.num_cuenta}.`);
            return false;
          }
          montos[cuenta.clave] = amount;
          const reason = reasonInput?.value.trim();
          if (reason) glosas[cuenta.clave] = reason;
        }
        return { montos, glosas };
      },
    });
    if (!result.isConfirmed || !result.value) return;
    this.abrirBanca(claves, result.value.montos, result.value.glosas);
  }

  private abrirBanca(claves: string[], montos: { [k: string]: number }, glosas: { [k: string]: string }): void {
    if (!claves.length) { this.errorBanca = 'No hay cuentas pendientes de apertura.'; return; }
    this.errorBanca = '';
    this.guardando = true;
    this.banking.abrirBanca(claves, montos, glosas).subscribe({
      next: r => {
        this.guardando = false;
        this.snack.open(r?.message || 'Banca abierta', 'OK', { duration: 5000 });
        if (r?.faltantes?.length) this.errorBanca = `Atención: ${r.faltantes.length} cuenta(s) sin arqueo anterior. El saldo de apertura se tomó del libro.`;
        this.actualizar();
      },
      error: e => { this.guardando = false; this.errorBanca = e.message || 'No se pudo abrir la banca'; },
    });
  }

  async cerrarGrupo(g: GrupoBanca): Promise<void> {
    const claves = this.clavesParaCerrar(g);
    const cuentas = this.cuentasDeGrupo(g).filter(c => claves.includes(c.clave));
    if (!cuentas.length) {
      this.errorBanca = 'No hay cuentas abiertas para cerrar.';
      return;
    }

    const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[char]!);
    const html = `<div class="close-banking-list">${cuentas.map((cuenta, index) => `
      <section class="close-banking-item">
        <div class="close-banking-account"><strong><span class="account-caption">Cuenta bancaria</span><span class="account-primary"><span class="account-number">${escapeHtml(cuenta.num_cuenta)}</span><span class="account-entity">${escapeHtml(cuenta.entidad)}</span></span></strong><span>${escapeHtml(this.cuentaBancoDe(cuenta)?.agencia || 'Agencia')} <b>${escapeHtml(cuenta.moneda)}</b></span></div>
        <div class="close-banking-field"><label for="close-amount-${index}">Saldo contado <small>· ${escapeHtml(cuenta.moneda)} · obligatorio</small></label><input id="close-amount-${index}" class="swal2-input close-banking-amount" type="number" min="0" step="0.01" placeholder="Ingresa el saldo contado"></div>
        <div class="close-banking-field"><label for="close-reason-${index}">Motivo de diferencia <small>· si corresponde</small></label><input id="close-reason-${index}" class="swal2-input close-banking-reason" type="text" maxlength="160" placeholder="Obligatorio si existe diferencia"></div>
      </section>`).join('')}</div>`;

    const result = await Swal.fire({
      title: `Cerrar cuentas · ${g.moneda}`,
      html,
      width: cuentas.length > 1 ? 720 : 540,
      showCancelButton: true,
      confirmButtonText: 'Confirmar cierre',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      customClass: { popup: 'banking-swal-popup', title: 'banking-swal-title', htmlContainer: 'close-banking-dialog', actions: 'banking-swal-actions', confirmButton: 'banking-close-confirm', cancelButton: 'banking-cancel-button' },
      didOpen: () => this.estilizarDialogoBanca(),
      preConfirm: () => {
        const montos: { [k: string]: number } = {};
        const glosas: { [k: string]: string } = {};
        const popup = Swal.getPopup();
        if (!popup) return false;
        for (const [index, cuenta] of cuentas.entries()) {
          const amountInput = popup.querySelector<HTMLInputElement>(`#close-amount-${index}`);
          const reasonInput = popup.querySelector<HTMLInputElement>(`#close-reason-${index}`);
          const amount = Number(amountInput?.value);
          if (!amountInput?.value.trim() || !Number.isFinite(amount) || amount < 0) {
            Swal.showValidationMessage(`Ingresa un saldo contado válido para la cuenta ${cuenta.num_cuenta}.`);
            return false;
          }
          const reason = reasonInput?.value.trim() || '';
          const difference = Number((amount - Number(cuenta.saldo_actual)).toFixed(2));
          if (Math.abs(difference) > 0.009 && !reason) {
            Swal.showValidationMessage(`Indica el motivo de la diferencia para la cuenta ${cuenta.num_cuenta}.`);
            return false;
          }
          montos[cuenta.clave] = amount;
          if (reason) glosas[cuenta.clave] = reason;
        }
        return { montos, glosas };
      },
    });
    if (!result.isConfirmed || !result.value) return;
    this.cerrarBanca(claves, result.value.montos, result.value.glosas);
  }

  private cerrarBanca(claves: string[], montos: { [k: string]: number }, glosas: { [k: string]: string }): void {
    if (!claves.length) { this.errorBanca = 'No hay cuentas abiertas para cerrar.'; return; }

    this.errorBanca = '';
    this.guardando = true;
    this.banking.cerrarBanca(claves, montos, glosas).subscribe({
      next: r => {
        this.guardando = false;
        this.snack.open(r?.message || 'Banca cerrada', 'OK', { duration: 6000 });
        const diferencias = (r?.detalle || []).filter(d => d.descuadrado);
        if (diferencias.length) {
          const detalle = diferencias.map(d => `${d.num_cuenta}: ${d.diferencia > 0 ? 'sobrante' : 'faltante'} ${Math.abs(d.diferencia).toFixed(2)}`).join(' · ');
          this.snack.open(`Diferencias: ${detalle}`, 'OK', { duration: 9000 });
        }
        this.loadBanca();
        this.store.refrescarCuentas();
      },
      error: e => { this.guardando = false; this.errorBanca = e.message || 'No se pudo cerrar la banca'; },
    });
  }

  loadBanca(): void {
    this.cargandoBanca = true;
    this.banking.estadoBanca().subscribe({
      next: r => {
        this.cargandoBanca = false;
        this.banca = r;
      },
      error: e => {
        this.cargandoBanca = false;
        this.snack.open(e.message || 'Error al cargar el estado de la banca', 'OK', { duration: 5000 });
      },
    });
  }

  soportaConciliacion(entidad: string): boolean {
    return this.clavesSoportadas.some(clave => (entidad || '').toUpperCase().includes(clave.toUpperCase()));
  }

  toggleConciliar(cuenta: CuentaBanco): void {
    const estado = this.getEstado(cuenta);
    if (!estado) return;
    this.conciliando = this.conciliando === estado.clave ? null : estado.clave;
  }

  cuentaBancoDe(cuentaEstado: CuentaBancaEstado): CuentaBanco | undefined {
    return this.store.cuentas().find(c => c.id_agencia === cuentaEstado.id_agencia && c.num_cuenta === cuentaEstado.num_cuenta
      && c.id_moneda === cuentaEstado.id_moneda && c.id_entidad === cuentaEstado.id_entidad);
  }

  verMovimientos(c: CuentaBanco): void {
    this.dialog.open(MovimientosDialogComponent, {
      data: c,
      width: 'min(1100px, 96vw)',
      maxWidth: '96vw',
      maxHeight: '92vh',
      autoFocus: false,
      restoreFocus: true,
    });
  }
}
