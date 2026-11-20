import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecargasService, RecargaLinea, RecargaPendiente } from '../../core/recargas.service';

@Component({
  selector: 'app-recargas', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <section class="recargas">
      <div *ngIf="simulated" class="uat-banner" role="status">🧪 MODO UAT — Recargas y saldos simulados. No se conecta con Chile ni realiza movimientos reales.</div>
      <header><div><h1>Recargas pendientes de Chile</h1><p>Procesamiento con líneas de saldo en BOB</p></div>
        <button (click)="cargar()" [disabled]="busy">Actualizar</button></header>
      <p class="error" *ngIf="error" role="alert">{{error}}</p>
      <p class="notice" *ngIf="notice" role="status">{{notice}}</p>
      <p *ngIf="busy">Consultando operaciones…</p>
      <div class="table-wrap"><table><thead><tr><th>POS</th><th>Proveedor</th><th>Número destino</th><th>Monto BOB</th><th>Fecha</th><th></th></tr></thead>
        <tbody><tr *ngFor="let r of pendientes">
          <td>{{r.id_recarga}}</td><td>{{proveedor(r.id_proveedor)}}</td><td>{{r.celular}}</td>
          <td>{{r.monto_bob | number:'1.2-2'}}</td><td>{{r.fec_crea_recarga}}</td>
          <td><button [disabled]="busy || !!selected" (click)="reservar(r)">Procesar</button></td>
        </tr></tbody></table></div>
      <p *ngIf="!busy && !pendientes.length">No hay recargas disponibles.</p>
      <div *ngIf="selected" class="panel">
        <h2>Confirmar recarga #{{selected.id_recarga}}</h2>
        <p>Realiza la recarga manualmente y verifica que se haya completado antes de confirmarla.</p>
        <p><strong>{{proveedor(selected.id_proveedor)}} · {{selected.celular}} · BOB {{selected.monto_bob}}</strong></p>
        <label>Línea utilizada</label>
        <select [(ngModel)]="lineId"><option [ngValue]="0">Seleccione una línea</option>
          <option *ngFor="let l of lineasDisponibles" [ngValue]="l.id_linea">{{l.numero}} — saldo BOB {{l.saldo_bob}}</option>
        </select>
        <label>Referencia / observación</label><input [(ngModel)]="glosa" maxlength="240" placeholder="Comprobante o referencia" />
        <div class="actions"><button [disabled]="busy || !lineId" (click)="confirmar()">Confirmar recarga realizada</button>
          <button class="secondary" [disabled]="busy" (click)="liberar()">Liberar sin procesar</button></div>
        <small>Si hubo un error de red durante la confirmación, consulta el estado antes de volver a operar.</small>
      </div>
    </section>
  `,
  styles: [`
    .recargas {padding:24px;max-width:1200px;margin:auto;color:var(--text-primary,#1f2937)}
    header{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}h1{font-size:24px;margin:0}
    p{color:var(--text-muted,#64748b)}button{background:#136a52;color:white;border:0;border-radius:8px;padding:10px 16px;cursor:pointer}
    button:disabled{opacity:.5;cursor:not-allowed}.secondary{background:#64748b}.table-wrap{overflow-x:auto;background:white;border-radius:12px}
    table{width:100%;border-collapse:collapse}td,th{padding:13px;text-align:left;border-bottom:1px solid #e5e7eb}
    .panel{margin-top:20px;background:white;padding:20px;border:1px solid #e2e8f0;border-radius:12px}
    label{display:block;font-weight:600;margin-top:12px}select,input{width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px}
    .actions{display:flex;gap:10px;margin:18px 0}.error{color:#b91c1c}.notice{color:#047857}
    .uat-banner{padding:12px 16px;background:#fef3c7;border:1px solid #f59e0b;color:#92400e;font-weight:700;border-radius:10px;margin-bottom:16px}
  `],
})
export class RecargasComponent implements OnInit {
  private service = inject(RecargasService);
  pendientes: RecargaPendiente[] = [];
  lineas: RecargaLinea[] = [];
  selected: RecargaPendiente | null = null;
  requestId = '';
  token = '';
  lineId = 0;
  glosa = '';
  busy = false;
  error = '';
  notice = '';
  simulated = false;

  get lineasDisponibles() { return this.lineas.filter(l => l.id_proveedor === this.selected?.id_proveedor); }
  ngOnInit() {
    this.service.modo().subscribe({ next: result => this.simulated = result.simulated });
    this.cargar();
  }
  proveedor(id: number) { return ({ 1: 'ENTEL', 2: 'TIGO', 3: 'VIVA' } as Record<number,string>)[id] || `Proveedor ${id}`; }
  cargar() {
    this.busy = true; this.error = ''; this.notice = '';
    this.service.pendientes().subscribe({
      next: rows => { this.pendientes = rows; this.busy = false; },
      error: e => { this.error = e.error?.message || e.message; this.busy = false; },
    });
    this.service.lineas().subscribe({ next: rows => this.lineas = rows, error: () => this.error = 'No se pudieron consultar las líneas' });
  }
  reservar(r: RecargaPendiente) {
    this.busy = true; this.error = '';
    const id = crypto.randomUUID();
    this.service.reservar(r.id_detalle_recarga, id).subscribe({
      next: result => { this.requestId = id; this.token = result.token; this.selected = r; this.busy = false; },
      error: e => { this.error = e.error?.message || e.message; this.busy = false; },
    });
  }
  confirmar() {
    if (!this.selected || !this.lineId) return;
    this.busy = true;
    this.service.confirmar(this.selected.id_detalle_recarga, this.requestId, this.token, this.lineId, this.glosa).subscribe({
      next: () => { this.selected = null; this.lineId = 0; this.cargar(); this.notice = 'Recarga confirmada correctamente'; },
      error: e => { this.error = e.error?.message || e.message; this.busy = false; },
    });
  }
  liberar() {
    if (!this.selected) return;
    this.busy = true;
    this.service.liberar(this.selected.id_detalle_recarga, this.requestId, this.token).subscribe({
      next: () => { this.selected = null; this.lineId = 0; this.cargar(); },
      error: e => { this.error = e.error?.message || e.message; this.busy = false; },
    });
  }
}
