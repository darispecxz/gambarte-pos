import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

interface ManualItem {
  number: string;
  title: string;
  subtitle: string;
  path: string;
  type: string;
}

interface ManualGroup {
  title: string;
  icon: string;
  items: ManualItem[];
}

@Component({
  selector: 'app-manuales-indice',
  standalone: true,
  imports: [RouterLink],
  template: `
    <aside class="manuals-index" aria-label="Índice de manuales">
      <div class="index-fixed">
        <div class="index-heading"><strong>Manuales disponibles</strong><span>{{ totalManuales }}</span></div>
        <label class="index-search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Buscar un manual" [value]="searchTerm" (input)="searchTerm = $any($event.target).value" aria-label="Buscar un manual"></label>
      </div>
      <div class="index-scroll">
        @for (group of groups; track group.title) {
          @if (visibleItems(group).length) {
            <section class="index-group">
              <button class="index-group-title" type="button" (click)="toggleGroup(group.title)" [attr.aria-expanded]="isGroupExpanded(group.title)">
                <span>{{ group.icon }}</span>{{ group.title }}<i>{{ isGroupExpanded(group.title) ? '⌃' : '⌄' }}</i>
              </button>
              @if (isGroupExpanded(group.title)) {
                <div class="index-children">
                  @for (manual of visibleItems(group); track manual.number) {
                    <a class="index-item" [routerLink]="manual.path" [queryParams]="{tipo: manual.type}"
                       [class.active]="isActive(manual)" [attr.aria-current]="isActive(manual) ? 'page' : null">
                      <span class="index-number">{{ manual.number }}</span>
                      <span class="item-copy"><strong>{{ manual.title }}</strong><small>{{ manual.subtitle }}</small></span>
                      <span class="index-chevron">›</span>
                    </a>
                  }
                </div>
              }
            </section>
          }
        }
        @if (!filteredCount) { <div class="index-empty">No hay manuales con ese nombre.</div> }
        <div class="index-upcoming"><span></span>Más guías se agregarán aquí</div>
      </div>
    </aside>
  `,
  styles: [`
    :host{display:block;min-width:0;min-height:0;height:100%}.manuals-index{display:flex;flex-direction:column;min-height:0;height:100%;box-sizing:border-box;overflow:hidden;padding:12px;border:1px solid #e0e7ef;border-radius:13px;background:#fff;box-shadow:0 2px 8px rgba(22,42,66,.035)}
    .index-fixed{flex:0 0 auto}.index-heading{display:flex;align-items:center;justify-content:space-between;padding:2px 6px 10px;color:#243a58;font-size:12px}.index-heading>span{min-width:22px;padding:3px 6px;border-radius:12px;background:#eef3f8;color:#687d98;text-align:center;font-size:10px;font-weight:700}.index-search{display:flex;align-items:center;gap:8px;height:34px;padding:0 9px;border:1px solid #dce5ef;border-radius:7px;background:#fafbfd;color:#8292a8}.index-search:focus-within{border-color:#e89442;box-shadow:0 0 0 2px #f582201a}.index-search>span{font-size:17px}.index-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#263c58;font:inherit;font-size:10px}.index-search input::placeholder{color:#91a0b4}.index-scroll{min-height:0;flex:1;overflow-y:auto;overscroll-behavior:contain;margin:9px -4px 0;padding:0 4px 4px;scrollbar-color:#cbd5e1 transparent;scrollbar-width:thin}
    .index-group{margin:0 0 7px}.index-group-title{display:flex;width:100%;align-items:center;gap:8px;margin:0 0 4px;padding:6px;border:0;border-radius:7px;background:#f5f7fa;color:#344963;text-align:left;font:inherit;font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;cursor:pointer}.index-group-title>span{display:grid;place-items:center;width:20px;height:20px;border-radius:6px;background:#eaf0f6;color:#60758f;font-size:12px}.index-group-title>i{margin-left:auto;color:#8091a7;font-size:13px;font-style:normal}.index-group-title:hover{background:#eef2f7}
    .index-children{margin-left:10px;padding-left:8px;border-left:1px solid #e4eaf1}.index-item{display:grid;grid-template-columns:25px minmax(0,1fr) 12px;align-items:center;gap:8px;padding:7px;border:1px solid transparent;border-radius:8px;color:#53657c;font-size:10px;text-decoration:none;transition:background .15s,border-color .15s,color .15s}.index-item:hover{background:#f7f9fc}.index-item.active{border-color:#f2d5b9;background:#fff4e9;color:#ad580e;font-weight:700}
    .index-number{display:grid;place-items:center;width:23px;height:23px;border-radius:6px;background:#f1f4f8;color:#8190a4;font-size:8px;font-weight:800}.index-item.active .index-number{background:#ffe5c9;color:#b65c17}.item-copy{min-width:0}.item-copy strong,.item-copy small{display:block;overflow:hidden;text-overflow:ellipsis}.item-copy strong{font-size:10px;line-height:1.3}.item-copy small{margin-top:3px;color:#8292a9;font-size:9px;font-weight:400}.index-chevron{color:#bd6b30;font-size:18px;text-align:right}.index-upcoming{display:flex;align-items:center;gap:7px;padding:8px 7px 2px;color:#98a6b8;font-size:10px}.index-upcoming>span{width:6px;height:6px;border-radius:50%;background:#cbd5e1}.index-empty{padding:14px 8px;color:#8292a9;font-size:10px;text-align:center}
    @media(max-width:860px){.manuals-index{padding:9px}.index-item{padding:6px 5px;grid-template-columns:23px minmax(0,1fr) 10px;gap:6px}.item-copy small{font-size:8px}}
  `],
})
export class ManualesIndiceComponent {
  private readonly router = inject(Router);
  searchTerm = '';
  private readonly collapsedGroups = new Set<string>();

  readonly groups: ManualGroup[] = [
    { title: 'Punto de Venta', icon: '▣', items: [
      { number: '01', title: 'Apertura de caja', subtitle: 'Inicio de jornada', path: '/manuales/apertura-cajas', type: 'apertura' },
      { number: '02', title: 'Cierre de caja', subtitle: 'Fin de jornada', path: '/manuales/apertura-cajas', type: 'cierre' },
    ] },
    { title: 'Cambios', icon: '⇄', items: [
      { number: '03', title: 'Compra de moneda', subtitle: 'Cambio', path: '/manuales/cambio', type: 'compra' },
      { number: '04', title: 'Venta de moneda', subtitle: 'Cambio', path: '/manuales/cambio', type: 'venta' },
      { number: '05', title: 'Reportes de cambio', subtitle: 'Historial', path: '/manuales/cambio', type: 'reportes' },
    ] },
    { title: 'Giro Internacional', icon: '◎', items: [
      { number: '06', title: 'Enviar giro', subtitle: 'Envío internacional', path: '/manuales/giro-internacional', type: 'enviar' },
      { number: '07', title: 'Reportes de giros', subtitle: 'Historial', path: '/manuales/giro-internacional', type: 'reportes' },
    ] },
    { title: 'Pago de Remesas', icon: '⇢', items: [
      { number: '21', title: 'Pago en efectivo', subtitle: 'Pago por ventanilla', path: '/manuales/pago-remesas', type: 'efectivo' },
      { number: '22', title: 'Pago por depósito', subtitle: 'Registro y acreditación', path: '/manuales/pago-remesas', type: 'deposito' },
      { number: '23', title: 'Reporte de pagos', subtitle: 'Consulta, filtros y detalle', path: '/manuales/pago-remesas', type: 'reporte' },
    ] },
    { title: 'Gestión Efectivo', icon: '▣', items: [
      { number: '08', title: 'Traspaso a Cajero', subtitle: 'Entre cajas abiertas', path: '/manuales/gestion-efectivo', type: 'cajero' },
      { number: '09', title: 'Operaciones de Bóveda', subtitle: 'Solicitar y enviar fondos', path: '/manuales/gestion-efectivo', type: 'boveda' },
    ] },
    { title: 'Bancos', icon: '⌂', items: [
      { number: '10', title: 'Cuentas y banca', subtitle: 'Saldos, arqueo y movimientos', path: '/manuales/bancos', type: 'cuentas' },
      { number: '11', title: 'Traspasos bancarios', subtitle: 'Entre agencias', path: '/manuales/bancos', type: 'traspasos' },
      { number: '12', title: 'Depósitos y retiros', subtitle: 'Caja y cuenta bancaria', path: '/manuales/bancos', type: 'depositos' },
      { number: '13', title: 'Movimientos bancarios', subtitle: 'Historial y exportación', path: '/manuales/bancos', type: 'movimientos' },
      { number: '14', title: 'Cheques', subtitle: 'Chequeras y ciclo del cheque', path: '/manuales/bancos', type: 'cheques' },
      { number: '15', title: 'Conciliación', subtitle: 'Extractos bancarios', path: '/manuales/bancos', type: 'conciliacion' },
    ] },
    { title: 'Egresos e Ingresos', icon: '⇅', items: [
      { number: '16', title: 'Egreso directo', subtitle: 'Salida pendiente de autorización', path: '/manuales/egresos-ingresos', type: 'egreso' },
      { number: '17', title: 'Ingreso directo', subtitle: 'Acreditación inmediata', path: '/manuales/egresos-ingresos', type: 'ingreso' },
      { number: '18', title: 'Egreso autorizado', subtitle: 'Aplicar comprobante contable', path: '/manuales/egresos-ingresos', type: 'egreso_autorizado' },
      { number: '19', title: 'Ingreso autorizado', subtitle: 'Aplicar comprobante contable', path: '/manuales/egresos-ingresos', type: 'ingreso_autorizado' },
      { number: '20', title: 'Transacción bancaria', subtitle: 'Depósito, retiro, ITF e intereses', path: '/manuales/egresos-ingresos', type: 'bancaria' },
    ] },
  ];

  readonly totalManuales = this.groups.reduce((total, group) => total + group.items.length, 0);

  get filteredCount(): number {
    return this.groups.reduce((count, group) => count + this.visibleItems(group).length, 0);
  }

  visibleItems(group: ManualGroup): ManualItem[] {
    const term = this.searchTerm.trim().toLocaleLowerCase();
    return term ? group.items.filter(item => `${item.title} ${item.subtitle}`.toLocaleLowerCase().includes(term)) : group.items;
  }

  isGroupExpanded(title: string): boolean {
    const group = this.groups.find(item => item.title === title);
    return Boolean(this.searchTerm.trim()) || Boolean(group?.items.some(item => this.isActive(item))) || !this.collapsedGroups.has(title);
  }

  toggleGroup(title: string): void {
    if (this.collapsedGroups.has(title)) this.collapsedGroups.delete(title);
    else this.collapsedGroups.add(title);
  }

  isActive(manual: ManualItem): boolean {
    const [path, query = ''] = this.router.url.split('?');
    return path === manual.path && new URLSearchParams(query).get('tipo') === manual.type;
  }
}
