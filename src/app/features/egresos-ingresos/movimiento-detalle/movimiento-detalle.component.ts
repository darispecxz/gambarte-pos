import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MovimientoCajaInfo } from '../../../core/models';

@Component({
  selector: 'app-movimiento-detalle',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './movimiento-detalle.component.html',
  styleUrl: './movimiento-detalle.component.scss',
})
export class MovimientoDetalleComponent {
  @Input({ required: true }) movimiento!: MovimientoCajaInfo;
  @Output() cerrar = new EventEmitter<void>();

  get titulo(): string {
    if (this.movimiento.tipo_operacion === 'egreso') return this.movimiento.metadata.autorizado ? 'Egreso autorizado' : 'Egreso';
    if (this.movimiento.tipo_operacion === 'ingreso') return this.movimiento.metadata.autorizado ? 'Ingreso autorizado' : 'Ingreso';
    return 'Transacción bancaria';
  }

  get icono(): string {
    if (this.movimiento.tipo_operacion === 'transaccion_bancaria') return 'account_balance';
    return this.movimiento.tipo_operacion === 'egreso' ? 'south_west' : 'north_east';
  }

  get claseIcono(): string {
    if (this.movimiento.tipo_operacion === 'transaccion_bancaria') return 'bank';
    return this.movimiento.tipo_operacion === 'egreso' ? 'expense' : 'income';
  }

  get estado(): string {
    const labels: Record<string, string> = { pendiente: 'Pendiente', aprobado: 'Aprobado', rechazado: 'Rechazado', anulado: 'Anulado' };
    return this.movimiento.estado_egreso ? labels[this.movimiento.estado_egreso] || this.movimiento.estado_egreso : 'Registrado';
  }

  get claseEstado(): string {
    return this.movimiento.estado_egreso ? `est-${this.movimiento.estado_egreso}` : 'est-aprobado';
  }

  categoriaLabel(categoria: string): string {
    const labels: Record<string, string> = {
      gastos_operativos: 'Gastos Operativos', sueldos: 'Sueldos / Salarios', servicios: 'Servicios',
      impuestos: 'Impuestos', alquileres: 'Alquileres', mantenimiento: 'Mantenimiento', compras: 'Compras', otros: 'Otros',
      ventas: 'Ventas', transferencias: 'Transferencias', devoluciones: 'Devoluciones',
    };
    return labels[categoria] || categoria;
  }

  origenIngresoLabel(origen: string): string {
    const labels: Record<string, string> = { efectivo: 'Efectivo', transferencia: 'Transferencia', deposito: 'Depósito', devolucion: 'Devolución', otros: 'Otros' };
    return labels[origen] || origen;
  }

  tipoBancarioLabel(tipo: string): string {
    const labels: Record<string, string> = { deposito: 'Depósito bancario', retiro: 'Retiro bancario', itf: 'Cobro de ITF', intereses: 'Intereses bancarios' };
    return labels[tipo] || tipo;
  }
}
