import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SnackSwal } from '../shared/notify';
import { BankingService, CuentaBanco, Traspaso } from '../../../core/banking.service';
import { BancosStore } from '../bancos.store';
import { ConfirmService } from '../shared/confirm.service';
import { SearchableSelectComponent } from '../../../shared/searchable-select.component';

type Sub = 'lista' | 'recibir';

/** Traspasos entre cuentas bancarias de distintas agencias. */
@Component({
  selector: 'app-bancos-traspasos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, SearchableSelectComponent],
  styleUrls: ['../bancos-ui.scss'],
  templateUrl: './traspasos.component.html',
  styles: [`
    .transfer-page-head { display:flex; align-items:center; gap:14px; margin-bottom:16px; }
    .transfer-page-head > div:not(.b-head-icon) { flex:1; min-width:0; }
    .transfer-page-head > .b-head-icon { flex:0 0 44px; }
    .transfer-page-head h3 { margin:0; color:var(--text-primary); font-size:17px; font-weight:700; }
    .transfer-page-head p { margin:4px 0 0; color:var(--text-muted); font-size:12px; }
    .transfer-list-card { padding:0; overflow:hidden; }
    .transfer-list-head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:16px 18px; border-bottom:1px solid var(--border-light); }
    .transfer-list-head h3 { margin:0; color:var(--text-primary); font-size:15px; font-weight:700; }
    .transfer-list-head p { margin:4px 0 0; color:var(--text-muted); font-size:12px; }
    .transfer-list-actions { display:flex; align-items:center; gap:8px; }
    .transfer-list-actions select { width:auto; min-width:140px; }
    .transfer-list-actions mat-form-field { width:150px; }
    .transfer-list-actions mat-form-field ::ng-deep .mat-mdc-form-field-subscript-wrapper { display:none; }
    .transfer-list-actions mat-form-field ::ng-deep .mat-mdc-text-field-wrapper { border-radius:10px; background:#fff; }
    .transfer-list-actions mat-form-field ::ng-deep .mdc-notched-outline__leading,
    .transfer-list-actions mat-form-field ::ng-deep .mdc-notched-outline__notch,
    .transfer-list-actions mat-form-field ::ng-deep .mdc-notched-outline__trailing { border-color:#d6dfeb!important; }
    .transfer-list-actions mat-form-field.mat-focused ::ng-deep .mdc-notched-outline__leading,
    .transfer-list-actions mat-form-field.mat-focused ::ng-deep .mdc-notched-outline__notch,
    .transfer-list-actions mat-form-field.mat-focused ::ng-deep .mdc-notched-outline__trailing { border-color:#d97725!important; border-width:2px!important; }
    .transfer-list-actions mat-form-field ::ng-deep .mat-mdc-form-field-infix { min-height:38px; padding-top:8px; padding-bottom:7px; }
    .transfer-list-actions mat-form-field ::ng-deep .mat-mdc-select-value { color:#172b4d; font-size:12px; font-weight:600; }
    .transfer-filters { display:grid; grid-template-columns:minmax(220px,1fr) repeat(2,minmax(145px,.42fr)); gap:12px; padding:14px 18px; border-bottom:1px solid #e2e8f0; background:linear-gradient(115deg,#f8fafc 0%,#f4f7fb 100%); }
    .transfer-filters mat-form-field { width:100%; }
    .transfer-filters mat-form-field ::ng-deep .mat-mdc-form-field-subscript-wrapper { display:none; }
    .transfer-filters mat-form-field ::ng-deep .mat-mdc-text-field-wrapper { border-radius:10px; background:#fff; }
    .transfer-filters mat-form-field ::ng-deep .mdc-notched-outline__leading,
    .transfer-filters mat-form-field ::ng-deep .mdc-notched-outline__notch,
    .transfer-filters mat-form-field ::ng-deep .mdc-notched-outline__trailing { border-color:#d6dfeb!important; }
    .transfer-filters mat-form-field:hover ::ng-deep .mdc-notched-outline__leading,
    .transfer-filters mat-form-field:hover ::ng-deep .mdc-notched-outline__notch,
    .transfer-filters mat-form-field:hover ::ng-deep .mdc-notched-outline__trailing { border-color:#aebed1!important; }
    .transfer-filters mat-form-field.mat-focused ::ng-deep .mdc-notched-outline__leading,
    .transfer-filters mat-form-field.mat-focused ::ng-deep .mdc-notched-outline__notch,
    .transfer-filters mat-form-field.mat-focused ::ng-deep .mdc-notched-outline__trailing { border-color:#d97725!important; border-width:2px!important; }
    .transfer-filters mat-form-field ::ng-deep .mat-mdc-form-field-flex { align-items:center; }
    .transfer-filters mat-form-field ::ng-deep .mat-mdc-form-field-infix { display:flex; align-items:center; box-sizing:border-box; min-height:48px; padding-top:0!important; padding-bottom:0!important; }
    .transfer-filters mat-form-field ::ng-deep .mat-mdc-form-field-icon-prefix { color:#b86623; }
    .transfer-filters mat-form-field ::ng-deep .mdc-floating-label { color:#64748b; font-size:12px; }
    .transfer-filters mat-form-field.mat-focused ::ng-deep .mdc-floating-label { color:#b86623; }
    .transfer-filters mat-form-field ::ng-deep input,
    .transfer-filters mat-form-field ::ng-deep .mat-mdc-select-value { color:#172b4d; font-size:13px; font-weight:500; }
    .transfer-filters mat-form-field ::ng-deep input::placeholder { color:#8b9bb0; opacity:1; }
    .transfer-row { display:grid; grid-template-columns:42px minmax(180px,1.2fr) minmax(220px,1.5fr) minmax(125px,auto) 105px 28px; align-items:center; gap:13px; width:100%; min-height:78px; padding:12px 18px; border:0; border-bottom:1px solid var(--border-light); border-left:3px solid #5276a8; background:var(--card-bg); color:var(--text-primary); text-align:left; cursor:pointer; transition:background .15s; }
    .transfer-row:last-child { border-bottom:0; }
    .transfer-row:hover,.transfer-row.selected { background:var(--hover-bg); }
    .transfer-row.ok { border-left-color:var(--success-text); }
    .transfer-row.warn { border-left-color:var(--warning-text); }
    .transfer-row.err { border-left-color:var(--error-text); }
    .transfer-row-icon { display:grid; place-items:center; width:38px; height:38px; border-radius:11px; color:#5276a8; background:#edf3fb; }
    .transfer-row.ok .transfer-row-icon { color:var(--success-text); background:var(--success-bg); }
    .transfer-row.warn .transfer-row-icon { color:var(--warning-text); background:var(--warning-bg); }
    .transfer-row.err .transfer-row-icon { color:var(--error-text); background:var(--error-bg); }
    .transfer-main,.transfer-route { display:grid; gap:5px; min-width:0; }
    .transfer-main strong { display:flex; align-items:center; gap:8px; flex-wrap:wrap; font-size:13px; }
    .transfer-role-badge { display:inline-flex; align-items:center; padding:3px 8px; border-radius:999px; font-size:10px; font-weight:700; line-height:1.2; text-transform:capitalize; }
    .transfer-role-badge.role-origen { color:#174f91; background:#dcecff; border:1px solid #b9d6fb; }
    .transfer-role-badge.role-destino { color:#087563; background:#d9f3ec; border:1px solid #afe4d7; }
    .transfer-main small,.transfer-route small { color:var(--text-muted); font-size:11px; }
    .transfer-route strong { overflow:hidden; color:var(--text-secondary); font-size:12px; text-overflow:ellipsis; white-space:nowrap; }
    .transfer-amount { text-align:right; white-space:nowrap; font-size:13px; font-variant-numeric:tabular-nums; }
    .transfer-chevron { color:var(--text-muted); }
    .transfer-loading { display:flex; justify-content:center; align-items:center; gap:10px; min-height:150px; color:var(--text-muted); }
    .transfer-empty { display:grid; justify-items:center; gap:7px; padding:42px 20px; color:var(--text-muted); text-align:center; }
    .transfer-empty mat-icon { color:#9aa9bc; }
    .transfer-empty strong { color:var(--text-secondary); }
    .transfer-backdrop { position:fixed; inset:56px 0 0; z-index:1000; background:rgba(15,23,42,.38); }
    .transfer-drawer { position:fixed; z-index:1001; top:56px; right:0; bottom:0; display:flex; flex-direction:column; width:min(760px,100vw); background:var(--card-bg); box-shadow:-14px 0 40px rgba(15,23,42,.16); animation:transfer-slide-in .2s ease-out; }
    @keyframes transfer-slide-in { from { transform:translateX(24px); opacity:.7; } to { transform:translateX(0); opacity:1; } }
    .drawer-head { display:flex; align-items:center; gap:12px; padding:18px 22px; border-bottom:1px solid var(--border-light); }
    .drawer-head.role-origen { padding-left:18px; border-left:4px solid #4d8bd2; background:linear-gradient(105deg,#edf5ff 0%,#f7faff 62%,#fff 100%); border-bottom-color:#d5e6fb; }
    .drawer-head.role-destino { padding-left:18px; border-left:4px solid #25a58e; background:linear-gradient(105deg,#eaf8f4 0%,#f6fcfa 62%,#fff 100%); border-bottom-color:#cdece4; }
    .drawer-head-icon { display:grid; place-items:center; width:42px; height:42px; flex:0 0 42px; border-radius:12px; color:var(--gambarte-orange); background:var(--gambarte-orange-light); }
    .drawer-head-icon.role-origen { color:#174f91; background:#dcecff; border:1px solid #b9d6fb; box-shadow:0 2px 5px rgba(37,99,166,.12); }
    .drawer-head-icon.role-destino { color:#087563; background:#d9f3ec; border:1px solid #afe4d7; box-shadow:0 2px 5px rgba(15,139,120,.12); }
    .drawer-head-copy { flex:1; min-width:0; }
    .drawer-head h3 { margin:0; color:var(--text-primary); font-size:16px; font-weight:700; }
    .drawer-head p { margin:4px 0 0; color:var(--text-muted); font-size:11px; }
    .drawer-head .b-badge { margin-left:auto; flex:0 0 auto; }
    .drawer-head .b-badge.warn { color:#8a4b00; background:#fff0c2; border:1px solid #f2d27b; }
    .drawer-head .b-badge.ok { color:#126b3a; background:#dcf5e6; border:1px solid #a9dfbd; }
    .drawer-head .b-badge.err { color:#a12727; background:#fde5e5; border:1px solid #f2bcbc; }
    .header-role-badge { flex:0 0 auto; }
    .drawer-body { flex:1; overflow:auto; padding:18px 22px 24px; }
    .drawer-footer { display:flex; justify-content:flex-end; gap:9px; padding:13px 22px; border-top:1px solid var(--border-light); background:var(--card-bg); }
    .drawer-footer .b-btn { min-height:38px; }
    .transfer-detail-amount { display:flex; align-items:center; justify-content:space-between; gap:10px; min-height:62px; padding:14px 17px; margin-bottom:14px; border:0; border-radius:12px; background:#f1f3f6; }
    .transfer-detail-amount span { color:#8594aa; font-size:12px; }
    .transfer-detail-amount strong { color:#087da8; font-size:20px; font-weight:750; font-variant-numeric:tabular-nums; }
    .transfer-detail-grid { display:grid; gap:0; }
    .transfer-detail-route { display:grid; grid-template-columns:minmax(0,1fr) 34px minmax(0,1fr); align-items:center; gap:10px; padding:4px 0 16px; margin-bottom:2px; border-bottom:1px solid var(--border-light); }
    .transfer-route-card { display:grid; align-content:start; gap:8px; min-width:0; min-height:116px; padding:13px 14px; border:1px solid var(--border-light); border-radius:12px; background:var(--card-bg); }
    .transfer-route-card-head { display:flex; align-items:center; gap:9px; margin-bottom:2px; }
    .transfer-route-bank-icon { display:grid; place-items:center; width:32px; height:32px; flex:0 0 32px; border-radius:10px; }
    .transfer-route-bank-icon mat-icon { width:19px; height:19px; font-size:19px; }
    .origin-route-card .transfer-route-bank-icon { color:#2563a6; background:#edf5ff; }
    .destination-route-card .transfer-route-bank-icon { color:#0f8b78; background:#e8f7f3; }
    .origin-route-card { border-color:#d5e6fb; background:#f8fbff; }
    .destination-route-card { border-color:#cdece4; background:#f6fcfa; }
    .origin-route-card .transfer-route-label { color:#2563a6; }
    .destination-route-card .transfer-route-label { color:#0f8b78; }
    .transfer-route-label { font-size:12px; font-weight:700; }
    .transfer-route-label small { color:var(--text-muted); font-size:10px; font-weight:500; }
    .transfer-route-card > strong { color:var(--text-primary); font-size:12px; line-height:1.4; overflow-wrap:anywhere; }
    .transfer-route-agency { color:var(--text-muted); font-size:11px; }
    .transfer-route-arrow { display:grid; place-items:center; width:32px; height:32px; border:1px solid #f3d3b8; border-radius:50%; color:#c96726; background:#fff7f0; }
    .transfer-route-arrow mat-icon { width:18px; height:18px; font-size:18px; }
    .transfer-detail-item { display:grid; grid-template-columns:26px 1fr; gap:12px; padding:15px 4px; border-bottom:1px solid var(--border-light); }
    .transfer-detail-item mat-icon { color:#8b9bb1; font-size:19px; }
    .transfer-detail-item .transfer-detail-icons { display:flex; align-items:center; gap:2px; width:max-content; height:24px; }
    .transfer-detail-item .transfer-detail-icons mat-icon { width:16px; height:16px; font-size:16px; }
    .transfer-detail-item .origin-bank-icon mat-icon { color:#2563a6; }
    .transfer-detail-item .destination-bank-icon mat-icon { color:#0f8b78; }
    .transfer-detail-item div { display:grid; gap:5px; min-width:0; }
    .transfer-detail-item span { color:#8b9bb1; font-size:11px; }
    .transfer-detail-item strong { color:var(--text-primary); font-size:13px; font-weight:700; overflow-wrap:anywhere; }
    .drawer-form .b-grid2 { gap:10px; }
    .drawer-form .b-fieldset { margin-bottom:12px; }
    .drawer-form .transfer-accounts-grid { display:grid; grid-template-columns:minmax(0,1fr) 34px minmax(0,1fr); align-items:stretch; gap:10px; min-width:0; }
    .drawer-form .transfer-accounts-grid > .b-fieldset { min-width:0; }
    .transfer-accounts-grid .b-fieldset legend { display:inline-flex; align-items:center; gap:7px; }
    .transfer-accounts-grid .b-fieldset legend small { color:var(--text-muted); font-size:10px; font-weight:500; }
    .transfer-bank-marker { display:grid; place-items:center; width:32px; height:32px; margin:0 auto 8px; border-radius:10px; }
    .transfer-bank-marker mat-icon { width:19px; height:19px; font-size:19px; }
    .origin-bank-icon { color:#2563a6; background:#edf5ff; }
    .destination-bank-icon { color:#0f8b78; background:#e8f7f3; }
    .transfer-flow-arrow { position:relative; z-index:1; display:grid; place-items:center; align-self:center; width:32px; height:32px; border:1px solid #f3d3b8; border-radius:50%; color:#c96726; background:#fff7f0; }
    .transfer-flow-arrow mat-icon { width:18px; height:18px; font-size:18px; }
    .drawer-form .b-form-actions { margin-top:18px; }
    @media(max-width:800px) { .transfer-row { grid-template-columns:40px minmax(0,1fr) auto 22px; gap:10px; } .transfer-route { grid-column:2/4; grid-row:2; } .transfer-amount { grid-column:3; grid-row:1; } .transfer-chevron { grid-column:4; grid-row:1; } }
    @media(max-width:560px) { .transfer-page-head { align-items:flex-start; flex-wrap:wrap; } .transfer-list-head { align-items:flex-start; flex-direction:column; } .transfer-list-actions { width:100%; } .transfer-list-actions select { flex:1; } .transfer-list-actions mat-form-field { flex:1; width:auto; } .transfer-filters { grid-template-columns:1fr 1fr; padding:10px; } .transfer-filters mat-form-field:first-child { grid-column:1/-1; } .transfer-drawer { top:56px; width:100vw; } .drawer-head,.drawer-body { padding-left:16px; padding-right:16px; } .drawer-footer { padding-left:16px; padding-right:16px; } .drawer-form .b-grid2 { grid-template-columns:1fr; } .drawer-form .transfer-accounts-grid { grid-template-columns:1fr; gap:8px; } .transfer-flow-arrow { justify-self:center; transform:rotate(90deg); } .transfer-detail-route { grid-template-columns:minmax(0,1fr); gap:8px; } .transfer-route-arrow { justify-self:center; transform:rotate(90deg); } .transfer-route-card { min-height:0; } }
  `],
})
export class TraspasosComponent implements OnInit {
  store = inject(BancosStore);
  private banking = inject(BankingService);
  private snack = inject(SnackSwal);
  private confirm = inject(ConfirmService);

  sub: Sub = 'lista';
  drawerMode: 'new' | 'detail' | null = null;
  traspasoSeleccionado: Traspaso | null = null;
  cargandoTraspasos = false;
  cargandoPendientes = false;
  guardando = false;
  procesando = 0;
  subiendo = 0;
  errorTraspaso = '';

  pendientes: Traspaso[] = [];
  traspasos: Traspaso[] = [];
  cuentasTraspaso: CuentaBanco[] = [];
  cargandoCuentasTraspaso = false;
  filtroEstado = 'TODO';
  filtroTexto = '';
  filtroDesde = '';
  filtroHasta = '';
  documentosRecepcion: { [id: number]: string } = {};
  modoRecepcion = false;
  comprobante: File | null = null;

  traspaso = {
    id_agencia_origen: 0,
    id_agencia_destino: 0,
    monto: 0, documento: '', observaciones: '',
  };

  /** Cuenta elegida en cada buscador (id numérico estable). */
  cuentaOrigenSelId = 0;
  cuentaDestinoSelId = 0;
  private cuentaIds = new Map<string, number>();

  ngOnInit(): void {
    this.inicializarRangoMes();
    this.store.cargarCatalogos();
    this.store.refrescarCuentas();
    this.cargarCuentasTraspaso();
    this.loadPendientes();
    this.loadTraspasos();
    if (!this.traspaso.id_agencia_origen) this.traspaso.id_agencia_origen = this.store.miAgencia();
  }

  private inicializarRangoMes(): void {
    const hoy = new Date();
    const iso = (fecha: Date) => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
    this.filtroDesde = iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    this.filtroHasta = iso(hoy);
  }

  setSub(s: Sub): void {
    this.sub = s;
    if (s === 'recibir') this.loadPendientes();
    if (s === 'lista') this.loadTraspasos();
  }

  abrirNuevo(): void {
    this.errorTraspaso = '';
    if (!this.traspaso.id_agencia_origen) this.traspaso.id_agencia_origen = this.store.miAgencia();
    this.traspasoSeleccionado = null;
    this.drawerMode = 'new';
  }

  verDetalle(t: Traspaso): void { this.traspasoSeleccionado = t; this.modoRecepcion = false; this.drawerMode = 'detail'; }
  iniciarRecepcion(): void { this.modoRecepcion = true; }
  cancelarRecepcion(): void { this.modoRecepcion = false; }
  cerrarDrawer(): void { this.drawerMode = null; this.traspasoSeleccionado = null; this.modoRecepcion = false; this.errorTraspaso = ''; }

  get listaVisible(): Traspaso[] {
    const query = this.filtroTexto.trim().toLocaleLowerCase();
    const source = this.sub === 'recibir' ? this.pendientes : this.traspasos;
    return source.filter(t => {
      const fecha = t.fecha?.slice(0, 10) || '';
      return (!query || [t.id, t.documento_origen, t.documento_destino, t.agencia_origen, t.agencia_destino,
        t.agencia_origen_abr, t.agencia_destino_abr, t.entidad_origen, t.entidad_destino,
        t.num_cuenta_origen, t.num_cuenta_destino, t.moneda, t.estado_label, t.usuario_origen, t.usuario_destino]
        .some(value => String(value ?? '').toLocaleLowerCase().includes(query)))
        && (!this.filtroDesde || fecha >= this.filtroDesde)
        && (!this.filtroHasta || fecha <= this.filtroHasta);
    });
  }
  get cargandoLista(): boolean { return this.sub === 'recibir' ? this.cargandoPendientes : this.cargandoTraspasos; }
  get esRecepcionPendiente(): boolean { return !!this.traspasoSeleccionado && this.traspasoSeleccionado.estado === 'P' && this.traspasoSeleccionado.id_agencia_destino === this.store.miAgencia(); }
  rolAgencia(t: Traspaso): 'origen' | 'destino' { return Number(t.id_agencia_origen) === Number(this.store.miAgencia()) ? 'origen' : 'destino'; }

  key(c: CuentaBanco): string { return BancosStore.keyCuenta(c); }

  /** Id numérico estable por cuenta, para el buscador (compara por número). */
  private cuentaId(c: CuentaBanco): number {
    const k = this.key(c);
    if (!this.cuentaIds.has(k)) this.cuentaIds.set(k, this.cuentaIds.size + 1);
    return this.cuentaIds.get(k)!;
  }

  get cuentasOrigen(): CuentaBanco[] { return this.store.cuentas().filter(c => c.id_agencia === this.traspaso.id_agencia_origen); }

  private cargarCuentasTraspaso(): void {
    this.cargandoCuentasTraspaso = true;
    this.banking.cuentas(true).subscribe({
      next: r => { this.cuentasTraspaso = r.cuentas; this.cargandoCuentasTraspaso = false; },
      error: e => { this.cargandoCuentasTraspaso = false; this.snack.open(e.message || 'No se pudieron cargar las cuentas de destino.', 'OK', { duration: 5000 }); },
    });
  }

  get cuentasDestino(): CuentaBanco[] {
    if (!this.traspaso.id_agencia_destino) return [];
    const base = this.cuentasTraspaso.filter(c => c.id_agencia === this.traspaso.id_agencia_destino);
    // Solo la misma moneda que el origen: el traspaso viaja en una sola moneda.
    const o = this.cuentaOrigen;
    return o ? base.filter(c => c.id_moneda === o.id_moneda) : base;
  }

  get cuentaOrigen(): CuentaBanco | undefined { return this.cuentasOrigen.find(c => this.cuentaId(c) === this.cuentaOrigenSelId); }
  get cuentaDestino(): CuentaBanco | undefined { return this.cuentasDestino.find(c => this.cuentaId(c) === this.cuentaDestinoSelId); }

  // Opciones memoizadas: referencia estable para no sobre-escribir el texto del buscador.
  private _coSig = ''; private _coOpc: { id: number; label: string }[] = [];
  get cuentasOrigenOpc(): { id: number; label: string }[] {
    const cs = this.cuentasOrigen;
    const sig = cs.map(c => this.key(c)).join('|');
    if (sig !== this._coSig) {
      this._coSig = sig;
      this._coOpc = cs.map(c => ({ id: this.cuentaId(c), label: `${c.entidad} · ${c.num_cuenta} · ${c.moneda} (${c.saldo.toFixed(2)})` }));
    }
    return this._coOpc;
  }
  private _cdSig = ''; private _cdOpc: { id: number; label: string }[] = [];
  get cuentasDestinoOpc(): { id: number; label: string }[] {
    const cs = this.cuentasDestino;
    const sig = cs.map(c => this.key(c)).join('|');
    if (sig !== this._cdSig) {
      this._cdSig = sig;
      this._cdOpc = cs.map(c => ({ id: this.cuentaId(c), label: `${c.entidad} · ${c.num_cuenta} · ${c.moneda}` }));
    }
    return this._cdOpc;
  }
  get montoExcedeSaldo(): boolean { const o = this.cuentaOrigen; return !!o && this.traspaso.monto > o.saldo; }

  get puedeRegistrar(): boolean {
    return !!this.cuentaOrigen && !!this.cuentaDestino
      && this.cuentaOrigen.id_moneda === this.cuentaDestino.id_moneda
      && this.traspaso.monto > 0
      && this.traspaso.documento.trim().length > 0
      && !this.montoExcedeSaldo;
  }

  onAgenciaOrigenChange(): void {
    this.cuentaOrigenSelId = 0;
    if (this.traspaso.id_agencia_destino === this.traspaso.id_agencia_origen) {
      this.traspaso.id_agencia_destino = 0;
      this.cuentaDestinoSelId = 0;
    }
  }
  onAgenciaDestinoChange(): void { this.cuentaDestinoSelId = 0; }
  /** Al cambiar la cuenta de origen cambia la moneda: se reinicia el destino. */
  onCuentaOrigenChange(): void { this.cuentaDestinoSelId = 0; }
  onComprobante(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.comprobante = input.files && input.files[0] ? input.files[0] : null;
  }

  urlComprobante(path: string): string { return this.banking.urlComprobante(path); }

  loadPendientes(): void {
    this.cargandoPendientes = true;
    this.banking.traspasosPendientes().subscribe({
      next: r => { this.pendientes = r.traspasos; this.cargandoPendientes = false; },
      error: e => { this.cargandoPendientes = false; this.snack.open(e.message || 'Error al cargar pendientes', 'OK', { duration: 5000 }); },
    });
  }

  loadTraspasos(): void {
    this.cargandoTraspasos = true;
    this.banking.traspasos({ estado: this.filtroEstado }).subscribe({
      next: r => {
        this.traspasos = r.traspasos;
        if (this.traspasoSeleccionado) this.traspasoSeleccionado = r.traspasos.find(t => t.id === this.traspasoSeleccionado?.id) ?? this.traspasoSeleccionado;
        this.cargandoTraspasos = false;
      },
      error: e => { this.cargandoTraspasos = false; this.snack.open(e.message || 'Error al cargar traspasos', 'OK', { duration: 5000 }); },
    });
  }

  registrar(): void {
    const o = this.cuentaOrigen, d = this.cuentaDestino;
    if (!o || !d) return;
    this.errorTraspaso = '';
    this.guardando = true;
    this.banking.registrarTraspaso({
      uuid: BankingService.uuid(),
      id_agencia_origen: o.id_agencia, id_entidad_origen: o.id_entidad, id_tipo_cuenta_origen: o.id_tipo_cuenta, num_cuenta_origen: o.num_cuenta,
      id_agencia_destino: d.id_agencia, id_entidad_destino: d.id_entidad, id_tipo_cuenta_destino: d.id_tipo_cuenta, num_cuenta_destino: d.num_cuenta,
      id_moneda: o.id_moneda, monto: this.traspaso.monto, documento: this.traspaso.documento.trim(),
      observaciones: this.traspaso.observaciones.trim() || undefined,
    }).subscribe({
      next: r => {
        this.guardando = false;
        this.snack.open(r?.message || 'Traspaso registrado', 'OK', { duration: 5000 });
        const idNuevo = r?.id;
        if (idNuevo && this.comprobante) {
          this.banking.subirComprobante('traspasos', Number(idNuevo), this.comprobante).subscribe({
            next: () => this.snack.open('Comprobante adjuntado', 'OK', { duration: 4000 }),
            error: e => this.snack.open('El traspaso se registró, pero el comprobante no: ' + (e.message || ''), 'OK', { duration: 7000 }),
          });
        }
        this.comprobante = null;
        this.cuentaOrigenSelId = 0; this.cuentaDestinoSelId = 0;
        this.traspaso.monto = 0; this.traspaso.documento = ''; this.traspaso.observaciones = '';
        this.store.refrescarCuentas();
        this.loadTraspasos();
        this.cerrarDrawer();
      },
      error: e => { this.guardando = false; this.errorTraspaso = e.message || 'No se pudo registrar el traspaso'; },
    });
  }

  aceptar(t: Traspaso): void {
    const doc = (this.documentosRecepcion[t.id] || '').trim();
    if (!doc) return;
    this.procesando = t.id;
    this.banking.aceptarTraspaso(t.id, doc).subscribe({
      next: r => { this.procesando = 0; this.snack.open(r?.message || 'Recepción confirmada', 'OK', { duration: 5000 }); this.cerrarDrawer(); this.loadPendientes(); this.loadTraspasos(); this.store.refrescarCuentas(); },
      error: e => { this.procesando = 0; this.snack.open(e.message || 'No se pudo confirmar', 'OK', { duration: 5000 }); },
    });
  }

  async rechazar(t: Traspaso): Promise<void> {
    const motivo = await this.confirm.ask({
      titulo: `Rechazar traspaso #${t.id}`,
      detalle: `Se devolverá ${t.monto} ${t.moneda} a la cuenta de origen.`,
      campo: true, etiqueta: 'Motivo del rechazo', requerido: true, danger: true, confirmLabel: 'Rechazar',
    });
    if (motivo === null) return;
    this.procesando = t.id;
    this.banking.rechazarTraspaso(t.id, motivo).subscribe({
      next: r => { this.procesando = 0; this.snack.open(r?.message || 'Traspaso rechazado', 'OK', { duration: 5000 }); this.cerrarDrawer(); this.loadPendientes(); this.store.refrescarCuentas(); this.loadTraspasos(); },
      error: e => { this.procesando = 0; this.snack.open(e.message || 'No se pudo rechazar', 'OK', { duration: 5000 }); },
    });
  }

  async revertir(t: Traspaso): Promise<void> {
    const motivo = await this.confirm.ask({
      titulo: `Revertir traspaso #${t.id}`,
      detalle: `Se reintegrará ${t.monto} ${t.moneda} a la cuenta de origen. Solo es posible mientras el destino no haya confirmado.`,
      campo: true, etiqueta: 'Motivo de la reversión', requerido: true, danger: true, confirmLabel: 'Revertir',
    });
    if (motivo === null) return;
    this.banking.revertirTraspaso(t.id, motivo).subscribe({
      next: r => { this.snack.open(r?.message || 'Traspaso revertido', 'OK', { duration: 5000 }); this.cerrarDrawer(); this.store.refrescarCuentas(); this.loadTraspasos(); this.loadPendientes(); },
      error: e => this.snack.open(e.message || 'No se pudo revertir', 'OK', { duration: 5000 }),
    });
  }

  subirComprobante(t: Traspaso, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    this.subiendo = t.id;
    this.banking.subirComprobante('traspasos', t.id, file).subscribe({
      next: () => { this.subiendo = 0; this.snack.open('Comprobante adjuntado', 'OK', { duration: 4000 }); this.loadTraspasos(); },
      error: e => { this.subiendo = 0; this.snack.open(e.message || 'No se pudo adjuntar', 'OK', { duration: 5000 }); },
    });
    input.value = '';
  }

  estadoClass(e: string): string { return e === 'A' ? 'ok' : e === 'P' ? 'warn' : e === 'X' ? 'err' : 'info'; }
}
