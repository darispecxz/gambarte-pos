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
import {
  BankingService, Chequera, Cheque, EnvioCheque, CategoriaCheque, Adjunto,
} from '../../../core/banking.service';
import { BancosStore } from '../bancos.store';
import { ConfirmService } from '../shared/confirm.service';
import { BankLogoComponent } from '../shared/bank-logo.component';

type Sub = 'chequeras' | 'gestion' | 'recepcion';

/** Gestión de cheques: chequeras, emisión/envío, cobro/anulación y recepción. */
@Component({
  selector: 'app-bancos-cheques',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, MatSidenavModule, MatFormFieldModule, MatInputModule, MatSelectModule, BankLogoComponent],
  styleUrls: ['../bancos-ui.scss', './cheques.component.scss'],
  templateUrl: './cheques.component.html',
})
export class ChequesComponent implements OnInit, OnDestroy {
  store = inject(BancosStore);
  private banking = inject(BankingService);
  private snack = inject(SnackSwal);
  private confirm = inject(ConfirmService);

  sub: Sub = 'gestion';
  drawerMode: 'new' | 'cheque' | 'chequera' | 'envio' | null = null;
  chequeSeleccionado: Cheque | null = null;
  chequeraSeleccionada: Chequera | null = null;
  envioSeleccionado: EnvioCheque | null = null;
  modoEnvio = false;
  guardando = false;
  procesando = 0;
  subiendo = '';
  errorCheque = '';

  chequeras: Chequera[] = [];
  chequesDisponibles: Cheque[] = [];
  chequesChequera: Cheque[] = [];
  cargandoMapaChequera = false;
  errorMapaChequera = '';
  mapaEmisionAbierto = false;
  chequesAgencia: Cheque[] = [];
  chequesEmitidos: Cheque[] = [];
  envios: EnvioCheque[] = [];
  filtroChequeTexto = '';
  filtroChequeEstado = 'T';
  filtroChequeraTexto = '';
  filtroDisponibilidad = 'T';
  filtroEnvioTexto = '';
  categorias: CategoriaCheque[] = [];
  adjuntosChq: { [k: string]: { anverso: Adjunto | null; reverso: Adjunto | null } } = {};
  readonly carasCheque: Array<'anverso' | 'reverso'> = ['anverso', 'reverso'];

  emision = { idChequera: 0, idCheque: 0, monto: 0, concepto: '', idCategoria: 0 };
  envio = { idAgenciaDestino: 0, observaciones: '' };
  envioChequeSelId = 0;
  private chequeIds = new Map<string, number>();

  /** Leyenda del ciclo de vida del cheque (para la interfaz). */
  readonly leyendaEstados = [
    { codigo: 'I', label: 'Disponible', clase: '' },
    { codigo: 'A', label: 'Emitido', clase: 'info' },
    { codigo: 'E', label: 'Enviado', clase: 'warn' },
    { codigo: 'T', label: 'Recibido', clase: 'ok' },
    { codigo: 'C', label: 'Cobrado', clase: 'ok' },
    { codigo: 'N', label: 'Anulado', clase: 'err' },
  ];

  ngOnInit(): void {
    this.store.cargarCatalogos();
    this.banking.chequesCatalogos().subscribe({ next: r => this.categorias = r.categorias, error: () => {} });
    this.loadChequeras();
    this.loadChequesAgencia();
    this.loadEnvios();
  }

  ngOnDestroy(): void { document.body.classList.remove('bank-drawer-open'); }
  onDrawerOpenedChange(opened: boolean): void { document.body.classList.toggle('bank-drawer-open', opened); }

  setSub(s: Sub): void {
    this.sub = s;
    this.errorCheque = '';
    this.cerrarDrawer();
    if (s === 'chequeras') this.loadChequeras();
    if (s === 'gestion') this.loadChequesAgencia();
    if (s === 'recepcion') this.loadEnvios();
  }

  abrirEmision(q?: Chequera): void {
    this.errorCheque = '';
    this.chequeSeleccionado = null;
    this.chequeraSeleccionada = null;
    this.envioSeleccionado = null;
    this.modoEnvio = false;
    this.emision = { idChequera: q?.id_chequera || 0, idCheque: 0, monto: 0, concepto: '', idCategoria: 0 };
    this.chequesDisponibles = [];
    this.drawerMode = 'new';
    if (q) this.onChequeraChange();
  }
  verCheque(c: Cheque): void { this.chequeSeleccionado = c; this.chequeraSeleccionada = null; this.envioSeleccionado = null; this.modoEnvio = false; this.drawerMode = 'cheque'; }
  verChequera(q: Chequera): void {
    this.chequeraSeleccionada = q;
    this.chequeSeleccionado = null;
    this.envioSeleccionado = null;
    this.modoEnvio = false;
    this.chequesChequera = [];
    this.cargandoMapaChequera = true;
    this.errorMapaChequera = '';
    this.drawerMode = 'chequera';
    this.banking.cheques(q.id_chequera).subscribe({
      next: r => {
        if (this.chequeraSeleccionada?.id_chequera !== q.id_chequera) return;
        this.chequesChequera = r.cheques;
        this.cargandoMapaChequera = false;
      },
      error: e => {
        if (this.chequeraSeleccionada?.id_chequera === q.id_chequera) {
          this.cargandoMapaChequera = false;
          this.errorMapaChequera = e.message || 'No se pudo cargar el estado de los cheques.';
        }
      },
    });
  }
  verEnvio(e: EnvioCheque): void { this.envioSeleccionado = e; this.chequeSeleccionado = null; this.chequeraSeleccionada = null; this.drawerMode = 'envio'; }
  iniciarEnvio(c: Cheque): void { this.chequeSeleccionado = c; this.envio = { idAgenciaDestino: 0, observaciones: '' }; this.envioChequeSelId = this.chequeId(c); this.modoEnvio = true; this.errorCheque = ''; this.drawerMode = 'cheque'; }
  cancelarEnvio(): void { this.modoEnvio = false; this.errorCheque = ''; }
  cerrarDrawer(): void { this.drawerMode = null; this.chequeSeleccionado = null; this.chequeraSeleccionada = null; this.envioSeleccionado = null; this.modoEnvio = false; this.errorCheque = ''; }

  urlComprobante(path: string): string { return this.banking.urlComprobante(path); }

  loadChequeras(): void {
    this.banking.chequeras().subscribe({
      next: r => this.chequeras = r.chequeras,
      error: e => this.snack.open(e.message || 'Error al cargar chequeras', 'OK', { duration: 5000 }),
    });
  }

  loadChequesAgencia(): void {
    this.banking.chequesAgencia().subscribe({
      next: r => {
        this.chequesAgencia = r.cheques;
        this.chequesEmitidos = r.cheques.filter(c => c.estado === 'A');
        if (this.chequeSeleccionado) this.chequeSeleccionado = r.cheques.find(c => c.id_chequera === this.chequeSeleccionado!.id_chequera && c.id_cheque === this.chequeSeleccionado!.id_cheque) || this.chequeSeleccionado;
        // Los adjuntos vienen ya resueltos en la respuesta (evita el N+1 anterior).
        for (const c of r.cheques) {
          this.adjuntosChq[c.id_chequera + '-' + c.id_cheque] = c.adjuntos ?? { anverso: null, reverso: null };
        }
      },
      error: e => this.snack.open(e.message || 'Error al cargar cheques', 'OK', { duration: 5000 }),
    });
  }

  loadEnvios(): void {
    this.banking.enviosPendientes().subscribe({
      next: r => { this.envios = r.envios; if (this.envioSeleccionado) this.envioSeleccionado = r.envios.find(e => e.id === this.envioSeleccionado!.id) || this.envioSeleccionado; },
      error: e => this.snack.open(e.message || 'Error al cargar envíos', 'OK', { duration: 5000 }),
    });
  }

  loadAdjuntosCheque(c: Cheque): void {
    const k = c.id_chequera + '-' + c.id_cheque;
    this.banking.adjuntosCheque(c.id_chequera, c.id_cheque).subscribe({
      next: r => this.adjuntosChq[k] = r,
      error: () => this.adjuntosChq[k] = { anverso: null, reverso: null },
    });
  }

  adjuntosDe(c: Cheque): { anverso: Adjunto | null; reverso: Adjunto | null } {
    return this.adjuntosChq[c.id_chequera + '-' + c.id_cheque] || { anverso: null, reverso: null };
  }
  adjuntoCheque(c: Cheque, cara: string): Adjunto | null { return cara === 'anverso' ? this.adjuntosDe(c).anverso : this.adjuntosDe(c).reverso; }
  monedaCheque(c: Cheque): string { return this.chequeras.find(q => q.id_chequera === c.id_chequera)?.moneda || ''; }

  get chequesFiltrados(): Cheque[] {
    const q = this.filtroChequeTexto.trim().toLocaleLowerCase();
    return this.chequesAgencia.filter(c => (this.filtroChequeEstado === 'T' || c.estado === this.filtroChequeEstado)
      && (!q || [c.numero, c.id_chequera, c.entidad, c.num_cuenta, c.concepto, c.categoria, c.estado_label]
        .some(value => String(value ?? '').toLocaleLowerCase().includes(q))));
  }
  get chequerasFiltradas(): Chequera[] {
    const q = this.filtroChequeraTexto.trim().toLocaleLowerCase();
    return this.chequeras.filter(item => (this.filtroDisponibilidad === 'T'
      || (this.filtroDisponibilidad === 'D' && item.disponibles > 0)
      || (this.filtroDisponibilidad === 'C' && item.disponibles === 0))
      && (!q || [item.id_chequera, item.entidad, item.num_cuenta, item.moneda, item.numero_ini]
        .some(value => String(value ?? '').toLocaleLowerCase().includes(q))));
  }
  get enviosFiltrados(): EnvioCheque[] {
    const q = this.filtroEnvioTexto.trim().toLocaleLowerCase();
    return this.envios.filter(item => !q || [item.id_cheque, item.entidad, item.num_cuenta, item.moneda,
      item.agencia_origen_abr, item.agencia_origen_desc, item.concepto_obs, item.categoria]
      .some(value => String(value ?? '').toLocaleLowerCase().includes(q)));
  }

  get chequerasConDisponibles(): Chequera[] { return this.chequeras.filter(q => q.disponibles > 0); }
  get chequeraEmisionSeleccionada(): Chequera | undefined { return this.chequeras.find(q => q.id_chequera === this.emision.idChequera); }
  get mapaNumerosChequera(): Array<{ numero: number; cheque?: Cheque; estado: string }> {
    const q = this.chequeraSeleccionada || this.chequeras.find(item => item.id_chequera === this.emision.idChequera);
    if (!q) return [];
    const primero = Number(q.numero_ini);
    if (!Number.isFinite(primero) || q.cantidad <= 0) return [];
    const porNumero = new Map(this.chequesChequera.map(c => [c.numero, c]));
    return Array.from({ length: q.cantidad }, (_, i) => {
      const numero = primero + i;
      const cheque = porNumero.get(numero);
      return { numero, cheque, estado: cheque?.estado ?? 'I' };
    });
  }
  get puedeEmitir(): boolean {
    return this.emision.idChequera > 0 && this.emision.idCheque > 0 && this.emision.monto > 0
      && this.emision.idCategoria > 0 && this.emision.concepto.trim().length > 0;
  }
  get puedeEnviar(): boolean { return this.envio.idAgenciaDestino > 0 && this.envioChequeSelId > 0; }

  /** Id numérico estable por cheque (chequera-cheque), para los buscadores. */
  private chequeId(c: Cheque): number {
    const k = `${c.id_chequera}-${c.id_cheque}`;
    if (!this.chequeIds.has(k)) this.chequeIds.set(k, this.chequeIds.size + 1);
    return this.chequeIds.get(k)!;
  }
  get chequeEnvioSel(): Cheque | undefined { return this.chequesEmitidos.find(c => this.chequeId(c) === this.envioChequeSelId); }

  // Opciones memoizadas (referencia estable para el buscador).
  private _qOpcSig = ''; private _qOpc: { id: number; label: string }[] = [];
  get chequerasOpc(): { id: number; label: string }[] {
    const qs = this.chequerasConDisponibles;
    const sig = qs.map(q => `${q.id_chequera}:${q.disponibles}`).join('|');
    if (sig !== this._qOpcSig) {
      this._qOpcSig = sig;
      this._qOpc = qs.map(q => ({ id: q.id_chequera, label: `${q.entidad} · ${q.num_cuenta} · ${q.moneda} (${q.disponibles} disp.)` }));
    }
    return this._qOpc;
  }
  private _dispSig = ''; private _dispOpc: { id: number; label: string }[] = [];
  get chequesDispOpc(): { id: number; label: string }[] {
    const sig = this.chequesDisponibles.map(c => c.id_cheque).join('|');
    if (sig !== this._dispSig) {
      this._dispSig = sig;
      this._dispOpc = this.chequesDisponibles.map(c => ({ id: c.id_cheque, label: String(c.numero) }));
    }
    return this._dispOpc;
  }
  private _emSig = ''; private _emOpc: { id: number; label: string }[] = [];
  get chequesEmitidosOpc(): { id: number; label: string }[] {
    const sig = this.chequesEmitidos.map(c => `${c.id_chequera}-${c.id_cheque}`).join('|');
    if (sig !== this._emSig) {
      this._emSig = sig;
      this._emOpc = this.chequesEmitidos.map(c => ({ id: this.chequeId(c), label: `#${c.numero} · ${c.entidad} · ${(c.monto ?? 0).toFixed(2)}` }));
    }
    return this._emOpc;
  }

  onChequeraChange(): void {
    this.emision.idCheque = 0;
    this.chequesDisponibles = [];
    this.chequesChequera = [];
    if (!this.emision.idChequera) return;
    const idChequera = this.emision.idChequera;
    this.banking.cheques(idChequera).subscribe({
      next: r => {
        if (this.emision.idChequera !== idChequera) return;
        this.chequesChequera = r.cheques;
        this.chequesDisponibles = r.cheques.filter(c => c.estado === 'I');
      },
      error: e => this.snack.open(e.message || 'Error al cargar cheques', 'OK', { duration: 5000 }),
    });
  }

  abrirMapaEmision(): void {
    if (!this.emision.idChequera) return;
    this.mapaEmisionAbierto = true;
    this.cargandoMapaChequera = true;
    this.errorMapaChequera = '';
    const idChequera = this.emision.idChequera;
    this.banking.cheques(idChequera).subscribe({
      next: r => {
        if (!this.mapaEmisionAbierto || this.emision.idChequera !== idChequera) return;
        this.chequesChequera = r.cheques;
        this.chequesDisponibles = r.cheques.filter(c => c.estado === 'I');
        this.cargandoMapaChequera = false;
      },
      error: e => {
        if (!this.mapaEmisionAbierto || this.emision.idChequera !== idChequera) return;
        this.errorMapaChequera = e.message || 'No se pudo cargar el mapa de cheques.';
        this.cargandoMapaChequera = false;
      },
    });
  }

  seleccionarChequeMapa(cheque: Cheque | undefined, numero: number): void {
    if (cheque && cheque.estado !== 'I') return;
    this.emision.idCheque = cheque?.id_cheque ?? numero;
    this.mapaEmisionAbierto = false;
  }

  emitir(): void {
    this.errorCheque = '';
    this.guardando = true;
    this.banking.emitirCheque({
      uuid: BankingService.uuid(), id_chequera: this.emision.idChequera, id_cheque: this.emision.idCheque,
      monto: this.emision.monto, concepto: this.emision.concepto.trim(), id_categoria: this.emision.idCategoria,
    }).subscribe({
      next: r => {
        this.guardando = false;
        this.snack.open(r?.message || 'Cheque emitido', 'OK', { duration: 5000 });
        this.emision.monto = 0; this.emision.concepto = ''; this.emision.idCheque = 0;
        this.loadChequeras(); this.loadChequesAgencia(); this.onChequeraChange();
        this.cerrarDrawer();
      },
      error: e => { this.guardando = false; this.errorCheque = e.message || 'No se pudo emitir el cheque'; },
    });
  }

  enviar(): void {
    const cheque = this.chequeEnvioSel;
    if (!cheque) return;
    this.errorCheque = '';
    this.guardando = true;
    this.banking.enviarCheque({
      id_chequera: cheque.id_chequera, id_cheque: cheque.id_cheque, id_agencia_destino: this.envio.idAgenciaDestino,
      observaciones: this.envio.observaciones.trim() || undefined,
    }).subscribe({
      next: r => {
        this.guardando = false;
        this.snack.open(r?.message || 'Cheque enviado', 'OK', { duration: 5000 });
        this.envioChequeSelId = 0; this.envio.observaciones = '';
        this.loadChequesAgencia(); this.loadEnvios();
        this.cerrarDrawer();
      },
      error: e => { this.guardando = false; this.errorCheque = e.message || 'No se pudo enviar el cheque'; },
    });
  }

  async cobrar(c: Cheque): Promise<void> {
    const caja = this.store.cajasAbiertas()[0];
    if (!caja) { this.snack.open('Debe tener una caja abierta para cobrar el cheque.', 'OK', { duration: 5000 }); return; }
    const tercero = await this.confirm.ask({
      titulo: `Cobrar cheque #${c.numero}`,
      detalle: `Se debitarán ${c.monto} de la cuenta bancaria y se acreditarán a la caja ${caja.num_caja}.`,
      campo: true, etiqueta: 'Tercera persona que cobra (opcional)', confirmLabel: 'Cobrar',
    });
    if (tercero === null) return;
    this.banking.cobrarCheque({ id_chequera: c.id_chequera, id_cheque: c.id_cheque, id_caja: caja.id_caja, tercero: tercero || undefined }).subscribe({
      next: r => { this.snack.open(r?.message || 'Cheque cobrado', 'OK', { duration: 5000 }); this.cerrarDrawer(); this.loadChequesAgencia(); this.store.refrescarCuentas(); this.store.refrescarCajas(); },
      error: e => this.snack.open(e.message || 'No se pudo cobrar', 'OK', { duration: 5000 }),
    });
  }

  async anular(c: Cheque): Promise<void> {
    const motivo = await this.confirm.ask({
      titulo: `Anular cheque #${c.numero}`, detalle: 'El cheque queda anulado. No se puede anular un cheque ya cobrado.',
      campo: true, etiqueta: 'Motivo de la anulación', requerido: true, danger: true, confirmLabel: 'Anular',
    });
    if (motivo === null) return;
    this.banking.anularCheque({ id_chequera: c.id_chequera, id_cheque: c.id_cheque, motivo }).subscribe({
      next: r => { this.snack.open(r?.message || 'Cheque anulado', 'OK', { duration: 5000 }); this.cerrarDrawer(); this.loadChequesAgencia(); },
      error: e => this.snack.open(e.message || 'No se pudo anular', 'OK', { duration: 5000 }),
    });
  }

  async revertirAnulacion(c: Cheque): Promise<void> {
    const motivo = await this.confirm.ask({
      titulo: `Revertir anulación del cheque #${c.numero}`, detalle: 'El cheque volverá al estado que tenía antes de anularse.',
      campo: true, etiqueta: 'Motivo de la reversión', requerido: true, confirmLabel: 'Revertir',
    });
    if (motivo === null) return;
    this.banking.revertirAnulacion({ id_chequera: c.id_chequera, id_cheque: c.id_cheque, motivo }).subscribe({
      next: r => { this.snack.open(r?.message || 'Anulación revertida', 'OK', { duration: 5000 }); this.cerrarDrawer(); this.loadChequesAgencia(); },
      error: e => this.snack.open(e.message || 'No se pudo revertir', 'OK', { duration: 5000 }),
    });
  }

  recibir(e: EnvioCheque): void {
    this.procesando = e.id;
    this.banking.recibirCheque(e.id).subscribe({
      next: r => { this.procesando = 0; this.snack.open(r?.message || 'Recepción confirmada', 'OK', { duration: 5000 }); this.cerrarDrawer(); this.loadEnvios(); this.loadChequesAgencia(); },
      error: err => { this.procesando = 0; this.snack.open(err.message || 'No se pudo recibir', 'OK', { duration: 5000 }); },
    });
  }

  async rechazarEnvio(e: EnvioCheque): Promise<void> {
    const motivo = await this.confirm.ask({
      titulo: `Rechazar envío del cheque #${e.id_cheque}`, detalle: 'El cheque volverá a estar emitido en la agencia de origen.',
      campo: true, etiqueta: 'Motivo del rechazo', requerido: true, danger: true, confirmLabel: 'Rechazar',
    });
    if (motivo === null) return;
    this.procesando = e.id;
    this.banking.rechazarEnvio(e.id, motivo).subscribe({
      next: r => { this.procesando = 0; this.snack.open(r?.message || 'Envío rechazado', 'OK', { duration: 5000 }); this.cerrarDrawer(); this.loadEnvios(); this.loadChequesAgencia(); },
      error: err => { this.procesando = 0; this.snack.open(err.message || 'No se pudo rechazar', 'OK', { duration: 5000 }); },
    });
  }

  subirImagen(c: Cheque, cara: 'anverso' | 'reverso', ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    this.subiendo = 'cheque-' + c.id_cheque + '-' + cara;
    this.banking.subirImagenCheque(c.id_chequera, c.id_cheque, cara, file).subscribe({
      next: () => { this.subiendo = ''; this.snack.open('Imagen del ' + cara + ' adjuntada', 'OK', { duration: 4000 }); this.loadAdjuntosCheque(c); },
      error: e => { this.subiendo = ''; this.snack.open(e.message || 'No se pudo adjuntar', 'OK', { duration: 5000 }); },
    });
    input.value = '';
  }

  subirComprobanteEnvio(e: EnvioCheque, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;
    this.subiendo = 'envio-' + e.id;
    this.banking.subirComprobante('cheques/envios', e.id, file).subscribe({
      next: () => { this.subiendo = ''; this.snack.open('Comprobante adjuntado', 'OK', { duration: 4000 }); this.loadEnvios(); },
      error: err => { this.subiendo = ''; this.snack.open(err.message || 'No se pudo adjuntar', 'OK', { duration: 5000 }); },
    });
    input.value = '';
  }

  chequeClass(e: string): string {
    switch (e) {
      case 'A': return 'info';
      case 'E': return 'warn';
      case 'T': case 'C': return 'ok';
      case 'N': return 'err';
      default: return '';
    }
  }
}
