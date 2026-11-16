import { CommonModule, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import Swal from 'sweetalert2';
import { AuditoriaCotizacion, CotizacionGestionService, GestionCotizacionesData, TasaVigente } from '../../core/cotizacion-gestion.service';

@Component({
  selector: 'app-gestion-cotizaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe, MatSnackBarModule],
  template: `
    <div class="page">
      <div class="page-head">
        <div><div class="eyebrow">CONFIGURACIÓN OPERATIVA</div><h1>Gestión de cotizaciones</h1><p>Administra las tasas vigentes y consulta el historial de publicaciones.</p></div>
        <div class="head-actions"><select [(ngModel)]="agenciaSeleccionada" (ngModelChange)="cargar()" [disabled]="agencias.length <= 1"><option [ngValue]="0">Todas las agencias</option>@for (a of agencias; track a.id_agencia) {<option [ngValue]="a.id_agencia">{{ a.agencia }}</option>}</select><button class="primary" (click)="abrirNueva()">↻ Nueva actualización</button></div>
      </div>

      @if (loading) { <div class="loading">Cargando cotizaciones…</div> }
      @else {
        <section class="panel">
          <div class="panel-head"><div><div class="section-kicker">TIPOS DE CAMBIO</div><h2>Tasas vigentes</h2><p>Valores utilizados por Cambio y la calculadora del POS.</p></div><div class="panel-tools"><label class="search-box"><span>⌕</span><input type="search" [(ngModel)]="busqueda" placeholder="Buscar moneda o agencia"></label><span class="count">{{ filteredTasas.length }} registros</span></div></div>
          <div class="table-wrap"><table><thead><tr><th>Moneda</th><th>Agencia</th><th>Compra BOB</th><th>Venta BOB</th><th>Compra USD</th><th>Venta USD</th><th>Actualizada</th><th>Estado</th><th></th></tr></thead><tbody>@for (t of filteredTasas; track t.id_agencia + '-' + t.id_moneda) {<tr><td><div class="currency-cell"><span class="flag-frame">@if (flagUrl(t.moneda)) {<img class="currency-flag" [src]="flagUrl(t.moneda)" [alt]="t.moneda" loading="lazy">} @else {<span class="flag-fallback">{{ t.moneda.slice(0,2) }}</span>}</span><span><strong>{{ t.moneda }}</strong><small>{{ t.moneda_desc }}</small></span></div></td><td>{{ t.agencia }}</td><td class="num">{{ t.compra_bob | number:'1.2-5' }}</td><td class="num">{{ t.venta_bob | number:'1.2-5' }}</td><td class="num muted">{{ t.compra_usd | number:'1.2-5' }}</td><td class="num muted">{{ t.venta_usd | number:'1.2-5' }}</td><td>{{ formatDate(t.actualizada) }}</td><td><span class="status" [class.active]="t.estado === 'activa'" [class.invalid]="t.estado !== 'activa'">● {{ t.estado === 'activa' ? 'Activa' : 'Revisar' }}</span></td><td><button class="icon-btn" (click)="editar(t)" title="Editar">✎</button></td></tr>} @empty {<tr><td colspan="9" class="empty">No hay tasas que coincidan con la búsqueda.</td></tr>}</tbody></table></div>
        </section>

        <section class="panel audit"><div class="panel-head"><div><h2>Últimos cambios</h2><p>Historial de valores publicados en cotización_base.</p></div></div><div class="audit-list">@for (a of auditoria; track a.fecha_creacion + '-' + a.id_moneda + '-' + a.id_operacion) {<div class="audit-row"><span class="dot"></span><div class="audit-time">{{ formatDate(a.fecha_creacion) }}</div><div class="audit-copy"><strong>{{ a.moneda }} · Actualización de {{ a.operacion }}</strong><span>{{ a.valor_base | number:'1.2-5' }} · {{ a.agencia }}</span></div><div class="audit-user">{{ a.usuario }}</div></div>} @empty {<div class="empty">Aún no hay cambios registrados.</div>}</div></section>
      }
    </div>

    @if (editor) {<div class="overlay" (click)="cerrarEditor()"></div><aside class="drawer"><div class="drawer-head"><div><div class="eyebrow">PUBLICAR CAMBIO</div><h2>{{ editor.id_moneda ? 'Actualizar tasa · ' + editor.moneda : 'Nueva actualización' }}</h2><p class="drawer-subtitle">Define el valor que utilizarán las operaciones del POS.</p></div><button class="close" (click)="cerrarEditor()">×</button></div><div class="drawer-body">@if (agencias.length > 1) {<label class="check-row"><input type="checkbox" [(ngModel)]="todasAgencias" (ngModelChange)="onTodasAgenciasChange()"><span><strong>Aplicar a todas las agencias</strong><small>Publica esta moneda con la misma tasa en todas las agencias.</small></span></label>}<label>Agencia<select [(ngModel)]="draft.id_agencia" [disabled]="todasAgencias"><option [ngValue]="0">Seleccione agencia</option>@for (a of agencias; track a.id_agencia) {<option [ngValue]="a.id_agencia">{{ a.agencia }}</option>}</select></label><label>Moneda<select [(ngModel)]="draft.id_moneda"><option [ngValue]="0">Seleccione moneda</option>@for (t of monedasDisponibles; track t.id_moneda) {<option [ngValue]="t.id_moneda">{{ t.moneda }} — {{ t.moneda_desc }}</option>}</select></label>@if (selectedCurrency; as currency) {<div class="currency-picker-preview"><span class="flag-frame large">@if (flagUrl(currency.moneda)) {<img class="currency-flag" [src]="flagUrl(currency.moneda)" [alt]="currency.moneda">} @else {<span class="flag-fallback">{{ currency.moneda.slice(0,2) }}</span>}</span><span><strong>{{ currency.moneda }}</strong><small>{{ currency.moneda_desc }}</small></span></div>}<div class="field-grid"><label>Compra BOB<input type="number" step="0.00001" min="0" [(ngModel)]="draft.compra_bob"></label><label>Venta BOB<input type="number" step="0.00001" min="0" [(ngModel)]="draft.venta_bob"></label></div><p class="hint">Máximo 5 decimales. La tasa debe ser mayor a cero.</p>@if (editor) {<div class="base-box"><span>Valor base compra</span><strong>{{ editor.valor_base_compra | number:'1.2-5' }}</strong><span>Valor base venta</span><strong>{{ editor.valor_base_venta | number:'1.2-5' }}</strong></div>}<div class="margin-box" [class.warn]="margenExcedido()"><span>％</span><strong>Margen: {{ margenTexto() }}</strong><small>Comparado contra el valor base</small></div></div><div class="drawer-foot"><button class="secondary" (click)="cerrarEditor()">Cancelar</button><button class="primary" [disabled]="saving" (click)="guardar()">{{ saving ? 'Publicando…' : 'Publicar cambios' }}</button></div></aside>}
  `,
  styles: [`
    :host{display:block}.page{padding:24px 28px 46px;background:#fafafa;min-height:100%}.page-head{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin-bottom:22px}.eyebrow{font-size:10px;font-weight:800;letter-spacing:.08em;color:#a05a1b}.page-head h1{margin:5px 0 7px;color:#172b4d;font-size:26px}.page-head p{margin:0;color:#788aa2;font-size:13px}.head-actions{display:flex;gap:10px;align-items:center}.head-actions select,.drawer select,.drawer input{height:40px;border:1px solid #d5dfeb;border-radius:9px;background:#fff;color:#253b59;padding:0 11px;font:inherit;font-size:12px}.head-actions select{min-width:190px}.primary{height:40px;border:0;border-radius:9px;background:#f58634;color:#fff;padding:0 16px;font-weight:700;cursor:pointer}.primary:disabled{opacity:.6;cursor:wait}.panel{background:#fff;border:1px solid #dfe7ef;border-radius:12px;margin-bottom:16px;overflow:hidden}.panel-head{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 20px;border-bottom:1px solid #edf1f5}.section-kicker{font-size:10px;letter-spacing:.08em;font-weight:800;color:#a05a1b;margin-bottom:5px}.panel-head h2{margin:0 0 5px;color:#243a58;font-size:16px}.panel-head p{margin:0;color:#8393a8;font-size:11px}.panel-tools{display:flex;align-items:center;gap:10px}.search-box{display:flex!important;flex-direction:row!important;align-items:center;gap:7px;margin:0!important;padding:0 10px;height:36px;border:1px solid #d5dfeb;border-radius:9px;background:#fff;color:#71849c}.search-box span{font-size:18px}.search-box input{height:32px!important;width:210px;border:0!important;outline:0;color:#253b59}.count{font-size:11px;color:#61758e;background:#f2f5f8;border-radius:20px;padding:7px 10px;white-space:nowrap}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;font-size:12px;min-width:930px}th{padding:12px 14px;text-align:left;color:#788aa0;font-size:10px;letter-spacing:.04em;text-transform:uppercase;background:#fbfcfd;white-space:nowrap}td{padding:13px 14px;border-top:1px solid #eef2f6;color:#52677f;white-space:nowrap}td strong,td small{display:block}td strong{color:#203754;font-size:13px}td small{margin-top:3px;color:#9aa8b8;font-size:10px}.currency-cell{display:flex;align-items:center;gap:9px}.flag-frame{display:grid;place-items:center;width:30px;height:22px;border-radius:4px;overflow:hidden;background:#eef3f8;border:1px solid #d9e2eb;flex:0 0 30px}.flag-frame.large{width:42px;height:30px;flex-basis:42px;border-radius:6px}.currency-flag{display:block;width:30px;height:22px;object-fit:cover}.flag-frame.large .currency-flag{width:42px;height:30px}.flag-fallback{font-size:9px;font-weight:800;color:#5a708b}.num{font-variant-numeric:tabular-nums;color:#243a58;font-weight:700}.muted{color:#8495a9;font-weight:500}.status{display:inline-block;padding:5px 8px;border-radius:20px;font-size:10px;font-weight:800}.status.active{color:#238354;background:#eaf8ef}.status.invalid{color:#b42318;background:#fff0ef}.icon-btn,.close{border:1px solid #dce4ed;background:#fff;color:#647891;border-radius:8px;cursor:pointer;width:32px;height:32px}.currency-picker-preview{display:flex;align-items:center;gap:10px;padding:10px 12px;margin:-7px 0 16px;border:1px solid #e4ebf2;border-radius:9px;background:#f8fafc}.currency-picker-preview strong,.currency-picker-preview small{display:block}.currency-picker-preview strong{color:#243a58;font-size:12px}.currency-picker-preview small{color:#8495a9;font-size:10px;margin-top:2px}.audit-list{padding:4px 20px}.audit-row{display:grid;grid-template-columns:14px 120px 1fr 140px;align-items:center;gap:10px;padding:13px 0;border-bottom:1px solid #eef2f6}.audit-row:last-child{border-bottom:0}.dot{width:8px;height:8px;border-radius:50%;background:#2aa466}.audit-time{font-size:11px;color:#7f90a5}.audit-copy strong,.audit-copy span{display:block}.audit-copy strong{font-size:12px;color:#243a58}.audit-copy span{font-size:11px;color:#8393a8;margin-top:3px}.audit-user{font-size:11px;color:#5d718a}.empty,.loading{padding:40px;text-align:center;color:#8b9bae;font-size:12px}.overlay{position:fixed;inset:0;background:rgba(20,33,61,.34);z-index:20}.drawer{position:fixed;z-index:21;right:0;top:0;bottom:0;width:570px;max-width:100vw;background:#fff;box-shadow:-6px 0 24px rgba(20,33,61,.16);display:flex;flex-direction:column}.drawer-head{display:flex;justify-content:space-between;padding:24px;border-bottom:1px solid #e6edf4}.drawer-head h2{margin:5px 0 0;color:#172b4d;font-size:20px}.drawer-subtitle{margin:6px 0 0;color:#8293a8;font-size:11px}.close{font-size:24px;border:0}.drawer-body{padding:24px;overflow:auto}.drawer label{display:flex;flex-direction:column;gap:7px;margin-bottom:16px;color:#52677f;font-size:11px;font-weight:800}.drawer input,.drawer select{width:100%;box-sizing:border-box}.check-row{display:flex!important;flex-direction:row!important;align-items:flex-start;gap:10px;padding:13px;border:1px solid #f5d2b0;border-radius:10px;background:#fff8f1;color:#7a4a22!important}.check-row input{width:16px!important;height:16px;margin-top:1px}.check-row span{display:flex;flex-direction:column;gap:3px}.check-row strong{font-size:12px;color:#854711}.check-row small{font-size:10px;color:#a77550;font-weight:500}.field-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.hint{margin:-4px 0 16px;color:#8495a9;font-size:10px}.base-box{display:grid;grid-template-columns:1fr auto;gap:8px;padding:13px;border-radius:9px;background:#f5f7fa;color:#778aa1;font-size:11px}.base-box strong{color:#536b85}.margin-box{display:flex;align-items:center;gap:9px;margin-top:15px;padding:12px;border-radius:9px;background:#ecf9f0;color:#258555}.margin-box.warn{background:#fff4df;color:#b66a12}.margin-box span{font-size:20px;font-weight:800}.margin-box strong,.margin-box small{display:block}.margin-box small{font-size:10px;margin-top:2px}.drawer-foot{display:flex;justify-content:flex-end;gap:10px;padding:16px 24px;border-top:1px solid #e6edf4}.secondary{height:40px;padding:0 16px;border:1px solid #d4dfe9;border-radius:9px;background:#fff;color:#5d718b;font-weight:700;cursor:pointer}@media(max-width:800px){.page{padding:16px}.page-head{align-items:flex-start;flex-direction:column}.head-actions{width:100%}.head-actions select{flex:1}.panel-head{align-items:flex-start;flex-direction:column}.panel-tools{width:100%}.search-box{flex:1}.search-box input{width:100%}.audit-row{grid-template-columns:14px 90px 1fr}.audit-user{display:none}}@media(max-width:560px){.drawer{width:100%}.field-grid{grid-template-columns:1fr}}
  `],
})
export class GestionCotizacionesComponent implements OnInit {
  private service = inject(CotizacionGestionService);
  private snack = inject(MatSnackBar);
  data: GestionCotizacionesData | null = null;
  tasas: TasaVigente[] = [];
  auditoria: AuditoriaCotizacion[] = [];
  agencias: { id_agencia: number; agencia: string }[] = [];
  agenciaSeleccionada = 0;
  loading = true;
  saving = false;
  busqueda = '';
  todasAgencias = false;
  editor: TasaVigente | null = null;
  draft = { id_agencia: 0, id_moneda: 0, compra_bob: 0, venta_bob: 0 };

  ngOnInit(): void { this.cargar(); }
  cargar(): void { this.loading = true; this.service.dashboard(this.agenciaSeleccionada || undefined).subscribe({ next: d => { this.data=d; this.tasas=d.tasas; this.auditoria=d.auditoria; this.agencias=d.agencias; if (!this.agenciaSeleccionada && d.agencia_seleccionada) this.agenciaSeleccionada=d.agencia_seleccionada; this.loading=false; }, error: e => { this.loading=false; this.snack.open(e.message,'Cerrar',{duration:5000}); } }); }
  get monedasDisponibles(): TasaVigente[] { return this.tasas.filter((t,i,a)=>a.findIndex(x=>x.id_moneda===t.id_moneda)===i); }
  get selectedCurrency(): TasaVigente | null { return this.monedasDisponibles.find(t => t.id_moneda === this.draft.id_moneda) || null; }
  get filteredTasas(): TasaVigente[] { const term=this.busqueda.trim().toLowerCase(); if (!term) return this.tasas; return this.tasas.filter(t => `${t.moneda} ${t.moneda_desc} ${t.agencia}`.toLowerCase().includes(term)); }
  abrirNueva(): void { void this.abrirDialogCotizacion(null); }
  editar(t: TasaVigente): void { void this.abrirDialogCotizacion(t); }

  private async abrirDialogCotizacion(tasa: TasaVigente | null): Promise<void> {
    const monedaInicial = tasa?.id_moneda || this.monedasDisponibles[0]?.id_moneda || 0;
    const agenciaInicial = tasa?.id_agencia || this.agenciaSeleccionada || this.agencias[0]?.id_agencia || 0;
    const actual = tasa || this.buscarTasa(agenciaInicial, monedaInicial);
    const result = await Swal.fire({
      title: tasa ? `Actualizar tasa · ${tasa.moneda}` : 'Nueva actualización de tasa',
      html: this.cotizacionDialogHtml(agenciaInicial, monedaInicial, actual),
      width: 720,
      showCancelButton: true,
      focusConfirm: false,
      confirmButtonText: 'Publicar cambios',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      confirmButtonColor: '#f58634',
      cancelButtonColor: '#64748b',
      didOpen: () => this.vincularDialogCotizacion(),
      preConfirm: () => this.recogerDialogCotizacion(),
    });
    if (!result.isConfirmed || !result.value) return;

    Swal.fire({ title: 'Publicando cotización…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const data = await firstValueFrom(this.service.actualizar(result.value));
      this.data=data; this.tasas=data.tasas; this.auditoria=data.auditoria;
      await Swal.fire({ icon:'success', title:'Cotización publicada', text:result.value.todas_agencias ? 'La tasa se publicó en todas las agencias.' : 'La tasa se publicó correctamente.', confirmButtonColor:'#f58634' });
    } catch (error: any) {
      await Swal.fire({ icon:'error', title:'No se pudo publicar', text:error?.message || 'Error al actualizar la cotización.', confirmButtonColor:'#f58634' });
    }
  }

  private cotizacionDialogHtml(idAgencia: number, idMoneda: number, tasa: TasaVigente | null): string {
    const agencias = this.agencias.map(a => `<option value="${a.id_agencia}" ${a.id_agencia===idAgencia?'selected':''}>${this.escapeHtml(a.agencia)}</option>`).join('');
    const monedas = this.monedasDisponibles.map(m => `<option value="${m.id_moneda}" ${m.id_moneda===idMoneda?'selected':''}>${this.escapeHtml(m.moneda)} — ${this.escapeHtml(m.moneda_desc)}</option>`).join('');
    const moneda = tasa?.moneda || this.monedasDisponibles.find(m=>m.id_moneda===idMoneda)?.moneda || '';
    const descripcion = tasa?.moneda_desc || this.monedasDisponibles.find(m=>m.id_moneda===idMoneda)?.moneda_desc || '';
    const compra = +(tasa?.compra_bob || 0); const venta = +(tasa?.venta_bob || 0);
    const baseCompra = +(tasa?.valor_base_compra || 0); const baseVenta = +(tasa?.valor_base_venta || 0);
    const todas = this.agencias.length > 1 ? `<label class="quote-all"><input id="quote-all" type="checkbox"><span><b>Aplicar a todas las agencias</b><small>Publica esta moneda con la misma tasa en todas las agencias.</small></span></label>` : '';
    return `<style>.quote-dialog{text-align:left}.quote-dialog .intro{margin:-8px 0 16px;color:#8293a8;font-size:11px}.quote-all{display:flex;align-items:flex-start;gap:9px;margin-bottom:13px;padding:11px;border:1px solid #f2cfad;border-radius:9px;background:#fff8f1}.quote-all input{width:16px;height:16px;margin-top:1px}.quote-all b,.quote-all small{display:block}.quote-all b{color:#854711;font-size:11px}.quote-all small{margin-top:3px;color:#a77550;font-size:9px}.quote-fields{display:grid;grid-template-columns:1fr 1fr;gap:11px}.quote-dialog label.field{display:flex;flex-direction:column;gap:6px;margin-bottom:12px;color:#52677f;font-size:10px;font-weight:700}.quote-dialog select,.quote-dialog input[type=number]{box-sizing:border-box;width:100%;height:40px;border:1px solid #d5dfeb;border-radius:8px;background:#fff;padding:0 10px;color:#253b59;font:inherit;font-size:11px}.quote-preview{display:flex;align-items:center;gap:10px;margin:-2px 0 13px;padding:10px 12px;border:1px solid #e1e9f1;border-radius:9px;background:#f7f9fc}.quote-preview img{width:38px;height:27px;object-fit:cover;border-radius:4px;border:1px solid #d5dfe9}.quote-preview b,.quote-preview small{display:block}.quote-preview b{color:#243a58;font-size:12px}.quote-preview small{margin-top:2px;color:#8495a9;font-size:9px}.quote-hint{margin:-3px 0 13px;color:#8495a9;font-size:9px}.quote-base{display:grid;grid-template-columns:1fr auto;gap:7px;padding:11px;border-radius:8px;background:#f3f6f9;color:#73869e;font-size:10px}.quote-base b{color:#526b86}.quote-margin{display:flex;align-items:center;gap:8px;margin-top:12px;padding:11px;border-radius:8px;background:#eaf8ef;color:#248354}.quote-margin.warn{background:#fff3df;color:#ad6511}.quote-margin strong{font-size:12px}.quote-margin small{margin-left:auto;font-size:9px}@media(max-width:580px){.quote-fields{grid-template-columns:1fr}}</style><div class="quote-dialog"><p class="intro">Define el valor que utilizarán las operaciones del POS.</p>${todas}<label class="field">Agencia<select id="quote-agency">${agencias}</select></label><label class="field">Moneda<select id="quote-currency">${monedas}</select></label><div class="quote-preview"><img id="quote-flag" src="${this.flagUrl(moneda)}" alt="${this.escapeHtml(moneda)}"><span><b id="quote-code">${this.escapeHtml(moneda)}</b><small id="quote-name">${this.escapeHtml(descripcion)}</small></span></div><div class="quote-fields"><label class="field">Compra BOB<input id="quote-buy" type="number" min="0" step="0.00001" value="${compra}"></label><label class="field">Venta BOB<input id="quote-sell" type="number" min="0" step="0.00001" value="${venta}"></label></div><p class="quote-hint">Máximo 5 decimales. La tasa debe ser mayor a cero.</p><div class="quote-base"><span>Valor base compra</span><b id="quote-base-buy">${baseCompra.toFixed(5)}</b><span>Valor base venta</span><b id="quote-base-sell">${baseVenta.toFixed(5)}</b></div><div id="quote-margin" class="quote-margin"><strong id="quote-margin-text">Margen: 0.00% usado</strong><small>Comparado contra el valor base</small></div></div>`;
  }

  private vincularDialogCotizacion(): void {
    const root=Swal.getHtmlContainer(); if(!root) return;
    const agency=root.querySelector<HTMLSelectElement>('#quote-agency')!; const currency=root.querySelector<HTMLSelectElement>('#quote-currency')!;
    const all=root.querySelector<HTMLInputElement>('#quote-all'); const buy=root.querySelector<HTMLInputElement>('#quote-buy')!; const sell=root.querySelector<HTMLInputElement>('#quote-sell')!;
    const refresh=(populate:boolean)=>{ const rate=this.buscarTasa(+agency.value,+currency.value) || this.monedasDisponibles.find(m=>m.id_moneda===+currency.value) || null; if(!rate)return; const code=root.querySelector<HTMLElement>('#quote-code')!; const name=root.querySelector<HTMLElement>('#quote-name')!; const flag=root.querySelector<HTMLImageElement>('#quote-flag')!; code.textContent=rate.moneda;name.textContent=rate.moneda_desc;flag.src=this.flagUrl(rate.moneda);flag.alt=rate.moneda; root.querySelector<HTMLElement>('#quote-base-buy')!.textContent=(rate.valor_base_compra||0).toFixed(5);root.querySelector<HTMLElement>('#quote-base-sell')!.textContent=(rate.valor_base_venta||0).toFixed(5); if(populate){buy.value=String(rate.compra_bob||0);sell.value=String(rate.venta_bob||0);} this.actualizarMargenDialog(); };
    agency.addEventListener('change',()=>refresh(true)); currency.addEventListener('change',()=>refresh(true)); buy.addEventListener('input',()=>this.actualizarMargenDialog()); sell.addEventListener('input',()=>this.actualizarMargenDialog());
    all?.addEventListener('change',()=>{agency.disabled=!!all.checked;this.actualizarMargenDialog();}); this.actualizarMargenDialog();
  }

  private actualizarMargenDialog(): void {
    const root=Swal.getHtmlContainer(); if(!root)return; const buy=+(root.querySelector<HTMLInputElement>('#quote-buy')?.value||0);const sell=+(root.querySelector<HTMLInputElement>('#quote-sell')?.value||0);const baseBuy=+(root.querySelector<HTMLElement>('#quote-base-buy')?.textContent||0);const baseSell=+(root.querySelector<HTMLElement>('#quote-base-sell')?.textContent||0);const pct=Math.max(baseBuy>0?Math.abs(buy-baseBuy)/baseBuy*100:0,baseSell>0?Math.abs(sell-baseSell)/baseSell*100:0);const box=root.querySelector<HTMLElement>('#quote-margin');const text=root.querySelector<HTMLElement>('#quote-margin-text');if(text)text.textContent=`Margen: ${pct.toFixed(2)}% usado`;box?.classList.toggle('warn',pct>3);
  }

  private recogerDialogCotizacion(): {id_agencia:number;id_moneda:number;compra_bob:number;venta_bob:number;todas_agencias:boolean}|undefined {
    const root=Swal.getHtmlContainer();if(!root)return;const todas=!!root.querySelector<HTMLInputElement>('#quote-all')?.checked;const data={id_agencia:+(root.querySelector<HTMLSelectElement>('#quote-agency')?.value||0),id_moneda:+(root.querySelector<HTMLSelectElement>('#quote-currency')?.value||0),compra_bob:+(root.querySelector<HTMLInputElement>('#quote-buy')?.value||0),venta_bob:+(root.querySelector<HTMLInputElement>('#quote-sell')?.value||0),todas_agencias:todas};if((!todas&&!data.id_agencia)||!data.id_moneda||data.compra_bob<=0||data.venta_bob<=0){Swal.showValidationMessage('Completa agencia, moneda y ambas tasas.');return}if(data.venta_bob<data.compra_bob){Swal.showValidationMessage('La venta no puede ser menor que la compra.');return}return data;
  }

  private buscarTasa(idAgencia:number,idMoneda:number): TasaVigente|null { return this.tasas.find(t=>t.id_agencia===idAgencia&&t.id_moneda===idMoneda) || this.tasas.find(t=>t.id_moneda===idMoneda) || null; }
  private escapeHtml(value:string):string{return String(value||'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]||c));}
  onTodasAgenciasChange(): void { if (this.todasAgencias) this.draft.id_agencia=0; else if (!this.draft.id_agencia) this.draft.id_agencia=this.agenciaSeleccionada || this.agencias[0]?.id_agencia || 0; }
  cerrarEditor(): void { this.editor=null; }
  guardar(): void { if ((!this.todasAgencias && !this.draft.id_agencia) || !this.draft.id_moneda || this.draft.compra_bob<=0 || this.draft.venta_bob<=0) { this.snack.open('Completa agencia, moneda y ambas tasas.','Cerrar',{duration:3500}); return; } this.saving=true; this.service.actualizar({...this.draft, todas_agencias:this.todasAgencias}).subscribe({ next:d=>{this.data=d;this.tasas=d.tasas;this.auditoria=d.auditoria;this.saving=false;this.editor=null;this.snack.open(this.todasAgencias ? 'Cotización publicada en todas las agencias.' : 'Cotización publicada correctamente.','Cerrar',{duration:3500});}, error:e=>{this.saving=false;this.snack.open(e.message,'Cerrar',{duration:5000});} }); }
  margenExcedido(): boolean { if (!this.editor) return false; const base=Math.max(this.editor.valor_base_compra || 0,this.editor.valor_base_venta || 0); return base>0 && (Math.abs(this.draft.compra_bob-base)>base*.03 || Math.abs(this.draft.venta_bob-base)>base*.03); }
  margenTexto(): string { if (!this.editor) return 'Se calculará al publicar'; const base=Math.max(this.editor.valor_base_compra || 0,this.editor.valor_base_venta || 0); if (!base) return 'Sin valor base'; const pct=Math.max(Math.abs(this.draft.compra_bob-base),Math.abs(this.draft.venta_bob-base))/base*100; return `${pct.toFixed(2)}% usado`; }
  formatDate(value: string | null | undefined): string { return value ? value.substring(0,16).replace('T',' ') : '—'; }
  private readonly paisMoneda: Record<string, string> = {
    USD:'us', EUR:'eu', BRL:'br', ARS:'ar', PEN:'pe', CLP:'cl', PYG:'py', GBP:'gb', JPY:'jp', CAD:'ca',
    MXN:'mx', COP:'co', UYU:'uy', BOB:'bo', CHF:'ch', AUD:'au', CNY:'cn', KRW:'kr', SEK:'se', NOK:'no',
    DKK:'dk', NZD:'nz', ZAR:'za', INR:'in', TWD:'tw',
  };

  flagUrl(moneda: string): string {
    const code = this.paisMoneda[moneda];
    return code ? `https://flagcdn.com/w40/${code}.png` : '';
  }
}
