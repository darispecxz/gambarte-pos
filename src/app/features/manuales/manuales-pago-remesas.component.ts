import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ManualesIndiceComponent } from './manuales-indice.component';
import { ManualesImprimirComponent } from './manuales-imprimir.component';
import { ManualLecturaComponent } from './manual-lectura.component';

type GuiaPagoRemesa = 'efectivo' | 'deposito' | 'reporte';

@Component({
  selector: 'app-manuales-pago-remesas',
  standalone: true,
  imports: [RouterLink, ManualesIndiceComponent, ManualesImprimirComponent, ManualLecturaComponent],
  templateUrl: './manuales-pago-remesas.component.html',
  styleUrl: './manuales-pago-remesas.component.scss',
})
export class ManualesPagoRemesasComponent {
  private readonly route = inject(ActivatedRoute);
  guia: GuiaPagoRemesa = 'efectivo';

  constructor() {
    this.route.queryParamMap.subscribe(params => {
      const tipo = params.get('tipo');
      this.guia = tipo === 'deposito' || tipo === 'reporte' ? tipo : 'efectivo';
    });
  }

  get titulo(): string {
    const titles: Record<GuiaPagoRemesa, string> = {
      efectivo: 'Pago en efectivo',
      deposito: 'Pago por depósito',
      reporte: 'Reporte de pagos de remesas',
    };
    return titles[this.guia];
  }

  get descripcion(): string {
    const descriptions: Record<GuiaPagoRemesa, string> = {
      efectivo: 'Verifica la remesa y paga al beneficiario por ventanilla.',
      deposito: 'Registra el depósito en la cuenta operativa y confirma cuando esté acreditado.',
      reporte: 'Filtra pagos de remesas, consulta su detalle y revisa los comprobantes.',
    };
    return descriptions[this.guia];
  }

  get tipoPagoQuery(): string {
    return this.guia === 'deposito' ? 'deposito' : 'efectivo';
  }
  get manualKey(): string { return ({ efectivo: 'pago_remesa_efectivo', deposito: 'pago_remesa_deposito', reporte: 'reporte_pago_remesas' } as const)[this.guia]; }
}
