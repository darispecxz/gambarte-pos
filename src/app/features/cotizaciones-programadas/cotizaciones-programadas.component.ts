import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorIntl, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { CotizacionGestionService, CotizacionProgramadaDetalle, CotizacionProgramadaRecord, MonedaProgramada } from '../../core/cotizacion-gestion.service';

function paginatorEnEspanol(): MatPaginatorIntl {
  const paginator = new MatPaginatorIntl();
  paginator.itemsPerPageLabel = 'Registros por página';
  paginator.nextPageLabel = 'Página siguiente';
  paginator.previousPageLabel = 'Página anterior';
  paginator.firstPageLabel = 'Primera página';
  paginator.lastPageLabel = 'Última página';
  paginator.getRangeLabel = (page, pageSize, length) => length === 0
    ? '0 de 0'
    : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, length)} de ${length}`;
  return paginator;
}

@Component({
  selector: 'app-cotizaciones-programadas', standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, MatFormFieldModule, MatIconModule, MatInputModule, MatPaginatorModule, MatSelectModule, MatSnackBarModule],
  providers: [{ provide: MatPaginatorIntl, useFactory: paginatorEnEspanol }],
  template: `
    <div class="page"><div class="page-head"><div><div class="eyebrow">PUBLICACIÓN PROGRAMADA</div><h1>Cotizaciones programadas</h1><p>Prepara las tasas que se aplicarán automáticamente en una fecha y hora determinadas.</p></div><button class="primary" (click)="abrirNueva()">＋ Nueva cotización</button></div>
      <section class="panel"><div class="toolbar"><mat-form-field appearance="outline" subscriptSizing="dynamic" class="search-field"><mat-label>Buscar cotización</mat-label><mat-icon matPrefix>search</mat-icon><input matInput type="search" [(ngModel)]="busqueda" (ngModelChange)="buscarConPausa()" placeholder="Agencia, usuario o número"></mat-form-field><mat-form-field appearance="outline" subscriptSizing="dynamic" class="state-field"><mat-label>Estado</mat-label><mat-select [(ngModel)]="estado" (selectionChange)="cambiarEstado()"><mat-option value="">Todos los estados</mat-option><mat-option value="P">Pendientes</mat-option><mat-option value="A">Aplicadas</mat-option><mat-option value="I">Con error</mat-option></mat-select></mat-form-field></div><div class="table-wrap"><table><thead><tr><th>Cotización</th><th>Agencia</th><th>Aplicación</th><th>Registrada por</th><th>Monedas</th><th>Estado</th><th></th></tr></thead><tbody>@for (r of registros; track r.id_cotizacion) {<tr><td><strong>#{{ r.id_cotizacion }}</strong><small>{{ r.observaciones || 'Sin observaciones' }}</small></td><td><strong>{{ r.agencia }}</strong><small>{{ r.abreviatura }}</small></td><td><strong>{{ formatDate(r.fecha_aplicacion) }}</strong><small>{{ r.hora_aplicacion | slice:0:5 }} hrs</small></td><td>{{ r.usuario_registro }}</td><td><span class="money-count">{{ r.total_monedas }} monedas</span></td><td><span class="status" [class.pending]="r.estado==='P'" [class.applied]="r.estado==='A'" [class.error]="r.estado==='I'">● {{ r.estado_texto }}</span></td><td><button class="icon-btn" (click)="verDetalle(r)" title="Ver detalle">›</button></td></tr>} @empty {<tr><td colspan="7" class="empty">No hay cotizaciones programadas para los filtros seleccionados.</td></tr>}</tbody></table></div><mat-paginator [length]="totalRegistros" [pageIndex]="pagina - 1" [pageSize]="porPagina" [pageSizeOptions]="[5, 10, 25, 50]" showFirstLastButtons aria-label="Paginación de cotizaciones" (page)="cambiarPagina($event)"></mat-paginator></section>
    </div>
  `,
  styles: [`
    :host{display:block}.page{padding:30px 36px 52px;background:#f7f9fc;min-height:100%}.page-head{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:20px}.eyebrow{font-size:10px;font-weight:800;letter-spacing:.08em;color:#a05a1b}.page-head h1{margin:5px 0 6px;color:#172b4d;font-size:25px;letter-spacing:-.02em}.page-head p{margin:0;color:#788aa2;font-size:12px}.primary{height:40px;border:0;border-radius:9px;background:#f58634;color:#fff;padding:0 16px;font-weight:700;cursor:pointer;box-shadow:0 3px 8px rgba(245,134,52,.18)}.primary:hover{background:#e97925}.panel{background:#fff;border:1px solid #dfe7ef;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(33,59,89,.04)}.toolbar{display:flex;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid #edf1f5;background:#fbfcfe}.toolbar select,.search-box,input,textarea{height:38px;border:1px solid #d5dfeb;border-radius:8px;background:#fff;color:#253b59;padding:0 10px;font:inherit;font-size:12px}.toolbar select{min-width:160px}.search-box{display:flex;align-items:center;gap:7px;flex:1;color:#71849c;background:#fff}.search-box input{border:0;outline:0;width:100%;padding:0}.count{font-size:11px;color:#61758e;background:#eef2f7;border-radius:20px;padding:7px 10px;white-space:nowrap}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px;min-width:820px}th{padding:11px 14px;text-align:left;color:#7a8ba0;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;background:#fff}th:nth-child(1){width:23%}th:nth-child(2){width:19%}th:nth-child(3){width:16%}th:nth-child(4){width:14%}th:nth-child(5){width:11%}th:nth-child(6){width:12%}th:nth-child(7){width:5%}td{padding:12px 14px;border-top:1px solid #edf1f5;color:#52677f;white-space:nowrap;vertical-align:middle}tbody tr{transition:background .15s ease,box-shadow .15s ease}tbody tr:hover{background:#fffaf5;box-shadow:inset 3px 0 #f58634}td strong,td small{display:block}td strong{color:#203754;font-size:12px}td small{margin-top:3px;color:#91a0b3;font-size:10px;overflow:hidden;text-overflow:ellipsis}.money-count{padding:5px 8px;border-radius:20px;background:#eef5ff;color:#3471ad;font-size:10px;font-weight:700}.status{display:inline-flex;align-items:center;gap:3px;padding:5px 8px;border-radius:20px;font-size:10px;font-weight:800}.status.pending{background:#fff4df;color:#a6630d}.status.applied{background:#eaf8ef;color:#238354}.status.error{background:#fff0ef;color:#b42318}.icon-btn,.close{border:1px solid #dce4ed;background:#fff;color:#647891;border-radius:8px;cursor:pointer;width:32px;height:32px;font-size:20px}.icon-btn:hover{border-color:#f2a26a;color:#c96314;background:#fff8f1}.empty{padding:44px;text-align:center;color:#8b9bae}.overlay{position:fixed;inset:0;background:rgba(20,33,61,.34);z-index:20}.drawer{position:fixed;z-index:21;right:0;top:0;bottom:0;width:620px;max-width:100vw;background:#fff;box-shadow:-6px 0 24px rgba(20,33,61,.16);display:flex;flex-direction:column}.drawer-head{display:flex;justify-content:space-between;padding:24px;border-bottom:1px solid #e6edf4}.drawer-head h2{margin:5px 0;color:#172b4d;font-size:20px}.drawer-head p{margin:0;color:#8293a8;font-size:11px}.drawer-body{padding:24px;overflow:auto}.drawer label{display:flex;flex-direction:column;gap:7px;margin-bottom:15px;color:#52677f;font-size:11px;font-weight:800}.drawer input,.drawer textarea{width:100%;box-sizing:border-box}.drawer textarea{height:auto;padding:10px;resize:vertical}.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.section-title{display:flex;justify-content:space-between;border-top:1px solid #edf1f5;margin:18px 0 12px;padding-top:18px;color:#243a58;font-size:13px;font-weight:800}.section-title small{color:#a05a1b}.currency-card{padding:13px;border:1px solid #e2eaf1;border-radius:10px;margin-bottom:10px}.currency-heading{display:flex;align-items:center;gap:10px;margin-bottom:12px}.currency-heading strong,.currency-heading small{display:block}.currency-heading strong{color:#243a58}.currency-heading small{font-size:10px;color:#8a9aae;margin-top:2px}.flag-frame{display:grid;place-items:center;width:34px;height:25px;border-radius:5px;overflow:hidden;background:#eef3f8;border:1px solid #d9e2eb;flex:0 0 34px}.flag-frame img{display:block;width:34px;height:25px;object-fit:cover}.flag-frame span{font-size:9px;font-weight:800;color:#5a708b}.spread{font-size:10px;color:#8393a8;text-align:right}.spread strong{color:#c96a16;margin-left:5px}.drawer-foot{display:flex;justify-content:flex-end;gap:10px;padding:16px 24px;border-top:1px solid #e6edf4}.secondary{height:40px;padding:0 16px;border:1px solid #d4dfe9;border-radius:9px;background:#fff;color:#5d718b;font-weight:700;cursor:pointer}@media(max-width:700px){.page{padding:18px}.page-head{align-items:flex-start;flex-direction:column}.toolbar{align-items:stretch;flex-direction:column}.drawer{width:100%}}
  `, `
    .toolbar{gap:12px}.search-field{flex:1}.state-field{width:190px;flex:0 0 190px}.toolbar mat-icon{color:#71849c;margin-right:6px}
    .toolbar input.mat-mdc-input-element{height:auto;border:0;border-radius:0;background:transparent;padding:0;font:inherit;font-size:12px}
    .toolbar ::ng-deep .mat-mdc-text-field-wrapper{height:46px;background:#fff}.toolbar ::ng-deep .mat-mdc-form-field-flex{height:46px;align-items:center}.toolbar ::ng-deep .mat-mdc-form-field-infix{min-height:46px;padding-top:12px;padding-bottom:8px}.toolbar ::ng-deep .mdc-notched-outline__leading{border-radius:9px 0 0 9px}.toolbar ::ng-deep .mdc-notched-outline__trailing{border-radius:0 9px 9px 0}.toolbar ::ng-deep .mdc-text-field--focused .mdc-notched-outline>*{border-color:#f58634!important}
    mat-paginator{border-top:1px solid #edf1f5;background:#fbfcfe;color:#52677f}::ng-deep .mat-mdc-paginator-page-size-select{width:84px}::ng-deep .mat-mdc-paginator-range-actions{gap:2px}
    @media(max-width:700px){.search-field,.state-field{width:100%;flex:1 1 auto}}
  `],
})
export class CotizacionesProgramadasComponent implements OnInit {
  private service = inject(CotizacionGestionService);
  private snack = inject(MatSnackBar);
  registros: CotizacionProgramadaRecord[] = [];
  monedas: MonedaProgramada[] = [];
  busqueda = ''; estado = ''; editor = false; saving = false;
  totalRegistros = 0; pagina = 1; porPagina = 5;
  private searchTimer?: ReturnType<typeof setTimeout>;
  draft: any = { fecha_aplicacion: '', hora_aplicacion: '10:00', observaciones: '', valores: {} };
  private readonly paisMoneda: Record<string,string> = {USD:'us',EUR:'eu',BRL:'br',ARS:'ar',PEN:'pe',CLP:'cl',PYG:'py',GBP:'gb',JPY:'jp',CAD:'ca',MXN:'mx',COP:'co',UYU:'uy',BOB:'bo',CHF:'ch',AUD:'au',CNY:'cn',KRW:'kr',SEK:'se',NOK:'no',DKK:'dk',NZD:'nz',ZAR:'za',INR:'in',TWD:'tw'};
  ngOnInit(): void { this.cargar(); }
  cargar(): void { this.service.programadas(this.estado, this.busqueda.trim(), this.pagina, this.porPagina).subscribe({next:r=>{this.registros=r.registros;this.monedas=r.monedas;this.totalRegistros=r.total;this.pagina=r.pagina;this.porPagina=r.por_pagina;},error:e=>this.snack.open(e.message,'Cerrar',{duration:5000})}); }
  buscarConPausa(): void { this.pagina=1; if(this.searchTimer) clearTimeout(this.searchTimer); this.searchTimer=setTimeout(()=>this.cargar(),350); }
  cambiarEstado(): void { this.pagina=1; this.cargar(); }
  cambiarPagina(event: PageEvent): void { this.pagina=event.pageIndex+1; this.porPagina=event.pageSize; this.cargar(); }
  async abrirNueva(): Promise<void> {
    const programacion = this.calcularProgramacion();
    this.draft = { ...programacion, observaciones: '', valores: {} };
    this.monedas.forEach(m => this.draft.valores[m.id_moneda] = { compra: m.compra_actual, venta: m.venta_actual });

    const result = await Swal.fire({
      title: 'Registrar cotización',
      html: this.dialogHtml(),
      width: 780,
      showCancelButton: true,
      focusConfirm: false,
      confirmButtonText: 'Guardar cotización',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      buttonsStyling: true,
      customClass: { popup: 'cotizacion-programada-dialog', confirmButton: 'swal-confirm', cancelButton: 'swal-cancel' },
      didOpen: () => this.bindDialog(),
      preConfirm: () => this.collectDialog(),
    });

    if (result.isConfirmed && result.value) this.guardarProgramada(result.value);
  }

  private dialogHtml(): string {
    const monedas = this.monedas.map(m => {
      const compra = this.rateInput(m.compra_actual);
      const venta = this.rateInput(m.venta_actual);
      const diferencial = Math.max(0, m.venta_actual - m.compra_actual).toFixed(5);
      return `<div class="quote-money-card"><div class="quote-money-head"><img src="${this.flagUrl(m.moneda)}" alt="${this.escape(m.moneda)}"><div><strong>${this.escape(m.moneda)}</strong><small>${this.escape(m.moneda_desc)}</small></div></div><div class="quote-rate-grid"><label>Compra<input data-rate="compra" data-moneda="${m.id_moneda}" type="number" min="0" step="0.00001" value="${compra}"></label><label>Venta<input data-rate="venta" data-moneda="${m.id_moneda}" type="number" min="0" step="0.00001" value="${venta}"></label></div><div class="quote-spread">Diferencial <b data-spread="${m.id_moneda}">${diferencial}</b></div></div>`;
    }).join('');
    return `<style>.quote-dialog-form{text-align:left}.quote-dialog-form .quote-intro{margin:-8px 0 16px;color:#8293a8;font-size:12px}.quote-dialog-form .quote-top{display:grid;grid-template-columns:1fr 1fr;gap:12px}.quote-dialog-form label{display:flex;flex-direction:column;gap:6px;color:#52677f;font-size:11px;font-weight:800}.quote-dialog-form input,.quote-dialog-form textarea{box-sizing:border-box;width:100%;border:1px solid #d5dfeb;border-radius:8px;padding:10px;color:#253b59;font:inherit;font-size:12px}.quote-dialog-form input[readonly]{background:#f5f7fa;color:#52677f;cursor:not-allowed}.quote-dialog-form textarea{resize:vertical}.quote-dialog-form .quote-section{display:flex;justify-content:space-between;align-items:center;margin:18px 0 10px;padding-top:16px;border-top:1px solid #edf1f5;color:#243a58;font-weight:800}.quote-dialog-form .quote-section small{color:#a05a1b}.quote-money-list{max-height:430px;overflow:auto;padding:2px 4px 4px}.quote-money-card{display:grid;grid-template-columns:155px minmax(0,1fr) minmax(0,1fr) 82px;align-items:end;gap:12px;margin-bottom:10px;padding:12px;border:1px solid #e2eaf1;border-radius:10px}.quote-money-head{display:flex;align-items:center;gap:10px;height:42px}.quote-money-head img{width:34px;height:25px;object-fit:cover;border-radius:4px;border:1px solid #d9e2eb}.quote-money-head strong,.quote-money-head small{display:block}.quote-money-head strong{color:#243a58;font-size:13px}.quote-money-head small{margin-top:2px;color:#8a9aae;font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.quote-rate-grid{display:contents}.quote-spread{text-align:right;color:#8393a8;font-size:10px;padding-bottom:11px;white-space:nowrap}.quote-spread b{color:#c96a16;margin-left:4px}@media(max-width:600px){.quote-dialog-form .quote-top,.quote-rate-grid{grid-template-columns:1fr}.quote-money-card{display:block}.quote-money-head{margin-bottom:11px}.quote-rate-grid{display:grid;gap:12px}.quote-spread{padding-top:7px;padding-bottom:0}}</style><div class="quote-dialog-form"><p class="quote-intro">La cotización quedará pendiente hasta la fecha y hora de aplicación.</p><div class="quote-top"><label>Fecha de aplicación<input id="cot-fecha" type="date" value="${this.draft.fecha_aplicacion}" readonly tabindex="-1"></label><label>Hora de aplicación<input id="cot-hora" type="time" value="${this.draft.hora_aplicacion}" readonly tabindex="-1"></label></div><label style="margin-top:14px">Observaciones<textarea id="cot-observaciones" rows="2" placeholder="Opcional"></textarea></label><div class="quote-section"><span>Tasas de compra y venta</span><small>BOB</small></div><div class="quote-money-list">${monedas}</div></div>`;
  }

  private bindDialog(): void {
    const root = Swal.getHtmlContainer(); if (!root) return;
    root.querySelectorAll<HTMLInputElement>('input[data-rate]').forEach(input => input.addEventListener('input', () => {
      const id = input.dataset['moneda'] || ''; const compra = +(root.querySelector<HTMLInputElement>(`input[data-rate="compra"][data-moneda="${id}"]`)?.value || 0); const venta = +(root.querySelector<HTMLInputElement>(`input[data-rate="venta"][data-moneda="${id}"]`)?.value || 0); const spread = root.querySelector<HTMLElement>(`[data-spread="${id}"]`); if (spread) spread.textContent = Math.max(0, venta - compra).toFixed(5);
    }));
  }

  private collectDialog(): { fecha_aplicacion: string; hora_aplicacion: string; observaciones: string; cotizaciones: { id_moneda: number; compra: number; venta: number }[] } | undefined {
    const root = Swal.getHtmlContainer(); if (!root) return;
    const cotizaciones = this.monedas.map(m => ({ id_moneda: m.id_moneda, compra: +(root.querySelector<HTMLInputElement>(`input[data-rate="compra"][data-moneda="${m.id_moneda}"]`)?.value || 0), venta: +(root.querySelector<HTMLInputElement>(`input[data-rate="venta"][data-moneda="${m.id_moneda}"]`)?.value || 0) }));
    if (cotizaciones.some(c => c.compra <= 0 || c.venta <= 0)) { Swal.showValidationMessage('Completa las tasas de compra y venta de todas las monedas.'); return; }
    if (cotizaciones.some(c => c.venta < c.compra)) { Swal.showValidationMessage('La venta no puede ser menor que la compra.'); return; }
    return { fecha_aplicacion: root.querySelector<HTMLInputElement>('#cot-fecha')?.value || '', hora_aplicacion: root.querySelector<HTMLInputElement>('#cot-hora')?.value || '', observaciones: root.querySelector<HTMLTextAreaElement>('#cot-observaciones')?.value || '', cotizaciones };
  }

  private guardarProgramada(data: { fecha_aplicacion: string; hora_aplicacion: string; observaciones: string; cotizaciones: { id_moneda: number; compra: number; venta: number }[] }): void { this.saving=true; this.service.crearProgramada(data).subscribe({next:()=>{this.saving=false;this.snack.open('Cotización programada creada.','Cerrar',{duration:3500});this.cargar();},error:e=>{this.saving=false;this.snack.open(e.message,'Cerrar',{duration:5000})}}); }
  private localDate(d: Date): string { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  private calcularProgramacion(): { fecha_aplicacion: string; hora_aplicacion: string } {
    const ahora = new Date();
    const minutos = ahora.getHours() * 60 + ahora.getMinutes();
    const limiteManana = 10 * 60 + 30;
    const limiteTarde = 15 * 60;
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    let hora = '10:30';
    if (minutos >= limiteManana && minutos < limiteTarde) hora = '15:00';
    if (minutos >= limiteTarde) fecha.setDate(fecha.getDate() + 1);
    return { fecha_aplicacion: this.localDate(fecha), hora_aplicacion: hora };
  }
  private rateInput(value: number): string { return Number.isFinite(+value) && +value > 0 ? String(+value) : '0'; }
  private escape(value: string): string { return value.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c] || c)); }
  formatDate(v:string): string { return v ? v.split('-').reverse().join('/') : '—'; }
  flagUrl(moneda:string): string { const code=this.paisMoneda[moneda]; return code ? `https://flagcdn.com/w40/${code}.png` : ''; }
  async verDetalle(r: CotizacionProgramadaRecord): Promise<void> {
    Swal.fire({ title: 'Cargando detalle…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const detalle = await firstValueFrom(this.service.detalleProgramada(r.id_cotizacion));
      const result = await Swal.fire({
        title: `Cotización #${r.id_cotizacion}`,
        html: this.detalleHtml(detalle),
        width: 860,
        showDenyButton: true,
        confirmButtonText: 'Cerrar',
        denyButtonText: '↓ Descargar PDF',
        confirmButtonColor: '#64748b',
        denyButtonColor: '#f58634',
        customClass: { popup: 'cotizacion-detalle-dialog' },
      });
      if (result.isDenied) await this.descargarPdf(r.id_cotizacion);
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'No se pudo abrir el detalle', text: error?.message || 'Error al consultar la cotización.' });
    }
  }

  private detalleHtml(data: CotizacionProgramadaDetalle): string {
    const c = data.cabecera;
    const filas = data.detalles.map(d => `<tr><td><div class="detail-money"><img src="${this.flagUrl(d.moneda)}" alt="${this.escape(d.moneda)}"><span><b>${this.escape(d.moneda)}</b><small>${this.escape(d.moneda_desc)}</small></span></div></td><td>${d.compra.toFixed(5)}</td><td>${d.venta.toFixed(5)}</td><td class="detail-spread">${d.diferencial.toFixed(5)}</td></tr>`).join('');
    const estadoClase = c.estado === 'A' ? 'ok' : c.estado === 'I' ? 'error' : 'pending';
    return `<style>.program-detail{text-align:left}.detail-summary{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px}.detail-summary>div{padding:10px 12px;background:#f6f8fb;border:1px solid #e2e8f0;border-radius:8px}.detail-summary small,.detail-money small{display:block;color:#8495aa;font-size:10px;margin-bottom:3px}.detail-summary b{color:#243a58;font-size:12px}.detail-status{display:inline-flex;padding:4px 8px;border-radius:14px}.detail-status.pending{background:#fff4df;color:#9a5b08}.detail-status.ok{background:#e9f8ee;color:#238354}.detail-status.error{background:#fff0ef;color:#b42318}.detail-table-wrap{max-height:390px;overflow:auto;border:1px solid #e2e8f0;border-radius:9px}.detail-table{width:100%;border-collapse:collapse;font-size:11px}.detail-table th{position:sticky;top:0;background:#f6f8fb;color:#70839b;text-transform:uppercase;font-size:9px;text-align:right;padding:9px 11px}.detail-table th:first-child{text-align:left}.detail-table td{padding:9px 11px;border-top:1px solid #edf1f5;text-align:right;color:#334b68}.detail-table td:first-child{text-align:left}.detail-money{display:flex;align-items:center;gap:9px}.detail-money img{width:30px;height:21px;object-fit:cover;border-radius:4px;border:1px solid #d9e2eb}.detail-money b{color:#243a58}.detail-money small{margin:2px 0 0}.detail-spread{color:#c96a16!important;font-weight:700}.detail-notes{margin-top:12px;padding:10px 12px;background:#fff8ed;border-left:3px solid #f58634;color:#5f7188;font-size:11px}@media(max-width:600px){.detail-summary{grid-template-columns:1fr}}</style><div class="program-detail"><div class="detail-summary"><div><small>Agencia</small><b>${this.escape(c.agencia)}</b></div><div><small>Estado</small><b class="detail-status ${estadoClase}">${this.escape(c.estado_texto || c.estado)}</b></div><div><small>Aplicación</small><b>${this.formatDate(c.fecha_aplicacion)} · ${String(c.hora_aplicacion).slice(0,5)} hrs</b></div><div><small>Registrada por</small><b>${this.escape(c.usuario_registro)}</b></div></div><div class="detail-table-wrap"><table class="detail-table"><thead><tr><th>Moneda</th><th>Compra BOB</th><th>Venta BOB</th><th>Diferencial</th></tr></thead><tbody>${filas}</tbody></table></div>${c.observaciones ? `<div class="detail-notes"><b>Observaciones</b><br>${this.escape(c.observaciones)}</div>` : ''}</div>`;
  }

  private async descargarPdf(id: number): Promise<void> {
    Swal.fire({ title: 'Generando PDF…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const blob = await firstValueFrom(this.service.descargarProgramadaPdf(id));
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Cotizacion_Programada_${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      Swal.close();
    } catch (error: any) {
      Swal.fire({ icon: 'error', title: 'No se pudo descargar el PDF', text: error?.message || 'Error al generar el documento.' });
    }
  }
}
