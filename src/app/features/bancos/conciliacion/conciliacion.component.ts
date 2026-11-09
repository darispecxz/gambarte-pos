import { Component, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';
import {
  BankingService, CuentaBanco, ConciliacionResultado, ConciliacionLinea, TipoAccion,
} from '../../../core/banking.service';
import { BancosStore } from '../bancos.store';
import { BankLogoComponent } from '../shared/bank-logo.component';

/**
 * Conciliación por extractos bancarios.
 *
 * El cajero elige una cuenta, sube el PDF del extracto (Ganadero o Bisa por
 * ahora) y el sistema lo compara contra los movimientos de OBEL. Las líneas que
 * el banco muestra pero OBEL no tiene se pueden registrar desde aquí, indicando
 * tipo de acción, motivo y razón.
 */
@Component({
  selector: 'app-bancos-conciliacion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BankLogoComponent],
  styleUrls: ['../bancos-ui.scss'],
  templateUrl: './conciliacion.component.html',
})
export class ConciliacionComponent implements OnInit {
  store = inject(BancosStore);
  private banking = inject(BankingService);

  /** Cuando se embebe (p. ej. en el cierre de banca) la cuenta viene fija y se
   *  oculta el selector y el encabezado de página. */
  @Input() cuentaFija: CuentaBanco | null = null;
  @Input() embebido = false;

  cuentaKey = '';
  file: File | null = null;
  cargando = false;
  resultado: ConciliacionResultado | null = null;
  tiposAccion: TipoAccion[] = [];
  bancosSoportados: { clave: string; nombre: string }[] = [];
  procesando = -1;

  ngOnInit(): void {
    this.store.cargarCatalogos();
    this.store.refrescarCuentas();
    this.banking.conciliacionCatalogos().subscribe({
      next: r => { this.tiposAccion = r.tipos_accion; this.bancosSoportados = r.bancos; },
      error: () => { /* no bloquea la subida */ },
    });
  }

  key(c: CuentaBanco): string { return BancosStore.keyCuenta(c); }
  get cuentaSel(): CuentaBanco | undefined {
    return this.cuentaFija ?? this.store.cuentas().find(c => this.key(c) === this.cuentaKey);
  }

  get nombresBancos(): string {
    return this.bancosSoportados.map(b => b.nombre).join(' y ') || 'Banco Ganadero y Banco Bisa';
  }

  onFile(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    this.file = input.files && input.files[0] ? input.files[0] : null;
  }

  conciliar(): void {
    const cuenta = this.cuentaSel;
    if (!cuenta) { Swal.fire({ icon: 'warning', title: 'Falta la cuenta', text: 'Seleccione la cuenta bancaria a conciliar.', confirmButtonColor: '#F58634' }); return; }
    if (!this.file) { Swal.fire({ icon: 'warning', title: 'Falta el extracto', text: 'Adjunte el PDF del extracto bancario.', confirmButtonColor: '#F58634' }); return; }

    this.cargando = true;
    this.resultado = null;
    this.banking.conciliarExtracto(cuenta, this.file).subscribe({
      next: r => {
        this.cargando = false;
        this.resultado = r;
        if (r.advertencias?.length) {
          Swal.fire({ icon: 'warning', title: 'Conciliación con advertencias', html: r.advertencias.map(a => `• ${a}`).join('<br>'), confirmButtonColor: '#F58634' });
        }
      },
      error: e => {
        this.cargando = false;
        Swal.fire({ icon: 'error', title: 'No se pudo conciliar', text: e.message || 'Error al procesar el extracto', confirmButtonColor: '#F58634' });
      },
    });
  }

  async registrar(linea: ConciliacionLinea, i: number): Promise<void> {
    const cuenta = this.cuentaSel;
    if (!cuenta) return;

    const monto = linea.monto ?? 0;
    const sugerido = monto >= 0 ? 'DE' : 'SE';
    const opciones = this.tiposAccion
      .map(t => `<option value="${t.codigo}" ${t.codigo === sugerido ? 'selected' : ''}>${t.nombre}</option>`)
      .join('');

    const { value, isConfirmed } = await Swal.fire({
      title: 'Registrar movimiento',
      html: `
        <div style="text-align:left;font-size:13px;margin-bottom:10px;color:#555">
          <div><b>${linea.fecha ?? ''}</b> · ${(linea.descripcion ?? '').replace(/</g, '&lt;')}</div>
          <div>Importe: <b>${monto.toFixed(2)}</b>${linea.referencia ? ' · Ref. ' + linea.referencia : ''}</div>
        </div>
        <select id="swal-tipo" class="swal2-select" style="width:100%">${opciones}</select>
        <input id="swal-motivo" class="swal2-input" placeholder="Motivo (obligatorio)" style="margin-top:8px">
        <input id="swal-razon" class="swal2-input" placeholder="Razón / detalle (opcional)">
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Registrar y conciliar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#F58634',
      preConfirm: () => {
        const tipo = (document.getElementById('swal-tipo') as HTMLSelectElement)?.value || '';
        const motivo = ((document.getElementById('swal-motivo') as HTMLInputElement)?.value || '').trim();
        const razon = ((document.getElementById('swal-razon') as HTMLInputElement)?.value || '').trim();
        if (!motivo) { Swal.showValidationMessage('El motivo es obligatorio'); return false; }
        return { tipo, motivo, razon };
      },
    });

    if (!isConfirmed || !value) return;

    this.procesando = i;
    this.banking.registrarConciliacion({
      id_agencia: cuenta.id_agencia, id_entidad: cuenta.id_entidad, id_tipo_cuenta: cuenta.id_tipo_cuenta,
      num_cuenta: cuenta.num_cuenta, id_moneda: cuenta.id_moneda, codsubcuenta: cuenta.codsubcuenta,
      linea, tipo_accion: value.tipo, motivo: value.motivo, razon: value.razon || undefined,
    }).subscribe({
      next: (res: any) => {
        this.procesando = -1;
        // La línea queda conciliada; se refleja sin recargar todo el extracto.
        linea.estado = 'conciliado';
        if (this.resultado) {
          this.resultado.resumen.no_registrados = Math.max(0, this.resultado.resumen.no_registrados - 1);
          this.resultado.resumen.conciliados++;
        }
        this.store.refrescarCuentas();

        const sinAsiento = res?.contabilidad && res.contabilidad.contabilizado === false;
        if (sinAsiento) {
          Swal.fire({
            icon: 'warning', title: 'Registrado sin asiento',
            text: 'El movimiento bancario se registró, pero el asiento contable quedó pendiente (falta configurar la cuenta de contrapartida de este tipo).',
            confirmButtonColor: '#F58634',
          });
        } else {
          Swal.fire({ icon: 'success', title: 'Registrado', text: 'El movimiento se registró y quedó conciliado con su asiento contable.', confirmButtonColor: '#F58634', timer: 2500, timerProgressBar: true });
        }
      },
      error: e => {
        this.procesando = -1;
        Swal.fire({ icon: 'error', title: 'No se pudo registrar', text: e.message || 'Error al registrar el movimiento', confirmButtonColor: '#F58634' });
      },
    });
  }

  estadoBadge(estado: string): string {
    return estado === 'conciliado' ? 'ok' : estado === 'dudoso' ? 'warn' : 'err';
  }
  estadoLabel(estado: string): string {
    return estado === 'conciliado' ? 'Conciliado' : estado === 'dudoso' ? 'Dudoso' : 'Por registrar';
  }
}
