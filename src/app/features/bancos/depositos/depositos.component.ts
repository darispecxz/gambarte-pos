import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SnackSwal } from '../shared/notify';
import { BankingService, CuentaBanco, DepositoBanco } from '../../../core/banking.service';
import { CajaInfo } from '../../../core/models';
import { BancosStore } from '../bancos.store';

/** Depósito (caja → banco) o retiro (banco → caja): mueve efectivo y saldo a la vez. */
@Component({
  selector: 'app-bancos-depositos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, MatSidenavModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  styleUrls: ['../bancos-ui.scss', './depositos.component.scss'],
  templateUrl: './depositos.component.html',
})
export class DepositosComponent implements OnInit, OnDestroy {
  store = inject(BancosStore);
  private banking = inject(BankingService);
  private snack = inject(SnackSwal);

  guardando = false;
  subiendo = 0;
  errorDeposito = '';
  depositos: DepositoBanco[] = [];
  filtroTexto = '';
  filtroTipo: 'T' | 'D' | 'R' = 'T';
  filtroDesde = '';
  filtroHasta = '';
  ultimo: DepositoBanco | null = null;
  depositoSeleccionado: DepositoBanco | null = null;
  drawerMode: 'new' | 'detail' | null = null;

  /** Comprobante elegido en el formulario; se adjunta al registrar. */
  comprobante: File | null = null;
  /** Cuenta elegida en el buscador (id numérico estable). */
  cuentaSelId = 0;
  private cuentaIds = new Map<string, number>();

  deposito = { tipo: 'D' as 'D' | 'R', idCaja: 0, monto: 0, referencia: '', glosa: '' };

  ngOnInit(): void {
    this.inicializarRangoMes();
    this.store.cargarCatalogos();
    this.store.refrescarCuentas();
    this.loadDepositos();
  }

  private inicializarRangoMes(): void {
    const hoy = new Date();
    const iso = (fecha: Date) => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
    this.filtroDesde = iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    this.filtroHasta = iso(hoy);
  }

  ngOnDestroy(): void { document.body.classList.remove('bank-drawer-open'); }
  onDrawerOpenedChange(opened: boolean): void { document.body.classList.toggle('bank-drawer-open', opened); }

  key(c: CuentaBanco): string { return BancosStore.keyCuenta(c); }

  /** Id numérico estable por cuenta, para el buscador (que compara por número). */
  private cuentaId(c: CuentaBanco): number {
    const k = this.key(c);
    if (!this.cuentaIds.has(k)) this.cuentaIds.set(k, this.cuentaIds.size + 1);
    return this.cuentaIds.get(k)!;
  }

  get cajaSeleccionada(): CajaInfo | undefined { return this.store.cajasAbiertas().find(c => c.id_caja === this.deposito.idCaja); }

  get cuentasDeposito(): CuentaBanco[] {
    const caja = this.cajaSeleccionada;
    if (!caja) return [];
    return this.store.cuentas().filter(c => c.id_agencia === caja.id_agencia && c.id_moneda === caja.id_moneda);
  }

  // Las opciones se memoizan: el buscador hace `ngOnChanges` cuando cambia la
  // referencia del array, y si devolviéramos uno nuevo en cada ciclo sobre-
  // escribiría el texto que el cajero está escribiendo.
  private _monOpc: { id: number; label: string }[] = [];
  private _monSig = '';
  private _ctaOpc: { id: number; label: string }[] = [];
  private _ctaSig = '';

  /** Opciones del buscador de moneda (una por caja-moneda abierta). */
  get monedaOpciones(): { id: number; label: string }[] {
    const cajas = this.store.cajasAbiertas();
    const sig = cajas.map(c => `${c.id_caja}:${c.saldo_actual}`).join('|');
    if (sig !== this._monSig) {
      this._monSig = sig;
      this._monOpc = cajas.map(c => ({
        id: c.id_caja,
        label: `${c.moneda} · Caja ${c.num_caja} (${c.saldo_actual.toFixed(2)})`,
      }));
    }
    return this._monOpc;
  }

  /** Opciones del buscador de cuenta bancaria (según la moneda elegida). */
  get cuentaOpciones(): { id: number; label: string }[] {
    const cuentas = this.cuentasDeposito;
    const sig = cuentas.map(c => this.key(c)).join('|');
    if (sig !== this._ctaSig) {
      this._ctaSig = sig;
      this._ctaOpc = cuentas.map(c => ({
        id: this.cuentaId(c),
        label: `${c.entidad} · ${c.num_cuenta} · ${c.moneda} (${c.saldo.toFixed(2)})`,
      }));
    }
    return this._ctaOpc;
  }

  get cuentaDeposito(): CuentaBanco | undefined { return this.cuentasDeposito.find(c => this.cuentaId(c) === this.cuentaSelId); }
  get depositosFiltrados(): DepositoBanco[] {
    const query = this.filtroTexto.trim().toLocaleLowerCase();
    return this.depositos.filter(d => {
      const fecha = d.created_at?.slice(0, 10) || '';
      return (this.filtroTipo === 'T' || d.tipo === this.filtroTipo)
        && (!query || [d.entidad, d.num_cuenta, d.num_caja, d.referencia, d.glosa, d.usuario, d.moneda, d.tipo === 'D' ? 'deposito' : 'retiro']
          .some(value => String(value ?? '').toLocaleLowerCase().includes(query)))
        && (!this.filtroDesde || fecha >= this.filtroDesde)
        && (!this.filtroHasta || fecha <= this.filtroHasta);
    });
  }
  get puedeRegistrar(): boolean { return !!this.cajaSeleccionada && !!this.cuentaDeposito && this.deposito.monto > 0; }

  abrirNuevo(): void {
    this.errorDeposito = '';
    this.comprobante = null;
    if (!this.deposito.idCaja && this.store.cajasAbiertas().length === 1) this.deposito.idCaja = this.store.cajasAbiertas()[0].id_caja;
    this.onMonedaChange();
    this.depositoSeleccionado = null;
    this.drawerMode = 'new';
  }
  verDetalle(d: DepositoBanco): void { this.depositoSeleccionado = d; this.drawerMode = 'detail'; }
  cerrarDrawer(): void { this.drawerMode = null; this.depositoSeleccionado = null; this.errorDeposito = ''; }

  onTipoChange(): void { this.cuentaSelId = 0; this.errorDeposito = ''; }
  onMonedaChange(): void { this.cuentaSelId = 0; this.errorDeposito = ''; }
  onComprobante(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.comprobante = input.files && input.files[0] ? input.files[0] : null;
  }
  urlComprobante(path: string): string { return this.banking.urlComprobante(path); }

  loadDepositos(): void {
    this.banking.depositos().subscribe({
      next: r => {
        this.depositos = r.depositos;
        if (this.drawerMode === 'detail' && this.depositoSeleccionado) {
          this.depositoSeleccionado = this.depositos.find(d => d.id === this.depositoSeleccionado!.id) || this.depositoSeleccionado;
        }
      },
      error: e => this.snack.open(e.message || 'Error al cargar movimientos', 'OK', { duration: 5000 }),
    });
  }

  registrar(): void {
    const caja = this.cajaSeleccionada, cuenta = this.cuentaDeposito;
    if (!caja || !cuenta) return;
    this.errorDeposito = '';
    this.guardando = true;
    this.banking.registrarDeposito({
      uuid: BankingService.uuid(), tipo: this.deposito.tipo, id_caja: caja.id_caja, monto: this.deposito.monto,
      id_entidad: cuenta.id_entidad, id_tipo_cuenta: cuenta.id_tipo_cuenta, num_cuenta: cuenta.num_cuenta, id_moneda: cuenta.id_moneda,
      referencia: this.deposito.referencia.trim() || undefined, glosa: this.deposito.glosa.trim() || undefined,
    }).subscribe({
      next: r => {
        this.guardando = false;
        this.snack.open(r?.message || 'Operación registrada', 'OK', { duration: 5000 });
        if (r?.id) {
          this.ultimo = {
            id: r.id, uuid: r.uuid, tipo: this.deposito.tipo, id_agencia: 0, id_caja: caja.id_caja,
            id_entidad: cuenta.id_entidad, id_tipo_cuenta: cuenta.id_tipo_cuenta, num_cuenta: cuenta.num_cuenta,
            id_moneda: cuenta.id_moneda, monto: this.deposito.monto, monto_bob: r.monto_bob ?? null, tipo_cambio: r.tipo_cambio ?? null,
            referencia: this.deposito.referencia || null, glosa: this.deposito.glosa || null, estado: 'A',
            created_at: new Date().toISOString(), moneda: cuenta.moneda, entidad: cuenta.entidad, num_caja: caja.num_caja,
          } as DepositoBanco;

          // Si se adjuntó comprobante en el formulario, se sube al movimiento recién creado.
          if (this.comprobante) {
            this.banking.subirComprobante('depositos', Number(r.id), this.comprobante).subscribe({
              next: () => this.snack.open('Comprobante adjuntado', 'OK', { duration: 4000 }),
              error: e => this.snack.open('La operación se registró, pero el comprobante no: ' + (e.message || ''), 'OK', { duration: 7000 }),
            });
          }
        }
        this.comprobante = null;
        this.cuentaSelId = 0;
        this.deposito.monto = 0; this.deposito.referencia = ''; this.deposito.glosa = '';
        this.depositoSeleccionado = this.ultimo;
        this.drawerMode = this.ultimo ? 'detail' : null;
        this.loadDepositos();
        this.store.refrescarCuentas();
        this.store.refrescarCajas();
      },
      error: e => { this.guardando = false; this.errorDeposito = e.message || 'No se pudo registrar la operación'; },
    });
  }

  subirComprobante(d: DepositoBanco, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    this.subiendo = d.id;
    this.banking.subirComprobante('depositos', d.id, file).subscribe({
      next: () => { this.subiendo = 0; this.snack.open('Comprobante adjuntado', 'OK', { duration: 4000 }); this.loadDepositos(); },
      error: e => { this.subiendo = 0; this.snack.open(e.message || 'No se pudo adjuntar', 'OK', { duration: 5000 }); },
    });
    input.value = '';
  }
}
