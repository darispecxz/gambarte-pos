import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CajaInfo, AsientoAutorizado } from '../../../core/models';

@Component({
  selector: 'app-movimiento-formulario',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatButtonModule],
  templateUrl: './movimiento-formulario.component.html',
  styleUrl: './movimiento-formulario.component.scss',
})
export class MovimientoFormularioComponent {
  @Input({ required: true }) operacion!: string;
  @Input() titulo = '';
  @Input() moneda = '';
  @Input({ required: true }) form!: any;
  @Input() attempted = false;
  @Input() submitting = false;
  @Input() puedeEnviar = false;
  @Input() selectedFile: File | null = null;
  @Input() fileError = '';
  @Input() buscandoAsiento = false;
  @Input() asientoEncontrado: AsientoAutorizado | null = null;
  @Input() selectedCaja: CajaInfo | undefined;
  @Input() submitLabel = 'Ejecutar';

  @Output() volver = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();
  @Output() enviar = new EventEmitter<void>();
  @Output() archivoSeleccionado = new EventEmitter<Event>();
  @Output() buscarComprobante = new EventEmitter<'E' | 'I'>();

  get esMovimientoDirecto(): boolean { return this.operacion === 'egreso' || this.operacion === 'ingreso'; }
  get esTransaccionBancaria(): boolean { return this.operacion === 'transaccion_bancaria'; }
  get conceptoInvalido(): boolean { return String(this.form?.concepto || '').trim().length < 3; }
}
