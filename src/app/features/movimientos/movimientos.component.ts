import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, forkJoin } from 'rxjs';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CajeroService } from '../../core/cajero.service';
import { CajaInfo, CajaDestino, BovedaInfo, DenominacionInput, MovimientoResponse, MovimientoCajaInfo } from '../../core/models';
import { SearchableSelectComponent } from '../../shared/searchable-select.component';
import { DenominationCaptureComponent } from '../../shared/denomination-capture.component';

type Operacion = 'solicitud_fondos' | 'traspaso_boveda' | 'traspaso_cajero' | 'transferencia_boveda' | 'transferencia_caja_agencia';
type VistaEfectivo = 'cajero' | 'boveda';

interface OpConfig {
  key: Operacion;
  label: string;
  icon: string;
  desc: string;
  color: string;
}

@Component({
  selector: 'app-movimientos',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, MatButtonModule, MatIconModule, MatSidenavModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, SearchableSelectComponent, DenominationCaptureComponent],
  templateUrl: './movimientos.component.html',
  styleUrl: './movimientos.component.scss',
})
export class MovimientosComponent implements OnInit, OnDestroy {
  private cajeroService = inject(CajeroService);
  private snack = inject(MatSnackBar);
  private route = inject(ActivatedRoute);

  cajas: CajaInfo[] = [];
  movimientos: MovimientoCajaInfo[] = [];
  movimientoSeleccionado: MovimientoCajaInfo | null = null;
  cajasDestino: CajaDestino[] = [];
  bovedas: BovedaInfo[] = [];
  selectedCajaId = 0;
  vista: VistaEfectivo = 'boveda';
  selectedOp: Operacion | null = null;
  creatingMovement = false;
  loadingMovimientos = false;
  filtroTexto = '';
  filtroTipo = '';
  filtroMoneda = '';
  fechaDesde = this.inicioMes();
  fechaHasta = this.fechaHoy();
  loading = true;
  submitting = false;
  lastResult: MovimientoResponse | null = null;
  cortes: DenominacionInput[] = [];
  totalCortes = 0;

  form = {
    monto: 0,
    concepto: '',
    idCajaDestino: 0,
    idBovedaOrigen: 0,
    idBovedaDestino: 0,
  };

  operaciones: OpConfig[] = [
    { key: 'solicitud_fondos', label: 'Solicitar fondos', desc: 'Recibir efectivo de la bóveda en esta caja.', icon: 'move_to_inbox', color: '#218451' },
    { key: 'transferencia_caja_agencia', label: 'Enviar a bóveda', desc: 'La bóveda de tu agencia se selecciona por defecto; puedes elegir otra agencia.', icon: 'outbox', color: '#c34c42' },
    { key: 'traspaso_cajero', label: 'Traspaso a cajero', desc: 'Transferir efectivo a otra caja abierta.', icon: 'swap_horiz', color: '#4c7fc1' },
  ];

  get cajasAbiertas(): CajaInfo[] {
    return this.cajas.filter(c => c.sesion_hoy?.estado === 'abierta');
  }

  get selectedCaja(): CajaInfo | undefined {
    return this.cajas.find(c => c.id_caja === this.selectedCajaId);
  }

  get monedasDisponibles(): string[] {
    return [...new Set(this.cajas.map(c => c.moneda))].sort();
  }

  get selectedOpConfig(): OpConfig | undefined {
    return this.operaciones.find(o => o.key === this.selectedOp);
  }

  get operacionesVista(): OpConfig[] {
    return this.operaciones.filter(op => this.vista === 'cajero'
      ? op.key === 'traspaso_cajero'
      : op.key !== 'traspaso_cajero');
  }

  get movimientosVista(): MovimientoCajaInfo[] {
    const tipos: Operacion[] = this.vista === 'cajero'
      ? ['traspaso_cajero']
      : ['solicitud_fondos', 'traspaso_boveda', 'transferencia_boveda', 'transferencia_caja_agencia'];
    return this.movimientos.filter(m => tipos.includes(m.tipo_operacion as Operacion));
  }

  get tituloVista(): string { return this.vista === 'cajero' ? 'Traspaso a Cajero' : 'Operaciones de Bóveda'; }
  get descripcionVista(): string {
    return this.vista === 'cajero'
      ? 'Consulta y registra transferencias de efectivo entre cajas abiertas.'
      : 'Solicita efectivo o envía fondos de caja a la bóveda que elijas.';
  }
  get accionNuevaVista(): string { return this.vista === 'cajero' ? 'Nuevo traspaso' : 'Nueva operación'; }

  get tipoEnvioBovedaSeleccionada(): string | null {
    const destino = this.bovedas.find(b => b.id_boveda === this.form.idBovedaDestino);
    if (!destino || !this.selectedCaja) return null;
    return Number(destino.id_agencia) === Number(this.selectedCaja.id_agencia) ? 'Devolución a bóveda' : 'Traspaso entre agencias';
  }

  etiquetaEnvioBoveda(mov: MovimientoCajaInfo): string | null {
    if (mov.tipo_operacion === 'traspaso_boveda') return 'Devolución a bóveda';
    if (mov.tipo_operacion !== 'transferencia_caja_agencia') return null;
    const agenciaOrigen = this.cajas.find(c => c.id_caja === mov.id_caja_contexto)?.id_agencia ?? this.selectedCaja?.id_agencia;
    if (!mov.metadata.id_agencia_destino || !agenciaOrigen) return 'Envío a bóveda';
    return Number(mov.metadata.id_agencia_destino) === Number(agenciaOrigen) ? 'Devolución a bóveda' : 'Traspaso entre agencias';
  }

  esTraspasoEntreAgencias(mov: MovimientoCajaInfo): boolean {
    return this.etiquetaEnvioBoveda(mov) === 'Traspaso entre agencias';
  }

  get panelDerechoAbierto(): boolean { return this.creatingMovement || !!this.selectedOp || !!this.movimientoSeleccionado; }

  get movimientosFiltrados(): MovimientoCajaInfo[] {
    const q = this.filtroTexto.trim().toLocaleLowerCase();
    return this.movimientosVista.filter(m => (!this.filtroTipo || m.tipo_operacion === this.filtroTipo) && (!this.filtroMoneda || m.moneda === this.filtroMoneda) && (!q || [this.movimientoTitulo(m), this.movimientoSubtitulo(m), m.moneda,
      m.metadata.concepto, m.metadata.glosa, m.metadata.cajero_destino, m.metadata.boveda_origen,
      m.metadata.boveda_destino, m.metadata.numero_comprobante, m.uuid, m.num_caja_contexto]
      .some(value => String(value ?? '').toLocaleLowerCase().includes(q))));
  }

  private fechaHoy(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
  }

  private inicioMes(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-01`;
  }

  get puedeEjecutar(): boolean {
    if (!this.selectedOp || !this.selectedCaja || !Number.isFinite(+this.form.monto) || +this.form.monto <= 0) return false;
    if (!this.cortes.length || Math.abs(this.totalCortes - Number(this.form.monto)) >= 0.01) return false;
    if (this.selectedOp === 'transferencia_caja_agencia') return !!this.form.idBovedaDestino;
    if (this.selectedOp === 'traspaso_cajero') return !!this.form.idCajaDestino;
    if (this.selectedOp === 'transferencia_boveda') return !!this.form.idBovedaOrigen && !!this.form.idBovedaDestino && this.form.idBovedaOrigen !== this.form.idBovedaDestino;
    return true;
  }

  get montoEsperadoCortes(): number { return Number(this.form.monto) || 0; }

  /** Origen y destino de la operación, para el diagrama visual del formulario. */
  get flujo(): { origenTipo: 'caja' | 'boveda'; origenNombre: string; destinoTipo: 'caja' | 'boveda'; destinoNombre: string } | null {
    if (!this.selectedOp) return null;
    const caja = this.selectedCaja;
    const cajaLbl = caja ? `Caja ${caja.num_caja} · ${caja.moneda}` : 'Tu caja';
    switch (this.selectedOp) {
      case 'solicitud_fondos':
        return { origenTipo: 'boveda', origenNombre: 'Bóveda de agencia', destinoTipo: 'caja', destinoNombre: cajaLbl };
      case 'transferencia_caja_agencia':
        {
          const destino = this.bovedas.find(b => b.id_boveda === this.form.idBovedaDestino);
          return { origenTipo: 'caja', origenNombre: cajaLbl, destinoTipo: 'boveda', destinoNombre: destino ? `${destino.agencia} · ${destino.moneda}` : 'Elige bóveda destino…' };
        }
      case 'traspaso_cajero': {
        const d = this.cajasDestino.find(c => c.id_caja === this.form.idCajaDestino);
        return { origenTipo: 'caja', origenNombre: cajaLbl, destinoTipo: 'caja', destinoNombre: d ? `Caja ${d.num_caja} · ${d.cajero}` : 'Elige cajero…' };
      }
      case 'transferencia_boveda': {
        const o = this.bovedas.find(b => b.id_boveda === this.form.idBovedaOrigen);
        const d = this.bovedas.find(b => b.id_boveda === this.form.idBovedaDestino);
        return {
          origenTipo: 'boveda', origenNombre: o ? `${o.agencia} · ${o.moneda}` : 'Elige bóveda…',
          destinoTipo: 'boveda', destinoNombre: d ? `${d.agencia} · ${d.moneda}` : 'Elige bóveda…',
        };
      }
    }
    return null;
  }

  // ── Opciones de los buscadores (memoizadas: referencia estable para que el
  //    buscador no sobre-escriba el texto que el cajero está escribiendo) ──────
  private _cajSig = ''; private _cajOpc: { id: number; label: string }[] = [];
  get cajasAbiertasOpc(): { id: number; label: string }[] {
    const cs = this.cajasAbiertas;
    const sig = cs.map(c => `${c.id_caja}:${c.saldo_actual}`).join('|');
    if (sig !== this._cajSig) {
      this._cajSig = sig;
      this._cajOpc = cs.map(c => ({ id: c.id_caja, label: c.moneda }));
    }
    return this._cajOpc;
  }

  private _cdSig = ''; private _cdOpc: { id: number; label: string }[] = [];
  get cajasDestinoOpc(): { id: number; label: string }[] {
    const sig = this.cajasDestino.map(c => c.id_caja).join('|');
    if (sig !== this._cdSig) {
      this._cdSig = sig;
      this._cdOpc = this.cajasDestino.map(c => ({ id: c.id_caja, label: `Caja ${c.num_caja} · ${c.cajero} (${c.moneda})` }));
    }
    return this._cdOpc;
  }

  private _bovSig = ''; private _bovOpc: { id: number; label: string }[] = [];
  get bovedasOpc(): { id: number; label: string }[] {
    const sig = this.bovedas.map(b => `${b.id_boveda}:${b.saldo_actual}`).join('|');
    if (sig !== this._bovSig) {
      this._bovSig = sig;
      this._bovOpc = this.bovedas.map(b => ({ id: b.id_boveda, label: `${b.agencia} · ${b.moneda} (${b.saldo_actual.toFixed(2)})` }));
    }
    return this._bovOpc;
  }

  private _bovdSig = ''; private _bovdOpc: { id: number; label: string }[] = [];
  get bovedasDestinoOpc(): { id: number; label: string }[] {
    const base = this.bovedasOpc;
    const sig = base.map(o => o.id).join('|') + '#' + this.form.idBovedaOrigen + '#' + this.selectedOp + '#' + this.selectedCaja?.id_moneda;
    if (sig !== this._bovdSig) {
      this._bovdSig = sig;
      this._bovdOpc = base.filter(o => o.id !== this.form.idBovedaOrigen && (this.selectedOp !== 'transferencia_caja_agencia' || Number(this.bovedas.find(b => Number(b.id_boveda) === Number(o.id))?.id_moneda) === Number(this.selectedCaja?.id_moneda)));
    }
    return this._bovdOpc;
  }

  private pendingOp: Operacion | null = null;

  ngOnInit(): void {
    combineLatest([this.route.url, this.route.queryParamMap]).subscribe(([routeSegments, queryParams]) => {
      const op = queryParams.get('op') as Operacion | null;
      const grupoRuta = routeSegments.map(segment => segment.path).at(-1);
      const grupoAntiguo = queryParams.get('grupo');
      const nuevaVista: VistaEfectivo = op === 'traspaso_cajero' || (grupoRuta || grupoAntiguo) === 'cajero' ? 'cajero' : 'boveda';
      if (nuevaVista !== this.vista) {
        this.vista = nuevaVista;
        this.selectedOp = null;
        this.movimientoSeleccionado = null;
        this.creatingMovement = false;
        this.filtroTipo = '';
      }
      if (!op && (grupoRuta || grupoAntiguo) && (this.creatingMovement || this.selectedOp || this.movimientoSeleccionado)) {
        this.cancelarRegistro();
      }
      if (op && this.operaciones.some(o => o.key === op)) {
        this.pendingOp = op;
        if (this.selectedCajaId) {
          this.selectOp(op);
          this.pendingOp = null;
        } else {
          this.iniciarRegistro();
        }
      }
    });
    this.loadCajas();
  }

  ngOnDestroy(): void { document.body.classList.remove('bank-drawer-open'); }
  onDrawerOpenedChange(opened: boolean): void { document.body.classList.toggle('bank-drawer-open', opened); }

  loadCajas(): void {
    this.loading = true;
    this.cajeroService.misCajas().subscribe({
      next: (cajas) => {
        this.cajas = cajas;
        this.loading = false;
        if (this.cajasAbiertas.length === 1) this.selectedCajaId = this.cajasAbiertas[0].id_caja;
        this.loadMovimientos();
        if (this.pendingOp && this.selectedCajaId) { this.selectOp(this.pendingOp); this.pendingOp = null; }
      },
      error: () => { this.loading = false; this.snack.open('Error al cargar cajas', 'OK', { duration: 4000 }); },
    });
  }

  onCajaChange(): void {
    const mantenerDrawer = this.creatingMovement || !!this.selectedOp;
    this.selectedOp = null;
    this.creatingMovement = mantenerDrawer;
    this.movimientoSeleccionado = null;
    this.lastResult = null;
    this.resetForm();
    if (this.pendingOp && this.selectedCajaId) { this.selectOp(this.pendingOp); this.pendingOp = null; }
    else if (mantenerDrawer && this.selectedCajaId && this.operacionesVista.length === 1) this.selectOp(this.operacionesVista[0].key);
  }

  loadMovimientos(): void {
    const cajas = this.cajas;
    if (!cajas.length) { this.movimientos = []; this.loadingMovimientos = false; return; }
    this.loadingMovimientos = true;
    forkJoin(cajas.map(caja => this.cajeroService.movimientosCaja(caja.id_caja, this.fechaDesde, this.fechaHasta))).subscribe({
      next: resultados => {
        const porCaja = resultados.flatMap((movimientos, index) => movimientos.map(m => ({
          ...m,
          id_caja_contexto: m.tipo_operacion === 'transferencia_boveda' ? undefined : cajas[index].id_caja,
          num_caja_contexto: m.tipo_operacion === 'transferencia_boveda' ? undefined : cajas[index].num_caja,
        })));
        const unicos = new Map<string, MovimientoCajaInfo>();
        porCaja.forEach(m => {
          const key = m.tipo_operacion === 'transferencia_boveda' ? m.uuid : `${m.uuid}:${m.id_caja_contexto}`;
          if (!unicos.has(key)) unicos.set(key, m);
        });
        this.movimientos = [...unicos.values()].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        if (this.movimientoSeleccionado) {
          this.movimientoSeleccionado = this.movimientos.find(m => m.uuid === this.movimientoSeleccionado!.uuid && m.id_caja_contexto === this.movimientoSeleccionado!.id_caja_contexto) || null;
        }
        this.loadingMovimientos = false;
      },
      error: err => { this.loadingMovimientos = false; this.snack.open(err?.message || 'No se pudieron cargar los movimientos de caja.', 'OK', { duration: 4000 }); },
    });
  }

  iniciarRegistro(): void {
    this.creatingMovement = true;
    this.selectedOp = null;
    this.movimientoSeleccionado = null;
    this.resetForm();
    if (this.selectedCaja && this.operacionesVista.length === 1) this.selectOp(this.operacionesVista[0].key);
  }
  cancelarRegistro(): void { this.creatingMovement = false; this.selectedOp = null; this.movimientoSeleccionado = null; this.resetForm(); }
  cerrarPanel(): void { this.cancelarRegistro(); }
  seleccionarMovimiento(mov: MovimientoCajaInfo): void {
    if (mov.id_caja_contexto) this.selectedCajaId = mov.id_caja_contexto;
    this.movimientoSeleccionado = mov;
    this.creatingMovement = false;
    this.selectedOp = null;
  }
  volverOperaciones(): void { this.selectedOp = null; this.resetForm(); }

  selectOp(op: Operacion): void {
    if (!this.operacionesVista.some(item => item.key === op)) return;
    this.creatingMovement = true;
    this.selectedOp = op;
    this.movimientoSeleccionado = null;
    this.lastResult = null;
    this.resetForm();

    if (op === 'traspaso_cajero' && this.selectedCaja) {
      this.cajeroService.cajasDestino(this.selectedCaja.id_moneda).subscribe({
        next: (cajas) => this.cajasDestino = cajas,
        error: () => this.cajasDestino = [],
      });
    }

    if (op === 'transferencia_caja_agencia' || op === 'transferencia_boveda') {
      this.cajeroService.bovedasDisponibles().subscribe({
        next: (b) => {
          this.bovedas = b;
          if (op === 'transferencia_caja_agencia' && this.selectedCaja && !this.form.idBovedaDestino) {
            const propia = b.find(item => Number(item.id_agencia) === Number(this.selectedCaja!.id_agencia) && Number(item.id_moneda) === Number(this.selectedCaja!.id_moneda));
            if (propia) this.form.idBovedaDestino = propia.id_boveda;
          }
        },
        error: () => this.bovedas = [],
      });
    }
  }

  resetForm(): void {
    this.form = { monto: 0, concepto: '', idCajaDestino: 0, idBovedaOrigen: 0, idBovedaDestino: 0 };
    this.cortes = [];
    this.totalCortes = 0;
  }

  onCortesChange(cortes: DenominacionInput[]): void { this.cortes = cortes; }
  onTotalCortesChange(total: number): void { this.totalCortes = total; }

  ejecutar(): void {
    if (!this.selectedOp || !this.selectedCaja) return;
    if (this.form.monto <= 0) {
      this.snack.open('El monto debe ser mayor a 0', 'OK', { duration: 3000 });
      return;
    }
    this.submitting = true;
    const id = this.selectedCajaId;

    let obs;
    switch (this.selectedOp) {
      case 'solicitud_fondos':
        obs = this.cajeroService.solicitarFondos(id, this.form.monto, this.form.concepto, this.cortes);
        break;
      case 'transferencia_caja_agencia': {
        if (!this.form.idBovedaDestino) { this.snack.open('Seleccione la bóveda destino', 'OK', { duration: 3000 }); this.submitting = false; return; }
        const destino = this.bovedas.find(b => b.id_boveda === this.form.idBovedaDestino);
        if (!destino) { this.snack.open('La bóveda destino ya no está disponible', 'OK', { duration: 3000 }); this.submitting = false; return; }
        obs = this.cajeroService.transferenciaCajaAgencia(id, destino.id_agencia, destino.id_boveda, this.form.monto, this.form.concepto, this.cortes);
        break;
      }
      case 'traspaso_cajero':
        if (!this.form.idCajaDestino) { this.snack.open('Seleccione una caja destino', 'OK', { duration: 3000 }); this.submitting = false; return; }
        obs = this.cajeroService.traspasoCajero(id, this.form.idCajaDestino, this.form.monto, this.form.concepto, this.cortes);
        break;
      case 'transferencia_boveda':
        if (!this.form.idBovedaOrigen || !this.form.idBovedaDestino) { this.snack.open('Seleccione bóvedas origen y destino', 'OK', { duration: 3000 }); this.submitting = false; return; }
        obs = this.cajeroService.transferenciaBoveda(this.form.idBovedaOrigen, this.form.idBovedaDestino, this.form.monto, this.form.concepto, this.cortes);
        break;
    }

    obs!.subscribe({
      next: (result) => {
        const operacionRealizada = this.selectedOp;
        this.lastResult = result;
        this.snack.open('Operación realizada correctamente', 'OK', { duration: 4000 });
        this.submitting = false;
        this.creatingMovement = false;
        this.selectedOp = null;
        this.movimientoSeleccionado = this.movimientoLocal(result, operacionRealizada!);
        this.resetForm();
        this.loadCajas();
      },
      error: (err) => {
        this.submitting = false;
        this.snack.open(err?.message || err?.error?.message || 'Error al procesar', 'OK', { duration: 5000 });
      },
    });
  }

  private movimientoLocal(result: MovimientoResponse, op: Operacion): MovimientoCajaInfo {
    const tipo = op;
    const metadata: MovimientoCajaInfo['metadata'] = { concepto: this.form.concepto };
    if (tipo === 'transferencia_caja_agencia') {
      const destino = this.bovedas.find(b => b.id_boveda === this.form.idBovedaDestino);
      metadata.id_boveda_destino = this.form.idBovedaDestino;
      metadata.id_agencia_destino = destino?.id_agencia;
      metadata.boveda_destino = destino ? `${destino.agencia} · ${destino.moneda}` : undefined;
    }
    if (tipo === 'traspaso_cajero') { metadata.cajero_destino = result.cajero_destino; metadata.num_caja_destino = this.cajasDestino.find(c => c.id_caja === this.form.idCajaDestino)?.num_caja; }
    if (tipo === 'transferencia_boveda') {
      metadata.boveda_origen = this.bovedas.find(b => b.id_boveda === this.form.idBovedaOrigen)?.agencia;
      metadata.boveda_destino = this.bovedas.find(b => b.id_boveda === this.form.idBovedaDestino)?.agencia;
    }
    return {
      id: 0, id_caja_contexto: this.selectedCajaId, num_caja_contexto: this.selectedCaja?.num_caja, uuid: result.uuid, tipo_operacion: tipo, id_moneda: this.selectedCaja?.id_moneda || 0,
      moneda: result.moneda, monto: result.monto, estado: 'A', metadata,
      created_at: result.fecha, estado_egreso: null, origen: null, beneficiario: null,
      categoria: null, comprobante_nombre: null, observaciones_aprobacion: null, impacto_saldo: null,
    };
  }

  movimientoTitulo(mov: MovimientoCajaInfo): string {
    const titles: Record<string, string> = {
      solicitud_fondos: 'Solicitud de fondos', traspaso_boveda: 'Envío a bóveda', transferencia_caja_agencia: 'Envío a bóveda',
      traspaso_cajero: 'Traspaso a cajero', transferencia_boveda: 'Transferencia entre bóvedas',
      egreso: mov.metadata.autorizado ? 'Egreso autorizado' : 'Egreso',
      ingreso: mov.metadata.autorizado ? 'Ingreso autorizado' : 'Ingreso',
      transaccion_bancaria: 'Transacción bancaria',
    };
    return titles[mov.tipo_operacion] || 'Movimiento de caja';
  }

  movimientoSubtitulo(mov: MovimientoCajaInfo): string {
    const concepto = mov.metadata.concepto || mov.metadata.glosa;
    switch (mov.tipo_operacion) {
      case 'solicitud_fondos': return concepto ? `Bóveda → Caja · ${concepto}` : 'Bóveda → Caja';
      case 'traspaso_boveda': return [mov.metadata.boveda_destino || 'Bóveda destino', concepto].filter(Boolean).join(' · ');
      case 'transferencia_caja_agencia': return [mov.metadata.boveda_destino || 'Bóveda destino', concepto].filter(Boolean).join(' · ');
      case 'traspaso_cajero': {
        const contraparte = mov.metadata.es_destino
          ? [mov.metadata.num_caja_origen ? `Caja ${mov.metadata.num_caja_origen}` : 'Caja de origen', mov.metadata.cajero_origen].filter(Boolean).join(' · ')
          : [mov.metadata.num_caja_destino ? `Caja ${mov.metadata.num_caja_destino}` : 'Otra caja', mov.metadata.cajero_destino].filter(Boolean).join(' · ');
        return [contraparte, concepto].filter(Boolean).join(' · ');
      }
      case 'transferencia_boveda': return [mov.metadata.boveda_origen, mov.metadata.boveda_destino].filter(Boolean).join(' → ') || concepto || 'Transferencia entre bóvedas';
      default:
        if (mov.metadata.numero_comprobante) return `Comprobante #${mov.metadata.numero_comprobante}`;
        if (mov.metadata.tipo_transaccion) return this.movimientoTipoBancario(mov.metadata.tipo_transaccion);
        return concepto || 'Movimiento registrado';
    }
  }

  movimientoIcono(mov: MovimientoCajaInfo): string {
    const icons: Record<string, string> = { solicitud_fondos: 'move_to_inbox', traspaso_boveda: 'outbox', transferencia_caja_agencia: 'outbox', traspaso_cajero: 'swap_horiz', transferencia_boveda: 'account_balance' };
    if (icons[mov.tipo_operacion]) return icons[mov.tipo_operacion];
    if (mov.tipo_operacion === 'transaccion_bancaria') return 'account_balance';
    return mov.tipo_operacion === 'egreso' ? 'south_west' : 'north_east';
  }

  movimientoClase(mov: MovimientoCajaInfo): string {
    if (mov.tipo_operacion === 'solicitud_fondos' || mov.tipo_operacion === 'ingreso') return 'cash-in';
    if (mov.tipo_operacion === 'traspaso_boveda' || mov.tipo_operacion === 'transferencia_caja_agencia' || mov.tipo_operacion === 'egreso') return 'cash-out';
    if (mov.tipo_operacion === 'traspaso_cajero' || mov.tipo_operacion === 'transferencia_boveda') return 'cash-transfer';
    return 'cash-transfer';
  }

  movimientoImpacto(mov: MovimientoCajaInfo): number {
    if (mov.tipo_operacion === 'solicitud_fondos' || mov.tipo_operacion === 'ingreso') return mov.monto;
    if (mov.tipo_operacion === 'traspaso_boveda' || mov.tipo_operacion === 'transferencia_caja_agencia' || mov.tipo_operacion === 'egreso') return -mov.monto;
    if (mov.tipo_operacion === 'traspaso_cajero') return mov.metadata.es_destino ? mov.monto : -mov.monto;
    if (mov.tipo_operacion === 'transferencia_boveda') return 0;
    if (mov.impacto_saldo !== null) return mov.impacto_saldo;
    return mov.metadata.tipo_transaccion === 'retiro' || mov.metadata.tipo_transaccion === 'itf' ? -mov.monto : mov.monto;
  }

  movimientoEstado(mov: MovimientoCajaInfo): string {
    const labels: Record<string, string> = { pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado', anulado: 'Anulado' };
    return mov.estado_egreso ? labels[mov.estado_egreso] || mov.estado_egreso : 'Registrado';
  }

  movimientoEstadoClase(mov: MovimientoCajaInfo): string {
    return mov.estado_egreso ? `est-${mov.estado_egreso}` : 'est-aprobado';
  }

  esTransferenciaInterna(mov: MovimientoCajaInfo): boolean {
    return ['solicitud_fondos', 'traspaso_boveda', 'transferencia_caja_agencia', 'traspaso_cajero', 'transferencia_boveda'].includes(mov.tipo_operacion);
  }

  movimientoOrigen(mov: MovimientoCajaInfo): string {
    if (mov.tipo_operacion === 'solicitud_fondos') return mov.metadata.boveda_origen || `Bóveda de agencia · ${mov.moneda}`;
    if (mov.tipo_operacion === 'transferencia_boveda') return mov.metadata.boveda_origen || 'Bóveda origen';
    if (mov.tipo_operacion === 'traspaso_cajero' && mov.metadata.es_destino) {
      const box = mov.metadata.num_caja_origen ? `Caja ${mov.metadata.num_caja_origen}` : 'Caja de origen';
      return mov.metadata.cajero_origen ? `${box} · ${mov.metadata.cajero_origen}` : box;
    }
    return this.selectedCaja ? `Caja ${this.selectedCaja.num_caja} · ${this.selectedCaja.moneda}` : 'Caja origen';
  }

  movimientoDestino(mov: MovimientoCajaInfo): string {
    if (mov.tipo_operacion === 'solicitud_fondos') return this.selectedCaja ? `Caja ${this.selectedCaja.num_caja} · ${this.selectedCaja.moneda}` : 'Caja receptora';
    if (mov.tipo_operacion === 'transferencia_boveda') return mov.metadata.boveda_destino || 'Bóveda destino';
    if (mov.tipo_operacion === 'transferencia_caja_agencia') return mov.metadata.boveda_destino || 'Bóveda destino';
    if (mov.tipo_operacion === 'traspaso_boveda') return mov.metadata.boveda_destino || mov.metadata.boveda_origen || 'Bóveda destino';
    if (mov.tipo_operacion === 'traspaso_cajero') {
      if (mov.metadata.es_destino) return this.selectedCaja ? `Caja ${this.selectedCaja.num_caja} · ${this.selectedCaja.moneda}` : 'Caja destino';
      const box = mov.metadata.num_caja_destino ? `Caja ${mov.metadata.num_caja_destino}` : 'Caja destino';
      return mov.metadata.cajero_destino ? `${box} · ${mov.metadata.cajero_destino}` : box;
    }
    return 'Destino';
  }

  movimientoTipoBancario(tipo: string): string {
    return ({ deposito: 'Depósito bancario', retiro: 'Retiro bancario', itf: 'Cobro de ITF', intereses: 'Intereses bancarios' } as Record<string, string>)[tipo] || tipo;
  }
}
