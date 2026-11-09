import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ManualesIndiceComponent } from './manuales-indice.component';
import { ManualesImprimirComponent } from './manuales-imprimir.component';
import { ManualLecturaComponent } from './manual-lectura.component';

type GuiaCaja = 'egreso' | 'ingreso' | 'egreso_autorizado' | 'ingreso_autorizado' | 'bancaria';

@Component({
  selector: 'app-manuales-egresos-ingresos',
  standalone: true,
  imports: [RouterLink, ManualesIndiceComponent, ManualesImprimirComponent, ManualLecturaComponent],
  templateUrl: './manuales-egresos-ingresos.component.html',
  styleUrl: './manuales-egresos-ingresos.component.scss',
})
export class ManualesEgresosIngresosComponent {
  private readonly route = inject(ActivatedRoute);
  guia: GuiaCaja = 'egreso';
  get manualKey(): string { return ({ egreso: 'egreso_directo', ingreso: 'ingreso_directo', egreso_autorizado: 'egreso_autorizado', ingreso_autorizado: 'ingreso_autorizado', bancaria: 'transaccion_bancaria' } as const)[this.guia]; }

  constructor() {
    this.route.queryParamMap.subscribe(params => {
      const value = params.get('tipo');
      this.guia = value === 'ingreso' || value === 'egreso_autorizado' || value === 'ingreso_autorizado' || value === 'bancaria' ? value : 'egreso';
    });
  }

  get titulo(): string {
    const titles: Record<GuiaCaja, string> = {
      egreso: 'Egreso directo',
      ingreso: 'Ingreso directo',
      egreso_autorizado: 'Egreso autorizado',
      ingreso_autorizado: 'Ingreso autorizado',
      bancaria: 'Transacción bancaria',
    };
    return titles[this.guia];
  }

  get descripcion(): string {
    const descriptions: Record<GuiaCaja, string> = {
      egreso: 'Registra una salida directa de caja y sigue su autorización.',
      ingreso: 'Registra una entrada directa y acredita el saldo de caja.',
      egreso_autorizado: 'Aplica a caja un egreso respaldado por un comprobante contable.',
      ingreso_autorizado: 'Aplica a caja un ingreso respaldado por un comprobante contable.',
      bancaria: 'Registra depósitos, retiros, ITF o intereses desde una caja compatible.',
    };
    return descriptions[this.guia];
  }
}
