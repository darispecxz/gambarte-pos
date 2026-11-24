import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ManualesIndiceComponent } from './manuales-indice.component';
import { ManualesImprimirComponent } from './manuales-imprimir.component';
import { ManualLecturaComponent } from './manual-lectura.component';

type GuiaRecargas = 'realizadas' | 'pendientes';

@Component({
  selector: 'app-manuales-recargas',
  standalone: true,
  imports: [RouterLink, ManualesIndiceComponent, ManualesImprimirComponent, ManualLecturaComponent],
  template: `
    <main class="manual-page manual-workspace">
      <header class="page-heading">
        <span class="heading-icon">◉</span>
        <div><small>MANUALES DEL SISTEMA · RECARGAS</small><h1>Guía de {{ titulo }}</h1><p>{{ descripcion }}</p></div>
        <app-manuales-imprimir></app-manuales-imprimir>
      </header>

      <div class="layout manual-layout">
        <app-manuales-indice></app-manuales-indice>
        <article class="document">
          <div class="doc-top"><span>GESTIÓN DE RECARGAS</span><span>Guía paso a paso</span></div>
          <h2>{{ titulo }}</h2>
          <app-manual-lectura [manualKey]="manualKey" [videoOnly]="true"></app-manual-lectura>

          @if (guia === 'realizadas') {
            <p class="intro">Consulta las solicitudes que ya fueron confirmadas. Revisa proveedor, número de destino, monto y fecha para localizar el registro correcto.</p>
            <section class="notice"><b>Antes de empezar</b><span>La vista Realizadas es de consulta. Las recargas aparecen después de confirmar su procesamiento. En ciertos entornos de prueba puede estar disponible “Nueva recarga”; úsala solo si el botón aparece en tu pantalla.</span></section>

            <section class="guide">
              <h3>1. Selecciona Recargas realizadas</h3>
              <p class="guide-intro">En el menú lateral, despliega Gestión de recargas y selecciona Recargas realizadas.</p>
              <figure class="visual-card">
                <figcaption><span class="step-number">01</span><span><b>Abre la opción del menú</b><small>La opción seleccionada carga la lista de recargas confirmadas.</small></span></figcaption>
                <div class="screen">
                  <div class="nav-preview">
                    <div class="nav-parent"><span>▯</span><b>Gestión de recargas</b><i>⌄</i></div>
                    <div class="nav-sub"><div class="annotated nav-target"><em>1 · Selecciona Recargas realizadas</em><svg viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1v21m0 0-6-7m6 7 6-7"/></svg><div class="nav-option active">☑　Recargas realizadas</div></div><div class="nav-option">◷　Pendientes por procesar</div></div>
                  </div>
                  <p class="caption">La opción activa abre la vista de recargas confirmadas. En esta lista no aparece la acción Procesar.</p>
                </div>
              </figure>
            </section>

            <section class="guide">
              <h3>2. Revisa el resumen y la lista</h3>
              <figure class="visual-card">
                <figcaption><span class="step-number">02</span><span><b>Localiza el registro y comprueba sus datos</b><small>Las tarjetas resumen y la tabla corresponden a la consulta actual.</small></span></figcaption>
                <div class="screen">
                  <div class="metrics"><div><span class="metric-icon pending">◷</span><section><small>Realizadas</small><b>12</b></section></div><div><span class="metric-icon money">Bs</span><section><small>Monto realizado</small><b>BOB 1.250,00</b></section></div><div><span class="metric-icon line">⌁</span><section><small>Líneas disponibles</small><b>3</b></section></div></div>
                  <div class="annotated table-target"><em>1 · Datos del registro confirmado</em><svg viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1v21m0 0-6-7m6 7 6-7"/></svg></div>
                  <div class="table-head"><span>POS</span><span>Proveedor</span><span>Número destino</span><span>Monto BOB</span><span>Fecha</span><span></span></div>
                  <div class="table-row"><b>#1048</b><span class="provider-logo"><img src="/assets/logos_lineas/entel.png" alt="ENTEL"></span><span>76543210</span><b>BOB 50,00</b><span>20/11/2026 10:32</span><span class="badge green">Confirmada</span></div>
                  <p class="caption"><i>1</i> Comprueba el identificador POS, proveedor, teléfono, monto en BOB, fecha y estado Confirmada. Los valores son un ejemplo ilustrativo.</p>
                </div>
              </figure>
            </section>

            <section class="guide">
              <h3>3. Registra una recarga solo si está habilitado</h3>
              <figure class="visual-card">
                <figcaption><span class="step-number">03</span><span><b>Completa el formulario “Registrar y pagar recarga”</b><small>Esta opción puede estar disponible únicamente en determinados entornos, como UAT.</small></span></figcaption>
                <div class="drawer-preview direct-drawer">
                  <header class="drawer-head"><div><small>VENTA EN BOLIVIA · UAT</small><h4>Registrar y pagar recarga</h4><p>La solicitud se crea y confirma en un único paso.</p></div><span class="drawer-close">×</span></header>
                  <div class="drawer-content">
                    <div class="drawer-field"><label>Proveedor</label><div class="annotated"><em>1 · Selecciona el proveedor</em><svg viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1v21m0 0-6-7m6 7 6-7"/></svg><div class="drawer-control">Seleccione un proveedor <span>⌄</span></div></div></div>
                    <div class="drawer-field"><label>Número destino</label><div class="annotated"><em>2 · Ingresa el número de destino</em><svg viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1v21m0 0-6-7m6 7 6-7"/></svg><div class="drawer-control placeholder">Ej. 76543210</div></div></div>
                    <div class="drawer-field"><label>Monto de recarga <small>BOB</small></label><div class="annotated"><em>3 · Indica el monto de recarga</em><svg viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1v21m0 0-6-7m6 7 6-7"/></svg><div class="drawer-control placeholder">0.00</div></div></div>
                    <div class="drawer-field"><label>Línea utilizada</label><div class="annotated"><em>4 · Selecciona una línea de saldo</em><svg viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1v21m0 0-6-7m6 7 6-7"/></svg><div class="drawer-control">Seleccione una línea de saldo <span>⌄</span></div></div></div>
                    <div class="drawer-field"><label>Referencia <small>/ observación (opcional)</small></label><div class="annotated"><em>5 · Añade una referencia si la necesitas</em><svg viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1v21m0 0-6-7m6 7 6-7"/></svg><div class="drawer-control placeholder">Número de operación o nota</div></div></div>
                    <div class="drawer-field"><label>Comprobante de recarga <b class="required-mark">*</b></label><div class="annotated"><em>6 · Adjunta el comprobante obligatorio</em><svg viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1v21m0 0-6-7m6 7 6-7"/></svg><div class="receipt-drop"><span>⇧</span><b>Adjuntar comprobante</b><small>Captura de pantalla, imagen o PDF</small><strong>Requerido para confirmar</strong></div></div><small class="drawer-help">PDF, JPG o PNG · máximo 2 MB · almacenamiento privado.</small></div>
                  </div>
                  <footer class="drawer-bottom"><small><span>ⓘ</span> En UAT se simulan el alta, el descuento de saldo y la confirmación.</small><div class="drawer-actions"><span class="annotated"><em>7 · Registra y confirma</em><svg viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1v21m0 0-6-7m6 7 6-7"/></svg><button class="drawer-submit">Registrar y confirmar</button></span><button class="drawer-cancel">Cancelar</button></div></footer>
                </div>
                <p class="caption">El drawer conserva el orden real de los campos. Selecciona proveedor y línea, ingresa el número y monto, y adjunta el comprobante; la referencia es opcional.</p>
              </figure>
            </section>
            <section class="steps"><h3>Control final</h3><div><b>1</b><span><strong>Confirma la consulta</strong><small>El registro debe estar en la vista Realizadas y mostrar estado Confirmada.</small></span></div><div><b>2</b><span><strong>Revisa los datos</strong><small>Valida teléfono, proveedor, monto y fecha; si registras desde UAT, adjunta el comprobante correcto.</small></span></div></section>
          }

          @if (guia === 'pendientes') {
            <p class="intro">Procesa solicitudes de recarga pendientes. El sistema reserva temporalmente una solicitud para evitar que otro operador la procese al mismo tiempo.</p>
            <section class="notice"><b>Antes de empezar</b><span>Ten a mano el comprobante de la operación. Debe ser PDF, JPG o PNG y no superar 2 MB. Confirma el proveedor, número y monto antes de completar el proceso.</span></section>

            <section class="guide">
              <h3>1. Selecciona Pendientes por procesar</h3>
              <figure class="visual-card">
                <figcaption><span class="step-number">01</span><span><b>Abre la opción del menú</b><small>La lista muestra las solicitudes que todavía requieren procesamiento.</small></span></figcaption>
                <div class="screen">
                  <div class="nav-preview">
                    <div class="nav-parent"><span>▯</span><b>Gestión de recargas</b><i>⌄</i></div>
                    <div class="nav-sub"><div class="nav-option">☑　Recargas realizadas</div><div class="annotated nav-target"><em>1 · Selecciona Pendientes por procesar</em><svg viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1v21m0 0-6-7m6 7 6-7"/></svg><div class="nav-option active">◷　Pendientes por procesar</div></div></div>
                  </div>
                  <div class="screen-heading"><span class="screen-icon blue">◷</span><span><b>Pendientes por procesar</b><small>Gestiona solicitudes pendientes de pago.</small></span><span class="count-badge">Pendientes</span></div>
                  <div class="annotated table-target"><em>1 · Solicitud disponible para procesar</em><svg viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1v21m0 0-6-7m6 7 6-7"/></svg></div>
                  <div class="table-head"><span>POS</span><span>Proveedor</span><span>Número destino</span><span>Monto BOB</span><span>Fecha</span><span></span></div>
                  <div class="table-row"><b>#1051</b><span class="provider-logo"><img src="/assets/logos_lineas/tigo.png" alt="TIGO"></span><span>71234567</span><b>BOB 30,00</b><span>20/11/2026 10:38</span><span class="process-preview">Procesar　→</span></div>
                  <p class="caption">Comprueba el número y el monto solicitados. Pulsa Procesar en la fila correspondiente; la solicitud se reserva mientras completas la confirmación.</p>
                </div>
              </figure>
            </section>

            <section class="guide">
              <h3>2. Revisa el drawer de confirmación</h3>
              <figure class="visual-card">
                <figcaption><span class="step-number">02</span><span><b>Comprueba que el panel coincide con la solicitud</b><small>El drawer de procesamiento mantiene esta estructura y estos controles.</small></span></figcaption>
                <div class="drawer-preview process-drawer">
                  <header class="drawer-head"><div><small>PASO FINAL</small><h4>Confirmar recarga</h4><p>Verifica la recarga antes de registrarla como completada.</p></div><span class="drawer-close">×</span></header>
                  <div class="drawer-content">
                    <div class="request-summary"><span class="provider-logo"><img src="/assets/logos_lineas/tigo.png" alt="TIGO"></span><span>71234567</span><b>BOB 30,00</b><small>Solicitud #1051</small></div>
                    <div class="drawer-field"><label>Línea utilizada</label><div class="annotated"><em>1 · Elige la línea del proveedor correcto</em><svg viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1v21m0 0-6-7m6 7 6-7"/></svg><div class="drawer-control">Seleccione una línea de saldo <span>⌄</span></div></div></div>
                    <div class="drawer-field"><label>Referencia <small>/ observación (opcional)</small></label><div class="annotated"><em>2 · La referencia es opcional</em><svg viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1v21m0 0-6-7m6 7 6-7"/></svg><div class="drawer-control placeholder">Número de operación o nota</div></div></div>
                    <div class="drawer-field"><label>Comprobante de recarga <b class="required-mark">*</b></label><div class="annotated"><em>3 · Adjunta el comprobante obligatorio</em><svg viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1v21m0 0-6-7m6 7 6-7"/></svg><div class="receipt-drop"><span>⇧</span><b>Adjuntar comprobante</b><small>Captura de pantalla, imagen o PDF</small><strong>Requerido para confirmar</strong></div></div><small class="drawer-help">PDF, JPG o PNG · máximo 2 MB · almacenamiento privado.</small></div>
                  </div>
                  <footer class="drawer-bottom"><small><span>ⓘ</span> Al cerrar se liberará la recarga para que otro operador pueda procesarla.</small><div class="drawer-actions"><button class="drawer-submit">Confirmar recarga realizada</button><button class="drawer-cancel">Cancelar</button></div></footer>
                </div>
                <p class="caption">El resumen, los campos, el aviso inferior y las acciones reproducen el panel que aparece al pulsar Procesar en una solicitud.</p>
              </figure>
            </section>

            <section class="guide">
              <h3>3. Adjunta el comprobante de recarga</h3>
              <figure class="visual-card">
                <figcaption><span class="step-number">03</span><span><b>Carga el respaldo antes de confirmar</b><small>El archivo es obligatorio para completar el procesamiento.</small></span></figcaption>
                <div class="screen">
                  <div class="drawer-field"><label>Comprobante de recarga <b class="required-mark">*</b></label><div class="annotated upload-target"><em>1 · Selecciona el comprobante</em><svg viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1v21m0 0-6-7m6 7 6-7"/></svg><div class="receipt-drop"><span>⇧</span><b>Adjuntar comprobante</b><small>Captura de pantalla, imagen o PDF</small><strong>Requerido para confirmar</strong></div></div><small class="drawer-help">PDF, JPG o PNG · máximo 2 MB · almacenamiento privado.</small></div>
                  <div class="file-rules"><span>✓ Formatos aceptados: PDF, JPG o PNG</span><span>✓ Tamaño máximo: 2 MB</span><span>✓ Almacenamiento privado</span></div>
                  <p class="caption">Selecciona el comprobante correspondiente a esta recarga. Si el archivo no cumple formato o tamaño, el sistema lo rechazará; elige un archivo válido antes de continuar.</p>
                </div>
              </figure>
            </section>

            <section class="guide">
              <h3>4. Confirma o cancela la solicitud</h3>
              <figure class="visual-card">
                <figcaption><span class="step-number">04</span><span><b>Finaliza únicamente después de validar los datos</b><small>Confirmar la recarga la registra como realizada; cancelar libera la reserva.</small></span></figcaption>
                <div class="screen">
                  <div class="drawer-bottom footer-preview"><small><span>ⓘ</span> Al cerrar se liberará la recarga para que otro operador pueda procesarla.</small><div class="drawer-actions"><span class="annotated"><em>1 · Confirma la recarga procesada</em><svg viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1v21m0 0-6-7m6 7 6-7"/></svg><button class="drawer-submit">Confirmar recarga realizada</button></span><span class="annotated"><em>2 · Cancela y libera la solicitud</em><svg viewBox="0 0 24 28" aria-hidden="true"><path d="M12 1v21m0 0-6-7m6 7 6-7"/></svg><button class="drawer-cancel">Cancelar</button></span></div></div>
                  <p class="caption"><i>1</i> Confirma con línea y comprobante seleccionados. <i>2</i> Si no puedes terminar, cancela o cierra el panel para liberar la solicitud y permitir que otro operador la procese.</p>
                </div>
              </figure>
            </section>
            <section class="steps"><h3>Control final</h3><div><b>1</b><span><strong>Solicitud y línea</strong><small>Verifica que el número, proveedor y monto coincidan y que la línea seleccionada sea del proveedor correcto.</small></span></div><div><b>2</b><span><strong>Comprobante y resultado</strong><small>Adjunta un archivo válido de hasta 2 MB y confirma solo después de completar la operación.</small></span></div></section>
          }

          <footer class="doc-footer"><span>Manual integrado en el sistema · Recargas</span><a routerLink="/recargas" [queryParams]="{vista: guia}">Ir a {{ guia === 'realizadas' ? 'Recargas realizadas' : 'Pendientes por procesar' }} →</a></footer>
          <app-manual-lectura [manualKey]="manualKey" [showVideo]="false"></app-manual-lectura>
        </article>
      </div>
    </main>
  `,
  styles: [`
    :host{display:block;color:#172b49}.page-heading{display:flex;align-items:center;gap:14px;margin:0 0 18px}.heading-icon{display:grid;place-items:center;width:48px;height:48px;flex:none;border-radius:13px;background:#eaf2ff;color:#2467c8;font-size:23px}.page-heading small{color:#b45b13;font-size:10px;font-weight:800;letter-spacing:.07em}.page-heading h1{margin:3px 0;color:#172b49;font-size:22px}.page-heading p{margin:0;color:#7789a2;font-size:12px}.page-heading app-manuales-imprimir{margin-left:auto;flex:none}.manual-layout{display:grid;grid-template-columns:280px minmax(0,1fr);align-items:start;gap:16px;min-height:calc(100vh - 150px)}.document{min-width:0;padding:22px 26px;border:1px solid #dfe6ee;border-radius:13px;background:#fff;box-shadow:0 2px 8px #162a4208}.doc-top{display:flex;justify-content:space-between;gap:12px;padding-bottom:11px;border-bottom:1px solid #e7edf4;color:#b65b12;font-size:9px;font-weight:800;letter-spacing:.07em;text-transform:uppercase}.doc-top span+span{color:#8392a7;font-weight:500;letter-spacing:0;text-transform:none}.document h2{margin:16px 0 10px;color:#172b49;font-size:21px;letter-spacing:-.02em}.intro{margin:16px 0;color:#536985;font-size:12px;line-height:1.7}.notice{display:flex;flex-direction:column;gap:5px;margin:15px 0 20px;padding:13px 15px;border:1px solid #f3d19c;border-radius:9px;background:#fff9ec;color:#80500b;font-size:11px;line-height:1.55}.notice b{color:#87480c;font-size:11px}.guide{margin:22px 0}.guide h3,.steps h3{margin:0 0 10px;color:#172b49;font-size:15px;letter-spacing:-.01em}.guide-intro{margin:0 0 10px;color:#6e819a;font-size:11px;line-height:1.6}.visual-card{margin:0;padding:13px;border:1px solid #dce5ef;border-radius:11px;background:#fbfcfe}.visual-card figcaption{display:flex;align-items:center;gap:10px;margin-bottom:12px}.step-number{display:grid;place-items:center;width:27px;height:27px;flex:none;border-radius:8px;background:#fff0e2;color:#b65b12;font-size:10px;font-weight:800}.visual-card figcaption b,.visual-card figcaption small{display:block}.visual-card figcaption b{color:#243a58;font-size:11px}.visual-card figcaption small{margin-top:3px;color:#8190a5;font-size:10px;line-height:1.4}.screen{position:relative;padding:12px;border:1px solid #e0e7ef;border-radius:9px;background:#fff}.screen-heading{display:flex;align-items:center;gap:9px;margin-bottom:11px}.screen-heading>span:nth-child(2){display:flex;min-width:0;flex-direction:column;gap:3px}.screen-heading b{color:#263c58;font-size:11px}.screen-heading small{color:#8493a8;font-size:9px}.screen-icon{display:grid;place-items:center;width:30px;height:30px;flex:none;border-radius:8px;font-weight:800}.screen-icon.green{background:#e2f7ed;color:#07835e}.screen-icon.blue{background:#e9f1ff;color:#2867bc}.count-badge{margin-left:auto;padding:5px 8px;border-radius:20px;background:#f1f5f9;color:#526780;font-size:9px;font-weight:700;white-space:nowrap}.annotated{position:relative;display:flex;min-width:0;flex-direction:column;gap:5px}.annotated em{align-self:flex-start;color:#a65412;font-size:9px;font-style:normal;font-weight:800}.annotated svg{width:16px;height:19px;overflow:visible;color:#ec790d;fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:2}.link-target{margin:3px 0 10px;max-width:330px}.control,.upload-control{display:flex;align-items:center;min-height:33px;padding:0 10px;border:1px solid #dce4ed;border-radius:7px;background:#fff;color:#52647d;font-size:10px}.upload-control{min-height:56px;flex-direction:column;align-items:flex-start;justify-content:center;gap:4px;border-style:dashed;background:#fbfcfe;color:#a95715;font-weight:700}.upload-control small{color:#8593a7;font-size:9px;font-weight:400}.metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:12px}.metrics>div{display:flex;flex-direction:column;gap:4px;padding:9px;border:1px solid #e2e8f0;border-radius:8px;background:#fff}.metrics small{color:#7e8da1;font-size:9px}.metrics b{color:#203751;font-size:13px}.table-target{width:max-content;margin:2px auto 0;align-items:center}.table-target em{text-align:center}.table-head,.table-row{display:grid;grid-template-columns:.7fr .8fr 1.15fr .95fr 1.2fr .85fr;align-items:center;gap:7px;padding:8px 7px}.table-head{border-bottom:1px solid #e6ebf2;background:#f7f9fc;color:#718198;font-size:8px;font-weight:800;text-transform:uppercase}.table-row{border-bottom:1px solid #edf1f5;color:#445873;font-size:9px}.table-row>b{color:#243a58}.provider-logo{display:inline-flex;justify-self:start;padding:4px 6px;border-radius:5px;background:#f1f5f9;color:#405a75;font-size:8px;font-weight:800}.badge{display:inline-flex;justify-self:start;padding:4px 7px;border-radius:20px;font-size:8px;font-weight:800;white-space:nowrap}.badge.green{background:#eaf8f2;color:#08705b}.badge.amber{background:#fff4d4;color:#9a6300}.caption{margin:12px 0 1px;color:#6e8098;font-size:10px;line-height:1.65}.caption i{display:inline-grid;place-items:center;width:16px;height:16px;margin:0 2px;border-radius:50%;background:#e87813;color:#fff;font-size:8px;font-style:normal;font-weight:800}.form-screen .screen-heading{margin-bottom:14px}.field-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 10px}.field-grid .annotated svg,.field-target svg,.upload-target svg{margin-left:12px}.button-row{display:flex;justify-content:flex-end;align-items:flex-start;gap:10px;margin:17px 0 2px}.primary,.outline{display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:0 12px;border:1px solid #e87922;border-radius:7px;background:#ef790c;color:#fff;font:inherit;font-size:9px;font-weight:800;white-space:nowrap}.outline{border-color:#d9e2ec;background:#fff;color:#526780}.drawer-screen{max-width:680px;margin-left:auto}.close-x{margin-left:auto;color:#8292a6;font-size:19px}.summary-box{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;padding:10px;border-radius:8px;background:#f7faf9;color:#334963;font-size:10px}.summary-box strong{color:#0b6555}.summary-box small{grid-column:2/4;color:#8291a5;font-size:9px}.field-target{margin-top:15px;max-width:390px}.hint{color:#b42318;font-size:9px}.upload-target{max-width:430px}.file-rules{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;color:#08705b;font-size:9px}.file-rules span{padding:6px 8px;border-radius:6px;background:#effaf4}.confirm-summary{display:flex;justify-content:space-between;gap:12px;padding:11px 12px;border:1px solid #e0e7ef;border-radius:8px;background:#f8fafc;color:#4a5f79;font-size:10px}.confirm-summary b{color:#17334c}.button-row .annotated{align-items:flex-end}.button-row .annotated em{text-align:right}.steps{margin:22px 0 14px;padding:14px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc}.steps h3{margin-bottom:12px}.steps>div{display:flex;align-items:flex-start;gap:9px;margin:9px 0}.steps>div>b{display:grid;place-items:center;width:20px;height:20px;flex:none;border-radius:50%;background:#fff0e2;color:#b65b12;font-size:9px}.steps>div span{display:flex;flex-direction:column;gap:3px}.steps strong{color:#344b67;font-size:10px}.steps small{color:#75869d;font-size:9px;line-height:1.5}.doc-footer{display:flex;justify-content:space-between;gap:12px;margin:20px 0 4px;padding-top:11px;border-top:1px solid #e7edf4;color:#8996a8;font-size:9px}.doc-footer a{color:#b65b12;text-decoration:none;font-weight:700}.doc-footer a:hover{text-decoration:underline}
    .annotated em{display:inline-flex;align-items:center;justify-content:center;align-self:center;padding:5px 10px;border:1px solid #f58220;border-radius:8px;background:#fffaf5;box-shadow:0 2px 5px rgba(231,120,19,.12);color:#ad580e;font-size:10px;line-height:1.2;text-align:center;white-space:nowrap}.annotated svg{align-self:center;width:18px;height:18px}.annotated>.control,.annotated>.upload-control,.annotated>.nav-option{align-self:stretch;box-sizing:border-box}.button-row .annotated{align-items:center}.button-row .annotated em{text-align:center}.nav-preview{max-width:340px;padding:10px 12px;border-radius:9px;background:#242b35;color:#e9eef6}.nav-parent{display:flex;align-items:center;gap:9px;padding:5px 6px;font-size:11px}.nav-parent>span{color:#bbc7d8;font-size:15px}.nav-parent b{font-size:11px}.nav-parent i{margin-left:auto;color:#bbc7d8;font-size:12px;font-style:normal}.nav-sub{margin:3px 0 0 10px;padding-left:10px;border-left:1px solid #4b5665}.nav-option{display:flex;align-items:center;min-height:29px;padding:0 8px;border-radius:6px;color:#c6d0dc;font-size:10px}.nav-option.active{background:#f58220;color:#243247;font-weight:800}.nav-target{margin:7px 0 5px}
    .drawer-preview{display:flex;flex-direction:column;overflow:hidden;width:100%;max-width:620px;margin:0 auto;border:1px solid #dce4ed;background:#fff;color:#243a58;box-shadow:0 8px 24px rgba(20,39,62,.12)}.drawer-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:24px 27px 20px;border-bottom:1px solid #e5eaf0;background:#fff}.drawer-head small{color:#7b8ca5;font-size:10px;font-weight:800;letter-spacing:.07em}.drawer-head h4{margin:3px 0 7px;color:#1d2b41;font-size:21px;font-weight:500;letter-spacing:-.02em}.drawer-head p{margin:0;color:#788ba6;font-size:13px;line-height:1.5}.drawer-close{display:grid;place-items:center;width:34px;height:34px;flex:none;border-radius:8px;background:#f0f4f8;color:#586b83;font-size:21px;font-weight:700}.drawer-content{display:flex;flex:1;flex-direction:column;gap:19px;padding:21px 27px 19px}.drawer-field>label{display:block;margin:0 0 7px;color:#34445d;font-size:12px;font-weight:800}.drawer-field>label small{color:#8291a6;font-size:11px;font-weight:600}.required-mark{color:#b42318}.drawer-field .annotated{align-items:stretch}.drawer-control{display:flex;align-items:center;box-sizing:border-box;width:100%;height:45px;padding:0 12px;border:1px solid #cbd7e6;border-radius:8px;background:#fff;color:#31435d;font-size:13px}.drawer-control span{margin-left:auto;color:#253a56;font-size:16px}.drawer-control.placeholder{color:#8996a8}.drawer-help{display:block;margin-top:7px;color:#7c8ca4;font-size:11px}.receipt-drop{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:7px;box-sizing:border-box;width:100%;min-height:138px;padding:14px;border:1px dashed #b9c8d9;border-radius:11px;background:#fbfcfe;text-align:center}.receipt-drop>span{display:grid;place-items:center;width:31px;height:31px;border-radius:50%;background:#e8f5f2;color:#0b8c82;font-size:24px;line-height:1}.receipt-drop>b{color:#273950;font-size:13px}.receipt-drop>small{color:#7b8ca5;font-size:11px}.receipt-drop>strong{padding:4px 9px;border-radius:20px;background:#e9f1ff;color:#3168a5;font-size:10px}.drawer-bottom{margin-top:auto;padding:16px 27px 20px;border-top:1px solid #e4eaf1;background:#fbfcfd}.drawer-bottom>small{display:flex;align-items:flex-start;gap:7px;color:#788aa3;font-size:11px;line-height:1.5}.drawer-bottom>small span{color:#129387;font-size:14px}.drawer-actions{display:flex;align-items:flex-start;gap:10px;margin-top:14px}.drawer-submit,.drawer-cancel{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 15px;border:0;border-radius:8px;font:inherit;font-size:12px;font-weight:800;white-space:nowrap}.drawer-submit{background:#83b8b2;color:#fff}.drawer-cancel{background:#edf1f5;color:#455a75}.request-summary{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px 12px;padding:12px 14px;border-radius:9px;background:#f7faf9;color:#354a65;font-size:13px}.request-summary>b{color:#0c6659}.request-summary>small{grid-column:2/4;color:#8190a5;font-size:11px}.provider-logo{display:inline-flex;align-items:center;justify-content:center;width:68px;height:52px;padding:0;background:transparent}.provider-logo img{display:block;width:52px;height:52px;object-fit:contain}.metrics>div{display:flex;align-items:center;gap:12px;padding:11px}.metrics>div>section{display:flex;flex-direction:column;gap:2px}.metric-icon{display:grid;place-items:center;width:36px;height:36px;flex:none;border-radius:10px;font-size:11px;font-weight:800}.metric-icon.pending{background:#eff6ff;color:#2563eb}.metric-icon.money{background:#ecfdf5;color:#07835e}.metric-icon.line{background:#fff7ed;color:#d26912;font-size:20px}.process-preview{display:inline-flex;align-items:center;justify-content:center;min-height:32px;padding:0 11px;border-radius:8px;background:#0f766e;color:#fff;font-size:9px;font-weight:700;white-space:nowrap}.process-drawer .drawer-content{gap:20px}.footer-preview{margin:0 -12px -12px}.footer-preview .drawer-actions{justify-content:flex-start}.footer-preview .annotated{align-items:center}.footer-preview .annotated em{max-width:220px;white-space:normal}
    .metrics>div{flex-direction:row}.request-summary .provider-logo img{width:52px;height:52px}.direct-drawer .drawer-submit{opacity:.65}
    @media(max-width:900px){.manual-layout{grid-template-columns:230px minmax(0,1fr)}.document{padding:18px}.table-head,.table-row{grid-template-columns:.65fr .72fr 1fr .8fr 1fr .75fr;gap:4px;font-size:8px}}
    @media(max-width:700px){.manual-layout{display:flex;flex-direction:column}.manual-layout app-manuales-indice{width:100%;max-height:280px}.document{width:100%;box-sizing:border-box;padding:14px}.page-heading{align-items:flex-start;flex-wrap:wrap}.page-heading app-manuales-imprimir{margin-left:auto}.page-heading h1{font-size:19px}.metrics{grid-template-columns:1fr}.table-head,.table-row{min-width:650px}.screen{overflow-x:auto}.field-grid{grid-template-columns:1fr}.button-row{flex-wrap:wrap}.doc-footer{flex-direction:column}}
  `],
})
export class ManualesRecargasComponent {
  private readonly route = inject(ActivatedRoute);
  guia: GuiaRecargas = 'realizadas';

  constructor() {
    this.route.queryParamMap.subscribe(params => this.guia = params.get('tipo') === 'pendientes' ? 'pendientes' : 'realizadas');
  }

  get titulo(): string { return this.guia === 'realizadas' ? 'Recargas realizadas' : 'Pendientes por procesar'; }
  get descripcion(): string { return this.guia === 'realizadas' ? 'Consulta las recargas confirmadas y revisa sus datos.' : 'Procesa solicitudes y adjunta el comprobante de recarga.'; }
  get manualKey(): string { return this.guia === 'realizadas' ? 'recargas_realizadas' : 'recargas_pendientes'; }
}
