import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { RecargasService, RecargaLinea, RecargaPendiente } from '../../core/recargas.service';

@Component({
  selector: 'app-recargas', standalone: true, imports: [CommonModule, FormsModule],
  template: `
    <section class="recargas">
      <header class="page-header"><div><p class="eyebrow">GESTIÓN DE RECARGAS</p><h1>{{ vistaRealizadas ? 'Recargas realizadas' : 'Pendientes por procesar' }}</h1><p class="subtitle">{{ vistaRealizadas ? 'Consulta las recargas registradas y confirmadas.' : 'Gestiona solicitudes pendientes de pago.' }}</p></div>
        <div class="header-actions"><button *ngIf="vistaRealizadas && simulated" class="new-button" (click)="abrirRegistroDirecto()" [disabled]="busy"><span aria-hidden="true">＋</span>Nueva recarga</button></div></header>
      <p class="error" *ngIf="error" role="alert">{{error}}</p>
      <p class="notice" *ngIf="notice" role="status">{{notice}}</p>
      <div class="summary" *ngIf="pendientes.length || busy">
        <div class="metric"><span class="metric-icon pending" aria-hidden="true">◷</span><div><span>{{ vistaRealizadas ? 'Realizadas' : 'Por procesar' }}</span><strong>{{ pendientes.length }}</strong></div></div>
        <div class="metric"><span class="metric-icon money" aria-hidden="true">Bs</span><div><span>{{ vistaRealizadas ? 'Monto realizado' : 'Monto pendiente' }}</span><strong>BOB {{ montoPendiente | number:'1.2-2' }}</strong></div></div>
        <div class="metric"><span class="metric-icon line" aria-hidden="true">⌁</span><div><span>Líneas disponibles</span><strong>{{ lineas.length }}</strong></div></div>
      </div>
      <div class="table-wrap" [class.loading]="busy"><table><thead><tr><th>POS</th><th>Proveedor</th><th>Número destino</th><th>Monto BOB</th><th>Fecha</th><th><span class="sr-only">Acción</span></th></tr></thead>
        <tbody><tr *ngFor="let r of pendientes">
          <td><span class="pos-id">#{{r.id_recarga}}</span></td><td><span class="provider"><img [src]="logoProveedor(r.id_proveedor)" [alt]="proveedor(r.id_proveedor)" /></span></td><td class="phone">{{r.celular}}</td>
          <td><strong class="amount">BOB {{r.monto_bob | number:'1.2-2'}}</strong></td><td class="date">{{r.fec_crea_recarga}}</td>
          <td class="action-cell"><button *ngIf="!vistaRealizadas" class="process-button" [disabled]="busy || !!selected" (click)="reservar(r)">Procesar <span aria-hidden="true">→</span></button><span *ngIf="vistaRealizadas" class="completed">Confirmada</span></td>
        </tr></tbody></table></div>
      <div class="empty" *ngIf="!busy && !pendientes.length"><span aria-hidden="true">✓</span><div><strong>No hay recargas {{ vistaRealizadas ? 'realizadas' : 'pendientes' }}</strong><p>{{ vistaRealizadas ? 'Las recargas confirmadas aparecerán aquí.' : 'Las nuevas solicitudes aparecerán aquí.' }}</p></div></div>
      <div *ngIf="registroDirecto" class="drawer-layer" (click)="cerrarRegistroDirecto()">
        <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="direct-drawer-title" (click)="$event.stopPropagation()">
          <div class="drawer-header"><div><p class="eyebrow">VENTA EN BOLIVIA · UAT</p><h2 id="direct-drawer-title">Registrar y pagar recarga</h2><p>La solicitud se crea y confirma en un único paso.</p></div><button class="close-button" type="button" aria-label="Cerrar" [disabled]="busy" (click)="cerrarRegistroDirecto()">×</button></div>
          <div class="drawer-body">
            <div class="field"><label for="direct-provider">Proveedor</label><select id="direct-provider" [(ngModel)]="directProviderId" (ngModelChange)="directLineId = 0"><option [ngValue]="0">Seleccione un proveedor</option><option [ngValue]="1">ENTEL</option><option [ngValue]="2">TIGO</option><option [ngValue]="3">VIVA</option></select><div *ngIf="directProviderId" class="selected-provider"><img [src]="logoProveedor(directProviderId)" [alt]="proveedor(directProviderId)" /><span>{{proveedor(directProviderId)}} seleccionado</span></div></div>
            <div class="field"><label for="direct-phone">Número destino</label><input id="direct-phone" [(ngModel)]="directCelular" inputmode="numeric" maxlength="15" placeholder="Ej. 76543210" /></div>
            <div class="field"><label for="direct-amount">Monto de recarga <span>BOB</span></label><input id="direct-amount" [(ngModel)]="directMontoBob" type="number" min="0.01" step="0.01" placeholder="0.00" /></div>
            <div class="field"><label for="direct-line">Línea utilizada</label><select id="direct-line" [(ngModel)]="directLineId" [disabled]="!directProviderId"><option [ngValue]="0">Seleccione una línea de saldo</option><option *ngFor="let l of lineasPorProveedor(directProviderId)" [ngValue]="l.id_linea">{{l.numero}} — saldo BOB {{l.saldo_bob}}</option></select><div *ngIf="lineaDirectaSeleccionada as linea" class="selected-line"><img [src]="logoProveedor(directProviderId)" [alt]="proveedor(directProviderId)" /><span><strong>{{linea.numero}}</strong><small>Línea {{proveedor(directProviderId)}} seleccionada</small></span><b>Saldo BOB {{linea.saldo_bob | number:'1.2-2'}}</b></div></div>
            <div class="field"><label for="direct-glosa">Referencia <span>/ observación (opcional)</span></label><input id="direct-glosa" [(ngModel)]="directGlosa" maxlength="240" placeholder="Número de operación o nota" /></div>
            <div class="field"><label for="direct-comprobante">Comprobante de recarga <span class="required">*</span></label><input class="receipt-input" id="direct-comprobante" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" (change)="seleccionarComprobanteDirecto($event)" [disabled]="busy" /><label class="receipt-dropzone" [class.has-file]="!!directComprobante" for="direct-comprobante"><span class="upload-icon" aria-hidden="true">⇧</span><strong>{{ directComprobante ? 'Comprobante adjuntado' : 'Adjuntar comprobante' }}</strong><span>{{ directComprobante ? directComprobante.name + ' (' + (directComprobante.size / 1024 | number:'1.0-0') + ' KB)' : 'Captura de pantalla, imagen o PDF' }}</span><em>{{ directComprobante ? 'Cambiar archivo' : 'Requerido para confirmar' }}</em></label><small>PDF, JPG o PNG · máximo 2 MB · almacenamiento privado.</small></div>
          </div>
          <div class="drawer-footer"><small><span aria-hidden="true">ⓘ</span> En UAT se simulan el alta, el descuento de saldo y la confirmación.</small><div class="actions"><button [disabled]="busy || !directProviderId || !telefonoValido || !montoDirectoValido || !directLineId || !directComprobante" (click)="registrarYConfirmarDirecto()">Registrar y confirmar</button><button class="secondary" [disabled]="busy" (click)="cerrarRegistroDirecto()">Cancelar</button></div></div>
        </aside>
      </div>
      <div *ngIf="selected" class="drawer-layer" (click)="liberar()">
        <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title" (click)="$event.stopPropagation()">
          <div class="drawer-header"><div><p class="eyebrow">PASO FINAL</p><h2 id="drawer-title">Confirmar recarga</h2><p>Verifica la recarga antes de registrarla como completada.</p></div><button class="close-button" type="button" aria-label="Cerrar y liberar recarga" [disabled]="busy" (click)="liberar()">×</button></div>
          <div class="drawer-body">
            <div class="recarga-detail"><span class="provider"><img [src]="logoProveedor(selected.id_proveedor)" [alt]="proveedor(selected.id_proveedor)" /></span><span>{{selected.celular}}</span><strong>BOB {{selected.monto_bob | number:'1.2-2'}}</strong></div>
            <span class="selected-id">Solicitud #{{selected.id_recarga}}</span>
            <div class="field"><label for="recarga-linea">Línea utilizada</label><select id="recarga-linea" [(ngModel)]="lineId"><option [ngValue]="0">Seleccione una línea de saldo</option><option *ngFor="let l of lineasDisponibles" [ngValue]="l.id_linea">{{l.numero}} — saldo BOB {{l.saldo_bob}}</option></select></div>
            <div class="field"><label for="recarga-glosa">Referencia <span>/ observación (opcional)</span></label><input id="recarga-glosa" [(ngModel)]="glosa" maxlength="240" placeholder="Número de operación o nota" /></div>
            <div class="field"><label for="recarga-comprobante">Comprobante de recarga <span class="required">*</span></label><input class="receipt-input" id="recarga-comprobante" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" (change)="seleccionarComprobante($event)" [disabled]="busy" /><label class="receipt-dropzone" [class.has-file]="!!comprobante" for="recarga-comprobante"><span class="upload-icon" aria-hidden="true">⇧</span><strong>{{ comprobante ? 'Comprobante adjuntado' : 'Adjuntar comprobante' }}</strong><span>{{ comprobante ? comprobante.name + ' (' + (comprobante.size / 1024 | number:'1.0-0') + ' KB)' : 'Captura de pantalla, imagen o PDF' }}</span><em>{{ comprobante ? 'Cambiar archivo' : 'Requerido para confirmar' }}</em></label><small>PDF, JPG o PNG · máximo 2 MB · almacenamiento privado.</small></div>
          </div>
          <div class="drawer-footer"><small><span aria-hidden="true">ⓘ</span> Al cerrar se liberará la recarga para que otro operador pueda procesarla.</small><div class="actions"><button [disabled]="busy || !lineId || !comprobante" (click)="confirmar()">Confirmar recarga realizada</button><button class="secondary" [disabled]="busy" (click)="liberar()">Cancelar</button></div></div>
        </aside>
      </div>
    </section>
  `,
  styles: [`
    .drawer{width:min(600px,100%)!important}.selected-provider,.selected-line{display:flex;align-items:center;gap:10px;margin-top:10px;padding:10px 12px;border:1px solid #b9ddd4;border-radius:9px;background:#f2fbf8}.selected-provider img,.selected-line img{width:36px;height:36px;object-fit:contain}.selected-provider span{font-size:13px;font-weight:700;color:var(--ink)}.selected-line span{display:flex;flex-direction:column;gap:2px}.selected-line strong{font-size:13px;color:var(--ink)}.selected-line small{font-size:11px;color:var(--muted)}.selected-line b{margin-left:auto;color:#08705b;font-size:12px;white-space:nowrap}
    .header-actions{display:flex;gap:10px;align-items:center}.new-button{background:#f1f8f6;color:#0f766e;border:1px solid #b9ddd4}.new-button:not(:disabled):hover{background:#e2f2ed;box-shadow:none}.new-button span{font-size:20px;line-height:12px}
    .completed{display:inline-flex;padding:6px 10px;border-radius:999px;background:#eaf8f2;color:#08705b;font-size:12px;font-weight:800}
    .recargas{--green:#0f766e;--green-dark:#0b5f58;--ink:#17243b;--muted:#71809a;--line:#e7edf4;width:100%;max-width:none;margin:0;padding:10px 0 32px;color:var(--ink)}.page-header{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:24px}.eyebrow{margin:0 0 5px;color:var(--green);font-weight:800;font-size:11px;letter-spacing:.09em}.page-header h1,.drawer h2{font-size:28px;line-height:1.15;letter-spacing:-.03em;margin:0;color:var(--ink)}.subtitle,.drawer-header p{margin:7px 0 0;color:var(--muted)}button{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--green);color:#fff;border:0;border-radius:8px;padding:10px 16px;font:inherit;font-weight:700;cursor:pointer;transition:background .15s ease,transform .15s ease,box-shadow .15s ease}button:not(:disabled):hover{background:var(--green-dark);transform:translateY(-1px);box-shadow:0 5px 12px rgba(15,118,110,.16)}button:disabled{opacity:.5;cursor:not-allowed}.refresh-button{min-width:125px}.refresh-button span{font-size:20px;line-height:12px}.summary{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:18px}.metric{display:flex;align-items:center;gap:12px;padding:15px 17px;border:1px solid var(--line);border-radius:12px;background:#fff;box-shadow:0 2px 5px rgba(15,23,42,.025)}.metric-icon{display:grid;place-items:center;width:36px;height:36px;border-radius:10px;font-weight:800}.metric-icon.pending{background:#eff6ff;color:#2563eb}.metric-icon.money{background:#ecfdf5;color:#07835e;font-size:12px}.metric-icon.line{background:#fff7ed;color:#d26912;font-size:20px}.metric div{display:flex;flex-direction:column;gap:2px}.metric span:not(.metric-icon){font-size:12px;color:var(--muted)}.metric strong{font-size:16px;color:var(--ink)}.table-wrap{overflow-x:auto;background:#fff;border:1px solid var(--line);border-radius:13px;box-shadow:0 4px 13px rgba(15,23,42,.035)}.table-wrap.loading{opacity:.65}table{width:100%;min-width:780px;border-collapse:collapse}th{padding:13px 16px;background:#f8fafc;color:#52627a;font-size:11px;letter-spacing:.045em;text-transform:uppercase;text-align:left;border-bottom:1px solid var(--line)}td{padding:16px;border-bottom:1px solid var(--line);font-size:14px;color:#263550}tbody tr:last-child td{border-bottom:0}tbody tr:hover{background:#f8fcfb}.pos-id,.phone,.date{font-variant-numeric:tabular-nums}.pos-id{color:#465671}.provider{display:inline-flex;align-items:center;justify-content:center;width:68px;height:52px;padding:0}.provider img{display:block;width:52px;height:52px;object-fit:contain}.date{color:#65758e;font-size:13px}.amount{white-space:nowrap;color:#13273d}.action-cell{text-align:right}.process-button{padding:8px 12px;font-size:13px}.process-button span{font-size:16px}.empty{display:flex;align-items:center;gap:13px;justify-content:center;padding:35px;background:#fff;border:1px solid var(--line);border-radius:13px;color:var(--green)}.empty>span{display:grid;place-items:center;width:31px;height:31px;border-radius:50%;background:#eaf8f2;font-weight:800}.empty strong{color:var(--ink)}.empty p{margin:3px 0 0;color:var(--muted);font-size:13px}.drawer-layer{position:fixed;z-index:1000;inset:0;background:rgba(15,23,42,.42);display:flex;justify-content:flex-end;backdrop-filter:blur(2px);animation:drawer-fade .16s ease-out}.drawer{display:flex;flex-direction:column;width:min(510px,100%);height:100%;background:#fff;box-shadow:-14px 0 35px rgba(15,23,42,.2);animation:drawer-slide .2s ease-out}.drawer-header{display:flex;justify-content:space-between;gap:18px;padding:28px 28px 22px;border-bottom:1px solid var(--line)}.drawer h2{font-size:23px}.close-button{flex:none;width:34px;height:34px;padding:0;border-radius:8px;background:#f1f5f9;color:#54647a;font-size:26px;font-weight:400;line-height:1}.close-button:not(:disabled):hover{background:#e6edf3;color:#263550;box-shadow:none}.drawer-body{flex:1;padding:23px 28px;overflow:auto}.recarga-detail{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:12px 14px;background:#f7faf9;border-radius:9px;color:#35455e;font-size:14px}.recarga-detail strong{margin-left:auto;color:#0d594b}.selected-id{display:inline-flex;margin-top:12px;padding:5px 8px;border-radius:6px;background:#f1f5f9;color:#465671;font-weight:800;font-size:12px}.field{margin-top:20px}label{display:block;font-size:13px;font-weight:800;color:#263550;margin-bottom:7px}label span{font-weight:500;color:var(--muted)}select,input{box-sizing:border-box;width:100%;padding:11px 12px;border:1px solid #cbd7e5;border-radius:8px;background:#fff;color:var(--ink);font:inherit;outline:none}select:focus,input:focus{border-color:var(--green);box-shadow:0 0 0 3px rgba(15,118,110,.12)}.receipt-input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.receipt-dropzone{display:flex;align-items:center;flex-direction:column;justify-content:center;gap:5px;min-height:126px;margin:0!important;padding:16px;border:1px dashed #aebccc;border-radius:11px;background:#fbfcfd;color:#52627a;text-align:center;cursor:pointer;transition:border-color .15s ease,background .15s ease,box-shadow .15s ease}.receipt-dropzone:hover,.receipt-dropzone.has-file{border-color:var(--green);background:#f2fbf8;box-shadow:0 0 0 3px rgba(15,118,110,.08)}.receipt-dropzone .upload-icon{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#e8f4f1;color:var(--green);font-size:25px;line-height:1}.receipt-dropzone strong{font-size:14px;color:var(--ink)}.receipt-dropzone>span:not(.upload-icon){font-size:12px;font-weight:500}.receipt-dropzone em{padding:3px 8px;border-radius:99px;background:#e8f1ff;color:#2962ad;font-size:11px;font-style:normal;font-weight:700}.field small,.drawer-footer small{display:flex;gap:6px;color:#6b7a90;font-size:12px;line-height:1.45;margin-top:7px}.required{color:#b91c1c}.drawer-footer{padding:17px 28px 22px;border-top:1px solid var(--line);background:#fbfdfd}.drawer-footer small span{color:#1d7a6d;font-size:14px}.actions{display:flex;gap:10px;margin:15px 0 0}.secondary{background:#eef2f6;color:#4b5c73}.secondary:not(:disabled):hover{background:#e1e8ef;box-shadow:none}.error,.notice{padding:10px 13px;border-radius:8px;margin:0 0 16px;font-size:14px}.error{background:#fef2f2;color:#b42318}.notice{background:#ecfdf3;color:#087443}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@keyframes drawer-fade{from{opacity:0}to{opacity:1}}@keyframes drawer-slide{from{transform:translateX(100%)}to{transform:translateX(0)}}@media (max-width:700px){.recargas{padding:6px 0 20px}.page-header{align-items:stretch;margin-bottom:18px}.page-header h1{font-size:25px}.refresh-button{width:100%}.summary{grid-template-columns:1fr;gap:9px}.metric{padding:11px 13px}.drawer-header,.drawer-body,.drawer-footer{padding-left:20px;padding-right:20px}.recarga-detail{align-items:flex-start;flex-direction:column;gap:8px}.recarga-detail strong{margin-left:0}.actions{flex-direction:column}.actions button{width:100%}}
  `],
})
export class RecargasComponent implements OnInit {
  private service = inject(RecargasService);
  private route = inject(ActivatedRoute);
  pendientes: RecargaPendiente[] = [];
  lineas: RecargaLinea[] = [];
  selected: RecargaPendiente | null = null;
  requestId = '';
  token = '';
  lineId = 0;
  glosa = '';
  comprobante: File | null = null;
  registroDirecto = false;
  directProviderId = 0;
  directCelular = '';
  directMontoBob: number | null = null;
  directLineId = 0;
  directGlosa = '';
  directComprobante: File | null = null;
  directRequestId = '';
  busy = false;
  error = '';
  notice = '';
  simulated = false;
  vistaRealizadas = true;

  get lineasDisponibles() { return this.lineas.filter(l => l.id_proveedor === this.selected?.id_proveedor); }
  get montoPendiente() { return this.pendientes.reduce((total, recarga) => total + Number(recarga.monto_bob || 0), 0); }
  get telefonoValido() { return /^[0-9]{8,15}$/.test(this.directCelular); }
  get montoDirectoValido() { return !!this.directMontoBob && Number(this.directMontoBob) > 0; }
  lineasPorProveedor(idProveedor: number) { return this.lineas.filter(l => l.id_proveedor === idProveedor); }
  get lineaDirectaSeleccionada() { return this.lineas.find(l => l.id_linea === this.directLineId) ?? null; }
  ngOnInit() {
    this.service.modo().subscribe({ next: result => this.simulated = result.simulated });
    this.route.queryParamMap.subscribe(params => {
      this.vistaRealizadas = params.get('vista') !== 'pendientes';
      if (params.get('nueva') === '1' && !this.registroDirecto) this.abrirRegistroDirecto();
      this.cargar();
    });
  }
  proveedor(id: number) { return ({ 1: 'ENTEL', 2: 'TIGO', 3: 'VIVA' } as Record<number,string>)[id] || `Proveedor ${id}`; }
  logoProveedor(id: number) { return ({ 1: '/assets/logos_lineas/entel.png', 2: '/assets/logos_lineas/tigo.png', 3: '/assets/logos_lineas/viva.png' } as Record<number,string>)[id] || ''; }
  abrirRegistroDirecto() {
    this.error = ''; this.notice = ''; this.registroDirecto = true;
    this.directProviderId = 0; this.directCelular = ''; this.directMontoBob = null;
    this.directLineId = 0; this.directGlosa = ''; this.directComprobante = null; this.directRequestId = crypto.randomUUID();
  }
  cerrarRegistroDirecto() { if (!this.busy) this.registroDirecto = false; }
  private validarComprobante(input: HTMLInputElement): File | null {
    const file = input.files?.[0] ?? null;
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (file && (!allowed.includes(file.type) || file.size > 2 * 1024 * 1024 || file.size === 0)) {
      this.error = 'El comprobante debe ser PDF, JPG o PNG y no superar 2 MB.';
      input.value = '';
      return null;
    }
    return file;
  }
  seleccionarComprobante(event: Event) {
    const input = event.target as HTMLInputElement;
    this.comprobante = null;
    this.error = '';
    this.comprobante = this.validarComprobante(input);
  }
  seleccionarComprobanteDirecto(event: Event) {
    const input = event.target as HTMLInputElement;
    this.directComprobante = null;
    this.error = '';
    this.directComprobante = this.validarComprobante(input);
  }
  private limpiarFormulario() { this.selected = null; this.lineId = 0; this.glosa = ''; this.comprobante = null; }
  cargar() {
    this.busy = true; this.error = ''; this.notice = '';
    (this.vistaRealizadas ? this.service.realizadas() : this.service.pendientes()).subscribe({
      next: rows => { this.pendientes = rows; this.busy = false; },
      error: e => { this.error = e.error?.message || e.message; this.busy = false; },
    });
    this.service.lineas().subscribe({ next: rows => this.lineas = rows, error: () => this.error = 'No se pudieron consultar las líneas' });
  }
  reservar(r: RecargaPendiente) {
    this.busy = true; this.error = '';
    const id = crypto.randomUUID();
    this.service.reservar(r.id_detalle_recarga, id).subscribe({
      next: result => { this.requestId = id; this.token = result.token; this.selected = r; this.glosa = ''; this.comprobante = null; this.busy = false; },
      error: e => { this.error = e.error?.message || e.message; this.busy = false; },
    });
  }
  confirmar() {
    if (!this.selected || !this.lineId || !this.comprobante) return;
    this.busy = true;
    this.service.confirmar(this.selected.id_detalle_recarga, this.requestId, this.token, this.lineId, this.glosa, this.comprobante).subscribe({
      next: () => { this.limpiarFormulario(); this.cargar(); this.notice = 'Recarga confirmada correctamente con comprobante adjunto'; },
      error: e => { this.error = e.error?.message || e.message; this.busy = false; },
    });
  }
  liberar() {
    if (!this.selected) return;
    this.busy = true;
    this.service.liberar(this.selected.id_detalle_recarga, this.requestId, this.token).subscribe({
      next: () => { this.limpiarFormulario(); this.cargar(); },
      error: e => { this.error = e.error?.message || e.message; this.busy = false; },
    });
  }
  registrarYConfirmarDirecto() {
    if (!this.directProviderId || !this.telefonoValido || !this.montoDirectoValido || !this.directLineId || !this.directComprobante) return;
    this.busy = true; this.error = ''; this.notice = '';
    this.service.registrarYConfirmar({
      requestId: this.directRequestId, proveedorId: this.directProviderId, celular: this.directCelular,
      montoBob: Number(this.directMontoBob), lineId: this.directLineId, glosa: this.directGlosa, comprobante: this.directComprobante,
    }).subscribe({
      next: result => { this.registroDirecto = false; this.cargar(); this.notice = `Recarga #${result.id_recarga} registrada y confirmada correctamente`; },
      error: e => { this.error = e.error?.message || e.message; this.busy = false; },
    });
  }
}
