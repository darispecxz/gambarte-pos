import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ManualesIndiceComponent } from './manuales-indice.component';
import { ManualesImprimirComponent } from './manuales-imprimir.component';
import { ManualLecturaComponent } from './manual-lectura.component';

type GuiaGiro = 'enviar' | 'reportes';

@Component({
  selector: 'app-manuales-giro-internacional',
  standalone: true,
  imports: [RouterLink, ManualesIndiceComponent, ManualesImprimirComponent, ManualLecturaComponent],
  template: `
    <main class="manual-page manual-workspace">
      <header class="page-heading">
        <span class="heading-icon">◎</span>
        <div><small>MANUALES DEL SISTEMA · GIRO INTERNACIONAL</small><h1>Guía de {{ title }}</h1><p>Instrucciones visuales basadas en las pantallas de Giro Internacional.</p></div>
        <app-manuales-imprimir></app-manuales-imprimir>
      </header>

      <div class="layout manual-layout">
        <app-manuales-indice></app-manuales-indice>

        <article class="document">
          <div class="doc-top"><span>GIRO INTERNACIONAL</span><span>Guía paso a paso</span></div>
          <h2>{{ title }}</h2>

          @if (guia === 'enviar') {
            <p class="intro">Registra el envío de dinero desde Bolivia a Chile y revisa importes, comisiones y datos del destinatario antes de confirmar.</p>
            <div class="notice"><b>Antes de empezar</b><span>Ten a mano el documento del remitente, los datos del beneficiario y la información de pago en Chile. Verifica los datos antes de registrar.</span></div>

            <section class="guide">
              <h3>1. Identifica al remitente</h3>
              <div class="section-card">
                <div class="screen-heading"><span class="screen-icon">◎</span><div><b>Giro Internacional</b><small>Envío de dinero al exterior</small></div></div>
                <div class="stepper"><span class="current"><i>1</i>Cliente</span><b></b><span><i>2</i>Destinatario</span><b></b><span><i>3</i>Operación</span><b></b><span><i>4</i>Resultado</span></div>
                <div class="panel-title">Datos del Remitente</div>
                <div class="field-grid three">
                  <div class="field"><small>Tipo Documento</small><b>CEDULA DE IDENTIDAD</b><i>⌄</i></div>
                  <div class="annotated"><span class="figure-callout">1 <b>Ingresa el documento</b></span><div class="field"><small>Nro. Documento</small><b>12345678</b></div></div>
                  <div class="annotated"><span class="figure-callout">2 <b>Selecciona expedición</b></span><div class="field"><small>Expedición</small><b>LA PAZ</b><i>⌄</i></div></div>
                </div>
                <div class="found-client"><b>✓</b><span><strong>DENNIS ARISPE</strong><small>70000000 · LA PAZ</small></span><em>Cliente encontrado</em></div>
                <div class="new-client-hint">Si no existe, el sistema mostrará “Cliente nuevo” y habilitará los datos personales: nombres, apellidos, fecha de nacimiento, país, actividad económica, domicilio y celular.</div>
                <div class="actions"><span>Continuar　›</span></div>
                <p class="caption"><i>1</i> Escribe el número de documento. <i>2</i> Elige la expedición cuando corresponda. Revisa el cliente encontrado o completa sus datos si es nuevo; luego pulsa Continuar.</p>
              </div>
            </section>

            <section class="guide">
              <h3>2. Registra al beneficiario y su forma de pago en Chile</h3>
              <div class="section-card">
                <div class="panel-head"><div><small>PASO 2 DE 4</small><h4>Datos del Beneficiario (Destinatario)</h4></div><span class="back-button">‹　Volver</span></div>
                <div class="contacts"><div><b>Destinatarios anteriores de este cliente</b><small>Selecciona un contacto guardado o registra uno nuevo.</small></div><span class="outline-button">♧　Abrir libreta</span></div>
                <div class="field-grid three">
                  <div class="field"><small>Nombres *</small><b>JUAN CARLOS</b></div><div class="field"><small>Apellido Paterno *</small><b>LAZO</b></div><div class="field"><small>Apellido Materno</small><b>POMA</b></div>
                  <div class="field"><small>Celular</small><b>+56 9 1234 5678</b></div><div class="field"><small>Domicilio</small><b>CALAMA, CHILE</b></div><div class="field"><small>Email (opcional)</small><b>correo&#64;ejemplo.cl</b></div>
                  <div class="field"><small>Documento Destinatario</small><b>12.345.678-9</b></div>
                </div>
                <div class="payment-panel"><h4>Forma de Pago en Chile</h4><div class="field-grid three"><div class="annotated"><span class="figure-callout">3 <b>Selecciona el método</b></span><div class="field"><small>Método de Pago *</small><b>Efectivo por Ventanilla</b><i>⌄</i></div></div><div class="field muted"><small>Banco Destino</small><b>Solo para depósito</b></div><div class="field muted"><small>Nro. Cuenta</small><b>Solo para depósito</b></div></div><p>Al elegir depósito, selecciona también el banco e ingresa el número de cuenta.</p></div>
                <div class="actions"><span class="annotated"><span class="figure-callout">4 <b>Pulsa Continuar</b></span><button type="button" class="primary-button">Continuar　›</button></span></div>
                <p class="caption"><i>3</i> Selecciona un destinatario anterior desde la libreta o completa sus datos. Escoge efectivo por ventanilla o depósito; para depósito, agrega banco y cuenta. <i>4</i> Pulsa Continuar para pasar a la operación.</p>
              </div>
            </section>

            <section class="guide">
              <h3>3. Completa la operación y revisa el resumen</h3>
              <div class="section-card">
                <div class="panel-head"><div><small>PASO 3 DE 4</small><h4>Datos de la Operación</h4></div><span class="back-button">‹　Volver</span></div>
                <div class="quote-row"><div class="field"><small>Código de cotización</small><b>Ingresa un código (opcional)</b></div><span class="outline-button">Aplicar Cotización</span></div>
                <div class="field-grid three annotated-grid">
                  <div class="annotated"><span class="figure-callout">5 <b>Define moneda y destino</b></span><div class="field"><small>Moneda a Enviar *</small><b>BOB - Bolivianos</b><i>⌄</i></div></div>
                  <div class="field"><small>Destino *</small><b>CALAMA</b><i>⌄</i></div>
                  <div class="field"><small>Modo de Ingreso</small><b>Monto a Enviar (BOB)</b><i>⌄</i></div>
                  <div class="annotated"><span class="figure-callout">6 <b>Ingresa el monto</b></span><div class="field"><small>Monto a Enviar (BOB)</small><b>1,000.00</b></div></div>
                  <div class="field"><small>Tipo de Comisión</small><b>Habitual</b><i>⌄</i></div>
                  <div class="toggle-preview"><small>INCLUIR COMISIÓN</small><b>◉　No, se cobra por separado</b></div>
                </div>
                <div class="operation-summary">
                  <h4>Resumen de la operación</h4>
                  <div class="summary-block"><div class="summary-main"><span class="flag">🇧🇴</span><div><strong>1,000.00 BOB</strong><small>Tú envías desde Bolivia</small></div></div>
                    <div class="fee-total"><span>▤　Comisión total</span><b>51.50 BOB</b></div>
                    <div class="fees"><span>Comisión Gambarte <b>0.00 BOB</b></span><span>Gastos corresponsal <b>44.80 BOB</b></span><span>IVA <b>6.70 BOB</b></span></div>
                  </div>
                  <div class="summary-block recipient-summary"><span class="flag">🇨🇱</span><div><strong>84,305 CLP</strong><small>La otra persona recibe en Chile · 1 USD = 940.00 CLP</small></div><b class="equivalent">89.69 USD</b></div>
                  <div class="grand-total"><span>🇧🇴　Total a cobrar al cliente</span><b>1,058.20 BOB</b></div>
                </div>
                <p class="caption"><i>5</i> Selecciona moneda, destino y modo de ingreso. <i>6</i> Escribe el monto y revisa tipo de comisión, resumen, importe que recibe el beneficiario y total a cobrar.</p>
              </div>
            </section>

            <section class="guide">
              <h3>4. Verifica los datos y registra el envío</h3>
              <div class="confirm-preview">
                <div class="confirm-title"><span>➤</span><div><b>Confirmar envío de remesa</b><small>Revise los datos y los importes antes de registrar.</small></div></div>
                <div class="confirm-rows"><div><span>♙　Remitente</span><b>DENNIS ARISPE</b></div><div><span>▣　Documento</span><b>12345678</b></div><div><span>♧　Beneficiario</span><b>JUAN CARLOS LAZO POMA</b></div><div><span>◎　Agencia destino</span><b>CALAMA</b></div><div><span>▣　Pago en Chile</span><b>Efectivo Ventanilla</b></div><div><span>⇄　Moneda de envío</span><b>BOB</b></div><div><span>➤　Monto a enviar</span><b>1,000.00 BOB</b></div><div><span>♙　Beneficiario recibe</span><b>84,305 CLP</b></div><div><span>％　Comisión</span><b>51.50 BOB</b></div></div>
                <div class="confirm-total"><span>▣　Total a cobrar al cliente</span><b>1,058.20 BOB</b></div>
                <div class="actions"><span class="back-button">Cancelar</span><span class="annotated"><span class="figure-callout">7 <b>Confirma el envío</b></span><span class="primary-button">7　Confirmar</span></span></div>
                <p class="caption"><i>7</i> Comprueba nombres, destino, forma de pago, importes y comisión. Si todo está correcto, pulsa Confirmar para registrar la remesa.</p>
              </div>
            </section>
          } @else {
            <p class="intro">Consulta remesas enviadas y cotizaciones, aplica filtros y abre los comprobantes o detalles de cada registro.</p>
            <section class="guide">
              <h3>1. Filtra el historial de remesas</h3>
              <div class="section-card report-screen">
                <div class="screen-heading"><span class="screen-icon report-icon">▤</span><div><b>Historial de Remesas</b><small>Registros de giros internacionales</small></div><span class="count">24 remesas</span></div>
                <div class="tabs"><span class="selected">Remesas</span><span>Cotizaciones</span></div>
                <div class="filter-grid">
                  <div class="field"><small>Desde</small><b>01/11/2026</b><i>▦</i></div><div class="field"><small>Hasta</small><b>30/11/2026</b><i>▦</i></div><div class="field"><small>Estado</small><b>Todos</b><i>⌄</i></div><div class="field"><small>Código</small><b>Ej: 80672</b></div><div class="annotated"><span class="figure-callout">1 <b>Pulsa Buscar</b></span><span class="primary-button">⌕　Buscar</span></div>
                </div>
                <p class="caption"><i>1</i> Define el período y, si lo necesitas, filtra por estado o código. Pulsa Buscar para cargar los resultados.</p>
              </div>
            </section>
            <section class="guide">
              <h3>2. Revisa la lista y sus comprobantes</h3>
              <div class="section-card report-screen">
                <div class="table-tools"><span>⌕　Buscar por nombre, destino, código...</span><span class="count">24 registros</span></div>
                <div class="table-scroll"><table><thead><tr><th></th><th>Código</th><th>Fecha de Registro</th><th>Remitente</th><th>Destinatario</th><th>Destino</th><th>Mon.</th><th>Monto en BOB</th><th>% Com total</th><th>Comisión</th><th>Costos Corresp. BOB</th><th>IVA BOB</th><th>Total [BOB]</th><th>Estado</th></tr></thead><tbody><tr><td><span class="doc-icon">▤</span></td><td><b>6346840</b></td><td>02/11/2026 09:52</td><td>NICOLAS ALEJANDRO SANTIBAÑEZ</td><td>JUAN CARLOS LAZO POMA</td><td>CALAMA</td><td>BOB</td><td>1,000.00</td><td>5.15%</td><td>51.50</td><td>44.80</td><td>6.70</td><td><b>1,058.20</b></td><td><span class="status">Pendiente</span></td></tr></tbody></table></div>
                <p class="caption"><i>2</i> Usa la búsqueda rápida para reducir la lista. Los íconos al inicio abren el comprobante de envío o la factura cuando están disponibles; selecciona una fila para ver el detalle.</p>
              </div>
            </section>
            <section class="guide">
              <h3>3. Consulta las cotizaciones</h3>
              <div class="section-card report-screen">
                <div class="tabs"><span>Remesas</span><span class="selected">Cotizaciones</span></div>
                <div class="field-grid three"><div class="field"><small>Estado</small><b>Todas</b><i>⌄</i></div><div class="quote-stat"><b>8 cotizaciones</b><small>Vigentes, aplicadas o expiradas</small></div></div>
                <div class="table-scroll quote-table"><table><thead><tr><th>Código</th><th>Fecha</th><th>Cliente</th><th>Moneda</th><th>Monto</th><th>Estado</th><th>Remesa aplicada</th></tr></thead><tbody><tr><td><b>COT-2026-001</b></td><td>05/11/2026 10:24</td><td>MARÍA PÉREZ</td><td>BOB</td><td>1,000.00</td><td><span class="status">Vigente</span></td><td>—</td></tr></tbody></table></div>
                <p class="caption"><i>3</i> Cambia a Cotizaciones y filtra por estado. Revisa fecha, datos de la oferta y si ya fue aplicada a una remesa.</p>
              </div>
            </section>
          }

          <footer><span>Manual integrado en el sistema · Giro Internacional</span><a [routerLink]="guia==='enviar' ? '/remesa' : '/historial-remesa'">Ir a {{ guia==='enviar' ? 'Enviar' : 'Reportes' }} <b>→</b></a></footer>
          <app-manual-lectura [manualKey]="manualKey"></app-manual-lectura>
        </article>
      </div>
    </main>
  `,
  styles: [`
    :host{display:block;color:#172b4d}.manual-page{max-width:1500px;margin:0 auto;padding:4px 4px 30px}.page-heading{display:flex;align-items:center;gap:14px;margin:0 0 22px}.heading-icon{width:48px;height:48px;display:grid;place-items:center;border-radius:14px;background:#fff0e2;color:#df6900;font-size:26px;font-weight:700}.page-heading small{color:#b96828;font-size:9px;font-weight:800;letter-spacing:.1em}.page-heading h1{margin:2px 0 3px;color:#14213d;font-size:21px}.page-heading p{margin:0;color:#7b8da7;font-size:12px}.layout{display:grid;grid-template-columns:260px minmax(0,1fr);gap:18px;align-items:start}.index,.document{border:1px solid #e0e7ef;border-radius:13px;background:#fff;box-shadow:0 2px 8px #162a4209}.index{position:sticky;top:16px;padding:15px 12px}.index>strong{display:block;margin:2px 7px 12px;font-size:12px}.index>a{display:flex;align-items:center;gap:9px;padding:10px 8px;border-radius:8px;color:#53657c;font-size:11px;text-decoration:none}.index>a:hover,.index>a.active{background:#fff4e9;color:#ad580e;font-weight:700}.index>a span{display:grid;place-items:center;width:25px;height:25px;flex:0 0 auto;border-radius:7px;background:#f1f4f8;color:#8190a4;font-size:9px;font-weight:800}.index>a.active span{background:#ffe5c9;color:#b65c17}.index-group{margin:0 0 9px}.index-group-title{display:flex;align-items:center;gap:7px;margin:4px 7px 5px;color:#344963;font-size:9px;font-weight:800;letter-spacing:.04em;text-transform:uppercase}.index-group-title>span{display:grid;place-items:center;width:19px;height:19px;border-radius:6px;background:#f1f5f9;color:#7b8ba0;font-size:11px}.index-children{margin-left:9px;padding-left:7px;border-left:1px solid #e4eaf1}.index-children>a{display:flex;align-items:center;gap:8px;padding:7px 7px;border-radius:7px;color:#53657c;font-size:10px;text-decoration:none}.index-children>a:hover{background:#f7f9fc}.index-children>a.active{background:#fff4e9;color:#ad580e;font-weight:700}.index-children>a>span{display:grid;place-items:center;width:23px;height:23px;flex:0 0 auto;border-radius:6px;background:#f1f4f8;color:#8190a4;font-size:8px;font-weight:800}.index-children>a.active>span{background:#ffe5c9;color:#b65c17}.document{padding:20px 24px 0}.doc-top{display:flex;justify-content:space-between;padding-bottom:12px;border-bottom:1px solid #e8eef5;color:#a65d21;font-size:9px;font-weight:800;letter-spacing:.08em}.doc-top span+span{color:#8594aa;font-weight:500;letter-spacing:0}.document h2{margin:16px 0 4px;font-size:20px}.intro{margin:0 0 16px;color:#72839a;font-size:12px}.notice{display:flex;flex-direction:column;gap:4px;margin:12px 0 18px;padding:12px 14px;border:1px solid #f5d7b8;border-radius:9px;background:#fff9f2;font-size:11px}.notice b{color:#99500e}.notice span{color:#65768e;line-height:1.45}.guide{margin:18px 0}.guide h3{margin:0 0 9px;font-size:13px;color:#172b4d}.section-card{padding:17px 19px;border:1px solid #e0e7ef;border-radius:12px;background:#fff}.screen-heading{display:flex;align-items:center;gap:10px;margin-bottom:14px}.screen-icon{display:grid;place-items:center;width:38px;height:38px;border-radius:10px;background:#fff0e2;color:#db6700;font-size:22px}.screen-heading b,.screen-heading small{display:block}.screen-heading b{font-size:14px}.screen-heading small{margin-top:3px;color:#7889a1;font-size:10px}.stepper{display:flex;align-items:center;gap:9px;margin:0 0 20px;padding:10px 13px;border:1px solid #e8edf4;border-radius:9px;background:#f8fafc}.stepper>span{display:flex;align-items:center;gap:6px;color:#8a99ae;font-size:10px}.stepper>span i{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#e8edf3;font-size:10px;font-style:normal;font-weight:700}.stepper>span.current{color:#a5520c;font-weight:700}.stepper>span.current i{background:#f5820a;color:white}.stepper>b{height:1px;flex:1;background:#dce3ec}.panel-title{margin:0 0 12px;font-size:14px;font-weight:700}.field-grid{display:grid;gap:13px;margin:0 0 14px}.field-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}.field{position:relative;display:flex;align-items:center;gap:8px;min-width:0;min-height:50px;padding:10px 12px;border:1px solid #d1d5db;border-radius:5px;background:#fff;color:#202124;box-sizing:border-box;font-size:12px}.field small{position:absolute;top:-7px;left:10px;padding:0 4px;background:#fff;color:#78869a;font-size:9px;white-space:nowrap}.field b{overflow:hidden;font-size:12px;font-weight:500;text-overflow:ellipsis;white-space:nowrap}.field i{margin-left:auto;color:#68768a;font-size:12px;font-style:normal}.annotated{position:relative}.figure-callout{position:absolute;z-index:2;top:-43px;left:50%;display:inline-flex;align-items:center;gap:6px;transform:translateX(-50%);padding:5px 8px;border:1px solid #f0b273;border-radius:6px;background:#fffaf4;color:#a4510d;box-shadow:0 2px 6px #784b1e1a;font-size:8px;font-weight:700;white-space:nowrap}.figure-callout:before{content:"";position:absolute;left:50%;bottom:-5px;width:2px;height:4px;background:#e87922;transform:translateX(-50%)}.figure-callout:after{content:"";position:absolute;left:50%;bottom:-10px;border-top:5px solid #e87922;border-right:5px solid transparent;border-left:5px solid transparent;transform:translateX(-50%)}.form-grid,.annotated-grid{margin-top:52px}.found-client{display:flex;align-items:center;gap:10px;margin:10px 0;padding:10px 12px;border:1px solid #b9e8ca;border-radius:8px;background:#f1fbf5}.found-client>b{display:grid;place-items:center;width:23px;height:23px;border-radius:50%;background:#dcfce7;color:#148246}.found-client strong,.found-client small{display:block}.found-client strong{font-size:11px}.found-client small{margin-top:3px;color:#76869b;font-size:9px}.found-client em{margin-left:auto;color:#15803d;font-size:9px;font-style:normal}.new-client-hint{padding:9px 11px;border:1px solid #f1d7be;border-radius:7px;background:#fff9f2;color:#8b5a2d;font-size:10px;line-height:1.5}.actions{display:flex;justify-content:flex-end;align-items:center;gap:10px;margin-top:14px}.actions>span:not(.back-button){display:inline-flex;padding:9px 15px;border-radius:7px;background:#f5820a;color:#fff;font-size:11px;font-weight:700}.caption{margin:12px 0 0;color:#687990;font-size:10px;line-height:1.6}.caption i{display:inline-grid;place-items:center;width:16px;height:16px;margin:0 3px;border-radius:50%;background:#d96d17;color:#fff;font-size:8px;font-style:normal;font-weight:800}.panel-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.panel-head small{color:#be641a;font-size:8px;font-weight:800;letter-spacing:.08em}.panel-head h4,.payment-panel h4{margin:3px 0 0;font-size:14px}.back-button,.outline-button{display:inline-flex;align-items:center;padding:8px 12px;border:1px solid #d8e0e9;border-radius:7px;background:white;color:#52647b;font-size:10px;white-space:nowrap}.contacts{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 14px;padding:10px 12px;border:1px solid #e4eaf1;border-radius:8px;background:#f8fafc}.contacts b,.contacts small{display:block}.contacts b{font-size:10px}.contacts small{margin-top:3px;color:#8190a3;font-size:9px}.payment-panel{margin-top:14px;padding:14px;border:1px solid #e4eaf1;border-radius:9px;background:#fbfcfe}.payment-panel h4{margin:0 0 13px}.payment-panel p{margin:2px 0 0;color:#72839a;font-size:9px}.muted{background:#f6f7f9;color:#8794a5}.quote-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;margin:12px 0 22px;padding:12px;border:1px solid #b6dfff;border-radius:8px;background:#f7fbff}.quote-row .field{flex:1}.toggle-preview{display:flex;flex-direction:column;justify-content:center;gap:8px;padding:8px;color:#43536b;font-size:10px}.toggle-preview small{font-size:9px;font-weight:800}.operation-summary{margin-top:16px;padding:15px;border:1px solid #dce5ef;border-radius:10px;background:#fff}.operation-summary h4{margin:0 0 11px;font-size:13px}.summary-block{padding:11px;border:1px solid #dfe7f1;border-radius:8px}.summary-main,.recipient-summary{display:flex;align-items:center;gap:10px}.flag{font-size:17px}.summary-main strong,.summary-main small,.recipient-summary strong,.recipient-summary small{display:block}.summary-main strong,.recipient-summary strong{font-size:13px}.summary-main small,.recipient-summary small{margin-top:3px;color:#63758f;font-size:9px}.fee-total{display:flex;justify-content:space-between;margin-top:10px;padding:8px 10px;border-radius:6px;background:#fff2e6;color:#79410c;font-size:10px}.fees{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:9px 10px;color:#60738d;font-size:9px}.fees span,.fees b{display:block}.fees b{margin-top:4px;color:#1e2f49;font-size:10px}.recipient-summary{position:relative;padding:12px 10px;border-top:1px solid #e8edf3}.equivalent{margin-left:auto;color:#14213d;font-size:10px}.grand-total,.confirm-total{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:7px;padding:12px;border-radius:7px;background:#f7f5f2;font-size:10px;font-weight:700}.grand-total b,.confirm-total b{font-size:14px}.confirm-preview{max-width:760px;margin:0 auto;padding:18px;border:1px solid #e3e9f0;border-radius:13px;background:#fff;box-shadow:0 6px 22px #172b4d0d}.confirm-title{display:flex;align-items:center;gap:11px;margin-bottom:12px}.confirm-title>span{display:grid;place-items:center;width:36px;height:36px;border-radius:9px;background:#fff0df;color:#f5820a}.confirm-title b,.confirm-title small{display:block}.confirm-title b{font-size:14px}.confirm-title small{margin-top:3px;color:#718199;font-size:10px}.confirm-rows{overflow:hidden;border:1px solid #e6ecf3;border-radius:8px}.confirm-rows>div{display:flex;justify-content:space-between;gap:14px;padding:9px 11px;border-bottom:1px solid #edf1f5;font-size:10px}.confirm-rows>div:last-child{border-bottom:0}.confirm-rows span{color:#63758f}.confirm-rows b{text-align:right}.confirm-total{margin-top:10px;background:#f5820a;color:white}.actions button.primary-button{border:0;font-family:inherit;cursor:default}.primary-button{display:inline-flex;align-items:center;padding:10px 17px;border-radius:7px;background:#f5820a;color:#fff;font-size:11px;font-weight:700;white-space:nowrap}.report-screen .screen-heading{margin-bottom:13px}.report-icon{background:#e9f2ff;color:#2563a8}.count{margin-left:auto;padding:6px 10px;border-radius:16px;background:#eef3f8;color:#52657d;font-size:9px}.tabs{display:flex;gap:5px;margin:0 0 13px;padding:4px;border-radius:8px;background:#f0f2f5;width:max-content}.tabs span{padding:7px 12px;border-radius:6px;color:#52657d;font-size:10px}.tabs .selected{background:white;color:#bc5f0b;font-weight:700;box-shadow:0 1px 4px #182b441a}.filter-grid{display:grid;grid-template-columns:repeat(4,minmax(110px,1fr)) auto;gap:10px;align-items:center;padding:12px;border:1px solid #e5eaf1;border-radius:9px;background:#f8fafc}.table-tools{display:flex;justify-content:space-between;align-items:center;padding:9px 11px;border:1px solid #e5eaf1;border-bottom:0;border-radius:8px 8px 0 0;color:#8290a2;font-size:10px}.table-scroll{overflow:auto;border:1px solid #e5eaf1;border-radius:8px}.table-tools+.table-scroll{border-radius:0 0 8px 8px}.table-scroll table{width:100%;min-width:1150px;border-collapse:collapse;font-size:9px}.table-scroll th{padding:9px 7px;background:#f1f4f8;color:#607189;text-align:left;white-space:nowrap;font-size:8px;text-transform:uppercase}.table-scroll td{padding:10px 7px;border-top:1px solid #e8edf3;color:#33465f;white-space:nowrap}.doc-icon{color:#4385c0;font-size:16px}.status{display:inline-flex;padding:4px 7px;border-radius:12px;background:#fff3c4;color:#9c5b00;font-size:8px;font-weight:700}.quote-stat{display:flex;flex-direction:column;gap:4px;padding:9px 12px;color:#344761;font-size:10px}.quote-stat small{color:#7888a0}.quote-table{margin-top:12px}.document footer{display:flex;justify-content:space-between;align-items:center;margin-top:18px;padding:13px 0;border-top:1px solid #e8eef5;color:#91a0b4;font-size:10px}.document footer a{color:#a95715;font-weight:700;text-decoration:none}.document footer a b{padding-left:5px}@media(max-width:1000px){.layout{grid-template-columns:210px minmax(0,1fr);gap:12px}.document{padding:18px}.filter-grid{grid-template-columns:repeat(3,minmax(110px,1fr))}.field-grid.three{gap:11px}}@media(max-width:720px){.layout{grid-template-columns:1fr}.index{position:static}.field-grid.three{grid-template-columns:1fr 1fr}.filter-grid{grid-template-columns:1fr 1fr}.stepper{overflow:auto}.stepper>b{min-width:15px}.fees{grid-template-columns:1fr}.document{padding:16px}}
  `],
})
export class ManualesGiroInternacionalComponent {
  private route = inject(ActivatedRoute);
  guia: GuiaGiro = 'enviar';
  title = 'Enviar giro internacional';
  get manualKey(): string { return this.guia === 'enviar' ? 'enviar_giro_internacional' : 'reportes_giros'; }

  constructor() {
    this.route.queryParamMap.subscribe(params => {
      this.guia = params.get('tipo') === 'reportes' ? 'reportes' : 'enviar';
      this.title = this.guia === 'enviar' ? 'Enviar giro internacional' : 'Reportes de giros internacionales';
    });
  }
}
