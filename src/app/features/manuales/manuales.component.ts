import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ManualesIndiceComponent } from './manuales-indice.component';
import { ManualesImprimirComponent } from './manuales-imprimir.component';
import { ManualLecturaComponent } from './manual-lectura.component';

@Component({
  selector: 'app-manuales',
  standalone: true,
  imports: [RouterLink, ManualesIndiceComponent, ManualesImprimirComponent, ManualLecturaComponent],
  template: `
    <main class="manuals-page manual-workspace manual-opening-workspace">
      <header class="manuals-page-heading">
        <span class="heading-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2zM8 7h8M8 11h8"/></svg></span>
        <div><span class="eyebrow">CENTRO DE AYUDA</span><h1>Manuales del sistema</h1><p>Guías prácticas para realizar las operaciones de Gambarte.</p></div>
        <app-manuales-imprimir></app-manuales-imprimir>
      </header>

      <div class="manuals-layout manual-layout">
        <app-manuales-indice></app-manuales-indice>

        <article class="manual-document">
          <div class="document-topline"><span class="category-pill">PUNTO DE VENTA</span><span class="reading-time">Guía paso a paso</span></div>
          <div class="document-title-row">
            <span class="document-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="10" width="18" height="11" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3M12 14v3"/></svg></span>
            <div><h2>{{ isCierre ? 'Cierre de caja' : 'Apertura de caja' }}</h2><p>{{ isCierre ? 'Cuenta y confirma el efectivo de cada moneda antes de cerrar la jornada.' : 'Registra y verifica el efectivo inicial de la caja antes de comenzar la jornada.' }}</p></div>
          </div>

          <section class="prerequisite">
            <span class="prerequisite-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v4m0 4h.01"/></svg></span>
            <div><strong>Antes de empezar</strong><p>{{ isCierre ? 'Verifica que la caja esté abierta y que el efectivo esté disponible para el conteo. El sistema mostrará las monedas abiertas; si hay monedas sin abrir, puede pedirte confirmar cuáles incluir en el cierre.' : 'La bóveda de tu agencia debe estar abierta. Si aparece el aviso “Bóveda no abierta”, solicita su apertura antes de continuar.' }}</p></div>
          </section>

          @if (!isCierre) {
            <section class="manual-video" aria-label="Video guía de apertura de caja">
              <div class="manual-video-heading">
                <span class="manual-video-icon" aria-hidden="true">▶</span>
                <div><strong>Video guía: Apertura de caja</strong><small>Repasa el flujo visual antes de registrar el conteo.</small></div>
                @if (!videoOpen) {
                  <button type="button" class="manual-video-toggle" (click)="videoOpen = true">Reproducir video</button>
                } @else {
                  <button type="button" class="manual-video-close" (click)="videoOpen = false">Cerrar video</button>
                }
              </div>
              @if (videoOpen) {
                <video class="manual-video-player" controls preload="none" playsinline>
                  <source src="https://srv1610-files.hstgr.io/b4876c143968de1f/files/trainings/1_GambartePOS_Apertura_Caja.mp4" type="video/mp4">
                  Tu navegador no puede reproducir este video. Verifica tu conexión e inténtalo de nuevo.
                </video>
              }
            </section>
          }

          <section class="interface-guide" aria-label="Referencias visuales de la interfaz">
            <div class="guide-heading"><span class="guide-heading-icon">◎</span><div><h3>Sigue las marcas en pantalla</h3><p>Las figuras reproducen los controles y colores que encontrarás en Punto de Venta.</p></div></div>

            <figure class="visual-card">
              <figcaption><span class="visual-step">01</span><span><strong>{{ isCierre ? 'Selecciona la caja que vas a cerrar' : 'Selecciona la caja que vas a abrir' }}</strong><small>{{ isCierre ? 'Busca la caja con monedas abiertas y revisa sus saldos actuales.' : 'Busca la caja y confirma que la moneda esté sin abrir.' }}</small></span></figcaption>
              <div class="ui-capture overview-capture">
                <div class="ui-capture-heading"><div><strong>Punto de Venta</strong><small>AGENCIA 6 DE MARZO — HOY</small></div><div class="ui-stats"><span><b>3</b> Monedas</span><span><b class="green-text">0</b> Abiertas</span></div></div>
                <div class="ui-caja-card">
                  <div class="ui-caja-head"><div class="ui-caja-ident"><span class="ui-caja-number">29</span><span><b>Caja 29</b><small>AGENCIA 6 DE MARZO</small></span></div><span class="confirm-target open-target"><span class="figure-callout control-callout">1 <b>{{ isCierre ? 'Pulsa “Cerrar Caja”' : 'Pulsa “Abrir Caja”' }}</b></span><span class="ui-open-button" [class.ui-close-button]="isCierre"><i>{{ isCierre ? '↙' : '↗' }}</i> {{ isCierre ? 'Cerrar Caja' : 'Abrir Caja' }}<span class="target-pin">1</span></span></span></div>
                  <table class="ui-money-table"><thead><tr><th>Moneda</th><th>Estado</th><th>Saldo</th></tr></thead><tbody><tr><td><b>BOB</b><small>Bolivianos</small></td><td><span class="ui-status-pending" [class.ui-status-open]="isCierre">● {{ isCierre ? 'Abierta' : 'Sin abrir' }}</span></td><td>{{ isCierre ? '61,550.00' : '0.00' }}</td></tr><tr><td><b>USD</b><small>Dólares</small></td><td><span class="ui-status-pending" [class.ui-status-open]="isCierre">● {{ isCierre ? 'Abierta' : 'Sin abrir' }}</span></td><td>{{ isCierre ? '30,000.00' : '0.00' }}</td></tr></tbody></table>
                </div>
              </div>
            </figure>

            <figure class="visual-card">
              <figcaption><span class="visual-step">02</span><span><strong>Registra el conteo por denominación</strong><small>Completa paquetes/fajos y unidades para cada billete y moneda.</small></span></figcaption>
              <div class="ui-capture count-capture">
                <div class="ui-stepper-title">{{ isCierre ? 'CIERRE' : 'APERTURA' }} DE CAJA <span>29</span> — AGENCIA 6 DE MARZO</div>
                <div class="ui-stepper-screen">
                  <div class="ui-step-nav"><div class="ui-step-active"><b>1</b><span><strong>BOB</strong><small>Bolivianos</small></span></div><div class="ui-step-inactive"><b>2</b><span><strong>USD</strong><small>Dólares</small></span></div><div class="ui-step-inactive"><b>3</b><span><strong>CLP</strong><small>Pesos chilenos</small></span></div></div>
                  <div class="ui-denoms">
                    <div class="ui-currency-title"><b>BOB</b><strong>Bolivianos</strong></div>
                    <div class="ui-denom-head"><span>VALOR</span><span>PAQUETE</span><span>UNIDAD</span><span>TOTAL [BOB]</span></div>
                    <div class="ui-denom-row"><b>200.00</b><span class="ui-input target-input"><i>7</i><b class="field-marker">2</b></span><span class="ui-input"><i>0</i></span><small>1,400.00</small></div>
                    <div class="ui-denom-row"><b>100.00</b><span class="ui-input"><i>0</i></span><span class="ui-input target-input"><i>1</i><b class="field-marker">3</b></span><small>100.00</small></div>
                    <div class="ui-denom-row"><b>50.00</b><span class="ui-input"><i>0</i></span><span class="ui-input"><i>0</i></span><small>0.00</small></div>
                    <div class="ui-denom-row"><b>20.00</b><span class="ui-input"><i>0</i></span><span class="ui-input"><i>0</i></span><small>0.00</small></div>
                    <div class="ui-denom-row"><b>10.00</b><span class="ui-input"><i>0</i></span><span class="ui-input"><i>0</i></span><small>0.00</small></div>
                    <div class="ui-figure-totals"><span>TOTAL BILLETE + MONEDA [BOB]</span><b>1,500.00</b></div>
                    <div class="ui-figure-nav"><span>← Anterior</span><span class="ui-next">Siguiente →</span></div>
                  </div>
                </div>
                <svg class="figure-arrow arrow-count" viewBox="0 0 1000 150" preserveAspectRatio="none" aria-hidden="true"><defs><marker id="arrow-count-head" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0L9 4.5L0 9" fill="none" stroke="#e87922" stroke-width="1.8"/></marker></defs><path d="M445 4C445 35 445 67 445 111M680 4C680 42 680 89 680 137" fill="none" stroke="#e87922" stroke-width="2.5" marker-end="url(#arrow-count-head)"/></svg>
                <span class="figure-callout callout-fajo">2 <b>Paquetes / fajos</b></span><span class="figure-callout callout-unidad">3 <b>Unidades sueltas</b></span>
              </div>
            </figure>

            <figure class="visual-card">
              <figcaption><span class="visual-step">03</span><span><strong>{{ isCierre ? 'Confirma cada total y cierra la caja' : 'Confirma cada total y abre la caja' }}</strong><small>El importe confirmado debe coincidir con el conteo automático.</small></span></figcaption>
              <div class="ui-capture confirm-capture">
                <div class="ui-stepper-title">{{ isCierre ? 'CIERRE' : 'APERTURA' }} DE CAJA <span>29</span> — AGENCIA 6 DE MARZO</div>
                <div class="ui-confirm-panel">
                  <div class="ui-confirm-row"><span>TOTAL BILLETE + MONEDA [BOB]</span><b>1,500.00</b></div>
                  <div class="ui-confirm-row"><span>CONFIRMAR MONTO [BOB]</span><span class="confirm-target"><span class="figure-callout control-callout">4 <b>Confirma el mismo importe</b></span><span class="ui-confirm-input">1,500.00 <i>4</i></span></span></div>
                  <div class="ui-confirm-note"><b>✓</b> El monto coincide con el total contado.</div>
                  <div class="ui-confirm-actions"><span>← Anterior</span><span class="confirm-target"><span class="figure-callout control-callout">5 <b>{{ isCierre ? 'Finaliza el cierre' : 'Finaliza la apertura' }}</b></span><span class="ui-confirm-button" [class.ui-close-button]="isCierre">{{ isCierre ? '🔒 Cerrar Caja' : '🔓 Abrir Caja' }} <i>5</i></span></span></div>
                </div>
              </div>
            </figure>
          </section>

          <section class="steps-section" [attr.aria-label]="isCierre ? 'Pasos para cerrar una caja' : 'Pasos para abrir una caja'">
            <div class="step-row"><span class="step-index">1</span><div class="step-copy"><h3>{{ isCierre ? 'Ubica la caja abierta' : 'Ubica la caja' }}</h3><p>En <b>Punto de Venta</b>, identifica el número de caja y la agencia. {{ isCierre ? 'Confirma que las monedas estén Abiertas y revisa sus saldos actuales.' : 'Revisa las monedas habilitadas y confirma que su estado sea Sin abrir.' }}</p></div><span class="step-symbol">▤</span></div>
            <div class="step-row"><span class="step-index">2</span><div class="step-copy"><h3>{{ isCierre ? 'Inicia el cierre' : 'Inicia la apertura' }}</h3><p>Presiona <b>{{ isCierre ? 'Cerrar Caja' : 'Abrir Caja' }}</b> en la caja correspondiente. {{ isCierre ? 'Si el sistema solicita elegir monedas adicionales sin abrir, revisa la selección antes de continuar.' : 'El formulario mostrará una pestaña para cada moneda habilitada.' }}</p></div><span class="step-symbol">{{ isCierre ? '↙' : '＋' }}</span></div>
            <div class="step-row"><span class="step-index">3</span><div class="step-copy"><h3>Cuenta billetes y monedas</h3><p>{{ isCierre ? 'Cuenta físicamente el efectivo disponible y registra, por denominación, paquetes/fajos y unidades. El sistema calculará los subtotales y comparará el total contado con el saldo de la caja.' : 'Cuenta físicamente el efectivo. Para cada denominación, ingresa la cantidad de paquetes/fajos y unidades; el sistema calculará los subtotales y el total contado.' }}</p><p class="tip"><b>Consejo:</b> deja en cero las denominaciones que no tienes y registra cantidades enteras.</p></div><span class="step-symbol">▦</span></div>
            <div class="step-row"><span class="step-index">4</span><div class="step-copy"><h3>Revisa todas las monedas</h3><p>Comprueba el total de cada moneda y avanza con <b>Siguiente</b>. Completa todas las pestañas antes de finalizar.</p></div><span class="step-symbol">✓</span></div>
            <div class="step-row"><span class="step-index">5</span><div class="step-copy"><h3>{{ isCierre ? 'Confirma el cierre' : 'Confirma la apertura' }}</h3><p>{{ isCierre ? 'En la última moneda, revisa el total contado y confirma el cierre. Si hay diferencia, sigue las indicaciones del sistema antes de continuar.' : 'En la última moneda, revisa el resumen y presiona Abrir Caja. Espera el mensaje de confirmación antes de iniciar operaciones.' }}</p></div><span class="step-symbol">{{ isCierre ? '🔒' : '🔓' }}</span></div>
          </section>

          <section class="success-check">
            <span class="success-icon">✓</span><div><strong>{{ isCierre ? 'Verifica que la caja quedó cerrada' : 'Verifica que la caja quedó abierta' }}</strong><p>{{ isCierre ? 'En el listado, las monedas cerradas deben mostrar el estado correspondiente y la hora de cierre.' : 'En el listado, la moneda debe aparecer con estado Abierta y mostrar su saldo y hora de apertura.' }}</p></div>
          </section>

          <footer class="manual-document-footer"><span>Manual integrado en el sistema · {{ isCierre ? 'Cierre' : 'Apertura' }} de caja</span><a routerLink="/caja">Ir a Punto de Venta <span>→</span></a></footer>
          <app-manual-lectura [manualKey]="manualKey"></app-manual-lectura>
        </article>
      </div>
    </main>
  `,
  styles: [`
    :host { display:block; color:#172b4d; }
    .manuals-page { max-width:1440px; margin:0 auto; padding:4px 4px 30px; }
    .manuals-page-heading { display:flex; align-items:center; gap:14px; margin:0 0 22px; }
    .heading-icon { width:48px; height:48px; display:grid; place-items:center; border-radius:14px; color:#b65c17; background:#ffead6; }
    svg { width:22px; height:22px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
    .eyebrow { color:#b96828; font-size:9px; font-weight:800; letter-spacing:.1em; }
    .manuals-page-heading h1 { margin:2px 0 3px; color:#14213d; font-size:21px; font-weight:750; }
    .manuals-page-heading p { margin:0; color:#7b8da7; font-size:12px; }
    .manuals-layout { display:grid; grid-template-columns:260px minmax(0,1fr); align-items:start; gap:18px; }
    .manuals-index,.manual-document { border:1px solid #e0e7ef; border-radius:13px; background:#fff; box-shadow:0 2px 8px rgba(22,42,66,.035); }
    .manuals-index { position:sticky; top:16px; padding:15px 12px; }
    .index-heading { display:flex; align-items:center; justify-content:space-between; padding:2px 6px 13px; color:#243a58; font-size:12px; }
    .index-heading > span { min-width:22px; padding:3px 6px; border-radius:12px; background:#eef3f8; color:#687d98; text-align:center; font-size:10px; font-weight:700; }
    .index-item { display:grid; grid-template-columns:28px minmax(0,1fr) 14px; align-items:center; gap:9px; padding:10px 8px; border:1px solid #f2d5b9; border-radius:9px; background:#fff8f1; color:#1c3555; text-decoration:none; }
    .index-number { width:26px; height:26px; display:grid; place-items:center; border-radius:8px; background:#ffead6; color:#b65c17; font-size:9px; font-weight:800; }
    .index-item strong,.index-item small { display:block; }
    .index-item strong { font-size:11px; }
    .index-item small { margin-top:3px; color:#8292a9; font-size:10px; }
    .index-chevron { color:#bd6b30; font-size:21px; }
    .index-upcoming { display:flex; align-items:center; gap:7px; padding:13px 7px 2px; color:#98a6b8; font-size:10px; }
    .upcoming-dot { width:6px; height:6px; border-radius:50%; background:#cbd5e1; }
    .index-group { margin:0 0 8px; }
    .index-group-title { display:flex; align-items:center; gap:8px; margin:4px 7px 5px; color:#344963; font-size:10px; font-weight:800; letter-spacing:.04em; text-transform:uppercase; }
    .index-group-title>span { display:grid; place-items:center; width:20px; height:20px; border-radius:6px; background:#f1f5f9; color:#7b8ba0; font-size:12px; }
    .index-children { margin-left:10px; padding-left:8px; border-left:1px solid #e4eaf1; }
    .index-children .index-item { grid-template-columns:25px minmax(0,1fr) 12px; padding:7px 7px; border-color:transparent; border-radius:7px; background:transparent; }
    .index-children .index-number { width:23px; height:23px; border-radius:6px; background:#f1f4f8; color:#8190a4; }
    .index-children .index-item strong { font-size:10px; }
    .index-children .index-item small { font-size:9px; }
    .index-children .index-item:hover { background:#f7f9fc; }
    .index-children .index-item.active { border-color:#f2d5b9; background:#fff4e9; color:#ad580e; font-weight:700; }
    .index-children .index-item.active .index-number { background:#ffe5c9; color:#b65c17; }
    .manual-document { padding:22px 26px 0; }
    .document-topline { display:flex; align-items:center; justify-content:space-between; }
    .category-pill { padding:5px 8px; border-radius:20px; background:#fff1e3; color:#a95715; font-size:9px; font-weight:800; letter-spacing:.05em; }
    .reading-time { color:#93a1b4; font-size:10px; }
    .document-title-row { display:flex; align-items:center; gap:13px; padding:17px 0 18px; border-bottom:1px solid #e9eef4; }
    .document-icon { width:44px; height:44px; display:grid; place-items:center; flex:0 0 auto; border-radius:12px; background:#eaf2ff; color:#2864ae; }
    .document-title-row h2 { margin:0 0 4px; color:#14213d; font-size:18px; font-weight:750; }
    .document-title-row p { margin:0; color:#7487a1; font-size:11px; line-height:1.45; }
    .prerequisite { display:flex; gap:11px; margin:17px 0 16px; padding:13px 14px; border:1px solid #f2d69e; border-radius:10px; background:#fff9e9; }
    .prerequisite-icon { color:#a8751c; flex:0 0 auto; }
    .prerequisite-icon svg { width:18px; height:18px; }
    .prerequisite strong { color:#735116; font-size:11px; }
    .prerequisite p { margin:4px 0 0; color:#80652f; font-size:11px; line-height:1.5; }
    .manual-video { margin:14px 0 18px; overflow:hidden; border:1px solid #dfe7f0; border-radius:11px; background:#fff; }
    .manual-video-heading { display:flex; align-items:center; gap:10px; padding:12px 14px; }
    .manual-video-icon { display:grid; place-items:center; width:32px; height:32px; flex:0 0 auto; border-radius:9px; background:#fff0e2; color:#bd5e12; font-size:12px; }
    .manual-video-heading>div { display:flex; min-width:0; flex:1; flex-direction:column; gap:3px; }
    .manual-video-heading strong { color:#243a58; font-size:11px; }
    .manual-video-heading small { color:#7d8fa8; font-size:10px; }
    .manual-video-toggle,.manual-video-close { min-height:34px; padding:0 12px; border:1px solid #e6b17f; border-radius:8px; background:#fff8f1; color:#a95715; font:inherit; font-size:10px; font-weight:700; cursor:pointer; white-space:nowrap; }
    .manual-video-close { border-color:#dce4ed; background:#fff; color:#596d87; }
    .manual-video-player { display:block; width:100%; max-height:520px; aspect-ratio:16/9; border-top:1px solid #e8eef5; background:#101827; }
    .interface-guide { margin:22px 0 24px; padding:17px; border:1px solid #dfe8f2; border-radius:13px; background:#f7f9fc; }
    .guide-heading { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
    .guide-heading-icon { width:32px; height:32px; display:grid; place-items:center; border-radius:9px; background:#eaf2ff; color:#2864ae; font-size:19px; }
    .guide-heading h3 { margin:0 0 3px; color:#1b2e4b; font-size:13px; font-weight:750; }
    .guide-heading p { margin:0; color:#7d8fa8; font-size:10px; }
    .visual-card { display:grid; grid-template-columns:minmax(160px,.45fr) minmax(0,1.55fr); margin:0; overflow:hidden; border:1px solid #e0e7ef; border-radius:11px; background:#fff; }
    .visual-card + .visual-card { margin-top:11px; }
    .visual-card figcaption { display:flex; align-items:flex-start; gap:10px; padding:17px 14px; border-right:1px solid #e7edf4; background:#fff; }
    .visual-step { width:27px; height:27px; display:grid; place-items:center; flex:0 0 auto; border-radius:8px; background:#fff0df; color:#ba621d; font-size:10px; font-weight:800; }
    .visual-card figcaption strong,.visual-card figcaption small { display:block; }
    .visual-card figcaption strong { color:#1e3452; font-size:11px; line-height:1.4; }
    .visual-card figcaption small { margin-top:5px; color:#8090a7; font-size:10px; line-height:1.45; }
    .ui-capture { position:relative; min-width:0; padding:13px; overflow:hidden; background:#fbfcfe; font-family:inherit; }
    .ui-capture-heading { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px; }
    .ui-capture-heading > div:first-child { display:flex; flex-direction:column; gap:3px; }
    .ui-capture-heading strong { color:#14213d; font-size:12px; }
    .ui-capture-heading small { color:#8a97b5; font-size:8px; }
    .ui-stats { display:flex; align-items:center; gap:8px; padding:5px 8px; border:1px solid #e2e5eb; border-radius:8px; background:#fff; }
    .ui-stats span { display:flex; align-items:center; gap:3px; color:#7a8799; font-size:8px; }
    .ui-stats b { color:#14213d; font-size:10px; }
    .ui-stats .green-text { color:#16a34a; }
    .ui-caja-card { overflow:hidden; border:1px solid #e2e5eb; border-radius:9px; background:#fff; }
    .ui-caja-head { display:flex; align-items:center; justify-content:space-between; gap:8px; padding:9px 10px; border-bottom:1px solid #f0f1f4; }
    .ui-caja-ident { display:flex; align-items:center; gap:8px; min-width:0; }
    .ui-caja-number { padding:5px 10px; border-radius:7px; background:#14213d; color:white; font-size:10px; font-weight:700; }
    .ui-caja-ident > span:last-child { display:flex; flex-direction:column; gap:2px; }
    .ui-caja-ident b { color:#14213d; font-size:10px; }
    .ui-caja-ident small { color:#8a97b5; font-size:8px; }
    .ui-open-button { position:relative; display:flex; align-items:center; gap:5px; padding:7px 10px; border:2px solid #f0a153; border-radius:7px; outline:2px solid rgba(238,137,44,.2); background:#f5820a; color:#fff; font-size:9px; font-weight:700; white-space:nowrap; }
    .ui-close-button { border-color:#263a5b !important; background:#263a5b !important; box-shadow:0 2px 6px rgba(29,48,77,.2) !important; }
    .ui-open-button i { font-size:13px; font-style:normal; }
    .target-pin { position:absolute; top:-9px; right:-9px; width:18px; height:18px; display:grid; place-items:center; border:2px solid white; border-radius:50%; background:#d96d17; color:white; font-size:9px; font-style:normal; font-weight:800; }
    .ui-money-table { width:100%; border-collapse:collapse; }
    .ui-money-table th { padding:6px 9px; color:#8a97b5; font-size:8px; font-weight:700; text-align:left; text-transform:uppercase; }
    .ui-money-table td { padding:7px 9px; border-top:1px solid #f0f1f4; color:#14213d; font-size:9px; }
    .ui-money-table td:first-child b { display:inline-block; min-width:33px; font-size:9px; }
    .ui-money-table td:first-child small { color:#68768a; font-size:8px; }
    .ui-status-pending { padding:3px 7px; border-radius:12px; background:#fef3c7; color:#92400e; font-size:8px; white-space:nowrap; }
    .ui-status-open { background:#dcfce7; color:#147a43; }
    .figure-arrow { position:absolute; pointer-events:none; overflow:visible; }
    .figure-callout { position:absolute; display:inline-flex; align-items:center; gap:5px; padding:5px 8px; border:1px solid #f0b273; border-radius:6px; background:#fffaf4; color:#a4510d; box-shadow:0 2px 6px rgba(120,75,30,.1); font-size:8px; white-space:nowrap; }
    .figure-callout::first-letter { font-weight:800; }
    .ui-stepper-title { margin:0 0 8px; color:#14213d; font-size:9px; font-weight:750; }
    .ui-stepper-title > span { display:inline-block; padding:2px 6px; border-radius:4px; background:#f5820a; color:#fff; }
    .ui-stepper-screen { display:grid; grid-template-columns:95px minmax(0,1fr); overflow:hidden; border:1px solid #e2e5eb; border-radius:8px; background:#fff; }
    .ui-step-nav { padding:9px 6px; border-right:1px solid #e2e5eb; background:#f8f9fb; }
    .ui-step-nav > div { display:flex; align-items:center; gap:6px; padding:7px 4px; }
    .ui-step-nav > div + div { border-top:1px solid #eceff3; }
    .ui-step-nav b { width:20px; height:20px; display:grid; place-items:center; flex:0 0 auto; border-radius:6px; background:#e2e5eb; color:#657386; font-size:8px; }
    .ui-step-nav strong,.ui-step-nav small { display:block; }
    .ui-step-nav strong { color:#14213d; font-size:8px; }
    .ui-step-nav small { color:#8a97b5; font-size:7px; }
    .ui-step-nav .ui-step-active b { background:#f5820a; color:white; }
    .ui-step-nav .ui-step-active strong { color:#d76e07; }
    .ui-denoms { min-width:0; padding:9px 11px; }
    .ui-currency-title { display:flex; align-items:center; gap:7px; margin-bottom:8px; padding-bottom:7px; border-bottom:2px solid #e2e5eb; }
    .ui-currency-title b { padding:3px 7px; border-radius:5px; background:#14213d; color:#fff; font-size:8px; }
    .ui-currency-title strong { color:#14213d; font-size:9px; }
    .ui-denom-head,.ui-denom-row { display:grid; grid-template-columns:minmax(45px,.8fr) minmax(60px,1fr) minmax(60px,1fr) minmax(55px,.9fr); align-items:center; gap:5px; }
    .ui-denom-head { padding:5px 4px; border-bottom:1px solid #e2e5eb; color:#8a97b5; font-size:7px; font-weight:700; text-align:center; }
    .ui-denom-head span:first-child { text-align:left; }
    .ui-denom-head span:last-child { text-align:right; }
    .ui-denom-row { min-height:27px; padding:2px 4px; border-bottom:1px solid #f0f1f4; }
    .ui-denom-row > b { color:#14213d; font-size:9px; font-variant-numeric:tabular-nums; }
    .ui-input { position:relative; min-height:21px; display:grid; place-items:center; border:1px solid #e2e5eb; border-radius:5px; background:#fff; color:#53657c; font-size:8px; }
    .ui-input i { font-style:normal; }
    .field-marker { position:absolute; top:-7px; right:-7px; width:15px; height:15px; display:grid; place-items:center; border:1.5px solid white; border-radius:50%; background:#d96d17; color:#fff; font-size:7px; line-height:1; }
    .target-input { border:1.5px solid #e99a4b; box-shadow:0 0 0 2px rgba(245,130,10,.12); }
    .ui-denom-row > small { color:#8a97b5; font-size:8px; text-align:right; }
    .ui-figure-totals { display:flex; justify-content:space-between; margin-top:8px; padding:7px 8px; border:1px solid #e2e5eb; border-radius:6px; background:#f8f9fb; color:#586a83; font-size:7px; font-weight:700; }
    .ui-figure-totals b { color:#14213d; font-size:9px; }
    .ui-figure-nav { display:flex; justify-content:space-between; align-items:center; margin-top:7px; color:#7f8fa5; font-size:8px; }
    .ui-next { padding:5px 8px; border-radius:5px; background:#f5820a; color:#fff; font-weight:700; }
    .count-capture .ui-stepper-title { margin-top:28px; }
    .arrow-count { top:30px; left:0; width:100%; height:150px; }
    .callout-fajo { top:4px; left:40%; }
    .callout-unidad { top:4px; left:63.5%; }
    .confirm-capture { min-height:205px; }
    .ui-confirm-panel { margin:11px 7px 0; padding:11px 13px; border:1px solid #e2e5eb; border-radius:9px; background:#fff; }
    .ui-confirm-row { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 7px; border-bottom:1px solid #eef1f5; color:#65768e; font-size:8px; }
    .ui-confirm-row b { color:#14213d; font-size:12px; font-variant-numeric:tabular-nums; }
    .ui-confirm-input { position:relative; padding:6px 25px 6px 8px; border:2px solid #1ba56a; border-radius:6px; color:#14213d; font-size:10px; font-weight:700; box-shadow:0 0 0 2px rgba(22,163,74,.1); }
    .ui-confirm-input i,.ui-confirm-button i { position:absolute; top:-8px; right:-8px; width:17px; height:17px; display:grid; place-items:center; border:2px solid white; border-radius:50%; background:#d96d17; color:#fff; font-size:8px; font-style:normal; }
    .ui-confirm-note { display:flex; align-items:center; gap:6px; padding:8px 7px; color:#16814d; font-size:8px; }
    .ui-confirm-note b { width:17px; height:17px; display:grid; place-items:center; border-radius:50%; background:#dcf5e7; }
    .ui-confirm-actions { display:flex; justify-content:space-between; align-items:center; margin-top:5px; padding:8px 7px 0; border-top:1px solid #eef1f5; color:#7f8fa5; font-size:8px; }
    .ui-confirm-button { position:relative; padding:7px 10px; border-radius:6px; background:linear-gradient(135deg,#f5820a,#e06d00); color:#fff; font-size:9px; font-weight:700; box-shadow:0 2px 6px rgba(245,130,10,.25); }
    .confirm-capture .ui-stepper-title { margin-top:28px; }
    .confirm-target { position:relative; display:inline-flex; flex-direction:column; align-items:flex-end; gap:7px; }
    .control-callout { position:relative; top:auto; right:auto; left:auto; padding:4px 7px; font-size:8px; }
    .control-callout::before { content:""; position:absolute; left:50%; bottom:-4px; width:2px; height:4px; background:#e87922; transform:translateX(-50%); }
    .control-callout::after { content:""; position:absolute; left:50%; bottom:-9px; border-top:5px solid #e87922; border-right:5px solid transparent; border-left:5px solid transparent; transform:translateX(-50%); }
    @media(max-width:900px) { .visual-card { grid-template-columns:minmax(145px,.48fr) minmax(0,1.52fr); } .ui-capture { padding:10px; } .ui-stepper-screen { grid-template-columns:78px minmax(0,1fr); } .ui-step-nav { padding:7px 4px; } .ui-denoms { padding:8px 7px; } }
    @media(max-width:680px) { .interface-guide { padding:12px; } .visual-card { grid-template-columns:minmax(0,1fr); } .visual-card figcaption { padding:12px; border-right:0; border-bottom:1px solid #e7edf4; } .ui-capture { padding:12px; } .ui-stepper-screen { grid-template-columns:76px minmax(0,1fr); } .ui-denom-head,.ui-denom-row { grid-template-columns:minmax(36px,.75fr) minmax(46px,1fr) minmax(46px,1fr) minmax(44px,.8fr); gap:3px; } .ui-input { min-height:19px; } .callout-fajo { left:39%; } .callout-unidad { left:63%; } }
    .steps-section { display:flex; flex-direction:column; gap:9px; }
    .step-row { display:grid; grid-template-columns:30px minmax(0,1fr) 32px; align-items:start; gap:12px; padding:13px 14px; border:1px solid #e5ebf3; border-radius:11px; background:#fff; }
    .step-index { width:28px; height:28px; display:grid; place-items:center; border-radius:9px; background:#edf4ff; color:#2762a4; font-size:12px; font-weight:800; }
    .step-copy h3 { margin:1px 0 4px; color:#1b2e4b; font-size:12px; font-weight:750; }
    .step-copy p { margin:0; color:#61738d; font-size:11px; line-height:1.5; }
    .step-copy p + p { margin-top:6px; }
    .step-symbol { width:30px; height:30px; display:grid; place-items:center; border-radius:9px; background:#f4f7fb; color:#8295ad; font-size:17px; }
    .tip { color:#8a5a19 !important; }
    .success-check { display:flex; align-items:flex-start; gap:11px; margin:15px 0 18px; padding:13px 15px; border:1px solid #bde7d0; border-radius:10px; background:#f1fbf5; }
    .success-icon { width:24px; height:24px; display:grid; place-items:center; flex:0 0 auto; border-radius:50%; background:#d9f4e4; color:#14804b; font-weight:800; }
    .success-check strong { color:#176344; font-size:11px; }
    .success-check p { margin:3px 0 0; color:#567763; font-size:11px; line-height:1.45; }
    .manual-document-footer { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:13px 0; border-top:1px solid #e8eef5; }
    .manual-document-footer > span { color:#91a0b4; font-size:10px; }
    .manual-document-footer a { display:inline-flex; align-items:center; gap:7px; color:#a95715; font-size:11px; font-weight:700; text-decoration:none; }
    .manual-document-footer a:hover { color:#e17723; }
    @media(max-width:900px) { .manuals-layout { grid-template-columns:210px minmax(0,1fr); gap:12px; } .manual-document { padding:18px 18px 0; } }
    @media(max-width:680px) { .manuals-page { padding:0 0 20px; } .manuals-layout { grid-template-columns:minmax(0,1fr); } .manuals-index { position:static; } .index-upcoming { display:none; } .manual-document-footer { align-items:flex-start; flex-direction:column; } }
  `],
})
export class ManualesComponent {
  private readonly route = inject(ActivatedRoute);
  isCierre = false;
  videoOpen = false;
  get manualKey(): string { return this.isCierre ? 'cierre_caja' : 'apertura_caja'; }

  constructor() {
    this.route.queryParamMap.subscribe(params => {
      this.isCierre = params.get('tipo') === 'cierre';
      this.videoOpen = false;
    });
  }
}
