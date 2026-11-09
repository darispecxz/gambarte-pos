import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ManualesIndiceComponent } from './manuales-indice.component';
import { ManualesImprimirComponent } from './manuales-imprimir.component';
import { ManualLecturaComponent } from './manual-lectura.component';

type CambioManual = 'compra' | 'venta' | 'reportes';

@Component({
  selector: 'app-manuales-cambio',
  standalone: true,
  imports: [RouterLink, ManualesIndiceComponent, ManualesImprimirComponent, ManualLecturaComponent],
  template: `
    <main class="manual-page manual-workspace">
      <header class="page-heading">
        <span class="heading-icon">$</span>
        <div><small>MANUALES DEL SISTEMA · CAMBIO</small><h1>Guía de {{ title }}</h1><p>Instrucciones visuales para realizar la operación en Gambarte.</p></div>
        <app-manuales-imprimir></app-manuales-imprimir>
      </header>

      <div class="layout manual-layout">
        <app-manuales-indice></app-manuales-indice>

        <article class="document">
          <div class="doc-top"><span>CAMBIO DE MONEDA</span><span>Guía paso a paso</span></div>
          <h2>{{ title }}</h2>
          <app-manual-lectura [manualKey]="manualKey" [videoOnly]="true"></app-manual-lectura>

          @if (manual === 'reportes') {
            <p class="intro">Consulta el historial de compras y ventas, revisa los totales y abre el detalle de una operación.</p>
            <section class="guide">
              <h3>1. Elige el período y tipo de operación</h3>
              <div class="report-screen">
                <div class="filter-bar">
                  <div class="filter-left">
                    <span class="calendar-icon">▦</span>
                    <div class="annotated"><span class="figure-callout">1 <b>Fecha inicial</b></span><div class="date-field"><small>Desde</small><strong>01/11/2026</strong><span>▦</span></div></div>
                    <div class="annotated"><span class="figure-callout">2 <b>Fecha final</b></span><div class="date-field"><small>Hasta</small><strong>30/11/2026</strong><span>▦</span></div></div>
                    <div class="annotated"><span class="figure-callout">3 <b>Filtra por tipo</b></span><div class="select-field"><small>Tipo</small><strong>Todas</strong><span>⌄</span></div></div>
                    <div class="annotated"><span class="figure-callout">4 <b>Ejecuta la búsqueda</b></span><button class="search-button">⌕　Buscar</button></div>
                  </div>
                  <span class="count-badge">24 operaciones</span>
                </div>
                <p class="caption"><i>1</i> Define desde cuándo. <i>2</i> Define hasta cuándo. <i>3</i> Selecciona Todas, Compra o Venta. <i>4</i> Pulsa Buscar.</p>
              </div>
            </section>

            <section class="guide">
              <h3>2. Revisa el resumen y encuentra la operación</h3>
              <div class="report-screen">
                <div class="summary-cards">
                  <div class="summary-card buy"><span class="summary-icon">↑</span><div><small>COMPRAS</small><b>12</b><strong>BOB 8,280.00</strong><em>USD: 1,200.00 (12)</em></div></div>
                  <div class="summary-card sell"><span class="summary-icon">↓</span><div><small>VENTAS</small><b>8</b><strong>BOB 5,520.00</strong><em>USD: 800.00 (8)</em></div></div>
                  <div class="summary-card net"><span class="summary-icon">$</span><div><small>BALANCE NETO</small><b>BOB 2,760.00</b><em>Ingreso ventas - Egreso compras</em></div></div>
                </div>
                <div class="table-wrapper">
                  <div class="table-search"><span>⌕</span><span>Buscar por nombre, documento, moneda...</span></div>
                  <div class="table-scroll"><table class="data-table">
                    <thead><tr><th></th><th>Correlativo</th><th>Agencia</th><th>Operador</th><th>Usuario Financiero</th><th>Fecha de Registro</th><th>Tipo Operación</th><th>Moneda</th><th>Monto</th><th>Tipo de Cambio Comercial</th><th>Tipo de Cambio Adquirido</th><th>Cotización Oficial - BCB</th><th>Total Operación</th><th>Diferencia [BOB]</th></tr></thead>
                    <tbody><tr><td><span class="invoice-icon">▤</span></td><td>1042 <i class="row-marker">5</i></td><td>AGENCIA 6 DE MARZO</td><td>CAJERO</td><td>MARÍA PÉREZ</td><td>05/11/2026 10:24</td><td><b class="type-buy">COMPRA</b></td><td><b class="currency">USD</b></td><td>100.00</td><td>6.90</td><td>6.90</td><td>6.96</td><td class="orange-value">690.00</td><td>6.00</td></tr></tbody>
                  </table></div>
                </div>
                <p class="caption"><i>5</i> Selecciona una fila para abrir el detalle. El ícono de documento abre la factura cuando está disponible.</p>
              </div>
            </section>

            <section class="guide">
              <h3>3. Consulta el detalle del registro</h3>
              <div class="drawer-preview">
                <div class="drawer-header"><span>＄</span><b>Detalle del Cambio</b><button>×</button></div>
                <div class="drawer-section"><strong>▤　DATOS DE LA OPERACION</strong><div class="detail-grid"><span>ID <b>#1042</b></span><span>Tipo <b class="type-buy">COMPRA</b></span><span>Agencia <b>AGENCIA 6 DE MARZO</b></span><span>Operador <b>CAJERO</b></span><span>Fecha <b>05/11/2026 10:24</b></span><span>Facturado <b class="facturado">SI</b></span></div></div>
                <div class="drawer-section"><strong>♙　CLIENTE</strong><div class="detail-grid"><span>Nombre <b>MARÍA PÉREZ</b></span><span>Documento <b>12345678</b></span><span>Teléfono <b>70000000</b></span></div></div>
                <div class="drawer-section"><strong>◷　DETALLE FINANCIERO</strong><div class="detail-grid"><span>Moneda Recibida <b>Dólar (USD)</b></span><span>Moneda Entregada <b>Boliviano (BOB)</b></span><span>Recibido <b>100.00</b></span><span>Entregado <b>690.00</b></span><span>Tipo de Cambio <b>6.90000</b></span><span>Total BOB <b class="orange-value">690.00 BOB</b></span></div></div>
              </div>
            </section>
          } @else {
            <p class="intro">{{ manual === 'compra' ? 'El cliente vende moneda extranjera y recibe bolivianos.' : 'El cliente compra moneda extranjera y entrega bolivianos.' }}</p>
            <div class="notice"><b>Antes de empezar</b><span>Ten a mano el documento del cliente y confirma la cotización vigente para la moneda que vas a cambiar.</span></div>

            <section class="guide">
              <h3>1. Selecciona la operación</h3>
              <div class="screen cambio-screen">
                <div class="cambio-header"><span class="cambio-icon">＄</span><div><b>{{ manual === 'compra' ? 'Compra de Moneda' : 'Venta de Moneda' }}</b><small>{{ manual === 'compra' ? 'El cliente vende divisa, recibe BOB' : 'El cliente compra divisa, entrega BOB' }}</small></div></div>
                <div class="section-card">
                  <h4>Tipo de Operación</h4><p>Seleccione el tipo de operación de cambio de moneda</p>
                  <div class="op-buttons">
                    <div class="op-btn compra" [class.chosen]="manual==='compra'">@if(manual==='compra'){<span class="figure-callout">1 <b>Selecciona Compra</b></span>}<span class="arrow-symbol">↑</span><b class="op-label">COMPRA</b><small>El cliente vende divisa, recibe BOB</small></div>
                    <div class="op-btn venta" [class.chosen]="manual==='venta'">@if(manual==='venta'){<span class="figure-callout">1 <b>Selecciona Venta</b></span>}<span class="arrow-symbol">↓</span><b class="op-label">VENTA</b><small>El cliente compra divisa, entrega BOB</small></div>
                  </div>
                </div>
                <p class="caption"><i>1</i> Elige la operación que corresponde al movimiento de moneda.</p>
              </div>
            </section>

            <section class="guide">
              <h3>2. Identifica al cliente</h3>
              <div class="section-card form-preview">
                <div class="section-header"><span class="op-badge" [class.buy-badge]="manual==='compra'" [class.sell-badge]="manual==='venta'">{{ manual === 'compra' ? 'COMPRA' : 'VENTA' }}</span><span class="back-button">‹　Volver</span></div>
                <h4>Identificación del Cliente</h4>
                <div class="form-grid three form-annotated">
                  <div class="mat-field"><small>Tipo Documento</small><span>▣</span><b>CÉDULA DE IDENTIDAD</b><i>⌄</i></div>
                  <div class="annotated"><span class="figure-callout">2 <b>Ingresa el documento</b></span><div class="mat-field"><small>Nro. Documento</small><span>⌖</span><b>12345678</b></div></div>
                  <div class="annotated"><span class="figure-callout">3 <b>Indica expedición</b></span><div class="mat-field"><small>Expedición</small><span>⌖</span><b>LA PAZ</b><i>⌄</i></div></div>
                </div>
                <div class="cliente-found"><b>✓</b><span><strong>MARÍA PÉREZ GUTIÉRREZ</strong><small>70000000 · ZONA CENTRAL</small></span><em>Cliente encontrado</em></div>
                <p class="branch-caption"><b>Si el sistema encuentra al cliente</b>, verifica que el nombre y los datos correspondan antes de continuar.</p>

                <div class="new-client-preview">
                  <div class="cliente-new"><span class="new-client-plus">＋</span><span><strong>Cliente nuevo — complete los datos</strong><small>El documento no está registrado. Se habilita el formulario de alta.</small></span></div>
                  <h4>Datos del Cliente</h4>
                  <div class="form-grid three new-client-fields">
                    <div class="annotated"><span class="figure-callout">Nombres <b>Obligatorio</b></span><div class="mat-field"><small>Nombres *</small><b>JUAN CARLOS</b></div></div>
                    <div class="annotated"><span class="figure-callout">Apellido paterno <b>Obligatorio</b></span><div class="mat-field"><small>Apellido Paterno *</small><b>PÉREZ</b></div></div>
                    <div class="mat-field"><small>Apellido Materno</small><b>GUTIÉRREZ</b></div>
                  </div>
                  <div class="form-grid three new-client-fields">
                    <div class="mat-field"><small>Fecha Nacimiento *</small><b>15/06/1990</b><i>▦</i></div>
                    <div class="mat-field"><small>Sexo</small><b>Seleccione</b><i>⌄</i></div>
                    <div class="mat-field"><small>País</small><b>BOLIVIA</b><i>⌄</i></div>
                  </div>
                  <div class="form-grid three new-client-fields">
                    <div class="mat-field"><small>Actividad Económica *</small><b>Seleccione</b><i>⌄</i></div>
                    <div class="mat-field"><small>Departamento</small><b>LA PAZ</b><i>⌄</i></div>
                    <div class="annotated"><span class="figure-callout">Ciudad y domicilio <b>Obligatorios</b></span><div class="mat-field"><small>Ciudad *</small><b>Seleccione</b><i>⌄</i></div></div>
                  </div>
                  <div class="form-grid three new-client-fields">
                    <div class="mat-field"><small>Zona</small><b>ZONA CENTRAL</b></div>
                    <div class="mat-field"><small>Domicilio *</small><b>AV. PRINCIPAL #123</b></div>
                    <div class="annotated"><span class="figure-callout">Celular <b>Obligatorio</b></span><div class="mat-field"><small>Celular *</small><b>＋591 70000000</b></div></div>
                  </div>
                  <div class="new-client-errors"><b>Validaciones que verás si falta información:</b><span>Los nombres son obligatorios</span><span>El apellido paterno es obligatorio</span><span>La fecha de nacimiento es obligatoria</span><span>Seleccione una ciudad</span><span>El domicilio y celular son obligatorios</span></div>
                </div>
                <p class="caption"><i>2</i> Completa el número de documento. <i>3</i> Selecciona la expedición para buscar. Si aparece “Cliente nuevo”, completa los datos obligatorios marcados con *; luego continúa con la operación.</p>
              </div>
            </section>

            <section class="guide">
              <h3>3. Ingresa los datos del cambio y la forma de cobro</h3>
              <div class="section-card form-preview operation-preview">
                <h4>Datos de la Operación</h4>
                <div class="form-grid three form-annotated">
                  <div class="annotated"><span class="figure-callout">4 <b>Elige la moneda</b></span><div class="mat-field"><small>{{ manual==='compra' ? 'Moneda Recibida' : 'Moneda a Entregar' }}</small><span>▣</span><b>USD - Dólares</b><i>⌄</i></div></div>
                  <div class="mat-field disabled"><small>Tipo de Cambio</small><span>Bs</span><b>6.9000</b></div>
                  <div class="mat-field disabled"><small>Diferencial</small><b>0.0000</b></div>
                </div>
                <div class="form-grid three form-annotated">
                  <div class="annotated"><span class="figure-callout">5 <b>Ingresa el monto</b></span><div class="mat-field"><small>Monto</small><b>100.00</b></div></div>
                  <div class="mat-field"><small>Confirmar Monto</small><b>100.00</b></div>
                  <div class="mat-field disabled"><small>Total Cambio</small><span>Bs</span><b>690.00</b></div>
                </div>
                <div class="form-grid three form-annotated">
                  <div class="mat-field disabled"><small>{{ manual==='compra' ? 'Recibido' : 'Entregado' }}</small><b>100.00</b></div>
                  <div class="annotated"><span class="figure-callout">6 <b>Registra el efectivo en BOB</b></span><div class="mat-field"><small>{{ manual==='compra' ? 'Entregado [BOB]' : 'Recibido [BOB]' }}</small><span>Bs</span><b>690.00</b></div></div>
                  <div class="mat-field disabled"><small>Cambio</small><b>0.00</b></div>
                </div>
                <div class="form-section"><b>FORMA DE COBRO AL CLIENTE</b><div class="payment-row form-annotated"><div class="mat-field"><small>Forma Pago</small><b>Efectivo</b><i>⌄</i></div><div class="mat-field"><small>Monto</small><span>Bs</span><b>690.00</b></div><span class="annotated"><span class="figure-callout">7 <b>Elige cómo recibes el pago</b></span><span class="mix-button">+ Agregar método (mixto)</span></span></div></div>
                <div class="actions-row"><span class="back-button">‹　Volver</span><span class="annotated"><span class="figure-callout">8 <b>Continúa a la confirmación</b></span><b class="register-button">✓　Registrar Operación</b></span></div>
                <p class="caption"><i>4</i> Selecciona la divisa. <i>5</i> Escribe y confirma el monto. <i>6</i> Registra el importe en BOB. <i>7</i> Indica la forma de cobro; para cobros mixtos, agrega otro método. <i>8</i> Pulsa Registrar Operación.</p>
              </div>
            </section>

            <section class="guide">
              <h3>4. Revisa y confirma la operación</h3>
              <div class="dialog-preview">
                <div class="dialog-head"><span>⇄</span><div><b>Confirmar Operación</b><small>{{ manual==='compra' ? 'Compra de moneda' : 'Venta de moneda' }} — revisá los datos</small></div></div>
                <div class="dialog-rows"><div><span>⇄　Tipo</span><b>{{ manual==='compra' ? 'COMPRA' : 'VENTA' }}</b></div><div><span>♙　Cliente</span><b>MARÍA PÉREZ GUTIÉRREZ</b></div><div><span>▣　Documento</span><b>12345678</b></div><div><span>▣　Moneda</span><b>USD - Dólares</b></div><div><span>↗　Tipo de cambio</span><b>6.90000</b></div></div>
                <div class="amount-row"><span>Monto <b>100.00</b></span><span>Recibido <b>Bs 690.00</b></span><span>Cambio <b>Bs 0.00</b></span></div>
                <div class="dialog-total"><span>TOTAL A COBRAR</span><b>690.00 <small>BOB</small></b></div>
                <div class="dialog-actions"><span class="back-button">Cancelar</span><span class="annotated"><span class="figure-callout">9 <b>Confirma y registra</b></span><b class="register-button">✓　Confirmar y registrar</b></span></div>
              </div>
              <p class="caption"><i>9</i> Comprueba tipo, cliente, moneda, importes y total. Confirma solo cuando los datos coincidan.</p>
            </section>
          }

          <footer><span>Manual integrado en el sistema · Cambio</span><a [routerLink]="manual==='reportes' ? '/historial' : '/cambio'" [queryParams]="manual==='reportes' ? {} : {op: manual==='venta' ? 'venta' : 'compra'}">Ir a {{ manual==='reportes' ? 'Reportes' : 'Cambio' }} <b>→</b></a></footer>
          <app-manual-lectura [manualKey]="manualKey" [showVideo]="false"></app-manual-lectura>
        </article>
      </div>
    </main>
  `,
  styles: [`
    :host{display:block;color:#172b4d}.manual-page{max-width:1440px;margin:0 auto;padding:4px 4px 30px}.page-heading{display:flex;align-items:center;gap:14px;margin:0 0 22px}.heading-icon{width:48px;height:48px;display:grid;place-items:center;border-radius:14px;background:#fff0e2;color:#ad580e;font-size:26px;font-weight:700}.page-heading small{color:#b96828;font-size:9px;font-weight:800;letter-spacing:.1em}.page-heading h1{margin:2px 0 3px;color:#14213d;font-size:21px}.page-heading p{margin:0;color:#7b8da7;font-size:12px}.layout{display:grid;grid-template-columns:260px minmax(0,1fr);gap:18px;align-items:start}.index,.document{border:1px solid #e0e7ef;border-radius:13px;background:#fff;box-shadow:0 2px 8px #162a4209}.index{position:sticky;top:16px;padding:15px 12px}.index>strong{display:block;margin:2px 7px 12px;font-size:12px}.index>a{display:flex;align-items:center;gap:9px;padding:10px 8px;border-radius:8px;color:#53657c;font-size:11px;text-decoration:none}.index>a:hover,.index>a.active{background:#fff4e9;color:#ad580e;font-weight:700}.index>a span{display:grid;place-items:center;width:25px;height:25px;border-radius:7px;background:#f1f4f8;color:#8190a4;font-size:9px;font-weight:800}.index>a.active span{background:#ffe5c9;color:#b65c17}.index-group{margin:0 0 9px}.index-group-title{display:flex;align-items:center;gap:7px;margin:4px 7px 5px;color:#344963;font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}.index-group-title>span{display:grid;place-items:center;width:19px;height:19px;border-radius:6px;background:#f1f5f9;color:#7b8ba0;font-size:11px}.index-children{margin-left:9px;padding-left:7px;border-left:1px solid #e4eaf1}.index-children>a{display:flex;align-items:center;gap:8px;padding:7px 7px;border-radius:7px;color:#53657c;font-size:10px;text-decoration:none}.index-children>a:hover{background:#f7f9fc}.index-children>a.active{background:#fff4e9;color:#ad580e;font-weight:700}.index-children>a>span{display:grid;place-items:center;width:23px;height:23px;flex:0 0 auto;border-radius:6px;background:#f1f4f8;color:#8190a4;font-size:8px;font-weight:800}.index-children>a.active>span{background:#ffe5c9;color:#b65c17}.document{padding:20px 24px 0}.doc-top{display:flex;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid #e8eef5;color:#a65d21;font-size:9px;font-weight:800;letter-spacing:.08em}.doc-top span+span{color:#8594aa;font-weight:500;letter-spacing:0}.document h2{margin:16px 0 4px;font-size:20px}.intro{margin:0 0 16px;color:#72839a;font-size:12px}.notice{display:flex;flex-direction:column;gap:4px;margin:12px 0 18px;padding:12px 14px;border:1px solid #f5d7b8;border-radius:9px;background:#fff9f2;font-size:11px}.notice b{color:#99500e}.notice span{color:#65768e;line-height:1.45}.guide{margin:18px 0}.guide h3{margin:0 0 9px;font-size:13px;color:#172b4d}.caption{margin:12px 0 0;color:#687990;font-size:10px;line-height:1.6}.caption i{display:inline-grid;place-items:center;width:16px;height:16px;margin:0 3px;border-radius:50%;background:#d96d17;color:#fff;font-size:8px;font-style:normal;font-weight:800}.figure-callout{position:absolute;z-index:2;top:-43px;left:50%;display:inline-flex;align-items:center;gap:6px;transform:translateX(-50%);padding:5px 8px;border:1px solid #f0b273;border-radius:6px;background:#fffaf4;color:#a4510d;box-shadow:0 2px 6px #784b1e1a;font-size:8px;font-weight:700;white-space:nowrap}.figure-callout:before{content:"";position:absolute;left:50%;bottom:-5px;width:2px;height:4px;background:#e87922;transform:translateX(-50%)}.figure-callout:after{content:"";position:absolute;left:50%;bottom:-10px;border-top:5px solid #e87922;border-right:5px solid transparent;border-left:5px solid transparent;transform:translateX(-50%)}.annotated{position:relative}.cambio-screen{padding:0;border:0;background:transparent}.cambio-header{display:flex;align-items:center;gap:11px;margin-bottom:12px;padding:12px 16px;border:1px solid #e5e7eb;border-radius:10px;background:#fff}.cambio-icon{width:40px;height:40px;display:grid;place-items:center;border-radius:10px;background:#f58634;color:#fff;font-size:21px}.cambio-header b,.cambio-header small{display:block}.cambio-header b{font-size:15px}.cambio-header small{margin-top:3px;color:#64748b;font-size:11px}.section-card{margin-bottom:12px;padding:18px 20px;border:1px solid #e5e7eb;border-radius:14px;background:#fff}.section-card h4{margin:0 0 4px;color:#14213d;font-size:16px}.section-card>p{margin:0 0 17px;color:#64748b;font-size:12px}.op-buttons{display:grid;grid-template-columns:1fr 1fr;gap:16px}.op-btn{position:relative;display:flex;min-height:150px;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:32px 20px 20px;border:2px solid #e5e7eb;border-radius:14px;background:#fff}.op-btn.chosen{border-color:#f5820a;background:#fff8f0;box-shadow:0 0 0 2px #f5820a18}.arrow-symbol{color:#16a34a;font-size:26px}.op-btn.venta .arrow-symbol{color:#dc2626}.op-label{font-size:18px;font-weight:800;color:#14213d}.op-btn small{color:#64748b;font-size:12px}.form-preview{padding:20px 22px}.section-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.op-badge{display:inline-flex;padding:4px 12px;border-radius:6px;font-size:11px;font-weight:800;letter-spacing:.04em}.buy-badge{background:#dcfce7;color:#15803d}.sell-badge{background:#fee2e2;color:#b91c1c}.back-button{display:inline-flex;align-items:center;padding:7px 12px;border:1px solid #d1d5db;border-radius:7px;color:#64748b;background:#fff;font-size:11px}.section-card h4{margin-bottom:12px}.form-grid{display:grid;gap:14px;margin:0 0 14px}.form-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}.form-annotated{margin-top:54px}.mat-field{position:relative;display:flex;align-items:center;gap:9px;min-width:0;height:54px;padding:9px 12px;border:1px solid #c9cdd2;border-radius:4px;background:#fff;color:#202124;box-sizing:border-box;font-size:14px}.mat-field small{position:absolute;top:-7px;left:11px;padding:0 4px;background:#fff;color:#777;font-size:10px;white-space:nowrap}.mat-field b{overflow:hidden;font-size:13px;font-weight:500;text-overflow:ellipsis;white-space:nowrap}.mat-field>span{color:#8b929a;font-size:15px}.mat-field>i{margin-left:auto;color:#5f6368;font-size:12px;font-style:normal}.mat-field.disabled{background:#f8fafc;color:#64748b}.cliente-found{display:flex;align-items:center;gap:10px;margin-top:14px;padding:12px;border:1px solid #bbebca;border-radius:9px;background:#f2fbf5}.cliente-found>b{display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:#dcfce7;color:#15803d}.cliente-found strong,.cliente-found small{display:block}.cliente-found strong{font-size:12px}.cliente-found small{margin-top:3px;color:#718198;font-size:10px}.cliente-found em{margin-left:auto;color:#15803d;font-size:10px;font-style:normal}.branch-caption{margin:7px 0 16px;color:#687990;font-size:10px;line-height:1.5}.new-client-preview{margin-top:14px;padding:16px;border:1px solid #f1d2b4;border-radius:11px;background:#fffaf5}.cliente-new{display:flex;align-items:center;gap:10px;margin-bottom:16px;padding:11px 13px;border:1px solid #f4d4b7;border-radius:8px;background:#fff3e6;color:#9a4e0c}.new-client-plus{display:grid;place-items:center;width:27px;height:27px;flex:0 0 auto;border-radius:50%;background:#ffe3c7;color:#bd5b0b;font-size:20px;font-weight:700}.cliente-new strong,.cliente-new small{display:block}.cliente-new strong{font-size:11px}.cliente-new small{margin-top:3px;color:#76869b;font-size:9px}.new-client-preview h4{margin:0 0 8px!important;font-size:13px!important}.new-client-fields{margin-top:48px!important;margin-bottom:12px!important}.new-client-errors{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:8px;padding:9px 11px;border:1px solid #f4cccc;border-radius:8px;background:#fff6f5;color:#9d3730;font-size:9px}.new-client-errors b{width:100%;font-size:9px}.new-client-errors span{padding:4px 7px;border-radius:5px;background:#fde8e7}.operation-preview h4{margin:0 0 5px;font-size:17px}.form-section{margin-top:18px;padding-top:14px;border-top:1px solid #e5e7eb}.form-section> b{display:block;margin-bottom:12px;color:#94a3b8;font-size:11px;letter-spacing:.04em}.payment-row{display:grid;grid-template-columns:1fr 1fr auto;align-items:center;gap:14px;margin-top:55px}.mix-button{color:#f58634;font-size:11px;font-weight:600;white-space:nowrap}.actions-row{display:flex;justify-content:flex-end;align-items:center;gap:10px;margin-top:16px;padding-top:15px;border-top:1px solid #f1f5f9}.register-button{position:relative;display:inline-flex;align-items:center;padding:10px 17px;border-radius:9px;background:#f5820a;color:#fff;font-size:12px;font-weight:700;white-space:nowrap}.dialog-preview{max-width:640px;margin:0 auto;padding:21px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;box-shadow:0 15px 45px #172b4d1c}.dialog-head{display:flex;align-items:center;gap:12px;margin-bottom:16px}.dialog-head>span{display:grid;place-items:center;width:40px;height:40px;border-radius:10px;background:#fde8d0;color:#f58634;font-size:22px}.dialog-head b,.dialog-head small{display:block}.dialog-head b{font-size:16px}.dialog-head small{margin-top:3px;color:#8a8a8a;font-size:11px}.dialog-rows{overflow:hidden;border:1px solid #ececec;border-radius:12px}.dialog-rows>div{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:9px 12px;border-bottom:1px solid #f3f3f3;font-size:11px}.dialog-rows>div:last-child{border-bottom:0}.dialog-rows span{color:#8a8a8a;white-space:nowrap}.dialog-rows b{text-align:right}.amount-row{display:flex;gap:9px;margin-top:12px}.amount-row>span{display:flex;flex:1;flex-direction:column;gap:4px;padding:9px 11px;border-radius:9px;background:#f8f8f8;color:#8a8a8a;font-size:9px;text-transform:uppercase}.amount-row b{color:#373435;font-size:13px}.dialog-total{display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding:13px 16px;border-radius:12px;background:linear-gradient(135deg,#f58634,#e0701a);color:#fff}.dialog-total span{font-size:10px;letter-spacing:.05em}.dialog-total>b{font-size:22px}.dialog-total small{font-size:11px}.dialog-actions{display:flex;justify-content:flex-end;align-items:center;gap:10px;margin-top:18px}.report-screen{padding:14px;border:1px solid #e5e7eb;border-radius:12px;background:#fff}.filter-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:13px 15px;border:1px solid #e5e7eb;border-radius:12px;background:#fff}.filter-left{display:flex;align-items:center;gap:11px;flex-wrap:wrap}.calendar-icon{color:#94a3b8}.date-field,.select-field{position:relative;display:grid;grid-template-columns:1fr auto;align-items:center;min-width:145px;padding:7px 10px;border:1px solid #d1d5db;border-radius:7px;background:#fff}.date-field small,.select-field small{grid-column:1/3;margin-bottom:3px;color:#94a3b8;font-size:9px}.date-field strong,.select-field strong{font-size:12px;font-weight:500}.date-field>span,.select-field>span{color:#718198}.search-button{padding:9px 15px;border:0;border-radius:8px;background:#14213d;color:#fff;font-size:12px;font-weight:600;white-space:nowrap}.count-badge{padding:6px 10px;border-radius:18px;background:#f1f5f9;color:#52657d;font-size:10px}.summary-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:14px 0}.summary-card{display:flex;gap:12px;min-width:0;padding:14px;border:1px solid #e5e7eb;border-radius:12px;background:#fff}.summary-icon{display:grid;place-items:center;width:40px;height:40px;flex:0 0 auto;border-radius:9px;font-size:20px}.summary-card.buy .summary-icon{background:#dcfce7;color:#15803d}.summary-card.sell .summary-icon{background:#fee2e2;color:#b91c1c}.summary-card.net .summary-icon{background:#e0f2fe;color:#0369a1}.summary-card small,.summary-card b,.summary-card strong,.summary-card em{display:block}.summary-card small{color:#94a3b8;font-size:9px;font-weight:700}.summary-card b{color:#14213d;font-size:19px}.summary-card.net b{margin:4px 0;font-size:14px}.summary-card strong{color:#f5820a;font-size:11px}.summary-card em{color:#64748b;font-size:9px;font-style:normal}.table-wrapper{overflow:hidden;border:1px solid #dbe3ec;border-radius:12px;background:#fff;box-shadow:0 3px 12px #14213d0f}.table-search{display:flex;align-items:center;gap:9px;min-height:40px;padding:8px 13px;border-bottom:1px solid #e8edf3;color:#94a3b8;font-size:11px}.table-scroll{overflow:auto}.data-table{width:100%;min-width:1250px;table-layout:fixed;border-collapse:collapse;font-size:9px}.data-table thead{background:#edf2f7}.data-table th{padding:8px 5px;border-bottom:1px solid #cbd5e1;color:#263a55;font-size:8px;line-height:1.15;text-align:center;text-transform:uppercase;vertical-align:middle}.data-table td{position:relative;overflow:hidden;padding:9px 5px;border-bottom:1px solid #edf1f5;color:#334155;text-align:center;text-overflow:ellipsis;white-space:nowrap}.data-table tbody tr:nth-child(even){background:#fafbfc}.type-buy,.type-sale{padding:3px 6px;border-radius:5px;background:#dcfce7;color:#15803d;font-size:8px}.type-sale{background:#fee2e2;color:#b91c1c}.currency{padding:2px 6px;border-radius:4px;background:#e0f2fe;color:#0369a1}.orange-value{color:#f5820a;font-weight:700}.invoice-icon{color:#e35c48}.row-marker{position:absolute;top:0;right:3px;display:grid;place-items:center;width:16px;height:16px;border-radius:50%;background:#d96d17;color:white;font-size:8px;font-style:normal}.drawer-preview{max-width:510px;margin-left:auto;border:1px solid #e0e7ef;border-radius:12px;background:#fff;box-shadow:0 4px 18px #172b4d12}.drawer-header{display:flex;align-items:center;gap:10px;padding:13px 15px;border-bottom:1px solid #e8eef5}.drawer-header>span{color:#f58634}.drawer-header>b{font-size:13px}.drawer-header button{margin-left:auto;border:0;border-radius:6px;background:#f1f5f9;color:#64748b;font-size:20px}.drawer-section{padding:14px 15px;border-bottom:1px solid #edf1f5}.drawer-section>strong{display:block;margin-bottom:11px;color:#8493a8;font-size:9px}.detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.detail-grid span{display:flex;flex-direction:column;gap:4px;color:#8a97a8;font-size:9px}.detail-grid b{color:#233650;font-size:10px}.facturado{color:#15803d!important}.type-buy{background:#dcfce7;color:#15803d}.type-sale{background:#fee2e2;color:#b91c1c}.caption{margin-top:12px}.document footer{display:flex;justify-content:space-between;align-items:center;margin-top:18px;padding:13px 0;border-top:1px solid #e8eef5;color:#91a0b4;font-size:10px}.document footer a{color:#a95715;font-weight:700;text-decoration:none}.document footer a b{padding-left:5px}@media(max-width:1000px){.layout{grid-template-columns:210px minmax(0,1fr);gap:12px}.document{padding:18px}.filter-left{align-items:stretch}.date-field,.select-field{min-width:120px}}@media(max-width:720px){.layout{grid-template-columns:1fr}.index{position:static}.form-grid.three{grid-template-columns:1fr 1fr}.payment-row{grid-template-columns:1fr 1fr}.summary-cards{grid-template-columns:1fr}.filter-left{display:grid;grid-template-columns:1fr 1fr;width:100%}.calendar-icon{display:none}.filter-bar{align-items:stretch}.count-badge{align-self:flex-start}}
  `],
})
export class ManualesCambioComponent {
  private readonly route = inject(ActivatedRoute);
  manual: CambioManual = 'compra';
  get manualKey(): string { return ({ compra: 'compra_moneda', venta: 'venta_moneda', reportes: 'reportes_cambio' } as const)[this.manual]; }

  constructor() {
    this.route.queryParamMap.subscribe(params => {
      const value = params.get('tipo');
      this.manual = value === 'venta' || value === 'reportes' ? value : 'compra';
    });
  }

  get title(): string {
    return this.manual === 'reportes' ? 'Reportes de Cambio' : `${this.manual === 'compra' ? 'Compra' : 'Venta'} de Moneda`;
  }
}
