import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ManualesIndiceComponent } from './manuales-indice.component';
import { ManualesImprimirComponent } from './manuales-imprimir.component';
import { ManualLecturaComponent } from './manual-lectura.component';

type ManualBanco = 'cuentas' | 'traspasos' | 'depositos' | 'movimientos' | 'cheques' | 'conciliacion';

@Component({
  selector: 'app-manuales-bancos',
  standalone: true,
  imports: [RouterLink, ManualesIndiceComponent, ManualesImprimirComponent, ManualLecturaComponent],
  templateUrl: './manuales-bancos.component.html',
  styleUrl: './manuales-bancos.component.scss',
})
export class ManualesBancosComponent {
  private readonly route = inject(ActivatedRoute);
  manual: ManualBanco = this.readManual(this.route.snapshot.queryParamMap.get('tipo'));

  constructor() {
    this.route.queryParamMap.subscribe(params => this.manual = this.readManual(params.get('tipo')));
  }

  get titulo(): string {
    return ({ cuentas: 'Cuentas y banca', traspasos: 'Traspasos bancarios', depositos: 'Depósitos y retiros', movimientos: 'Movimientos bancarios', cheques: 'Cheques', conciliacion: 'Conciliación bancaria' } as const)[this.manual];
  }

  get resumen(): string {
    return ({ cuentas: 'Consulta saldos, realiza arqueos y abre los movimientos de una cuenta.', traspasos: 'Envía fondos a otra agencia y confirma los traspasos recibidos.', depositos: 'Registra depósitos y retiros vinculados a caja y cuenta bancaria.', movimientos: 'Filtra, consulta e imprime el historial bancario.', cheques: 'Administra chequeras, emisión, cobro, envío y recepción de cheques.', conciliacion: 'Compara el extracto PDF con los movimientos registrados en OBEL.' } as const)[this.manual];
  }

  get manualKey(): string { return ({ cuentas: 'cuentas_bancarias', traspasos: 'traspasos_bancarios', depositos: 'depositos_retiros', movimientos: 'movimientos_bancarios', cheques: 'cheques', conciliacion: 'conciliacion' } as const)[this.manual]; }

  private readManual(value: string | null): ManualBanco {
    const validos: ManualBanco[] = ['cuentas', 'traspasos', 'depositos', 'movimientos', 'cheques', 'conciliacion'];
    return validos.includes(value as ManualBanco) ? value as ManualBanco : 'cuentas';
  }
}
