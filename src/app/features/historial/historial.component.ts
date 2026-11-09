import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CambioService } from '../../core/cambio.service';
import { HistorialRecord, HistorialTotals, HistorialDetail } from '../../core/models';

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, RouterLink],
  template: `
    <div class="historial-page">

      <!-- ===== FILTERS ===== -->
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
            <label>Tipo</label>
            <select [(ngModel)]="filterOp">
              <option value="0">Todas</option>
              <option value="1">Compra</option>
              <option value="2">Venta</option>
            </select>
          </div>
          <button class="btn-search" (click)="buscar()" [disabled]="loading">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            Buscar
          </button>
        </div>
        <div class="filter-right">
          <a class="manual-help" routerLink="/manuales/cambio" [queryParams]="{tipo: 'reportes'}">？ Manual de reportes</a>
          <span class="count-badge" [class.has]="records.length > 0">
            {{ records.length }} operaciones
          </span>
        </div>
      </div>

      <!-- ===== LOADING ===== -->
      @if (loading) {
        <div class="loading-box">
          <div class="spinner"></div>
          <span>Cargando operaciones...</span>
        </div>
      }

      <!-- ===== SUMMARY CARDS ===== -->
      @if (!loading && totals) {
        <div class="summary-row">
          <div class="summary-card compra">
            <div class="summary-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5"/><polyline points="5 12 12 5 19 12"/></svg>
            </div>
            <div class="summary-data">
              <div class="summary-label">Compras</div>
              <div class="summary-value">{{ totals.compras.count }}</div>
              <div class="summary-bob">BOB {{ totals.compras.totalBob | number:'1.2-2' }}</div>
              @for (entry of monedaEntries(totals.compras.byMoneda); track entry.key) {
                <div class="summary-mon">{{ entry.key }}: {{ entry.value.monto | number:'1.2-2' }} ({{ entry.value.count }})</div>
              }
            </div>
          </div>
          <div class="summary-card venta">
            <div class="summary-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14"/><polyline points="19 12 12 19 5 12"/></svg>
            </div>
            <div class="summary-data">
              <div class="summary-label">Ventas</div>
              <div class="summary-value">{{ totals.ventas.count }}</div>
              <div class="summary-bob">BOB {{ totals.ventas.totalBob | number:'1.2-2' }}</div>
              @for (entry of monedaEntries(totals.ventas.byMoneda); track entry.key) {
                <div class="summary-mon">{{ entry.key }}: {{ entry.value.monto | number:'1.2-2' }} ({{ entry.value.count }})</div>
              }
            </div>
          </div>
          <div class="summary-card balance">
            <div class="summary-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div class="summary-data">
              <div class="summary-label">Balance Neto</div>
              <div class="summary-value balance-val"
                   [class.positive]="netBalance > 0"
                   [class.negative]="netBalance < 0">
                BOB {{ netBalance | number:'1.2-2' }}
              </div>
              <div class="summary-mon">Ingreso ventas - Egreso compras</div>
            </div>
          </div>
        </div>
      }

      <!-- ===== TABLE ===== -->
      @if (!loading && records.length > 0) {
        <div class="table-wrapper">
          <div class="table-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" [(ngModel)]="searchTerm" placeholder="Buscar por nombre, documento, moneda..."
                   class="search-input">
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th class="th-act" aria-label="Factura"></th>
                <th class="th-id">Correlativo</th>
                <th>Agencia</th>
                <th>Operador</th>
                <th>Usuario Financiero</th>
                <th>Fecha de Registro</th>
                <th>Tipo Operación</th>
                <th>Moneda</th>
                <th class="th-num">Monto</th>
                <th class="th-num">Tipo de Cambio Comercial</th>
                <th class="th-num">Tipo de Cambio Adquirido</th>
                <th class="th-num">Cotización Oficial - BCB</th>
                <th class="th-num">Total Operación</th>
                <th class="th-num">Diferencia [BOB]</th>
              </tr>
            </thead>
            <tbody>
              @for (r of filteredRecords; track r.id) {
                <tr (click)="verDetalle(r.id)" [class.selected]="selectedId === r.id" class="clickable-row">
                  <td class="td-act">
                    <button class="btn-print-sm" (click)="abrirFacturaPdf(r.id); $event.stopPropagation()" title="Factura PDF" aria-label="Abrir factura">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    </button>
                  </td>
                  <td class="td-id">
                    {{ r.id }}
                  </td>
                  <td>{{ r.agencia }}</td>
                  <td class="td-op">{{ r.operador }}</td>
                  <td class="td-cliente">{{ r.usuarioFinanciero }}</td>
                  <td class="td-hora">{{ formatFechaRegistro(r.fecha) }}</td>
                  <td>
                    <span class="tipo-badge" [class.compra]="r.idOperacion === 1" [class.venta]="r.idOperacion === 2">
                      {{ r.tipo }}
                    </span>
                  </td>
                  <td>
                    <span class="mon-badge">{{ r.moneda }}</span>
                  </td>
                  <td class="td-num">{{ r.monto | number:'1.2-2' }}</td>
                  <td class="td-num">{{ r.tipoCambio | number:'1.2-5' }}</td>
                  <td class="td-num">{{ r.tipoCambioBob | number:'1.2-6' }}</td>
                  <td class="td-num">{{ r.cotizacionOficial !== null ? (r.cotizacionOficial | number:'1.2-6') : '—' }}</td>
                  <td class="td-num td-total">{{ r.totalOperacion | number:'1.2-2' }}</td>
                  <td class="td-num" [class.negative]="r.diferenciaBob !== null && r.diferenciaBob < 0" [class.positive]="r.diferenciaBob !== null && r.diferenciaBob >= 0">
                    {{ r.diferenciaBob !== null ? (r.diferenciaBob | number:'1.2-2') : '—' }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (!loading && records.length === 0 && searched) {
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="8" y2="14.01"/><line x1="12" y1="14" x2="12" y2="14.01"/><line x1="16" y1="14" x2="16" y2="14.01"/></svg>
          <p>No se encontraron operaciones para el rango seleccionado.</p>
        </div>
      }

      <!-- ===== DETAIL DRAWER ===== -->
      @if (showDrawer) {
        <div class="drawer-overlay" (click)="cerrarDrawer()"></div>
        <div class="drawer">
          <div class="drawer-header">
            <div class="drawer-title-row">
              <span class="drawer-icon">↔</span>
              <div class="drawer-heading-copy">
                <h3>Detalle del cambio</h3>
                @if (detalle) {
                  <span class="drawer-code">Operación #{{ detalle.id }} · {{ detalle.fecha }}</span>
                }
              </div>
            </div>
            <div class="drawer-header-actions">
              <button class="btn-close" (click)="cerrarDrawer()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          <div class="drawer-body">
          @if (loadingDetalle) {
            <div class="drawer-loading">
              <div class="spinner"></div>
              <span>Cargando detalle...</span>
            </div>
          }
          @if (detalle) {
            <div class="drawer-section">
              <div class="section-head">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
                <span>Datos de la Operacion</span>
              </div>
              <div class="detail-grid">
                <div class="dg-item">
                  <span class="dg-label">ID</span>
                  <span class="dg-value">#{{ detalle.id }}</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Tipo</span>
                  <span class="dg-value">
                    <span class="tipo-badge" [class.compra]="detalle.idOperacion === 1" [class.venta]="detalle.idOperacion === 2">
                      {{ detalle.tipo }}
                    </span>
                  </span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Agencia</span>
                  <span class="dg-value">{{ detalle.agencia }}</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Operador</span>
                  <span class="dg-value">{{ detalle.operador }}</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Fecha</span>
                  <span class="dg-value">{{ detalle.fecha }}</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Estado</span>
                  <span class="dg-value">
                    <span class="estado-badge" [class.pagado]="detalle.facturado === 1" [class.pendiente]="detalle.facturado !== 1">
                      {{ detalle.facturado === 1 ? 'FACTURADO' : 'PENDIENTE' }}
                    </span>
                  </span>
                </div>
              </div>
            </div>

            <div class="drawer-section">
              <div class="section-head">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>Cliente</span>
              </div>
              <div class="detail-grid">
                <div class="dg-item span2">
                  <span class="dg-label">Nombre</span>
                  <span class="dg-value fw700">{{ detalle.cliente.nombre }}</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Documento</span>
                  <span class="dg-value">{{ detalle.cliente.documento }}</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Telefono</span>
                  <span class="dg-value">{{ detalle.cliente.telefono }}</span>
                </div>
                @if (detalle.cliente.domicilio) {
                  <div class="dg-item span2">
                    <span class="dg-label">Domicilio</span>
                    <span class="dg-value">{{ detalle.cliente.domicilio }}</span>
                  </div>
                }
              </div>
            </div>

            <div class="drawer-section">
              <div class="section-head">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                <span>Detalle Financiero</span>
              </div>
              <div class="detail-grid">
                <div class="dg-item">
                  <span class="dg-label">Moneda Recibida</span>
                  <span class="dg-value">{{ detalle.monedaRecibidaDesc }} ({{ detalle.monedaRecibida }})</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Moneda Entregada</span>
                  <span class="dg-value">{{ detalle.monedaEntregadaDesc }} ({{ detalle.monedaEntregada }})</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Recibido</span>
                  <span class="dg-value big">{{ detalle.recibido | number:'1.2-2' }}</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Entregado</span>
                  <span class="dg-value big">{{ detalle.entregado | number:'1.2-2' }}</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Tipo de Cambio</span>
                  <span class="dg-value">{{ detalle.tipoCambio | number:'1.2-5' }}</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Cambio (Vuelto)</span>
                  <span class="dg-value">{{ detalle.cambio | number:'1.2-2' }}</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Total Operacion</span>
                  <span class="dg-value big orange">{{ detalle.totalOperacion | number:'1.2-2' }}</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Total BOB</span>
                  <span class="dg-value big orange">{{ detalle.totalOperacionBob | number:'1.2-2' }} BOB</span>
                </div>
              </div>
            </div>

            @if (detalle.origen || detalle.destino) {
              <div class="drawer-section">
                <div class="section-head">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
                  <span>PCC-06</span>
                </div>
                <div class="detail-grid">
                  <div class="dg-item span2">
                    <span class="dg-label">Origen de Fondos</span>
                    <span class="dg-value">{{ detalle.origen }}</span>
                  </div>
                  <div class="dg-item span2">
                    <span class="dg-label">Destino de Fondos</span>
                    <span class="dg-value">{{ detalle.destino }}</span>
                  </div>
                </div>
              </div>
            }

            @if (detalle.factura && esFacturaTercero()) {
              <div class="drawer-section">
                <div class="section-head">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span>Factura</span>
                </div>
                <div class="detail-grid">
                  <div class="dg-item">
                    <span class="dg-label">Numero</span>
                    <span class="dg-value fw700">{{ detalle.factura.numero }}</span>
                  </div>
                  <div class="dg-item">
                    <span class="dg-label">Fecha</span>
                    <span class="dg-value">{{ detalle.factura.fecha }}</span>
                  </div>
                  <div class="dg-item">
                    <span class="dg-label">NIT</span>
                    <span class="dg-value">{{ detalle.factura.nit }}</span>
                  </div>
                  <div class="dg-item">
                    <span class="dg-label">Nombre</span>
                    <span class="dg-value">{{ detalle.factura.nombre }}</span>
                  </div>
                  <div class="dg-item">
                    <span class="dg-label">Importe</span>
                    <span class="dg-value big orange">{{ detalle.factura.importe | number:'1.2-2' }} BOB</span>
                  </div>
                  <div class="dg-item">
                    <span class="dg-label">Autorizacion</span>
                    <span class="dg-value" style="font-size:11px;word-break:break-all;">{{ detalle.factura.autorizacion }}</span>
                  </div>
                </div>
              </div>
            }

            @if (detalle.factura) {
              <div class="drawer-section">
                <div class="section-head">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span>Documentos</span>
                </div>
                <div class="doc-list">
                  <button class="doc-item" (click)="abrirFacturaPdf(detalle.id)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F58634" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <div class="doc-info">
                      <span class="doc-name">Factura</span>
                      <span class="doc-sub">N° {{ detalle.factura.numero }}</span>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  </button>
                </div>
              </div>
            }
          }
          </div>

          @if (detalle) {
            <div class="drawer-footer">
              @if (detalle.factura) {
                <button class="btn-print" (click)="abrirFacturaPdf(detalle.id)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Imprimir Factura
                </button>
              }
            </div>
          }
        </div>
      }

      @if (showPdfPopup) {
        <div class="pdf-popup-overlay" (click)="cerrarPdfPopup()">
          <div class="pdf-popup" (click)="$event.stopPropagation()">
            <div class="pdf-popup-header">
              <span>{{ pdfPopupTitulo }}</span>
              <div class="pdf-popup-actions">
                <button class="btn-popup-print" (click)="imprimirPdf()" [disabled]="pdfPopupLoading">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Imprimir
                </button>
                <button class="btn-popup-close" (click)="cerrarPdfPopup()">✕</button>
              </div>
            </div>
            <div class="pdf-popup-body">
              @if (pdfPopupLoading) {
                <div class="pdf-popup-loading">Cargando PDF...</div>
              }
              @if (pdfPopupUrl) {
                <iframe [src]="pdfPopupUrl" style="width:100%;height:100%;border:none;"></iframe>
              }
            </div>
          </div>
        </div>
      }

    </div>
  `,
  styles: [`
    :host { display: block; }
    .historial-page { margin: 0; }

    /* ===== FILTER BAR ===== */
    .filter-bar {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      background: var(--card-bg, #fff); border: 1px solid var(--border, #e5e7eb); border-radius: 12px;
      padding: 14px 18px; margin-bottom: 16px; flex-wrap: wrap;
    }
    .filter-left {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    }
    .filter-left > svg { color: var(--text-muted, #94a3b8); flex-shrink: 0; }
    .field-inline { display: flex; flex-direction: column; gap: 2px; }
    .field-inline label {
      font-size: 10px; font-weight: 700; color: var(--text-muted, #94a3b8);
      text-transform: uppercase; letter-spacing: .04em;
    }
    .field-inline input, .field-inline select {
      padding: 7px 10px; border: 1px solid var(--border, #d1d5db); border-radius: 7px;
      font-size: 13px; color: var(--text-primary, #1e293b); outline: none; background: var(--card-bg, #fff);
      font-family: inherit;
    }
    .field-inline input:focus, .field-inline select:focus {
      border-color: #F5820A; box-shadow: 0 0 0 3px rgba(245,130,10,.12);
    }
    .btn-search {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 18px; background: #14213d; color: #fff; border: none;
      border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .btn-search:hover:not(:disabled) { background: #1c2d4f; }
    .btn-search:disabled { opacity: .5; cursor: not-allowed; }
    .count-badge {
      font-size: 12px; font-weight: 600; color: var(--text-muted, #94a3b8); padding: 6px 12px;
      background: var(--hover-bg, #f1f5f9); border-radius: 20px;
    }
    .count-badge.has { color: var(--text-primary, #14213d); background: var(--info-bg, #e0f2fe); }
    .manual-help { display:inline-flex; align-items:center; padding:7px 10px; border:1px solid #efd2b8; border-radius:8px; color:#a95715; background:#fff9f3; font-size:11px; font-weight:700; text-decoration:none; white-space:nowrap; }
    .manual-help:hover { background:#fff0e2; }

    /* ===== LOADING ===== */
    .loading-box {
      display: flex; align-items: center; justify-content: center; gap: 12px;
      padding: 60px 0; color: var(--text-secondary, #64748b); font-size: 14px;
    }

    /* ===== SUMMARY CARDS ===== */
    .summary-row {
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin-bottom: 16px;
    }
    .summary-card {
      display: flex; gap: 14px; padding: 18px; background: var(--card-bg, #fff);
      border: 1px solid var(--card-border, #e5e7eb); border-radius: 12px;
    }
    .summary-icon {
      width: 44px; height: 44px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .summary-card.compra .summary-icon { background: var(--success-bg, #dcfce7); color: var(--success-text, #15803d); }
    .summary-card.venta .summary-icon { background: var(--error-bg, #fee2e2); color: var(--error-text, #b91c1c); }
    .summary-card.balance .summary-icon { background: var(--info-bg, #e0f2fe); color: var(--info-text, #0369a1); }
    .summary-data { flex: 1; min-width: 0; }
    .summary-label { font-size: 12px; font-weight: 600; color: var(--text-muted, #94a3b8); text-transform: uppercase; letter-spacing: .03em; }
    .summary-value { font-size: 24px; font-weight: 800; color: var(--text-primary, #14213d); line-height: 1.2; }
    .summary-bob { font-size: 14px; font-weight: 700; color: #F5820A; }
    .summary-mon { font-size: 11px; color: var(--text-secondary, #64748b); }
    .balance-val { font-size: 18px; }
    .balance-val.positive { color: #15803d; }
    .balance-val.negative { color: #b91c1c; }

    /* ===== TABLE ===== */
    .table-wrapper {
      background: var(--card-bg, #fff); border: 1px solid #dbe3ec; border-radius: 14px; overflow-x: auto;
      box-shadow: 0 3px 12px rgba(20, 33, 61, .06);
    }
    .table-search {
      display: flex; align-items: center; gap: 9px; min-height: 42px; box-sizing: border-box; padding: 9px 16px;
      background: #fff; border-bottom: 1px solid #e8edf3; transition: background .15s ease;
    }
    .table-search:focus-within { background: #fffaf5; }
    .table-search svg { color: #8b9aae; flex-shrink: 0; }
    .search-input {
      flex: 1; border: none; outline: none; font-size: 13px; color: var(--text-primary, #1e293b);
      font-family: inherit; background: transparent;
    }
    .search-input::placeholder { color: #94a3b8; }
    .data-table {
      width: 100%; min-width: 0; table-layout: fixed; border-collapse: collapse; font-size: 11px;
    }
    .data-table thead { background: #edf2f7; }
    .data-table th {
      padding: 8px 6px; text-align: center; font-size: 9px; line-height: 1.15; font-weight: 700;
      color: #263a55; text-transform: uppercase; letter-spacing: .025em;
      border-bottom: 1px solid #cbd5e1;
      white-space: normal; overflow-wrap: anywhere; vertical-align: middle;
    }
    .data-table td {
      padding: 10px 6px; border-bottom: 1px solid #edf1f5;
      color: var(--text-primary, #334155); text-align: center;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .data-table tbody tr:nth-child(even) { background: #fafbfc; }
    .data-table tbody tr { cursor: pointer; transition: background .15s ease, box-shadow .15s ease; }
    .data-table tbody tr:hover { background: #fff7ed; }
    .data-table tbody tr.selected { background: #fff8ef; box-shadow: inset 3px 0 0 #f58634; }
    .th-num, .td-num { text-align: center; font-variant-numeric: tabular-nums; }
    .data-table th.th-num { text-align: center; }
    .th-act { width: 4%; }
    .th-id { width: 5%; }
    .data-table th:nth-child(3), .data-table td:nth-child(3) { width: 8%; }
    .data-table th:nth-child(4), .data-table td:nth-child(4) { width: 7%; }
    .data-table th:nth-child(5), .data-table td:nth-child(5) { width: 13%; }
    .data-table th:nth-child(6), .data-table td:nth-child(6) { width: 9%; }
    .data-table th:nth-child(7), .data-table td:nth-child(7) { width: 7%; }
    .data-table th:nth-child(8), .data-table td:nth-child(8) { width: 5%; }
    .data-table th:nth-child(9), .data-table td:nth-child(9) { width: 6%; }
    .data-table th:nth-child(10), .data-table td:nth-child(10),
    .data-table th:nth-child(11), .data-table td:nth-child(11),
    .data-table th:nth-child(12), .data-table td:nth-child(12) { width: 7%; }
    .data-table th:nth-child(13), .data-table td:nth-child(13) { width: 7%; }
    .data-table th:nth-child(14), .data-table td:nth-child(14) { width: 6%; }
    .td-id { font-weight: 700; color: var(--text-muted, #94a3b8); white-space: nowrap; }
    .td-id .btn-print-sm { margin-left: 4px; vertical-align: middle; }
    .td-hora { white-space: nowrap; font-size: 12px; color: var(--text-secondary, #64748b); }
    .td-cliente { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .td-total { font-weight: 700; color: #F5820A; }
    .td-op { font-size: 12px; color: var(--text-secondary, #64748b); }

    .tipo-badge {
      display: inline-block; padding: 3px 8px; border-radius: 5px;
      font-size: 10px; font-weight: 800; letter-spacing: .03em;
    }
    .tipo-badge.compra { background: var(--success-bg, #dcfce7); color: var(--success-text, #15803d); }
    .tipo-badge.venta { background: var(--error-bg, #fee2e2); color: var(--error-text, #b91c1c); }
    .mon-badge {
      display: inline-block; padding: 2px 7px; border-radius: 4px;
      background: var(--info-bg, #e0f2fe); color: var(--info-text, #0369a1); font-size: 11px; font-weight: 700;
    }
    .clickable-row { cursor: pointer; }
    .th-act { width: 5%; }
    .td-act { white-space: nowrap; text-align: center; overflow: visible !important; text-overflow: clip !important; }
    .btn-eye, .btn-print-sm {
      width: 28px; height: 28px; box-sizing: border-box; background: #fff; border: 1px solid #d7e0ea; border-radius: 7px;
      padding: 0; cursor: pointer; color: #52657d;
      display: inline-flex; align-items: center; justify-content: center; margin: 0 2px;
      box-shadow: 0 1px 2px rgba(20, 33, 61, .05); transition: all .15s ease;
    }
    .btn-eye:hover { background: var(--hover-bg, #f8fafc); color: var(--text, #14213d); border-color: #F58634; }
    .btn-print-sm:hover { background: var(--orange-bg, #fff8f0); color: #F58634; border-color: #F58634; }

    /* ===== EMPTY ===== */
    .empty-state {
      text-align: center; padding: 60px 20px; color: var(--text-muted, #94a3b8);
    }
    .empty-state p { margin-top: 12px; font-size: 14px; }

    /* ===== DRAWER ===== */
    .drawer-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 100;
      animation: fadeIn .2s ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .drawer {
      position: fixed; top: 0; right: 0; bottom: 0; width: 440px; max-width: 100vw;
      background: var(--card-bg, #fff); box-shadow: -4px 0 30px rgba(0,0,0,.15);
      z-index: 101; display: flex; flex-direction: column;
      animation: slideIn .25s ease-out;
    }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
    .drawer-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 18px 22px; border-bottom: 1px solid var(--border, #e5e7eb); flex-shrink: 0;
    }
    .drawer-title-row { display: flex; align-items: center; gap: 10px; }
    .drawer-title-row h3 { font-size: 16px; font-weight: 700; color: var(--text-primary, #14213d); margin: 0; }
    .btn-close {
      width: 32px; height: 32px; border: 1px solid var(--border, #e5e7eb); border-radius: 8px;
      background: var(--card-bg, #fff); color: var(--text-secondary, #64748b); cursor: pointer;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .btn-close:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }
    .drawer-body { flex: 1; overflow-y: auto; padding: 0; }
    .drawer-loading {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 14px; padding: 80px 20px; color: var(--text-secondary, #64748b); font-size: 14px;
    }
    .drawer-section { padding: 16px 22px; border-bottom: 1px solid var(--border-light, #f1f5f9); }
    .section-head {
      display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 700;
      color: var(--text-muted, #64748b); text-transform: uppercase; letter-spacing: .05em;
      margin-bottom: 12px;
    }
    .section-head svg { color: var(--text-muted, #94a3b8); flex-shrink: 0; }
    .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; }
    .dg-item { display: flex; flex-direction: column; gap: 2px; }
    .dg-item.span2 { grid-column: span 2; }
    .dg-label { font-size: 10px; font-weight: 600; color: var(--text-muted, #94a3b8); text-transform: uppercase; letter-spacing: .03em; }
    .dg-value { font-size: 14px; font-weight: 500; color: var(--text-primary, #14213d); }
    .dg-value.big { font-size: 17px; font-weight: 800; }
    .dg-value.orange { color: #F58634; }
    .dg-value.fw700 { font-weight: 700; }
    .estado-badge {
      display: inline-block; padding: 3px 8px; border-radius: 5px;
      font-size: 10px; font-weight: 800; letter-spacing: .03em;
    }
    .estado-badge.pagado { background: var(--success-bg, #dcfce7); color: var(--success-text, #15803d); }
    .estado-badge.pendiente { background: var(--warning-bg, #fef3c7); color: var(--warning-text, #92400e); }
    .doc-list { display: flex; flex-direction: column; gap: 6px; }
    .doc-item {
      display: flex; align-items: center; gap: 12px; padding: 10px 14px;
      background: var(--hover-bg, #f8fafc); border: 1px solid var(--border, #e5e7eb);
      border-radius: 10px; cursor: pointer; transition: all .15s;
    }
    .doc-item:hover { border-color: #F58634; background: var(--orange-bg, #fff8f0); }
    .doc-info { flex: 1; display: flex; flex-direction: column; }
    .doc-name { font-size: 13px; font-weight: 600; color: var(--text-primary, #14213d); }
    .doc-sub { font-size: 11px; color: var(--text-muted, #94a3b8); }
    .doc-item > svg:last-child { color: var(--text-muted, #94a3b8); flex-shrink: 0; }
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

    /* Drawer visual shared with the Giro detail view */
    .drawer { width: 600px; }
    .drawer-header { gap: 12px; padding: 16px 20px; border-left: 4px solid #f58634; border-bottom-color: #dbe5f1; background: linear-gradient(110deg, #fff8f0 0%, #fff 75%); }
    .drawer-header.header-pending { border-left-color: #f58634; background: linear-gradient(110deg, #fff8f0 0%, #fff 75%); }
    .drawer-header.header-paid { border-left-color: #15945b; background: linear-gradient(110deg, #effaf4 0%, #fff 75%); }
    .drawer-title-row { gap: 12px; min-width: 0; }
    .drawer-icon { width: 42px; height: 42px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 12px; color: #bd5b0b; background: #ffecd9; font-size: 23px; font-weight: 700; }
    .header-paid .drawer-icon { color: #147b4d; background: #dff5e9; }
    .drawer-heading-copy { display: flex; min-width: 0; flex-direction: column; gap: 4px; }
    .drawer-code { color: #8192aa; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .drawer-status { align-self: flex-start; margin-top: 2px; }
    .drawer-header-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .drawer-body { padding: 16px 20px 20px; }
    .drawer-section { padding: 15px 2px; border-bottom-color: #edf1f6; }

    /* ===== SPINNER ===== */
    .spinner {
      width: 28px; height: 28px; border: 3px solid var(--border, #e5e7eb); border-top-color: #F5820A;
      border-radius: 50%; animation: spin .7s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ===== MOBILE ===== */
    @media (max-width: 700px) {
      .summary-row { grid-template-columns: 1fr; }
      .filter-left { flex-direction: column; align-items: stretch; }
      .data-table { font-size: 12px; }
      .td-cliente { max-width: 120px; }
      .drawer { width: 100%; }
      .detail-grid { grid-template-columns: 1fr; }
      .dg-item.span2 { grid-column: span 1; }
    }

    /* ===== PDF POPUP ===== */
    .pdf-popup-overlay {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,.5); display: flex; align-items: center;
      justify-content: center; z-index: 9999;
    }
    .pdf-popup {
      background: var(--card-bg, #fff); border-radius: 12px; width: 520px; max-width: 95vw;
      height: 85vh; display: flex; flex-direction: column; overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,.3);
    }
    .pdf-popup-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 16px; border-bottom: 1px solid var(--border, #e5e7eb);
      font-weight: 600; font-size: 15px; color: var(--text-primary, #14213d);
    }
    .pdf-popup-actions { display: flex; align-items: center; gap: 8px; }
    .btn-popup-print {
      display: flex; align-items: center; gap: 6px; padding: 6px 14px;
      background: #F58634; color: #fff; border: none; border-radius: 6px;
      font-size: 13px; cursor: pointer; font-weight: 500;
    }
    .btn-popup-print:hover { background: #e0751e; }
    .btn-popup-print:disabled { opacity: .5; cursor: not-allowed; }
    .btn-popup-close {
      width: 32px; height: 32px; border: none; background: var(--hover-bg, #f3f4f6);
      border-radius: 6px; cursor: pointer; font-size: 16px; display: flex;
      align-items: center; justify-content: center; color: var(--text-secondary, #64748b);
    }
    .btn-popup-close:hover { background: var(--border, #e5e7eb); }
    .pdf-popup-body { flex: 1; overflow: hidden; }
    .pdf-popup-loading {
      display: flex; align-items: center; justify-content: center;
      height: 100%; color: var(--text-secondary, #6b7280); font-size: 14px;
    }
  `],
})
export class HistorialComponent implements OnInit {
  private cambioSvc = inject(CambioService);
  private snack = inject(MatSnackBar);
  private sanitizer = inject(DomSanitizer);

  showPdfPopup = false;
  pdfPopupUrl: SafeResourceUrl | null = null;
  pdfPopupTitulo = '';
  pdfPopupLoading = false;
  private pdfBlobUrl: string | null = null;

  loading = false;
  searched = false;
  desde = '';
  hasta = '';
  filterOp = '0';
  searchTerm = '';

  records: HistorialRecord[] = [];
  totals: HistorialTotals | null = null;
  selectedId = 0;
  detalle: HistorialDetail | null = null;
  loadingDetalle = false;
  showDrawer = false;

  get netBalance(): number {
    if (!this.totals) return 0;
    return this.totals.ventas.totalBob - this.totals.compras.totalBob;
  }

  get filteredRecords(): HistorialRecord[] {
    if (!this.searchTerm.trim()) return this.records;
    const term = this.searchTerm.toLowerCase();
    return this.records.filter(r =>
      (r.usuarioFinanciero || '').toLowerCase().includes(term) ||
      (r.documento || '').toLowerCase().includes(term) ||
      (r.moneda || '').toLowerCase().includes(term) ||
      (r.operador || '').toLowerCase().includes(term) ||
      r.id.toString().includes(term)
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
    this.loading = true;
    this.searched = true;
    const op = +this.filterOp || undefined;

    this.cambioSvc.historial(this.desde, this.hasta || undefined, op).subscribe({
      next: (res) => {
        this.records = res.records;
        this.totals = res.totals;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.snack.open(err.message || 'Error al cargar historial', 'OK', { duration: 5000 });
      },
    });
  }

  selectRecord(r: HistorialRecord): void {
    this.selectedId = this.selectedId === r.id ? 0 : r.id;
  }

  verDetalle(id: number): void {
    this.selectedId = id;
    this.showDrawer = true;
    this.loadingDetalle = true;
    this.detalle = null;
    this.cambioSvc.historialDetalle(id).subscribe({
      next: (d) => { this.detalle = d; this.loadingDetalle = false; },
      error: () => { this.loadingDetalle = false; this.showDrawer = false; this.snack.open('Error al cargar detalle', 'OK', { duration: 3000 }); },
    });
  }

  cerrarDrawer(): void {
    this.showDrawer = false;
    this.detalle = null;
    this.selectedId = 0;
  }

  esFacturaTercero(): boolean {
    if (!this.detalle?.factura || !this.detalle?.cliente) return false;
    const nit = (this.detalle.factura.nit ?? '').trim();
    const doc = (this.detalle.cliente.documento ?? '').trim();
    if (!nit || !doc) return false;
    return !doc.includes(nit);
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '';
    return fecha.split(' ')[0];
  }

  formatHora(fecha: string): string {
    if (!fecha) return '';
    const parts = fecha.split(' ');
    return parts.length > 1 ? parts[1].substring(0, 5) : '';
  }

  formatFechaRegistro(fecha: string): string {
    if (!fecha) return '';
    const [date, time = ''] = fecha.split(' ');
    const [year, month, day] = date.split('-');
    return year && month && day ? `${day}-${month}-${year} ${time}`.trim() : fecha;
  }

  monedaEntries(obj: { [key: string]: { count: number; monto: number; totalBob: number } }): { key: string; value: { count: number; monto: number; totalBob: number } }[] {
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
  }

  abrirFacturaPdf(id: number): void {
    this.pdfPopupLoading = true;
    this.showPdfPopup = true;
    this.pdfPopupTitulo = 'Factura';

    this.cambioSvc.descargarFacturaPdf(id).subscribe({
      next: (blob) => {
        this.pdfBlobUrl = URL.createObjectURL(blob);
        this.pdfPopupUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfBlobUrl);
        this.pdfPopupLoading = false;
      },
      error: () => {
        this.snack.open('Error al descargar factura PDF', 'OK', { duration: 3000 });
        this.showPdfPopup = false;
        this.pdfPopupLoading = false;
      },
    });
  }

  imprimirPdf(): void {
    const iframe = document.querySelector('.pdf-popup-overlay iframe') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }
  }

  cerrarPdfPopup(): void {
    this.showPdfPopup = false;
    this.pdfPopupUrl = null;
    if (this.pdfBlobUrl) {
      URL.revokeObjectURL(this.pdfBlobUrl);
      this.pdfBlobUrl = null;
    }
  }
}
