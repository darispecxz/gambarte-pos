import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ManualesService, SeguimientoManual } from '../../core/manuales.service';

@Component({
  selector: 'app-seguimiento-manuales',
  standalone: true,
  imports: [DatePipe, FormsModule, MatIconModule],
  template: `
    <main class="tracking-page">
      <header class="page-heading"><span class="heading-icon"><mat-icon>fact_check</mat-icon></span><div><small>EVALUACIÓN · ADMINISTRACIÓN</small><h1>Seguimiento de manuales</h1><p>Consulta qué cajeros confirmaron la lectura de cada guía.</p></div></header>
      <section class="tracking-panel">
        <div class="panel-heading"><div><h2>Lecturas de los cajeros</h2><p>{{ pendientes }} pendientes · {{ leidos }} leídos de {{ rows.length }}</p></div><button type="button" class="refresh" (click)="load()"><mat-icon>refresh</mat-icon>Actualizar</button></div>
        <div class="filters"><label>Manual<select [(ngModel)]="manualKey" (ngModelChange)="load()"><option value="apertura_caja">Apertura de caja</option><option value="cierre_caja">Cierre de caja</option><option value="compra_moneda">Compra de moneda</option><option value="venta_moneda">Venta de moneda</option><option value="reportes_cambio">Reportes de cambio</option><option value="enviar_giro_internacional">Enviar giro internacional</option><option value="reportes_giros">Reportes de giros</option><option value="traspaso_cajero">Traspaso a Cajero</option><option value="operaciones_boveda">Operaciones de Bóveda</option><option value="cuentas_bancarias">Cuentas bancarias</option><option value="traspasos_bancarios">Traspasos bancarios</option><option value="depositos_retiros">Depósitos y retiros</option><option value="movimientos_bancarios">Movimientos bancarios</option><option value="cheques">Cheques</option><option value="conciliacion">Conciliación</option><option value="egreso_directo">Egreso directo</option><option value="ingreso_directo">Ingreso directo</option><option value="egreso_autorizado">Egreso autorizado</option><option value="ingreso_autorizado">Ingreso autorizado</option><option value="transaccion_bancaria">Transacción bancaria</option><option value="pago_remesa_efectivo">Pago de remesas en efectivo</option><option value="pago_remesa_deposito">Pago de remesas por depósito</option><option value="reporte_pago_remesas">Reporte de pagos</option></select></label><label>Agencia<select [(ngModel)]="agencyId" (ngModelChange)="load()"><option value="">Todas las agencias</option>@for (agency of agencies; track agency.id_agencia) {<option [value]="agency.id_agencia">{{ agency.agencia }}</option>}</select></label></div>
        @if (loading) { <div class="state"><mat-icon>hourglass_top</mat-icon>Consultando confirmaciones…</div> }
        @else if (error) { <div class="state error"><mat-icon>error_outline</mat-icon>{{ error }}</div> }
        @else if (!rows.length) { <div class="state"><mat-icon>groups</mat-icon>No se encontraron cajeros para estos filtros.</div> }
        @else {
          <div class="table-wrap"><table><thead><tr><th>Cajero</th><th>Agencia</th><th>Estado</th><th>Fecha de lectura</th></tr></thead><tbody>
            @for (row of rows; track row.cod_usuario + '-' + row.id_agencia) {<tr><td><strong>{{ row.cajero || row.login }}</strong><small>{{ row.login }}</small></td><td>{{ row.agencia }}</td><td><span class="status" [class.done]="!!row.leido_en">{{ row.leido_en ? 'Leído' : 'Pendiente' }}</span></td><td>{{ row.leido_en ? (row.leido_en | date:'dd/MM/yyyy HH:mm') : '—' }}</td></tr>}
          </tbody></table></div>
        }
      </section>
    </main>
  `,
  styles: [`
    :host{display:block}.tracking-page{padding:4px 0 28px}.page-heading{display:flex;align-items:center;gap:14px;margin:0 0 20px}.heading-icon{display:grid;place-items:center;width:48px;height:48px;border-radius:13px;background:#fff0e2;color:#b95d12}.heading-icon mat-icon{width:24px;height:24px;font-size:24px}.page-heading small{color:#b45b13;font-size:10px;font-weight:800;letter-spacing:.07em}.page-heading h1{margin:3px 0;color:#172b49;font-size:22px}.page-heading p,.panel-heading p{margin:0;color:#7789a2;font-size:12px}.tracking-panel{padding:18px;border:1px solid #dfe6ee;border-radius:13px;background:white}.panel-heading{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:16px}.panel-heading h2{margin:0 0 4px;color:#243a58;font-size:15px}.refresh{display:flex;align-items:center;gap:6px;padding:8px 12px;border:1px solid #d9e2ed;border-radius:8px;background:#fff;color:#3a526f;font:inherit;font-size:11px;font-weight:700;cursor:pointer}.refresh mat-icon{font-size:17px;width:17px;height:17px}.filters{display:grid;grid-template-columns:minmax(220px,1.4fr) minmax(180px,1fr);gap:12px;margin-bottom:15px}.filters label{display:grid;gap:6px;color:#657891;font-size:10px;font-weight:700}.filters select{height:40px;padding:0 11px;border:1px solid #d6e0ec;border-radius:8px;background:#fff;color:#263b58;font:inherit;font-size:12px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;text-align:left;font-size:11px}th{padding:11px 12px;background:#f4f7fa;color:#75869d;font-size:9px;letter-spacing:.04em;text-transform:uppercase}td{padding:12px;border-bottom:1px solid #edf1f5;color:#52657d}td strong,td small{display:block}td strong{color:#233955;font-size:11px}td small{margin-top:3px;color:#8a99ad;font-size:10px}.status{display:inline-flex;padding:5px 9px;border-radius:99px;background:#fff4df;color:#9b5a09;font-size:10px;font-weight:700}.status.done{background:#e7f7ee;color:#13794d}.state{display:flex;align-items:center;justify-content:center;gap:9px;min-height:150px;color:#75869d;font-size:12px}.state mat-icon{color:#91a2b7}.state.error{color:#a93228}@media(max-width:700px){.tracking-panel{padding:12px}.filters{grid-template-columns:1fr}.panel-heading{align-items:flex-start}}
  `],
})
export class SeguimientoManualesComponent implements OnInit {
  private readonly service = inject(ManualesService);
  private agencyOptions: Array<{ id_agencia: number; agencia: string }> = [];
  manualKey = 'apertura_caja';
  agencyId = '';
  rows: SeguimientoManual[] = [];
  loading = true;
  error = '';
  get agencies(): Array<{ id_agencia: number; agencia: string }> {
    return this.agencyOptions;
  }
  get leidos(): number { return this.rows.filter(row => !!row.leido_en).length; }
  get pendientes(): number { return this.rows.length - this.leidos; }
  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true; this.error = '';
    this.service.seguimiento(this.manualKey, this.agencyId).subscribe({
      next: rows => {
        this.rows = rows;
        if (!this.agencyOptions.length) {
          const map = new Map<number, string>();
          rows.forEach(row => map.set(row.id_agencia, row.agencia));
          this.agencyOptions = [...map].map(([id_agencia, agencia]) => ({ id_agencia, agencia }));
        }
        this.loading = false;
      },
      error: () => { this.rows = []; this.error = 'No se pudo cargar el seguimiento de lecturas.'; this.loading = false; },
    });
  }
}
