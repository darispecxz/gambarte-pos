import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ManualesIndiceComponent } from './manuales-indice.component';
import { ManualesImprimirComponent } from './manuales-imprimir.component';
import { ManualLecturaComponent } from './manual-lectura.component';

@Component({
  selector: 'app-manuales-efectivo',
  standalone: true,
  imports: [RouterLink, ManualesIndiceComponent, ManualesImprimirComponent, ManualLecturaComponent],
  template: `
    <main class="manual-page manual-workspace">
      <header class="page-heading">
        <span class="heading-icon">▣</span>
        <div><small>CENTRO DE AYUDA · GESTIÓN EFECTIVO</small><h1>Guías de movimientos de efectivo</h1><p>Instrucciones para transferir efectivo entre cajas y operar con las bóvedas.</p></div>
        <app-manuales-imprimir></app-manuales-imprimir>
      </header>

      <div class="layout manual-layout">
        <app-manuales-indice></app-manuales-indice>
        <article class="document">
          <div class="doc-top"><span>GESTIÓN EFECTIVO</span><span>Guía paso a paso</span></div>
          <div class="title-row">
            <span class="title-icon">{{ isCajero ? '⇄' : '▣' }}</span>
            <div><h2>{{ isCajero ? 'Traspaso a Cajero' : 'Operaciones de Bóveda' }}</h2><p>{{ isCajero ? 'Envía efectivo desde tu caja a otra caja abierta de la misma moneda.' : 'Solicita efectivo para tu caja o envía fondos a la bóveda de tu agencia u otra agencia.' }}</p></div>
          </div>
          <app-manual-lectura [manualKey]="manualKey" [videoOnly]="true"></app-manual-lectura>

          <section class="notice" [class.notice-blue]="isCajero"><b>{{ isCajero ? 'Antes de empezar' : 'Importante' }}</b><span>{{ isCajero ? 'Debes tener una caja abierta. El cajero destino también debe tener una caja abierta en la misma moneda.' : 'Debes tener una caja abierta. Solicitar fondos acredita la caja; enviar a bóveda descuenta el efectivo contado y deja el movimiento pendiente de recepción según el flujo de la agencia.' }}</span></section>

          @if (isCajero) {
            <figure class="visual-card">
              <figcaption><span class="step-number">01</span><span><b>Abre Traspaso a Cajero</b><small>Entra a Gestión Efectivo → Traspaso a Cajero y pulsa “Nuevo traspaso”.</small></span></figcaption>
              <div class="screen">
                <div class="screen-title"><span class="orange-icon">⇄</span><span><b>Traspaso a Cajero</b><small>Consulta y registra transferencias entre cajas abiertas.</small></span><div class="action-annotation"><em class="callout">1　Pulsa para iniciar</em><svg class="annotation-arrow action-arrow" viewBox="0 0 24 30" aria-hidden="true"><path d="M12 1v22m0 0-7-8m7 8 7-8"/></svg><button class="marked-control">＋ Nuevo traspaso<i class="target-pin">1</i></button></div></div>
                <div class="screen-filters"><span>⌕　Buscar operación, destino o concepto</span><span>Moneda　Todas　⌄</span><span>Tipo de movimiento　Todos　⌄</span><span>Desde　01/11/2026</span><span>Hasta　05/11/2026</span><button>Buscar</button></div>
                <div class="empty-row"><span>⇄</span><b>Traspasos registrados</b><small>Selecciona un movimiento para consultar el detalle.</small></div>
              </div>
            </figure>

            <figure class="visual-card">
              <figcaption><span class="step-number">02</span><span><b>Selecciona origen y destino</b><small>Elige la caja de trabajo y luego la caja abierta que recibirá el efectivo.</small></span></figcaption>
              <div class="screen drawer-screen">
                <div class="drawer-head blue"><span class="drawer-icon">⇄</span><span><b>Traspaso a cajero</b><small>Completa los datos para registrar el movimiento.</small></span><i>×</i></div>
                <div class="drawer-body">
                  <div class="context"><span>▣　<b>Caja de trabajo</b><small>　Selecciona la caja abierta</small></span><strong>BOB　⌄</strong><em>Saldo actual · Caja 29<br><b>61,550.00 BOB</b></em></div>
                  <div class="flow"><span class="origin"><b>ORIGEN</b><strong>▣　Caja 29 · BOB</strong></span><i>→</i><span class="destination"><b>DESTINO</b><strong>▣　Caja 31 · Cajero</strong></span></div>
                  <div class="field-line marked-control"><label>Caja destino</label><em class="callout">2　Selecciona la caja receptora</em><svg class="annotation-arrow field-arrow" viewBox="0 0 24 30" aria-hidden="true"><path d="M12 1v22m0 0-7-8m7 8 7-8"/></svg><div class="target-field">Selecciona una caja abierta con la misma moneda　⌄<i class="target-pin">2</i></div><small>Debe estar abierta y usar la misma moneda que la caja de origen.</small></div>
                  <div class="field-columns"><div class="field-line"><label>Monto a traspasar <small>BOB</small></label><div>1,500.00</div></div><div class="field-line"><label>Concepto <small>· opcional</small></label><div>Motivo del movimiento</div></div></div>
                  <div class="denom"><b>Billetes y monedas traspasados</b><small>El total contado debe coincidir con el monto.</small><div class="denom-annotations"><span class="denom-annotation package-label">3　Paquetes / fajos</span><span class="denom-annotation unit-label">4　Unidades sueltas</span><svg class="denom-arrows" viewBox="0 0 1000 70" preserveAspectRatio="none" aria-hidden="true"><path d="M405 1V60m0 0-8-10m8 10 8-10M635 1V60m0 0-8-10m8 10 8-10"/></svg></div><div class="denom-grid"><span>VALOR</span><span>PAQUETE</span><span>UNIDAD</span><span>TOTAL · BOB</span><b>200.00</b><i>0</i><i>0</i><span>0.00</span><b>100.00</b><i class="marked-input">7<i class="target-pin">3</i></i><i class="marked-input">1<i class="target-pin">4</i></i><span>1,500.00</span></div></div>
                  <footer><button>Cancelar</button><button class="primary">Registrar movimiento</button></footer>
                </div>
              </div>
            </figure>

            <section class="steps"><h3>Pasos para completar el traspaso</h3>
              <div><b>1</b><span><strong>Elige la caja de trabajo</strong><small>Si tienes más de una caja abierta, selecciona la que entregará el efectivo. Verifica moneda y saldo disponible.</small></span></div>
              <div><b>2</b><span><strong>Elige la caja destino</strong><small>Selecciona otra caja abierta de la misma moneda. Si no aparece, confirma que el cajero abrió su caja y que ambas usan la misma moneda.</small></span></div>
              <div><b>3</b><span><strong>Ingresa monto y concepto</strong><small>El concepto es opcional y ayuda a identificar el motivo del movimiento.</small></span></div>
              <div><b>4</b><span><strong>Registra el efectivo entregado</strong><small>Completa paquetes/fajos y unidades por denominación. Revisa que el total contado coincida con el monto del traspaso.</small></span></div>
              <div><b>5</b><span><strong>Registra y revisa el detalle</strong><small>Pulsa “Registrar movimiento”. Luego selecciona el registro en la lista para revisar origen, destino, importe, fecha y concepto.</small></span></div>
            </section>
          } @else {
            <figure class="visual-card">
              <figcaption><span class="step-number">01</span><span><b>Consulta movimientos de bóveda</b><small>Filtra por texto, moneda, tipo y fechas. El período inicial corresponde al mes en curso.</small></span></figcaption>
              <div class="screen">
                <div class="screen-title"><span class="orange-icon">▣</span><span><b>Operaciones de Bóveda</b><small>Solicita efectivo o envía fondos de caja a la bóveda que elijas.</small></span><div class="action-annotation"><em class="callout">1　Pulsa para ver las operaciones</em><svg class="annotation-arrow action-arrow" viewBox="0 0 24 30" aria-hidden="true"><path d="M12 1v22m0 0-7-8m7 8 7-8"/></svg><button class="marked-control">＋ Nueva operación<i class="target-pin">1</i></button></div></div>
                <div class="screen-filters"><span>⌕　Buscar operación, destino o concepto</span><span>Moneda　Todas　⌄</span><span>Tipo de movimiento　Todos　⌄</span><span>Desde　01/11/2026</span><span>Hasta　05/11/2026</span><button>Buscar</button></div>
                <div class="movement"><span class="row-icon">▣</span><span><b>Solicitud de fondos</b><small>05/11/2026 09:15 · Caja 29 · BOB · Bóveda → Caja</small></span><strong>+1,500.00 BOB</strong><i>›</i></div>
                <div class="movement"><span class="row-icon out">↗</span><span><b>Envío a bóveda <em>Devolución a bóveda</em></b><small>04/11/2026 16:20 · Caja 29 · BOB · Caja → Agencia 6 de Marzo</small></span><strong class="negative">−500.00 BOB</strong><i>›</i></div>
                <div class="movement"><span class="row-icon out">↗</span><span><b>Envío a bóveda <em class="external">Traspaso entre agencias</em></b><small>03/11/2026 14:02 · Caja 29 · USD · Caja → Agencia Cochabamba Central</small></span><strong class="negative">−150.00 USD</strong><i>›</i></div>
              </div>
            </figure>

            <figure class="visual-card">
              <figcaption><span class="step-number">02</span><span><b>Elige el tipo de operación</b><small>Después de “Nueva operación”, selecciona Solicitar fondos o Enviar a bóveda en el drawer.</small></span></figcaption>
              <div class="screen operation-screen">
                <div class="drawer-head"><span class="drawer-icon cash-icon">▣</span><span><b>Nuevo movimiento</b><small>Elige el tipo de operación que deseas registrar.</small></span><i>×</i></div>
                <div class="drawer-body">
                  <div class="context operation-context"><div class="work-picker"><span>▣　<b>Caja de trabajo</b><small>　Selecciona la caja abierta</small></span><strong>BOB　⌄</strong></div><em>Saldo actual · Caja 29<br><b>102,001.50 BOB</b></em></div>
                  <div class="operation-prompt"><b>¿Qué operación de bóveda deseas realizar?</b><small>Elige una opción para continuar con Caja 29 · BOB.</small></div>
                  <div class="operation-choice"><span class="option-icon green-option">⇩</span><span><strong>Solicitar fondos</strong><small>Recibir efectivo de la bóveda en esta caja.</small></span><i>›</i></div>
                  <div class="operation-choice"><span class="option-icon red-option">⇧</span><span><strong>Enviar a bóveda</strong><small>La bóveda de tu agencia se selecciona por defecto; puedes elegir otra agencia.</small></span><i>›</i></div>
                </div>
              </div>
            </figure>

            <figure class="visual-card">
              <figcaption><span class="step-number">03</span><span><b>Solicitar fondos</b><small>Usa esta opción cuando necesitas recibir efectivo de la bóveda en tu caja.</small></span></figcaption>
              <div class="screen drawer-screen">
                <div class="drawer-head green"><span class="drawer-icon">⇩</span><span><b>Solicitar fondos</b><small>Recibir efectivo de la bóveda en esta caja.</small></span><i>×</i></div>
                <div class="drawer-body">
                  <div class="context"><span>▣　<b>Caja de trabajo</b><small>　Selecciona la caja abierta</small></span><strong>BOB　⌄</strong><em>Saldo actual · Caja 29<br><b>60,000.00 BOB</b></em></div>
                  <div class="flow"><span class="origin vault"><b>ORIGEN</b><strong>▣　Bóveda de agencia</strong></span><i>→</i><span class="destination"><b>DESTINO</b><strong>▣　Caja 29 · BOB</strong></span></div>
                  <div class="field-columns"><div class="field-line"><label>Monto a solicitar <small>BOB</small></label><div>1,500.00</div></div><div class="field-line"><label>Concepto <small>· opcional</small></label><div>Motivo de la solicitud</div></div></div>
                  <div class="denom"><b>Billetes y monedas recibidos</b><small>Indica los fajos y unidades que se moverán.</small><div class="denom-annotations"><span class="denom-annotation package-label">2　Paquetes / fajos</span><span class="denom-annotation unit-label">3　Unidades sueltas</span><svg class="denom-arrows" viewBox="0 0 1000 70" preserveAspectRatio="none" aria-hidden="true"><path d="M405 1V60m0 0-8-10m8 10 8-10M635 1V60m0 0-8-10m8 10 8-10"/></svg></div><div class="denom-grid"><span>VALOR</span><span>PAQUETE</span><span>UNIDAD</span><span>TOTAL · BOB</span><b>100.00</b><i class="marked-input">7<i class="target-pin">2</i></i><i class="marked-input">1<i class="target-pin">3</i></i><span>1,500.00</span></div><div class="denom-total">Total contado <strong>1,500.00 BOB</strong></div></div>
                  <footer><button>Cancelar</button><button class="primary green-button">Registrar movimiento</button></footer>
                </div>
              </div>
            </figure>

            <figure class="visual-card">
              <figcaption><span class="step-number">04</span><span><b>Enviar a bóveda</b><small>Se descuenta de la caja. La bóveda destino recibe el monto al confirmar.</small></span></figcaption>
              <div class="screen drawer-screen">
                <div class="drawer-head red"><span class="drawer-icon">⇧</span><span><b>Enviar a bóveda</b><small>Selecciona el destino y registra el efectivo enviado.</small></span><i>×</i></div>
                <div class="drawer-body">
                  <div class="context"><span>▣　<b>Caja de trabajo</b><small>　Selecciona la caja abierta</small></span><strong>BOB　⌄</strong><em>Saldo actual · Caja 29<br><b>61,550.00 BOB</b></em></div>
                  <div class="flow"><span class="origin"><b>ORIGEN</b><strong>▣　Caja 29 · BOB</strong></span><i>→</i><span class="destination vault"><b>DESTINO</b><strong>▣　Agencia 6 de Marzo · BOB</strong><mark>Devolución a bóveda</mark></span></div>
                  <div class="field-line marked-control"><label>Bóveda destino　<span class="tag">Devolución a bóveda</span></label><em class="callout">2　Elige otra agencia para transferir</em><svg class="annotation-arrow field-arrow" viewBox="0 0 24 30" aria-hidden="true"><path d="M12 1v22m0 0-7-8m7 8 7-8"/></svg><div class="target-field">Agencia 6 de Marzo · BOB　⌄<i class="target-pin">2</i></div><small>La bóveda de la agencia propia se selecciona por defecto. El badge aparece junto al selector.</small></div>
                  <div class="field-columns"><div class="field-line"><label>Monto a enviar <small>BOB</small></label><div>500.00</div></div><div class="field-line"><label>Concepto <small>· opcional</small></label><div>Motivo del movimiento</div></div></div>
                  <div class="denom"><b>Billetes y monedas enviados</b><small>El total contado debe coincidir con el monto indicado.</small><div class="denom-annotations"><span class="denom-annotation package-label">3　Paquetes / fajos</span><span class="denom-annotation unit-label">4　Unidades sueltas</span><svg class="denom-arrows" viewBox="0 0 1000 70" preserveAspectRatio="none" aria-hidden="true"><path d="M405 1V60m0 0-8-10m8 10 8-10M635 1V60m0 0-8-10m8 10 8-10"/></svg></div><div class="denom-grid"><span>VALOR</span><span>PAQUETE</span><span>UNIDAD</span><span>TOTAL · BOB</span><b>100.00</b><i class="marked-input">5<i class="target-pin">3</i></i><i class="marked-input">0<i class="target-pin">4</i></i><span>500.00</span></div></div>
                  <footer><button>Cancelar</button><button class="primary red-button">Registrar movimiento</button></footer>
                </div>
              </div>
            </figure>

            <section class="steps"><h3>Opciones de Operaciones de Bóveda</h3>
              <div><b>1</b><span><strong>Solicitar fondos · Bóveda → Caja</strong><small>La bóveda es el origen y la caja seleccionada es el destino. Ingresa el monto que necesitas recibir, el concepto si aplica y el conteo de billetes/monedas recibidos.</small></span></div>
              <div><b>2</b><span><strong>Enviar a bóveda · devolución a la agencia propia</strong><small>La bóveda de la misma agencia se propone por defecto. El badge “Devolución a bóveda” aparece junto al selector. El monto se descuenta de la caja y debes registrar el efectivo enviado.</small></span></div>
              <div><b>3</b><span><strong>Enviar a bóveda · traspaso entre agencias</strong><small>En el selector elige una bóveda de otra agencia en la misma moneda. El badge cambia a “Traspaso entre agencias” para identificar rápidamente el destino.</small></span></div>
              <div><b>4</b><span><strong>Confirma el conteo y registra</strong><small>En ambas operaciones de envío, captura paquetes/fajos y unidades. La acción queda deshabilitada si el total contado no coincide con el importe o falta un dato obligatorio.</small></span></div>
              <div><b>5</b><span><strong>Consulta el movimiento</strong><small>Usa los filtros de la lista y abre la fila para ver importe, origen, destino, tipo de operación, concepto, fecha e identificador.</small></span></div>
            </section>
          }

          <section class="success"><b>✓</b><span><strong>Verificación</strong><small>{{ isCajero ? 'El movimiento debe aparecer en la lista con las cajas de origen y destino, el monto y la fecha correctos.' : 'Revisa el detalle en la lista y confirma que moneda, sentido del movimiento, bóveda destino y estado sean los esperados.' }}</small></span></section>
          <footer class="doc-footer"><span>Manual integrado en el sistema · Gestión Efectivo</span><a [routerLink]="isCajero ? '/movimientos/cajero' : '/movimientos/boveda'">Ir a {{ isCajero ? 'Traspaso a Cajero' : 'Operaciones de Bóveda' }} →</a></footer>
          <app-manual-lectura [manualKey]="manualKey" [showVideo]="false"></app-manual-lectura>
        </article>
      </div>
    </main>
  `,
  styles: [`
    :host { display:block; color:#172b4d; }
    .manual-page { max-width:1500px; margin:0 auto; padding:4px 4px 30px; }
    .page-heading { display:flex; align-items:center; gap:14px; margin:0 0 22px; }
    .heading-icon { width:48px; height:48px; display:grid; place-items:center; border-radius:14px; background:#fff0e2; color:#c56516; font-size:25px; }
    .page-heading small { color:#b96828; font-size:9px; font-weight:800; letter-spacing:.1em; }
    .page-heading h1 { margin:2px 0 3px; font-size:21px; }
    .page-heading p { margin:0; color:#7b8da7; font-size:12px; }
    .layout { display:grid; grid-template-columns:260px minmax(0,1fr); gap:18px; align-items:start; }
    .document { min-width:0; padding:20px 24px 0; border:1px solid #e0e7ef; border-radius:13px; background:#fff; box-shadow:0 2px 8px #162a4209; }
    .doc-top { display:flex; justify-content:space-between; padding-bottom:12px; border-bottom:1px solid #e8eef5; color:#a65d21; font-size:9px; font-weight:800; letter-spacing:.08em; }
    .doc-top span+span { color:#8594aa; font-weight:500; letter-spacing:0; }
    .title-row { display:flex; align-items:center; gap:12px; padding:17px 0; border-bottom:1px solid #e8eef5; }
    .title-icon { width:44px; height:44px; display:grid; place-items:center; border-radius:12px; background:#fff0e2; color:#c56516; font-size:25px; }
    .title-row h2 { margin:0 0 4px; font-size:18px; }
    .title-row p { margin:0; color:#7487a1; font-size:11px; line-height:1.5; }
    .notice { display:flex; flex-direction:column; gap:4px; margin:16px 0; padding:12px 14px; border:1px solid #f4d4b5; border-radius:9px; background:#fff8f0; color:#825324; font-size:11px; line-height:1.5; }
    .notice b { color:#9d5414; }
    .notice-blue { border-color:#cfe0f8; background:#f4f8ff; color:#526a87; }
    .visual-card { display:grid; grid-template-columns:minmax(150px,.38fr) minmax(0,1.62fr); margin:12px 0; overflow:hidden; border:1px solid #dfe7f1; border-radius:11px; background:#fff; }
    .visual-card figcaption { display:flex; align-items:flex-start; gap:10px; padding:16px 13px; border-right:1px solid #e6edf4; background:#fff; }
    .step-number { width:27px; height:27px; display:grid; place-items:center; flex:0 0 auto; border-radius:8px; background:#fff0df; color:#bd641c; font-size:10px; font-weight:800; }
    .visual-card figcaption b,.visual-card figcaption small { display:block; }
    .visual-card figcaption b { font-size:11px; line-height:1.4; }
    .visual-card figcaption small { margin-top:5px; color:#8090a7; font-size:10px; line-height:1.5; }
    .screen { min-width:0; padding:12px; background:#fbfcfe; }
    .screen-title { display:flex; align-items:center; gap:9px; padding:0 0 10px; border-bottom:1px solid #e9eef4; }
    .orange-icon { width:31px; height:31px; display:grid; place-items:center; border-radius:8px; background:#fff0e2; color:#e47728; font-size:17px; }
    .screen-title>span:nth-child(2) { display:flex; flex:1; flex-direction:column; gap:3px; min-width:0; }
    .screen-title b { font-size:11px; }
    .screen-title small { color:#8090a7; font-size:9px; }
    .screen-title button,.screen-filters button { padding:7px 10px; border:0; border-radius:7px; background:#a75a0b; color:#fff; font-size:9px; font-weight:700; white-space:nowrap; }
    .screen-filters { display:flex; align-items:center; gap:6px; flex-wrap:wrap; padding:9px 0; border-bottom:1px solid #e8edf4; }
    .screen-filters span { flex:1 1 110px; min-width:0; padding:7px; border:1px solid #dfe5ed; border-radius:5px; background:white; color:#64748b; font-size:8px; white-space:nowrap; }
    .empty-row { display:flex; flex-direction:column; align-items:center; gap:5px; padding:18px 8px; color:#8293aa; font-size:10px; }
    .empty-row>span { font-size:18px; }.empty-row b { color:#243a58; }.empty-row small { font-size:9px; }
    .drawer-screen { padding:0; background:#fff; }
    .drawer-head { display:flex; align-items:center; gap:9px; padding:10px 12px; border-bottom:1px solid #e7edf4; border-left:3px solid #4d83c6; background:#f6f9ff; }
    .drawer-head.green { border-left-color:#248453; background:#f3faf6; }.drawer-head.red { border-left-color:#c95046; background:#fff7f6; }
    .drawer-icon { width:30px; height:30px; display:grid; place-items:center; border-radius:8px; background:#e8f1ff; color:#3473bb; font-size:17px; }
    .green .drawer-icon { background:#e2f5ea; color:#218451; }.red .drawer-icon { background:#ffebe8; color:#bb4a41; }
    .drawer-head>span:nth-child(2) { display:flex; flex:1; flex-direction:column; gap:3px; }.drawer-head b { font-size:11px; }.drawer-head small { color:#8292a8; font-size:9px; }.drawer-head i { color:#63748b; font-size:18px; font-style:normal; }
    .drawer-body { padding:10px; }
    .context { display:grid; grid-template-columns:1fr 1fr; align-items:center; gap:8px; padding:9px; border:1px solid #dce6f2; border-radius:9px; background:#f6f9fc; font-size:9px; }
    .context>span { grid-row:span 2; color:#d36a20; }.context>span small { display:block; color:#8190a5; font-size:8px; }.context>strong { padding:7px; border:1px solid #d9e1eb; border-radius:6px; background:#fff; font-weight:500; }
    .context>em { padding:7px 9px; border:1px solid #cdebdc; border-radius:7px; background:#f1faf5; color:#70839a; font-size:8px; font-style:normal; }.context>em b { color:#17784e; font-size:10px; }
    .flow { display:grid; grid-template-columns:1fr 22px 1fr; align-items:center; gap:6px; margin:10px 0; }
    .flow>span { display:flex; flex-direction:column; gap:5px; min-width:0; padding:9px; border:1px solid #cfe0fb; border-radius:8px; background:#f4f8ff; }.flow>span.destination,.flow>span.vault { border-color:#c9eadc; background:#f3faf7; }
    .flow b { color:#8093ad; font-size:8px; }.flow strong { overflow:hidden; font-size:9px; text-overflow:ellipsis; white-space:nowrap; }.flow>i { color:#d87526; font-size:17px; font-style:normal; text-align:center; }
    .flow mark { align-self:flex-start; padding:3px 6px; border:1px solid #bce4cf; border-radius:10px; background:#e9f8ef; color:#18804d; font-size:8px; }
    .field-line { display:flex; flex-direction:column; gap:5px; min-width:0; margin:8px 0; }.field-line label { font-size:9px; font-weight:650; }.field-line label small { color:#8796aa; font-weight:400; }
    .field-line>div { overflow:hidden; padding:8px 9px; border:1px solid #d8e0e9; border-radius:6px; background:#fff; color:#5c6d83; font-size:9px; text-overflow:ellipsis; white-space:nowrap; }
    .field-line>small { color:#8191a8; font-size:8px; line-height:1.45; }.field-columns { display:grid; grid-template-columns:1fr 1fr; gap:10px; }.tag { padding:3px 6px; border-radius:9px; background:#e8f4ff; color:#3471b5; font-size:8px; }
    .denom { margin-top:10px; padding:10px; border:1px solid #dce5ef; border-radius:8px; background:white; }.denom>b,.denom>small { display:block; }.denom>b { font-size:10px; }.denom>small { margin-top:3px; color:#8090a7; font-size:8px; }
    .denom-grid { display:grid; grid-template-columns:1.2fr 1fr 1fr 1fr; align-items:center; gap:5px; margin-top:9px; padding:6px 0; border-top:1px solid #e8eef4; font-size:8px; text-align:right; }.denom-grid>*:nth-child(4n+1) { text-align:left; }.denom-grid>span { color:#8a9bb1; font-size:7px; font-weight:700; }.denom-grid>i { padding:5px; border:1px solid #dce4ed; border-radius:5px; color:#53657d; font-style:normal; }.denom-grid>b { font-size:9px; }
    .denom-total { display:flex; justify-content:space-between; margin-top:8px; padding:8px; border-radius:6px; background:#eef8f2; color:#4f7080; font-size:8px; }.denom-total strong { color:#158251; font-size:9px; }
    .drawer-body footer { display:flex; justify-content:flex-end; gap:7px; margin-top:10px; }.drawer-body footer button { padding:7px 10px; border:1px solid #d9e1eb; border-radius:6px; background:#fff; color:#53657d; font-size:8px; }.drawer-body footer .primary { border-color:#a75a0b; background:#a75a0b; color:#fff; font-weight:700; }.drawer-body footer .green-button { border-color:#19834b; background:#19834b; }.drawer-body footer .red-button { border-color:#bd5148; background:#bd5148; }
    .movement { display:grid; grid-template-columns:30px minmax(0,1fr) auto 14px; align-items:center; gap:8px; padding:9px 4px; border-bottom:1px solid #e9eef4; }.row-icon { width:27px; height:27px; display:grid; place-items:center; border-radius:7px; background:#eaf2ff; color:#3473bb; }.row-icon.out { background:#fff0e2; color:#c56516; }
    .movement>span:nth-child(2) { display:flex; flex-direction:column; gap:4px; min-width:0; }.movement b { font-size:9px; }.movement small { overflow:hidden; color:#8190a6; font-size:8px; text-overflow:ellipsis; white-space:nowrap; }.movement strong { color:#17649e; font-size:9px; white-space:nowrap; }.movement strong.negative { color:#be5147; }
    .movement em { margin-left:4px; padding:2px 5px; border-radius:8px; background:#e7f4ff; color:#3275ba; font-size:7px; font-style:normal; }.movement em.external { background:#fff1e3; color:#b8631f; }.movement>i { color:#8294aa; font-style:normal; }
    .operation-screen { padding:0; background:#fff; }.operation-screen .drawer-body { padding:12px; }.operation-screen .context { grid-template-columns:1.15fr .85fr; gap:10px; padding:10px; background:#f4f8fc; }.work-picker { display:flex; flex-direction:column; gap:7px; }.work-picker>span { color:#d36a20; font-size:9px; }.work-picker>span small { display:block; color:#8190a5; font-size:8px; }.work-picker>strong { padding:8px 10px; border:1px solid #d9e1eb; border-radius:7px; background:#fff; color:#253b58; font-size:9px; font-weight:500; }
    .operation-prompt { display:flex; flex-direction:column; gap:4px; margin:14px 0 10px; }.operation-prompt b { color:#1b2e4b; font-size:11px; }.operation-prompt small { color:#8292a8; font-size:9px; }.operation-choice { display:flex; align-items:center; gap:10px; margin-top:8px; padding:10px; border:1px solid #dfe7f1; border-radius:9px; background:#fff; }.operation-choice>span:nth-child(2) { display:flex; flex:1; flex-direction:column; gap:4px; }.operation-choice strong { color:#213754; font-size:10px; }.operation-choice small { color:#8292a8; font-size:9px; }.operation-choice>i { color:#91a1b6; font-size:17px; font-style:normal; }.cash-icon { background:#fff0e2; color:#c56516; }
    .option-icon { width:31px; height:31px; display:grid; place-items:center; flex:0 0 auto; border-radius:8px; font-size:16px; }.green-option { background:#e7f5ed; color:#18834d; }.red-option { background:#fdeceb; color:#c94d43; }
    .option-icon { width:23px; height:23px; display:grid; place-items:center; border-radius:6px; font-size:13px; }.green-option { background:#e7f5ed; color:#18834d; }.red-option { background:#fff0e2; color:#c56516; }
    .steps { margin:22px 0; padding:16px; border:1px solid #dfe7f1; border-radius:11px; background:#fafbfd; }.steps h3 { margin:0 0 11px; font-size:13px; }.steps>div { display:flex; gap:10px; padding:10px 0; border-top:1px solid #e9eef4; }.steps>div>b { width:24px; height:24px; display:grid; place-items:center; flex:0 0 auto; border-radius:7px; background:#fff0df; color:#b65c17; font-size:9px; }.steps>div span { display:flex; flex-direction:column; gap:4px; }.steps strong { font-size:10px; }.steps small { color:#70829b; font-size:10px; line-height:1.5; }
    .success { display:flex; align-items:center; gap:10px; margin:18px 0; padding:12px; border:1px solid #cbe9d7; border-radius:9px; background:#f2fbf5; }.success>b { width:25px; height:25px; display:grid; place-items:center; border-radius:50%; background:#d9f4e3; color:#14804a; }.success span { display:flex; flex-direction:column; gap:3px; }.success strong { font-size:10px; }.success small { color:#6b8293; font-size:9px; line-height:1.5; }
    .doc-footer { display:flex; justify-content:space-between; gap:12px; padding:13px 0; border-top:1px solid #e8eef5; color:#91a0b4; font-size:9px; }.doc-footer a { color:#a95715; font-weight:700; text-decoration:none; white-space:nowrap; }
    .marked-control { position:relative; }.target-pin { position:absolute; top:-7px; right:-7px; z-index:2; display:grid; place-items:center; width:17px; height:17px; border:2px solid white; border-radius:50%; background:#df6d13; color:#fff; font-size:8px; font-style:normal; font-weight:800; }
    .action-annotation { position:relative; display:flex; flex-direction:column; align-items:center; gap:18px; }.action-arrow { position:absolute; top:23px; left:50%; z-index:1; width:14px; height:22px; transform:translateX(-50%); }.action-annotation button { position:relative; }
    .callout,.denom-annotation { display:inline-flex; align-items:center; justify-content:center; padding:5px 8px; border:1px solid #f0a04b; border-radius:7px; background:#fffaf4; color:#a4510d; box-shadow:0 2px 6px #784b1e1a; font-size:8px; font-style:normal; font-weight:700; white-space:nowrap; }
    .marked-control>.callout { align-self:center; margin:0; }.field-arrow { display:block; width:14px; height:27px; margin:0 0 -1px 50%; transform:translateX(-50%); }
    .target-field { position:relative; }.denom { position:relative; }.denom-annotations { position:relative; height:60px; margin:10px 0 0; }.denom-annotation { position:absolute; top:0; transform:translateX(-50%); }.package-label { left:40.5%; }.unit-label { left:63.5%; }
    .annotation-arrow { overflow:visible; pointer-events:none; }.annotation-arrow path { fill:none; stroke:#f5820a; stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round; }
    .denom-arrows { position:absolute; top:23px; left:0; width:100%; height:58px; overflow:visible; pointer-events:none; }.denom-arrows path { fill:none; stroke:#f5820a; stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round; }.marked-input { position:relative; border-color:#f0a04b!important; box-shadow:0 0 0 2px #f5820a1c; }
    @media(max-width:1000px) { .layout { grid-template-columns:210px minmax(0,1fr); gap:12px; }.document { padding:17px; } }
    @media(max-width:720px) { .layout,.visual-card { grid-template-columns:1fr; }.visual-card figcaption { border-right:0; border-bottom:1px solid #e6edf4; }.field-columns { grid-template-columns:1fr; }.movement { grid-template-columns:28px minmax(0,1fr) auto; }.movement>i { display:none; } }
  `],
})
export class ManualesEfectivoComponent {
  private readonly route = inject(ActivatedRoute);
  isCajero = this.route.snapshot.queryParamMap.get('tipo') === 'cajero';
  get manualKey(): string { return this.isCajero ? 'traspaso_cajero' : 'operaciones_boveda'; }

  constructor() {
    this.route.queryParamMap.subscribe(params => {
      this.isCajero = params.get('tipo') === 'cajero';
    });
  }
}
