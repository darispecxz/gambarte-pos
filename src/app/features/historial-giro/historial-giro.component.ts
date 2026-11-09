import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { GiroService, HistorialGiroRecord } from '../../core/giro.service';

@Component({
  selector: 'app-historial-giro',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule],
  template: `
    <div class="page">

      <!-- FILTERS -->
      <div class="filter-bar">
        <div class="filter-left">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <div class="field-inline">
            <label>Desde</label>
            <input type="date" [(ngModel)]="desde">
          </div>
          <div class="field-inline">
            <label>Hasta</label>
            <input type="date" [(ngModel)]="hasta">
          </div>
          <div class="field-inline">
            <label>Estado</label>
            <select [(ngModel)]="filterEstado">
              <option value="">Todos</option>
              <option value="0">Pendiente</option>
              <option value="1">Pagado</option>
              <option value="2">Devuelto</option>
            </select>
          </div>
          <div class="field-inline">
            <label>Codigo</label>
            <input type="text" [(ngModel)]="filterCodigo" placeholder="Ej: 10542" class="input-sm">
          </div>
          <button class="btn-search" (click)="buscar()" [disabled]="loadingGiros">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Buscar
          </button>
        </div>
        <div class="filter-right">
          <span class="count-badge" [class.has]="giros.length > 0">
            {{ giros.length }} giros
          </span>
        </div>
      </div>

      @if (loadingGiros) {
        <div class="loading-box">
          <div class="spinner"></div>
          <span>Cargando giros...</span>
        </div>
      }

      <!-- TABLE -->
      @if (!loadingGiros && giros.length > 0) {
        <div class="table-wrapper">
          <div class="table-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" [(ngModel)]="searchTerm" placeholder="Buscar por nombre, codigo, agencia..."
                   class="search-input">
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th class="th-comprobantes"></th>
                <th>Codigo</th>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Remitente</th>
                <th>Destinatario</th>
                <th>Agencia Destino</th>
                <th>Mon.</th>
                <th class="th-num">Monto</th>
                <th class="th-num">Total [BOB]</th>
                <th>Pago</th>
                <th>Estado</th>
                <th class="th-act"></th>
              </tr>
            </thead>
            <tbody>
              @for (g of filteredGiros; track g.id) {
                <tr>
                  <td class="td-comprobantes">
                    <button class="btn-icon-pdf" title="Comprobante de envio" (click)="abrirPdfPopup('comprobante', g.id)">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    </button>
                  </td>
                  <td class="td-code">{{ g.codigo }}</td>
                  <td class="td-hora">{{ formatFechaOnly(g.fecha) }}</td>
                  <td class="td-hora">{{ formatHoraOnly(g.fecha) }}</td>
                  <td class="td-cliente">{{ g.remitente }}</td>
                  <td class="td-cliente">{{ g.destinatario }}</td>
                  <td>{{ g.agencia_destino }}</td>
                  <td><span class="mon-badge">{{ g.moneda }}</span></td>
                  <td class="td-num">{{ g.monto | number:'1.2-2' }}</td>
                  <td class="td-num td-total">{{ g.totalBob | number:'1.2-2' }}</td>
                  <td>
                    <span class="pago-badge" [class.deposito]="g.cuentaBancaria === 1" [class.efectivo]="g.cuentaBancaria !== 1">
                      {{ g.formaPagoDesc }}
                    </span>
                  </td>
                  <td>
                    <span class="estado-badge"
                      [class.pendiente]="g.estado === 0"
                      [class.pagado]="g.estado === 1"
                      [class.devuelto]="g.estado === 2">
                      {{ g.estadoDesc }}
                    </span>
                  </td>
                  <td class="td-act">
                    <button class="btn-eye" (click)="verDetalle(g)" title="Ver detalle">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    <button class="btn-print-sm" (click)="abrirPdfPopup('factura', g.id)" title="Factura PDF">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (!loadingGiros && giros.length === 0 && searched) {
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <p>No se encontraron giros para los filtros seleccionados.</p>
        </div>
      }

      <!-- ===== DETAIL DRAWER ===== -->
      @if (selectedGiro) {
        <div class="drawer-overlay" (click)="selectedGiro = null"></div>
        <div class="drawer">
          <div class="drawer-header">
            <div class="drawer-title-row">
              <span class="drawer-icon">↔</span>
              <div class="drawer-heading-copy"><h3>Detalle del giro</h3><span class="drawer-code">Giro #{{ selectedGiro.codigo }} · {{ selectedGiro.fecha }}</span></div>
            </div>
            <div class="drawer-header-actions">
            <button class="btn-close" (click)="selectedGiro = null">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            </div>
          </div>

          <div class="drawer-body">
            <div class="route-section">
              <div class="route-party route-origin"><span class="route-icon">↗</span><div class="route-copy"><span class="route-label">Origen</span><strong>{{ selectedGiro.agencia_origen || 'No disponible' }}</strong><span class="route-location">🇧🇴 Bolivia</span></div></div>
              <span class="route-arrow">→</span>
              <div class="route-party route-destination"><span class="route-icon">↙</span><div class="route-copy"><span class="route-label">Destino</span><strong>{{ selectedGiro.agencia_destino || 'No disponible' }}</strong><span class="route-location">🇨🇱 Chile</span></div></div>
            </div>
            <div class="drawer-section">
              <div class="section-head"><span class="section-icon">▤</span><span>Datos de la operación</span></div>
              <div class="detail-grid">
                <div class="dg-item"><span class="dg-label">Fecha y hora</span><span class="dg-value">{{ selectedGiro.fecha }}</span></div>
                <div class="dg-item"><span class="dg-label">Correlativo</span><span class="dg-value">{{ selectedGiro.correlativo }}</span></div>
                <div class="dg-item"><span class="dg-label">Forma de pago</span><span class="dg-value"><span class="pago-badge" [class.deposito]="selectedGiro.cuentaBancaria === 1" [class.efectivo]="selectedGiro.cuentaBancaria !== 1">{{ selectedGiro.cuentaBancaria === 1 ? 'Depósito a cuenta' : 'Efectivo por ventanilla' }}</span></span></div>
                <div class="dg-item"><span class="dg-label">Estado</span><span class="dg-value"><span class="estado-badge" [class.pendiente]="selectedGiro.estado === 0" [class.pagado]="selectedGiro.estado === 1" [class.devuelto]="selectedGiro.estado === 2">{{ selectedGiro.estadoDesc }}</span></span></div>
                @if (selectedGiro.cuentaBancaria === 1) {
                  @if (selectedGiro.bancoNombre) {
                    <div class="dg-item">
                      <span class="dg-label">Banco Destino</span>
                      <span class="dg-value fw700">{{ selectedGiro.bancoNombre }}</span>
                    </div>
                  }
                  @if (selectedGiro.bancoCuenta) {
                    <div class="dg-item">
                      <span class="dg-label">Nro. Cuenta</span>
                      <span class="dg-value fw700">{{ selectedGiro.bancoCuenta }}</span>
                    </div>
                  }
                }
              </div>
            </div>

            <div class="drawer-section">
              <div class="section-head">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>Remitente</span>
              </div>
              <div class="detail-grid">
                <div class="dg-item span2">
                  <span class="dg-label">Nombre</span>
                  <span class="dg-value fw700">{{ selectedGiro.remitente }}</span>
                </div>
              </div>
            </div>

            <div class="drawer-section">
              <div class="section-head">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6"/><path d="M23 11h-6"/></svg>
                <span>Destinatario</span>
              </div>
              <div class="detail-grid">
                <div class="dg-item span2">
                  <span class="dg-label">Nombre</span>
                  <span class="dg-value fw700">{{ selectedGiro.destinatario }}</span>
                </div>
              </div>
            </div>

            <div class="drawer-section">
              <div class="section-head">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                <span>Detalle Financiero</span>
              </div>
              <div class="detail-grid">
                <div class="dg-item">
                  <span class="dg-label">Moneda</span>
                  <span class="dg-value"><span class="mon-badge">{{ selectedGiro.moneda }}</span></span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Monto</span>
                  <span class="dg-value big">{{ selectedGiro.monto | number:'1.2-2' }}</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Comision</span>
                  <span class="dg-value">{{ selectedGiro.comision | number:'1.2-2' }}</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Comision BOB</span>
                  <span class="dg-value">{{ selectedGiro.comisionBob | number:'1.2-2' }}</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Total</span>
                  <span class="dg-value big">{{ selectedGiro.total | number:'1.2-2' }}</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Total BOB</span>
                  <span class="dg-value big orange">{{ selectedGiro.totalBob | number:'1.2-2' }} BOB</span>
                </div>
              </div>
            </div>

            <div class="drawer-section">
              <div class="section-head">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Documentos</span>
              </div>
              <div class="doc-list">
                <button class="doc-item" (click)="abrirPdfPopup('comprobante', selectedGiro.id)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F58634" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  <div class="doc-info">
                    <span class="doc-name">Comprobante de Giro</span>
                    <span class="doc-sub">Codigo {{ selectedGiro.codigo }}</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </button>
                <button class="doc-item" (click)="abrirPdfPopup('factura', selectedGiro.id)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F58634" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <div class="doc-info">
                    <span class="doc-name">Factura de Comision</span>
                    <span class="doc-sub">Giro #{{ selectedGiro.codigo }}</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </button>
              </div>
            </div>
          </div>

          <div class="drawer-footer">
            <button class="btn-print" (click)="abrirPdfPopup('comprobante', selectedGiro.id)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Comprobante
            </button>
            <button class="btn-print" (click)="abrirPdfPopup('factura', selectedGiro.id)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Factura
            </button>
          </div>
        </div>
      }

      <!-- ===== PDF POPUP ===== -->
      @if (showPdfPopup) {
        <div class="overlay" (click)="cerrarPdfPopup()">
          <div class="pdf-modal" (click)="$event.stopPropagation()">
            <div class="pdf-modal-header">
              <h3>{{ pdfPopupTitulo }}</h3>
              <div class="pdf-modal-actions">
                <button class="btn-secondary btn-sm" (click)="imprimirPdf()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Imprimir
                </button>
                <button class="btn-icon-close" (click)="cerrarPdfPopup()">&#x2715;</button>
              </div>
            </div>
            @if (pdfPopupLoading) {
              <div class="pdf-loading">
                <div class="spinner"></div>
                <span>Generando PDF...</span>
              </div>
            }
            @if (pdfPopupUrl) {
              <iframe [src]="pdfPopupUrl" class="pdf-iframe"></iframe>
            }
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { margin: 0; }

    .filter-bar {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      background: var(--card-bg, #fff); border: 1px solid var(--border, #e5e7eb); border-radius: 12px;
      padding: 14px 18px; margin-bottom: 16px; flex-wrap: wrap;
    }
    .filter-left { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
    .filter-left > svg { color: var(--text-secondary, #94a3b8); flex-shrink: 0; }
    .field-inline { display: flex; flex-direction: column; gap: 2px; }
    .field-inline label {
      font-size: 10px; font-weight: 700; color: var(--text-secondary, #94a3b8);
      text-transform: uppercase; letter-spacing: .04em;
    }
    .field-inline input, .field-inline select {
      padding: 7px 10px; border: 1px solid var(--border, #d1d5db); border-radius: 7px;
      font-size: 13px; color: var(--text, #1e293b); outline: none; background: var(--input-bg, #fff);
      font-family: inherit;
    }
    .field-inline input:focus, .field-inline select:focus {
      border-color: #F58634; box-shadow: 0 0 0 3px rgba(245,134,52,.12);
    }
    .input-sm { width: 100px; }
    .btn-search {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 18px; background: #373435; color: #fff; border: none;
      border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .btn-search:hover:not(:disabled) { background: #1c2d4f; }
    .btn-search:disabled { opacity: .5; cursor: not-allowed; }
    .count-badge {
      font-size: 12px; font-weight: 600; color: var(--text-secondary, #94a3b8); padding: 6px 12px;
      background: var(--hover-bg, #f1f5f9); border-radius: 20px;
    }
    .count-badge.has { color: var(--text, #14213d); background: var(--info-bg, #e0f2fe); }

    .loading-box {
      display: flex; align-items: center; justify-content: center; gap: 12px;
      padding: 60px 0; color: var(--text-secondary, #64748b); font-size: 14px;
    }

    .table-wrapper {
      background: var(--card-bg, #fff); border: 1px solid var(--border, #e5e7eb); border-radius: 12px; overflow: hidden;
    }
    .table-search {
      display: flex; align-items: center; gap: 8px; padding: 12px 16px;
      border-bottom: 1px solid var(--border, #f1f5f9);
    }
    .table-search svg { color: var(--text-secondary, #94a3b8); flex-shrink: 0; }
    .search-input {
      flex: 1; border: none; outline: none; font-size: 13px; color: var(--text, #1e293b);
      font-family: inherit; background: transparent;
    }
    .data-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .data-table thead { background: var(--hover-bg, #f8fafc); }
    .data-table th {
      padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700;
      color: var(--text-secondary, #64748b); text-transform: uppercase; letter-spacing: .04em;
      border-bottom: 1px solid var(--border, #e5e7eb); white-space: nowrap;
    }
    .data-table td {
      padding: 10px 12px; border-bottom: 1px solid var(--border, #f1f5f9); color: var(--text, #334155);
    }
    .data-table tbody tr { transition: background .1s; }
    .data-table tbody tr:hover { background: var(--hover-bg, #f8fafc); }
    .th-num, .td-num { text-align: right; font-variant-numeric: tabular-nums; }
    .th-act { width: 100px; }
    .td-code { font-weight: 700; color: #F58634; }
    .td-hora { white-space: nowrap; font-size: 12px; color: var(--text-secondary, #64748b); }
    .td-cliente { max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .td-total { font-weight: 700; color: #F58634; }
    .td-act { display: flex; gap: 4px; }

    .mon-badge {
      display: inline-block; padding: 2px 7px; border-radius: 4px;
      background: var(--info-bg, #e0f2fe); color: var(--info-text, #0369a1); font-size: 11px; font-weight: 700;
    }
    .pago-badge {
      display: inline-block; padding: 3px 8px; border-radius: 5px;
      font-size: 10px; font-weight: 800; letter-spacing: .03em; white-space: nowrap;
    }
    .pago-badge.efectivo { background: var(--success-bg, #dcfce7); color: var(--success-text, #15803d); }
    .pago-badge.deposito { background: var(--info-bg, #e0f2fe); color: var(--info-text, #0369a1); }
    .estado-badge {
      display: inline-block; padding: 3px 8px; border-radius: 5px;
      font-size: 10px; font-weight: 800; letter-spacing: .03em;
    }
    .estado-badge.pendiente { background: var(--warning-bg, #fef3c7); color: var(--warning-text, #92400e); }
    .estado-badge.pagado { background: var(--success-bg, #dcfce7); color: var(--success-text, #15803d); }
    .estado-badge.devuelto { background: var(--error-bg, #fee2e2); color: var(--error-text, #b91c1c); }

    .btn-icon-pdf {
      background: transparent; border: 1px solid #e0e0e0; border-radius: 4px; cursor: pointer;
      padding: 2px 4px; display: inline-flex; align-items: center; justify-content: center;
      transition: all .15s; vertical-align: middle;
    }
    .btn-icon-pdf:hover { background: #fef2f2; border-color: #fca5a5; }
    .td-comprobantes { text-align: center; white-space: nowrap; width: 30px; }
    .th-comprobantes { width: 30px; }
    .btn-eye, .btn-print-sm {
      width: 30px; height: 30px; border: 1px solid var(--border, #e5e7eb); border-radius: 7px;
      background: var(--card-bg, #fff); color: var(--text-secondary, #64748b); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .btn-eye:hover { background: var(--hover-bg, #f8fafc); color: var(--text, #14213d); border-color: #F58634; }
    .btn-print-sm:hover { background: var(--orange-bg, #fff8f0); color: #F58634; border-color: #F58634; }

    .empty-state { text-align: center; padding: 60px 20px; color: var(--text-secondary, #94a3b8); }
    .empty-state p { margin-top: 12px; font-size: 14px; }

    /* ===== DRAWER ===== */
    .drawer-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 100;
      animation: fadeIn .2s ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .drawer {
      position: fixed; top: 0; right: 0; bottom: 0; width: 600px; max-width: 100vw;
      background: var(--card-bg, #fff); box-shadow: -4px 0 30px rgba(0,0,0,.15);
      z-index: 101; display: flex; flex-direction: column;
      animation: slideIn .25s ease-out;
    }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
    .drawer-header {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; padding: 16px 20px; border-bottom: 1px solid #dbe5f1; border-left: 4px solid #f58634;
      background: linear-gradient(110deg, #fff8f0 0%, #fff 75%); flex-shrink: 0;
    }
    .drawer-header.header-pending { border-left-color: #f58634; background: linear-gradient(110deg, #fff8f0 0%, #fff 75%); }
    .drawer-header.header-paid { border-left-color: #15945b; background: linear-gradient(110deg, #effaf4 0%, #fff 75%); }
    .drawer-header.header-returned { border-left-color: #d14343; background: linear-gradient(110deg, #fff4f3 0%, #fff 75%); }
    .drawer-title-row { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .drawer-icon { width: 42px; height: 42px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 12px; color: #bd5b0b; background: #ffecd9; font-size: 23px; font-weight: 700; }
    .header-paid .drawer-icon { color: #147b4d; background: #dff5e9; }
    .header-returned .drawer-icon { color: #b42318; background: #fee4e2; }
    .drawer-heading-copy { display: flex; min-width: 0; flex-direction: column; gap: 4px; }
    .drawer-title-row h3 { font-size: 16px; font-weight: 700; color: var(--text, #14213d); margin: 0; }
    .drawer-code { color: #8192aa; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .drawer-header-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .btn-close {
      width: 32px; height: 32px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px;
      background: var(--card-bg, #fff); color: var(--text-secondary, #64748b); cursor: pointer;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .btn-close:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }
    .drawer-body { flex: 1; overflow-y: auto; padding: 16px 20px 20px; }
    .route-section { display: grid; grid-template-columns: minmax(0,1fr) 28px minmax(0,1fr); gap: 8px; align-items: center; margin-bottom: 10px; }
    .route-party { min-width: 0; min-height: 82px; box-sizing: border-box; padding: 13px 12px; display: flex; align-items: flex-start; gap: 10px; border: 1px solid #cfe0ff; border-radius: 12px; background: #f5f9ff; }
    .route-destination { border-color: #bce8d6; background: #f2fbf7; }
    .route-icon { width: 34px; height: 34px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 9px; color: #2864ae; background: #e4efff; font-weight: 700; }
    .route-destination .route-icon { color: #14805e; background: #ddf4e9; }
    .route-copy { display: flex; min-width: 0; flex-direction: column; gap: 4px; }
    .route-label { color: #8192aa; font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .route-copy strong { color: #14213d; font-size: 12px; line-height: 1.35; overflow-wrap: anywhere; }
    .route-location { color: #7588a3; font-size: 10px; }
    .route-arrow { display: grid; place-items: center; color: #e1782b; font-size: 22px; }
    .drawer-section { padding: 15px 2px; border-bottom: 1px solid var(--border, #edf1f6); }
    .section-icon { color: #8095b2; font-size: 15px; }
    .section-head {
      display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700;
      color: var(--text-secondary, #64748b); text-transform: uppercase; letter-spacing: .05em;
      margin-bottom: 12px;
    }
    .section-head svg { color: var(--text-secondary, #94a3b8); flex-shrink: 0; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; }
    .dg-item { display: flex; flex-direction: column; gap: 2px; }
    .dg-item.span2 { grid-column: span 2; }
    .dg-label { font-size: 10px; font-weight: 600; color: var(--text-secondary, #94a3b8); text-transform: uppercase; letter-spacing: .03em; }
    .dg-value { font-size: 14px; font-weight: 500; color: var(--text, #14213d); }
    .dg-value.big { font-size: 17px; font-weight: 800; }
    .dg-value.orange { color: #F58634; }
    .dg-value.fw700 { font-weight: 700; }
    .doc-list { display: flex; flex-direction: column; gap: 6px; }
    .doc-item {
      display: flex; align-items: center; gap: 12px; padding: 10px 14px;
      background: var(--hover-bg, #f8fafc); border: 1px solid var(--border, #e5e7eb);
      border-radius: 10px; cursor: pointer; transition: all .15s;
    }
    .doc-item:hover { border-color: #F58634; background: var(--orange-bg, #fff8f0); }
    .doc-info { flex: 1; display: flex; flex-direction: column; }
    .doc-name { font-size: 13px; font-weight: 600; color: var(--text, #14213d); }
    .doc-sub { font-size: 11px; color: var(--text-secondary, #94a3b8); }
    .doc-item > svg:last-child { color: var(--text-secondary, #94a3b8); flex-shrink: 0; }
    .drawer-footer {
      display: flex; align-items: center; justify-content: flex-end; gap: 10px;
      padding: 14px 22px; border-top: 1px solid var(--border, #e5e7eb); flex-shrink: 0;
    }
    .btn-print {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 18px; background: #F58634; color: #fff; border: none;
      border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
      font-family: inherit;
    }
    .btn-print:hover { background: #e0740a; }

    .overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 200;
      display: flex; align-items: center; justify-content: center;
    }
    .pdf-modal {
      background: var(--card-bg, #fff); border-radius: 14px; width: 520px; max-width: 95vw;
      height: 85vh; display: flex; flex-direction: column;
      box-shadow: 0 20px 60px rgba(0,0,0,.25); overflow: hidden;
    }
    .pdf-modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 18px; border-bottom: 1px solid var(--border, #e5e7eb); flex-shrink: 0;
    }
    .pdf-modal-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--text, #14213d); }
    .pdf-modal-actions { display: flex; align-items: center; gap: 8px; }
    .btn-secondary {
      padding: 9px 18px; border: 1px solid var(--border, #d1d5db); border-radius: 8px;
      background: var(--card-bg, #fff); color: var(--text, #334155); font-size: 13px; font-weight: 600;
      cursor: pointer; font-family: inherit;
    }
    .btn-secondary.btn-sm { padding: 6px 12px; font-size: 12px; }
    .btn-icon-close {
      width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border, #d1d5db);
      background: var(--card-bg, #fff); cursor: pointer; font-size: 16px; color: var(--text-secondary, #64748b);
      display: flex; align-items: center; justify-content: center;
    }
    .btn-icon-close:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }
    .pdf-iframe { flex: 1; border: none; width: 100%; }
    .pdf-loading {
      flex: 1; display: flex; align-items: center; justify-content: center;
      gap: 12px; color: var(--text-secondary, #64748b); font-size: 14px;
    }

    .spinner {
      width: 28px; height: 28px; border: 3px solid var(--border, #e5e7eb); border-top-color: #F58634;
      border-radius: 50%; animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 700px) {
      .filter-left { flex-direction: column; align-items: stretch; }
      .data-table { font-size: 12px; }
      .td-cliente { max-width: 100px; }
      .drawer { width: 100%; }
      .detail-grid { grid-template-columns: 1fr; }
      .dg-item.span2 { grid-column: span 1; }
    }
  `],
})
export class HistorialGiroComponent implements OnInit {
  private giroSvc = inject(GiroService);
  private snack = inject(MatSnackBar);
  private sanitizer = inject(DomSanitizer);

  loadingGiros = false;
  searched = false;
  desde = '';
  hasta = '';
  filterEstado = '';
  filterCodigo = '';
  searchTerm = '';
  giros: HistorialGiroRecord[] = [];
  selectedGiro: HistorialGiroRecord | null = null;

  showPdfPopup = false;
  pdfPopupUrl: SafeResourceUrl | null = null;
  pdfPopupTitulo = '';
  pdfPopupLoading = false;
  private pdfBlobUrl: string | null = null;

  get filteredGiros(): HistorialGiroRecord[] {
    if (!this.searchTerm.trim()) return this.giros;
    const term = this.searchTerm.toLowerCase();
    return this.giros.filter(g =>
      (g.remitente || '').toLowerCase().includes(term) ||
      (g.destinatario || '').toLowerCase().includes(term) ||
      (g.agencia_destino || '').toLowerCase().includes(term) ||
      (g.agencia_origen || '').toLowerCase().includes(term) ||
      g.codigo.toString().includes(term)
    );
  }

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.desde = today;
    this.hasta = today;
    this.buscar();
  }

  buscar(): void {
    if (!this.desde) return;
    this.loadingGiros = true;
    this.searched = true;

    const estado = this.filterEstado !== '' ? +this.filterEstado : undefined;
    const codigo = this.filterCodigo.trim() || undefined;

    this.giroSvc.historialGiros(this.desde, this.hasta || undefined, estado, codigo).subscribe({
      next: (records) => {
        this.giros = records;
        this.loadingGiros = false;
      },
      error: (err) => {
        this.loadingGiros = false;
        this.snack.open(err.message || 'Error al cargar historial de giros', 'OK', { duration: 5000 });
      },
    });
  }

  verDetalle(g: HistorialGiroRecord): void {
    this.selectedGiro = g;
  }

  abrirPdfPopup(tipo: 'comprobante' | 'factura', id: number): void {
    this.pdfPopupTitulo = tipo === 'comprobante' ? 'Comprobante de Giro' : 'Factura de Comisión';
    this.pdfPopupLoading = true;
    this.pdfPopupUrl = null;
    this.showPdfPopup = true;

    const obs = tipo === 'comprobante'
      ? this.giroSvc.descargarComprobantePdf(id)
      : this.giroSvc.descargarFacturaPdf(id);

    obs.subscribe({
      next: (blob) => {
        if (this.pdfBlobUrl) URL.revokeObjectURL(this.pdfBlobUrl);
        this.pdfBlobUrl = URL.createObjectURL(blob);
        this.pdfPopupUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfBlobUrl);
        this.pdfPopupLoading = false;
      },
      error: () => {
        this.pdfPopupLoading = false;
        this.showPdfPopup = false;
        this.snack.open('Error al generar PDF', 'OK', { duration: 3000 });
      },
    });
  }

  imprimirPdf(): void {
    if (!this.pdfBlobUrl) return;
    const iframe = document.querySelector('.pdf-iframe') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  }

  cerrarPdfPopup(): void {
    this.showPdfPopup = false;
    if (this.pdfBlobUrl) {
      URL.revokeObjectURL(this.pdfBlobUrl);
      this.pdfBlobUrl = null;
    }
    this.pdfPopupUrl = null;
  }

  formatFechaOnly(fecha: string): string {
    if (!fecha) return '';
    return fecha.split(' ')[0];
  }

  formatHoraOnly(fecha: string): string {
    if (!fecha) return '';
    const parts = fecha.split(' ');
    return parts.length > 1 ? parts[1].substring(0, 5) : '';
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '';
    const parts = fecha.split(' ');
    const d = parts[0];
    const h = parts.length > 1 ? parts[1].substring(0, 5) : '';
    return `${d} ${h}`;
  }
}
