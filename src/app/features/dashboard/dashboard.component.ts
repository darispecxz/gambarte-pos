import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { CambioService } from '../../core/cambio.service';
import { CajeroService } from '../../core/cajero.service';
import { NotificacionService, NotificacionConteo, Notificacion } from '../../core/notificacion.service';
import { AuthService } from '../../core/auth.service';
import { forkJoin, catchError, of } from 'rxjs';

interface ResumenCajas {
  total: number;
  abiertas: number;
  monedas: string[];
}

interface ResumenOperaciones {
  cambiosHoy: number;
  totalCambiosBob: number;
  remesasHoy: number;
  totalRemesasBob: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DecimalPipe],
  template: `
    <div class="dash">
      <!-- Banner de bienvenida -->
      <div class="welcome-banner">
        <div class="wb-content">
          <div class="wb-text">
            <h1>Buenos {{ saludo }}, {{ nombreCorto }}</h1>
            <p>{{ fechaHoy }}</p>
          </div>
          <div class="wb-illustration">
            @if (resumenCajas.abiertas > 0) {
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                <circle cx="60" cy="60" r="50" fill="rgba(255,255,255,.15)"/>
                <circle cx="60" cy="60" r="35" fill="rgba(255,255,255,.12)"/>
                <path d="M50 50h20a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H50a4 4 0 0 1-4-4V54a4 4 0 0 1 4-4z" stroke="rgba(255,255,255,.9)" stroke-width="2" fill="none"/>
                <path d="M52 50v-6a8 8 0 0 1 16 0v0" stroke="rgba(255,255,255,.9)" stroke-width="2" fill="none" stroke-linecap="round"/>
                <circle cx="60" cy="62" r="3" fill="rgba(255,255,255,.9)"/>
                <path d="M60 65v4" stroke="rgba(255,255,255,.9)" stroke-width="2"/>
              </svg>
            } @else {
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                <circle cx="60" cy="60" r="50" fill="rgba(255,255,255,.15)"/>
                <circle cx="60" cy="60" r="35" fill="rgba(255,255,255,.12)"/>
                <path d="M50 50h20a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H50a4 4 0 0 1-4-4V54a4 4 0 0 1 4-4z" stroke="rgba(255,255,255,.9)" stroke-width="2" fill="none"/>
                <path d="M52 50v-6a8 8 0 0 1 16 0v6" stroke="rgba(255,255,255,.9)" stroke-width="2" fill="none"/>
                <circle cx="60" cy="62" r="3" fill="rgba(255,255,255,.9)"/>
                <path d="M60 65v4" stroke="rgba(255,255,255,.9)" stroke-width="2"/>
              </svg>
            }
          </div>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi" (click)="ir('/caja')">
          <div class="kpi-top">
            <div class="kpi-icon-wrap caja">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 7h20l-2 13H4L2 7z"/><path d="M5 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2"/></svg>
            </div>
            <span class="kpi-badge" [class.open]="resumenCajas.abiertas > 0" [class.closed]="resumenCajas.abiertas === 0">
              {{ resumenCajas.abiertas > 0 ? 'Activas' : 'Cerradas' }}
            </span>
          </div>
          <div class="kpi-val">{{ resumenCajas.abiertas }}<span class="kpi-of"> / {{ resumenCajas.total }}</span></div>
          <div class="kpi-lbl">Cajas abiertas</div>
          @if (resumenCajas.abiertas > 0 && resumenCajas.total > 0) {
            <div class="kpi-bar"><div class="kpi-bar-fill caja" [style.width.%]="(resumenCajas.abiertas / resumenCajas.total) * 100"></div></div>
          }
        </div>

        <div class="kpi" (click)="ir('/historial')">
          <div class="kpi-top">
            <div class="kpi-icon-wrap cambio">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
            </div>
          </div>
          <div class="kpi-val">{{ resumenOps.cambiosHoy }}</div>
          <div class="kpi-lbl">Cambios hoy</div>
          @if (resumenOps.totalCambiosBob > 0) {
            <div class="kpi-amount">BOB {{ resumenOps.totalCambiosBob | number:'1.2-2' }}</div>
          }
        </div>

        <div class="kpi" (click)="ir('/historial-remesa')">
          <div class="kpi-top">
            <div class="kpi-icon-wrap remesa">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
          </div>
          <div class="kpi-val">{{ resumenOps.remesasHoy }}</div>
          <div class="kpi-lbl">Remesas hoy</div>
          @if (resumenOps.totalRemesasBob > 0) {
            <div class="kpi-amount">BOB {{ resumenOps.totalRemesasBob | number:'1.2-2' }}</div>
          }
        </div>

        <div class="kpi" [class.kpi-alert]="conteoNotif.critica > 0 || conteoNotif.alta > 0">
          <div class="kpi-top">
            <div class="kpi-icon-wrap alerta" [class.critica]="conteoNotif.critica > 0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </div>
            @if (conteoNotif.critica > 0) {
              <span class="kpi-badge critica-badge">{{ conteoNotif.critica }} criticas</span>
            }
          </div>
          <div class="kpi-val">{{ conteoNotif.total }}</div>
          <div class="kpi-lbl">Alertas pendientes</div>
        </div>
      </div>

      <div class="dash-cols">
        <!-- Columna izquierda -->
        <div class="dash-main">
          <!-- Notificaciones recientes -->
          @if (notifRecientes.length > 0) {
            <div class="section-card">
              <div class="sc-head">
                <h2>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  Alertas recientes
                </h2>
              </div>
              <div class="notif-list">
                @for (n of notifRecientes; track n.id_notificacion) {
                  <div class="notif-row" [class.no-leida]="!n.leida">
                    <div class="notif-dot" [class]="'dot-' + n.urgencia"></div>
                    <div class="notif-body">
                      <div class="notif-titulo">{{ n.titulo }}</div>
                      <div class="notif-msg">{{ n.mensaje }}</div>
                    </div>
                    <div class="notif-meta">
                      <span class="notif-urg" [class]="'urg-' + n.urgencia">{{ n.urgencia }}</span>
                      <span class="notif-time">{{ tiempoRelativo(n.fec_creacion) }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
        </div>

        <!-- Columna derecha: Accesos rápidos -->
        <div class="dash-side">
          <div class="section-card">
            <div class="sc-head">
              <h2>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                Accesos rápidos
              </h2>
            </div>
            <div class="quick-list">
              <button class="quick-item" (click)="ir('/cambio')">
                <div class="qi-icon cambio">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                </div>
                <div class="qi-text">
                  <span class="qi-label">Nuevo Cambio</span>
                  <span class="qi-desc">Compra y venta de divisas</span>
                </div>
                <svg class="qi-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <button class="quick-item" (click)="ir('/remesa')">
                <div class="qi-icon remesa">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div class="qi-text">
                  <span class="qi-label">Nueva Remesa</span>
                  <span class="qi-desc">Enviar giro internacional</span>
                </div>
                <svg class="qi-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <button class="quick-item" (click)="irEnviarGiro()">
                <div class="qi-icon giro">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
                </div>
                <div class="qi-text">
                  <span class="qi-label">Enviar Giro Nacional</span>
                  <span class="qi-desc">Registrar un nuevo giro</span>
                </div>
                <svg class="qi-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
              <button class="quick-item" (click)="irPagoEfectivo()">
                <div class="qi-icon efectivo">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                </div>
                <div class="qi-text">
                  <span class="qi-label">Pago de Remesas en Efectivo</span>
                  <span class="qi-desc">Pagar remesas por ventanilla</span>
                </div>
                <svg class="qi-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dash { }

    /* ── Welcome Banner ── */
    .welcome-banner {
      background: linear-gradient(135deg, #F58634 0%, #e07020 50%, #c85d18 100%);
      border-radius: 16px;
      padding: 32px 36px;
      margin-bottom: 24px;
      position: relative;
      overflow: hidden;
    }
    .welcome-banner::before {
      content: '';
      position: absolute;
      top: -40%; right: -10%;
      width: 300px; height: 300px;
      background: radial-gradient(circle, rgba(255,255,255,.12) 0%, transparent 70%);
      border-radius: 50%;
    }
    .wb-content {
      display: flex; align-items: center; justify-content: space-between;
      position: relative; z-index: 1;
    }
    .wb-text h1 {
      font-size: 26px; font-weight: 800; color: #fff; margin: 0 0 6px;
    }
    .wb-text p {
      font-size: 14px; color: rgba(255,255,255,.85); margin: 0;
      text-transform: capitalize;
    }
    .wb-illustration { opacity: .7; flex-shrink: 0; }

    /* ── KPI Grid ── */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 28px;
    }
    .kpi {
      background: var(--card-bg, #fff);
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 14px;
      padding: 20px;
      cursor: pointer;
      transition: all .2s;
    }
    .kpi:hover {
      box-shadow: 0 6px 20px rgba(0,0,0,.07);
      transform: translateY(-2px);
    }
    .kpi-alert { border-color: #fca5a5; }
    .kpi-top {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 14px;
    }
    .kpi-icon-wrap {
      width: 42px; height: 42px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .kpi-icon-wrap.caja { background: #ede9fe; color: #7c3aed; }
    .kpi-icon-wrap.cambio { background: #dbeafe; color: #2563eb; }
    .kpi-icon-wrap.remesa { background: #d1fae5; color: #059669; }
    .kpi-icon-wrap.alerta { background: #fef3c7; color: #d97706; }
    .kpi-icon-wrap.alerta.critica { background: #fee2e2; color: #dc2626; }
    .kpi-badge {
      font-size: 10.5px; font-weight: 700; text-transform: uppercase;
      padding: 3px 10px; border-radius: 20px; letter-spacing: .3px;
    }
    .kpi-badge.open { background: #d1fae5; color: #059669; }
    .kpi-badge.closed { background: var(--hover-bg, #f1f5f9); color: var(--text-secondary, #94a3b8); }
    .kpi-badge.critica-badge { background: #fee2e2; color: #dc2626; }
    .kpi-val {
      font-size: 32px; font-weight: 800; color: var(--text-primary, #14213d); line-height: 1.1;
    }
    .kpi-of { font-size: 18px; font-weight: 500; color: var(--text-secondary, #94a3b8); }
    .kpi-lbl {
      font-size: 13px; color: var(--text-secondary, #64748b); margin-top: 4px;
    }
    .kpi-amount {
      font-size: 12px; color: var(--text-secondary, #94a3b8); margin-top: 6px;
      font-weight: 600; font-variant-numeric: tabular-nums;
    }
    .kpi-bar {
      height: 4px; border-radius: 2px; background: var(--hover-bg, #f1f5f9);
      margin-top: 12px; overflow: hidden;
    }
    .kpi-bar-fill { height: 100%; border-radius: 2px; transition: width .6s ease; }
    .kpi-bar-fill.caja { background: #7c3aed; }

    /* ── Columns layout ── */
    .dash-cols {
      display: grid;
      grid-template-columns: 1fr 380px;
      gap: 24px;
    }
    .dash-main { min-width: 0; }
    .dash-side { min-width: 0; }

    /* ── Section card ── */
    .section-card {
      background: var(--card-bg, #fff);
      border: 1px solid var(--border, #e5e7eb);
      border-radius: 14px;
      overflow: hidden;
    }
    .sc-head {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border, #f1f5f9);
    }
    .sc-head h2 {
      font-size: 14px; font-weight: 700; color: var(--text-primary, #1e293b);
      margin: 0; display: flex; align-items: center; gap: 8px;
    }
    .sc-head h2 svg { color: var(--text-secondary, #94a3b8); }

    /* ── Notifications ── */
    .notif-list { }
    .notif-row {
      display: flex; align-items: flex-start; gap: 12px;
      padding: 14px 20px;
      border-bottom: 1px solid var(--border, #f1f5f9);
      transition: background .15s;
    }
    .notif-row:last-child { border-bottom: none; }
    .notif-row:hover { background: var(--hover-bg, #f8fafc); }
    .notif-row.no-leida { background: var(--card-alert-bg, #fffbeb); }
    .notif-dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
      margin-top: 6px;
    }
    .dot-critica { background: #dc2626; }
    .dot-alta { background: #f97316; }
    .dot-media { background: #eab308; }
    .dot-baja { background: #3b82f6; }
    .notif-body { flex: 1; min-width: 0; }
    .notif-titulo { font-size: 13px; font-weight: 600; color: var(--text-primary, #1e293b); }
    .notif-msg {
      font-size: 12px; color: var(--text-secondary, #64748b); margin-top: 2px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .notif-meta {
      display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
      flex-shrink: 0;
    }
    .notif-urg {
      font-size: 9.5px; font-weight: 700; text-transform: uppercase;
      padding: 2px 8px; border-radius: 6px; white-space: nowrap;
      letter-spacing: .3px;
    }
    .urg-critica { background: #fee2e2; color: #dc2626; }
    .urg-alta { background: #ffedd5; color: #c2410c; }
    .urg-media { background: #fef3c7; color: #b45309; }
    .urg-baja { background: #e0f2fe; color: #0369a1; }
    .notif-time {
      font-size: 11px; color: var(--text-secondary, #94a3b8); white-space: nowrap;
    }

    /* ── Quick Access List ── */
    .quick-list { padding: 4px 0; }
    .quick-item {
      display: flex; align-items: center; gap: 14px;
      width: 100%; padding: 14px 20px;
      background: none; border: none;
      cursor: pointer; transition: background .15s;
      text-align: left;
    }
    .quick-item:hover { background: var(--hover-bg, #f8fafc); }
    .qi-icon {
      width: 38px; height: 38px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .qi-icon.caja { background: #ede9fe; color: #7c3aed; }
    .qi-icon.cambio { background: #dbeafe; color: #2563eb; }
    .qi-icon.remesa { background: #d1fae5; color: #059669; }
    .qi-icon.giro { background: #fce7f3; color: #db2777; }
    .qi-icon.efectivo { background: #fef3c7; color: #d97706; }
    .qi-icon.banco { background: #e0f2fe; color: #0284c7; }
    .qi-text { flex: 1; min-width: 0; }
    .qi-label {
      font-size: 13.5px; font-weight: 600; color: var(--text-primary, #1e293b);
      display: block;
    }
    .qi-desc {
      font-size: 11.5px; color: var(--text-secondary, #94a3b8);
      display: block; margin-top: 1px;
    }
    .qi-arrow { color: var(--text-secondary, #cbd5e1); flex-shrink: 0; }

    /* Dashboard hierarchy: compact greeting, spacious quick actions. */
    .dash { display:block; }
    .welcome-banner { padding:10px 18px;margin:0 0 14px;border-radius:10px; }
    .wb-text h1 { font-size:16px;margin-bottom:2px; }
    .wb-text p { font-size:10px; }
    .wb-illustration svg { width:42px;height:42px; }
    .kpi-grid { grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:0 0 14px; }
    .kpi { padding:9px 12px;border-radius:11px; }
    .kpi-top { margin-bottom:5px; }
    .kpi-icon-wrap { width:28px;height:28px;border-radius:8px; }
    .kpi-icon-wrap svg { width:16px;height:16px; }
    .kpi-badge { padding:2px 7px;font-size:9px; }
    .kpi-val { font-size:21px; }
    .kpi-of { font-size:12px; }
    .kpi-lbl { margin-top:2px;font-size:10px; }
    .kpi-amount { margin-top:3px;font-size:10px; }
    .kpi-bar { margin-top:6px; }
    .dash-cols { grid-template-columns:minmax(0,1fr);gap:14px; }
    .dash-side { grid-row:1; }
    .dash-main { grid-row:2; }
    .quick-list { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:14px; }
    .quick-item { min-height:86px;box-sizing:border-box;padding:16px;border:1px solid var(--border,#e5e7eb);border-radius:12px;background:var(--card-bg,#fff);gap:13px; }
    .quick-item:hover { border-color:#f3b06f;background:var(--hover-bg,#fffaf5);box-shadow:0 5px 14px rgba(31,45,64,.07); }
    .qi-icon { width:46px;height:46px;border-radius:12px; }
    .qi-icon svg { width:21px;height:21px; }
    .qi-label { font-size:15px;font-weight:700; }
    .qi-desc { margin-top:4px;font-size:12px; }
    .qi-arrow { width:18px;height:18px; }

    @media (max-width: 900px) {
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
      .dash-cols { grid-template-columns: 1fr; }
      .quick-list { grid-template-columns:repeat(2,minmax(0,1fr)); }
    }
    @media (max-width: 500px) {
      .welcome-banner { padding: 24px 20px; }
      .wb-text h1 { font-size: 20px; }
      .wb-illustration { display: none; }
      .kpi-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
      .kpi { padding: 14px; }
      .kpi-val { font-size: 24px; }
      .quick-list { grid-template-columns:1fr;padding:10px; }
      .quick-item { min-height:72px;padding:12px; }
    }

    @media(max-width:900px) { .kpi-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
    @media(max-width:500px) { .welcome-banner { padding:9px 12px; } .wb-text h1 { font-size:14px; } .kpi { padding:8px 10px; } }

    /* ── Dark mode ── */
    :host-context(html[data-theme="dark"]) {
      .kpi:hover { box-shadow: 0 6px 20px rgba(0,0,0,.3); }
      .kpi-icon-wrap.caja { background: rgba(124,58,237,.2); color: #a78bfa; }
      .kpi-icon-wrap.cambio { background: rgba(37,99,235,.2); color: #60a5fa; }
      .kpi-icon-wrap.remesa { background: rgba(5,150,105,.2); color: #34d399; }
      .kpi-icon-wrap.alerta { background: rgba(217,119,6,.2); color: #fbbf24; }
      .kpi-icon-wrap.alerta.critica { background: rgba(220,38,38,.2); color: #f87171; }
      .kpi-badge.open { background: rgba(5,150,105,.2); color: #34d399; }
      .kpi-badge.closed { background: rgba(148,163,184,.15); color: #94a3b8; }
      .kpi-badge.critica-badge { background: rgba(220,38,38,.2); color: #f87171; }
      .kpi-bar { background: rgba(255,255,255,.08); }
      .kpi-bar-fill.caja { background: #a78bfa; }
      .kpi-alert { border-color: rgba(220,38,38,.35); }
      .notif-row.no-leida { background: rgba(250,204,21,.06); }
      .qi-icon.caja { background: rgba(124,58,237,.2); color: #a78bfa; }
      .qi-icon.cambio { background: rgba(37,99,235,.2); color: #60a5fa; }
      .qi-icon.remesa { background: rgba(5,150,105,.2); color: #34d399; }
      .qi-icon.giro { background: rgba(219,39,119,.2); color: #f472b6; }
      .qi-icon.efectivo { background: rgba(217,119,6,.2); color: #fbbf24; }
      .qi-icon.banco { background: rgba(2,132,199,.2); color: #38bdf8; }
      .qi-arrow { color: var(--text-secondary, #64748b); }
      .urg-critica { background: rgba(220,38,38,.2); color: #f87171; }
      .urg-alta { background: rgba(249,115,22,.2); color: #fb923c; }
      .urg-media { background: rgba(234,179,8,.2); color: #fbbf24; }
      .urg-baja { background: rgba(59,130,246,.2); color: #60a5fa; }
      .dot-critica { background: #f87171; }
      .dot-alta { background: #fb923c; }
      .dot-media { background: #fbbf24; }
      .dot-baja { background: #60a5fa; }
    }
  `],
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private auth = inject(AuthService);
  private cajeroService = inject(CajeroService);
  private cambioService = inject(CambioService);
  private notifService = inject(NotificacionService);

  resumenCajas: ResumenCajas = { total: 0, abiertas: 0, monedas: [] };
  resumenOps: ResumenOperaciones = { cambiosHoy: 0, totalCambiosBob: 0, remesasHoy: 0, totalRemesasBob: 0 };
  conteoNotif: NotificacionConteo = { total: 0, critica: 0, alta: 0, media: 0, baja: 0 };
  notifRecientes: Notificacion[] = [];

  get nombreCorto(): string {
    const nombre = this.auth.user?.nombre ?? '';
    return nombre.split(' ')[0] || 'Usuario';
  }

  get saludo(): string {
    const h = new Date().getHours();
    if (h < 12) return 'días';
    if (h < 18) return 'tardes';
    return 'noches';
  }

  get fechaHoy(): string {
    return new Date().toLocaleDateString('es-BO', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  }

  ngOnInit(): void {
    this.cargarCajas();
    this.cargarOperaciones();
    this.cargarNotificaciones();
  }

  private cargarCajas(): void {
    this.cajeroService.misCajas().subscribe({
      next: cajas => {
        this.resumenCajas.total = cajas.length;
        this.resumenCajas.abiertas = cajas.filter(c => c.sesion_hoy?.estado === 'abierta').length;
        this.resumenCajas.monedas = [...new Set(cajas.map(c => c.moneda))];
      },
      error: () => {},
    });
  }

  private cargarOperaciones(): void {
    const hoy = new Date().toISOString().slice(0, 10);
    this.cambioService.historial(hoy).pipe(catchError(() => of(null))).subscribe(resp => {
      if (resp) {
        this.resumenOps.cambiosHoy = resp.total;
        this.resumenOps.totalCambiosBob = (resp.totals?.compras?.totalBob ?? 0) + (resp.totals?.ventas?.totalBob ?? 0);
      }
    });
  }

  private cargarNotificaciones(): void {
    forkJoin([
      this.notifService.contarNoLeidas().pipe(catchError(() => of({ total: 0, critica: 0, alta: 0, media: 0, baja: 0 }))),
      this.notifService.listar({ leida: 0, limit: 5 }).pipe(catchError(() => of([]))),
    ]).subscribe(([conteo, recientes]) => {
      this.conteoNotif = conteo;
      this.notifRecientes = recientes;
    });
  }

  tiempoRelativo(fecha: string): string {
    const diff = Date.now() - new Date(fecha).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const dias = Math.floor(hrs / 24);
    return `${dias}d`;
  }

  ir(ruta: string): void {
    this.router.navigate([ruta]);
  }

  irPagoEfectivo(): void {
    this.router.navigate(['/pago-remesa'], { queryParams: { tipo: 'efectivo' } });
  }

  irEnviarGiro(): void {
    this.router.navigate(['/giro'], { queryParams: { tab: 'enviar' } });
  }
}
