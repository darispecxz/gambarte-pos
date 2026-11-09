import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSidenavModule } from '@angular/material/sidenav';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import { CajeroService } from '../../core/cajero.service';
import { CajaInfo, MovimientoResponse, AsientoAutorizado, MovimientoCajaInfo } from '../../core/models';
import { MovimientoDetalleComponent } from './movimiento-detalle/movimiento-detalle.component';
import { MovimientoFormularioComponent } from './movimiento-formulario/movimiento-formulario.component';

type Operacion = 'egreso' | 'ingreso' | 'egreso_autorizado' | 'ingreso_autorizado' | 'transaccion_bancaria';

interface OpConfig {
  key: Operacion;
  label: string;
  icon: string;
  desc: string;
  color: string;
  group: 'directo' | 'contable' | 'bancario';
}

@Component({
  selector: 'app-egresos-ingresos',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatAutocompleteModule, MatIconModule, MatButtonModule, MatSidenavModule, RouterLink,
    MovimientoDetalleComponent, MovimientoFormularioComponent],
  templateUrl: './egresos-ingresos.component.html',
  styleUrl: './egresos-ingresos.component.scss',
})
export class EgresosIngresosComponent implements OnInit {
  private cajeroService = inject(CajeroService);
  private snack = inject(MatSnackBar);

  cajas: CajaInfo[] = [];
  movimientos: MovimientoCajaInfo[] = [];
  movimientoSeleccionado: MovimientoCajaInfo | null = null;
  selectedCajaId = 0;
  cajaBusqueda = '';
  selectedOp: Operacion | null = null;
  creatingMovement = false;
  loading = true;
  loadingMovimientos = false;
  submitting = false;
  lastResult: MovimientoResponse | null = null;
  selectedFile: File | null = null;
  fileError = '';
  attempted = false;
  asientoEncontrado: AsientoAutorizado | null = null;
  buscandoAsiento = false;

  form: any = {
    monto: 0, concepto: '', origenEgreso: 'caja', beneficiario: '',
    categoriaEgreso: 'otros', origenIngreso: 'efectivo', entregadoPor: '', categoriaIngreso: 'otros',
    numeroAutorizado: 0, tipoBancario: '', referencia: '',
  };

  private categorias: Record<string, string> = {
    gastos_operativos: 'Gastos Operativos', sueldos: 'Sueldos / Salarios',
    servicios: 'Servicios', impuestos: 'Impuestos', alquileres: 'Alquileres',
    mantenimiento: 'Mantenimiento', compras: 'Compras', otros: 'Otros',
    ventas: 'Ventas', transferencias: 'Transferencias', devoluciones: 'Devoluciones',
  };

  operaciones: OpConfig[] = [
    { key: 'egreso', label: 'Registrar egreso', desc: 'Salida de caja que queda pendiente de autorización', color: '#D97732', icon: 'south_west', group: 'directo' },
    { key: 'ingreso', label: 'Registrar ingreso', desc: 'Entrada de dinero sin comprobante contable previo', color: '#168A83', icon: 'north_east', group: 'directo' },
    { key: 'egreso_autorizado', label: 'Completar egreso autorizado', desc: 'Busca el comprobante contable y aplica el débito a caja', color: '#5276A8', icon: 'outbound', group: 'contable' },
    { key: 'ingreso_autorizado', label: 'Completar ingreso autorizado', desc: 'Busca el comprobante contable y aplica el crédito a caja', color: '#5276A8', icon: 'move_to_inbox', group: 'contable' },
    { key: 'transaccion_bancaria', label: 'Transacción bancaria', desc: 'Depósitos, retiros, ITF e intereses', color: '#66758A', icon: 'account_balance', group: 'bancario' },
  ];

  get gruposOperaciones() {
    return [
      { key: 'directo', title: 'Movimientos de caja', description: 'Registra una entrada o salida sin comprobante contable.', items: this.operaciones.filter(op => op.group === 'directo') },
      { key: 'contable', title: 'Con comprobante contable', description: 'Completa movimientos que ya tienen un asiento autorizado.', items: this.operaciones.filter(op => op.group === 'contable') },
      { key: 'bancario', title: 'Operaciones bancarias', description: 'Registra movimientos entre caja y banco.', items: this.operaciones.filter(op => op.group === 'bancario') },
    ];
  }

  get cajasAbiertas(): CajaInfo[] {
    return this.cajas.filter(c => c.sesion_hoy?.estado === 'abierta');
  }

  get cajasFiltradas(): CajaInfo[] {
    const query = this.cajaBusqueda.trim().toLocaleLowerCase();
    if (!query) return this.cajasAbiertas;
    return this.cajasAbiertas.filter(c => `caja ${c.num_caja} ${c.moneda}`.toLocaleLowerCase().includes(query));
  }

  get selectedCaja(): CajaInfo | undefined {
    return this.cajas.find(c => c.id_caja === this.selectedCajaId);
  }

  get monedaBancariaPermitida(): boolean {
    return ['BOB', 'USD'].includes(String(this.selectedCaja?.moneda || '').trim().toUpperCase());
  }

  operacionDisponible(op: OpConfig): boolean {
    return op.key !== 'transaccion_bancaria' || this.monedaBancariaPermitida;
  }

  get selectedOpConfig(): OpConfig | undefined {
    return this.operaciones.find(o => o.key === this.selectedOp);
  }

  get panelDerechoAbierto(): boolean {
    return this.creatingMovement || !!this.selectedOp || !!this.movimientoSeleccionado;
  }

  get puedeEnviar(): boolean {
    if (!this.selectedOp || !this.selectedCaja) return false;
    const montoValido = Number.isFinite(+this.form.monto) && +this.form.monto > 0;
    const conceptoValido = String(this.form.concepto || '').trim().length >= 3;
    switch (this.selectedOp) {
      case 'egreso': return montoValido && conceptoValido && !!this.selectedFile;
      case 'ingreso': return montoValido && conceptoValido && !!this.selectedFile;
      case 'egreso_autorizado':
      case 'ingreso_autorizado': return !!this.asientoEncontrado && Number.isInteger(+this.form.numeroAutorizado) && +this.form.numeroAutorizado === this.asientoEncontrado.numero && this.selectedCaja.id_moneda === this.asientoEncontrado.id_moneda;
      case 'transaccion_bancaria': return !!this.form.tipoBancario && montoValido && conceptoValido && !!this.selectedFile;
      default: return false;
    }
  }

  seleccionarCaja(caja: CajaInfo): void {
    this.selectedCajaId = caja.id_caja;
    this.cajaBusqueda = this.etiquetaCaja(caja);
    this.onCajaChange();
  }

  private etiquetaCaja(caja: CajaInfo): string { return `Caja ${caja.num_caja} · ${caja.moneda}`; }

  get submitLabel(): string {
    if (this.selectedOp === 'egreso') return 'Registrar Egreso';
    if (this.selectedOp === 'egreso_autorizado') return 'Confirmar Egreso';
    if (this.selectedOp === 'ingreso_autorizado') return 'Confirmar Ingreso';
    return 'Ejecutar';
  }

  categoriaLabel(cat: string): string { return this.categorias[cat] || cat; }
  estadoLabel(estado: string): string {
    return ({ pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado', anulado: 'Anulado' } as any)[estado] || estado;
  }

  ngOnInit(): void { this.loadCajas(); }

  loadCajas(): void {
    this.loading = true;
    this.cajeroService.misCajas().subscribe({
      next: (cajas) => {
        this.cajas = cajas;
        this.loading = false;
        if (this.cajasAbiertas.length === 1) {
          this.selectedCajaId = this.cajasAbiertas[0].id_caja;
          this.cajaBusqueda = this.etiquetaCaja(this.cajasAbiertas[0]);
        }
        if (this.selectedCajaId) this.loadMovimientos();
      },
      error: () => { this.loading = false; this.snack.open('Error al cargar cajas', 'OK', { duration: 4000 }); },
    });
  }

  loadMovimientos(): void {
    if (!this.selectedCajaId) { this.movimientos = []; return; }
    this.loadingMovimientos = true;
    this.cajeroService.movimientosCaja(this.selectedCajaId).subscribe({
      next: (movimientos) => { this.movimientos = movimientos; this.loadingMovimientos = false; },
      error: () => { this.movimientos = []; this.loadingMovimientos = false; },
    });
  }

  onCajaChange(): void { this.selectedOp = null; this.creatingMovement = false; this.movimientoSeleccionado = null; this.lastResult = null; this.resetForm(); this.loadMovimientos(); }

  iniciarRegistro(): void { this.lastResult = null; this.movimientoSeleccionado = null; this.creatingMovement = true; this.selectedOp = null; this.resetForm(); }

  cancelarRegistro(): void { this.selectedOp = null; this.creatingMovement = false; this.movimientoSeleccionado = null; this.lastResult = null; this.resetForm(); }

  selectOp(op: Operacion): void {
    if (op === 'transaccion_bancaria' && !this.monedaBancariaPermitida) return;
    this.selectedOp = op; this.movimientoSeleccionado = null; this.creatingMovement = true; this.lastResult = null; this.attempted = false; this.resetForm();
  }

  seleccionarMovimiento(movimiento: MovimientoCajaInfo): void {
    this.movimientoSeleccionado = movimiento;
    this.selectedOp = null;
    this.creatingMovement = false;
    this.lastResult = null;
    this.resetForm();
  }

  cerrarPanel(): void { this.cancelarRegistro(); }

  goBack(): void { this.selectedOp = null; this.creatingMovement = true; this.resetForm(); }

  movimientoTitulo(mov: MovimientoCajaInfo): string {
    if (mov.tipo_operacion === 'egreso') return mov.metadata.autorizado ? 'Egreso autorizado' : 'Egreso';
    if (mov.tipo_operacion === 'ingreso') return mov.metadata.autorizado ? 'Ingreso autorizado' : 'Ingreso';
    return 'Transacción bancaria';
  }

  movimientoSubtitulo(mov: MovimientoCajaInfo): string {
    if (mov.metadata.numero_comprobante) return `Comprobante #${mov.metadata.numero_comprobante}`;
    if (mov.metadata.tipo_transaccion) return this.movimientoTipoBancario(mov.metadata.tipo_transaccion);
    if (mov.origen) return mov.origen === 'caja' ? 'Efectivo de caja' : 'Cuenta bancaria';
    if (mov.metadata.origen_ingreso) return this.origenIngresoLabel(mov.metadata.origen_ingreso);
    return mov.metadata.concepto || mov.metadata.glosa || 'Movimiento registrado';
  }

  origenIngresoLabel(origen: string): string {
    return ({ efectivo: 'Efectivo', transferencia: 'Transferencia', deposito: 'Depósito', devolucion: 'Devolución', otros: 'Otros' } as Record<string, string>)[origen] || origen;
  }

  movimientoTipoBancario(tipo: string): string {
    return ({ deposito: 'Depósito bancario', retiro: 'Retiro bancario', itf: 'Cobro de ITF', intereses: 'Intereses bancarios' } as Record<string, string>)[tipo] || tipo;
  }

  movimientoIcono(mov: MovimientoCajaInfo): string {
    if (mov.tipo_operacion === 'transaccion_bancaria') return 'account_balance';
    if (mov.tipo_operacion === 'egreso') return 'south_west';
    return 'north_east';
  }

  movimientoClase(mov: MovimientoCajaInfo): string {
    return mov.tipo_operacion === 'transaccion_bancaria' ? 'bank' : mov.tipo_operacion === 'egreso' ? 'expense' : 'income';
  }

  movimientoEstado(mov: MovimientoCajaInfo): string {
    return mov.estado_egreso ? this.estadoLabel(mov.estado_egreso) : 'Registrado';
  }

  movimientoEstadoClase(mov: MovimientoCajaInfo): string {
    return mov.estado_egreso ? `est-${mov.estado_egreso}` : 'est-aprobado';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const validExtension = /\.(pdf|jpe?g|png)$/i.test(file.name);
      if (!validExtension) { this.fileError = 'Adjunta un archivo PDF, JPG o PNG.'; input.value = ''; this.selectedFile = null; return; }
      if (file.size > 5 * 1024 * 1024) { this.fileError = 'El archivo no debe superar 5 MB.'; input.value = ''; this.selectedFile = null; return; }
      this.fileError = '';
      this.selectedFile = file;
    }
  }

  buscarAsiento(tipo: 'E' | 'I'): void {
    this.attempted = true;
    if (!Number.isInteger(+this.form.numeroAutorizado) || +this.form.numeroAutorizado <= 0) {
      this.snack.open('Ingresa un número de comprobante válido.', 'OK', { duration: 3000 });
      return;
    }
    this.buscandoAsiento = true;
    this.asientoEncontrado = null;
    this.cajeroService.buscarAsientoAutorizado(tipo, this.form.numeroAutorizado).subscribe({
      next: (asiento) => { this.asientoEncontrado = asiento; this.buscandoAsiento = false; },
      error: (err) => {
        this.buscandoAsiento = false;
        this.snack.open(err?.message || err?.error?.message || 'No se encontró el comprobante', 'OK', { duration: 5000 });
      },
    });
  }

  resetForm(): void {
    this.form = { monto: 0, concepto: '', origenEgreso: 'caja', beneficiario: '', categoriaEgreso: 'otros', origenIngreso: 'efectivo', entregadoPor: '', categoriaIngreso: 'otros', numeroAutorizado: 0, tipoBancario: '', referencia: '' };
    this.selectedFile = null;
    this.fileError = '';
    this.attempted = false;
    this.asientoEncontrado = null;
  }

  ejecutar(): void {
    if (!this.selectedOp || !this.selectedCaja) return;
    this.attempted = true;
    const isAutorizado = this.selectedOp === 'egreso_autorizado' || this.selectedOp === 'ingreso_autorizado';

    if (isAutorizado && !this.asientoEncontrado) { this.snack.open('Busca primero un comprobante contable válido.', 'OK', { duration: 3000 }); return; }
    if (isAutorizado && this.asientoEncontrado!.id_moneda !== this.selectedCaja.id_moneda) {
      this.snack.open(`Selecciona una caja en ${this.asientoEncontrado!.moneda}.`, 'OK', { duration: 4000 }); return;
    }
    if (!isAutorizado && (!Number.isFinite(+this.form.monto) || +this.form.monto <= 0)) { this.snack.open('El monto debe ser mayor a cero.', 'OK', { duration: 3000 }); return; }
    if (this.selectedOp === 'transaccion_bancaria' && !this.form.tipoBancario) { this.snack.open('Selecciona el tipo de transacción.', 'OK', { duration: 3000 }); return; }
    if (['egreso', 'ingreso'].includes(this.selectedOp) && (String(this.form.concepto || '').trim().length < 3)) {
      this.snack.open('Describe el motivo con al menos 3 caracteres.', 'OK', { duration: 3000 }); return;
    }
    if (this.selectedOp === 'transaccion_bancaria' && String(this.form.concepto || '').trim().length < 3) {
      this.snack.open('Describe el concepto con al menos 3 caracteres.', 'OK', { duration: 3000 }); return;
    }
    if (['egreso', 'ingreso'].includes(this.selectedOp) && !this.selectedFile) {
      this.snack.open('Adjunta un comprobante para registrar el movimiento.', 'OK', { duration: 3500 }); return;
    }
    if (this.selectedOp === 'transaccion_bancaria' && !this.selectedFile) {
      this.snack.open('Adjunta un comprobante para registrar la transacción bancaria.', 'OK', { duration: 3500 }); return;
    }

    this.submitting = true;
    const id = this.selectedCajaId;
    let obs;

    switch (this.selectedOp) {
      case 'egreso':
        if (!String(this.form.concepto || '').trim()) { this.submitting = false; return; }
        obs = this.cajeroService.egreso(id, this.form.monto, this.form.concepto, this.form.origenEgreso, this.form.beneficiario, this.form.categoriaEgreso);
        break;
      case 'ingreso':
        if (!String(this.form.concepto || '').trim()) { this.submitting = false; return; }
        obs = this.cajeroService.ingreso(id, this.form.monto, this.form.concepto, this.form.origenIngreso, this.form.entregadoPor, this.form.categoriaIngreso);
        break;
      case 'egreso_autorizado': {
        const a = this.asientoEncontrado!;
        obs = this.cajeroService.completarEgresoAutorizado(id, a.numero, a.glosa, a.monto, a.id_moneda);
        break;
      }
      case 'ingreso_autorizado': {
        const a = this.asientoEncontrado!;
        obs = this.cajeroService.completarIngresoAutorizado(id, a.numero, a.glosa, a.monto, a.id_moneda);
        break;
      }
      case 'transaccion_bancaria':
        if (!this.form.tipoBancario) { this.snack.open('Seleccione el tipo de transacción', 'OK', { duration: 3000 }); this.submitting = false; return; }
        obs = this.cajeroService.transaccionBancaria(id, this.form.tipoBancario, this.form.monto, this.form.referencia, this.form.concepto);
        break;
    }

    obs!.subscribe({
      next: (result) => {
        this.lastResult = result;
        if (this.selectedOp === 'egreso' && this.selectedFile && result.id_egreso) {
          this.cajeroService.subirComprobanteEgreso(result.id_egreso, this.selectedFile).subscribe({
            next: () => this.mostrarResultado(result, 'Comprobante adjuntado correctamente.'),
            error: () => this.mostrarResultado(result, 'El movimiento se registró, pero no se pudo subir el comprobante.', 'warning'),
          });
        } else if (this.selectedOp === 'ingreso' && this.selectedFile && result.uuid) {
          this.cajeroService.subirComprobanteIngreso(result.uuid, this.selectedFile).subscribe({
            next: () => this.mostrarResultado(result, 'Comprobante adjuntado correctamente.'),
            error: () => this.mostrarResultado(result, 'El movimiento se registró, pero no se pudo subir el comprobante.', 'warning'),
          });
        } else if (this.selectedOp === 'transaccion_bancaria' && this.selectedFile && result.uuid) {
          this.cajeroService.subirComprobanteTransaccionBancaria(result.uuid, this.selectedFile).subscribe({
            next: () => this.mostrarResultado(result, 'Comprobante adjuntado correctamente.'),
            error: () => this.mostrarResultado(result, 'La transacción se registró, pero no se pudo subir el comprobante.', 'warning'),
          });
        } else {
          this.mostrarResultado(result);
        }
        this.submitting = false;
        this.resetForm();
        this.selectedOp = null;
        this.creatingMovement = false;
        this.movimientoSeleccionado = null;
        this.loadCajas();
      },
      error: (err) => {
        this.submitting = false;
        this.snack.open(err?.message || err?.error?.message || 'Error al procesar', 'OK', { duration: 5000 });
      },
    });
  }

  private mostrarResultado(result: MovimientoResponse, nota?: string, icon?: 'success' | 'warning'): void {
    const pendiente = result.estado === 'pendiente';
    const titulo = pendiente
      ? 'Egreso registrado · Pendiente de aprobación'
      : this.selectedOp === 'ingreso' ? 'Ingreso registrado' : 'Operación realizada';
    const filas = [
      result.monto != null ? this.filaAlerta('Monto', `${this.formatoImporte(result.monto)} ${result.moneda || ''}`) : '',
      result.origen ? this.filaAlerta('Origen', result.origen === 'caja' ? 'Efectivo de caja' : 'Cuenta bancaria') : '',
      result.beneficiario ? this.filaAlerta('Beneficiario', result.beneficiario) : '',
      result.categoria ? this.filaAlerta('Categoría', this.categoriaLabel(result.categoria)) : '',
      result.saldo_anterior != null ? this.filaAlerta('Saldo anterior', this.formatoImporte(result.saldo_anterior)) : '',
      result.saldo_nuevo != null ? this.filaAlerta('Saldo nuevo', this.formatoImporte(result.saldo_nuevo), true) : '',
      result.fecha ? this.filaAlerta('Fecha', result.fecha) : '',
      result.uuid ? this.filaAlerta('UUID', result.uuid) : '',
      nota ? `<div class="ei-alert-note">${this.escapeHtml(nota)}</div>` : '',
    ].filter(Boolean).join('');

    this.creatingMovement = false;
    this.selectedOp = null;
    this.movimientoSeleccionado = null;
    void Swal.fire({
      icon: icon || (pendiente ? 'warning' : 'success'),
      title: titulo,
      html: `<div class="ei-alert-details">${filas}</div>`,
      confirmButtonText: 'Aceptar',
      confirmButtonColor: '#F58634',
      width: 540,
    });
    this.loadMovimientos();
    this.loadCajas();
  }

  private filaAlerta(label: string, value: string, destacado = false): string {
    return `<div class="ei-alert-row"><span>${this.escapeHtml(label)}</span><strong${destacado ? ' class="highlight"' : ''}>${this.escapeHtml(value)}</strong></div>`;
  }

  private formatoImporte(value: number): string {
    return new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
  }
}

