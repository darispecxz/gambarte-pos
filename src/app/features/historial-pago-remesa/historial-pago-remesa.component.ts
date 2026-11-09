import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RemesaService, ReporteRemesaRecord } from '../../core/remesa.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-historial-pago-remesa',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatButtonModule],
  template: `
    <div class="page">
      <header class="report-heading">
        <span class="report-heading-icon"><mat-icon>fact_check</mat-icon></span>
        <div><h1>Reportes de pago de remesas</h1><p>Consulta pagos en efectivo y depósitos registrados.</p></div>
      </header>

      <!-- FILTERS -->
      <div class="filter-bar">
        <div class="filter-left">
          <mat-form-field appearance="outline" class="report-filter date-filter">
            <mat-label>Desde</mat-label>
            <input matInput type="date" [(ngModel)]="desde" required>
            @if (!desde && searched) { <mat-error>Selecciona la fecha inicial.</mat-error> }
          </mat-form-field>
          <mat-form-field appearance="outline" class="report-filter date-filter">
            <mat-label>Hasta</mat-label>
            <input matInput type="date" [(ngModel)]="hasta">
            @if (rangoFechasInvalido) { <mat-error>Debe ser igual o posterior a Desde.</mat-error> }
          </mat-form-field>
          <mat-form-field appearance="outline" class="report-filter">
            <mat-label>Estado</mat-label>
            <mat-select [(ngModel)]="filterEstado">
              <mat-option value="">Todos</mat-option>
              <mat-option value="0">Pendientes</mat-option>
              <mat-option value="1">Pagadas</mat-option>
              <mat-option value="2">Devueltas</mat-option>
              <mat-option value="5">Anuladas</mat-option>
              <mat-option value="7">En proceso</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="report-filter">
            <mat-label>Forma de pago</mat-label>
            <mat-select [(ngModel)]="filterTipoPago">
              <mat-option value="">Todos</mat-option>
              <mat-option value="1">Efectivo</mat-option>
              <mat-option value="2">Depósito</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="report-filter code-filter">
            <mat-label>Código</mat-label>
            <input matInput type="number" min="1" [(ngModel)]="filterCodigo" placeholder="Ej. 80672">
          </mat-form-field>
          <button mat-flat-button color="primary" class="btn-search" (click)="buscar()" [disabled]="loading || rangoFechasInvalido || !desde">
            <mat-icon>search</mat-icon> Buscar
          </button>
        </div>
        <div class="filter-right">
          <span class="count-badge" [class.has]="records.length > 0">
            {{ records.length }} remesas
          </span>
        </div>
      </div>

      @if (loading) {
        <div class="loading-box">
          <div class="spinner"></div>
          <span>Cargando reporte...</span>
        </div>
      }

      <!-- TABLE -->
      @if (!loading && records.length > 0) {
        <div class="table-wrapper">
          <div class="table-search">
            <mat-form-field appearance="outline" class="table-search-field">
              <mat-label>Buscar en resultados</mat-label>
              <mat-icon matPrefix>search</mat-icon>
              <input matInput type="text" [(ngModel)]="searchTerm" placeholder="Nombre, código o documento">
            </mat-form-field>
          </div>
          <table class="data-table">
            <thead>
              <tr>
                <th class="th-comprobantes"></th>
                <th>Codigo</th>
                <th>Fecha Envio</th>
                <th>Remitente</th>
                <th>Beneficiario</th>
                <th>Doc.</th>
                <th>Origen</th>
                <th>Mon.</th>
                <th class="th-num">Monto</th>
                <th>Estado</th>
                <th>Fecha Pago</th>
                <th class="th-act"></th>
              </tr>
            </thead>
            <tbody>
              @for (r of filtered; track r.codigo) {
                <tr [class.selected]="selectedCodigo === r.codigo">
                  <td class="td-comprobantes">
                    <button class="btn-icon-pdf" title="Comprobante de envio" (click)="abrirComprobanteEnvio(r.codigo)">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    </button>
                  </td>
                  <td class="td-code">{{ r.codigo }}</td>
                  <td class="td-fecha">{{ formatFecha(r.fechaEnvio) }}</td>
                  <td class="td-cliente">{{ r.remitente }}</td>
                  <td class="td-cliente">{{ r.destinatario }}</td>
                  <td class="td-doc">{{ r.docDestinatario }}</td>
                  <td class="td-origen">{{ r.origen }}</td>
                  <td><span class="mon-badge">{{ r.moneda }}</span></td>
                  <td class="td-num td-total">{{ r.monto | number:'1.2-2' }}</td>
                  <td>
                    <span class="estado-badge"
                      [class.pendiente]="r.estado === 0"
                      [class.pagada]="r.estado === 1"
                      [class.devuelta]="r.estado === 2"
                      [class.anulada]="r.estado === 5"
                      [class.en-proceso]="r.estado === 7">
                      {{ r.estadoDesc }}
                    </span>
                  </td>
                  <td class="td-fecha">{{ r.fechaPago ? formatFecha(r.fechaPago) : '-' }}</td>
                  <td class="td-act">
                    <button class="btn-eye" (click)="verDetalle(r)" title="Ver detalle">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                    @if (r.estado === 0) {
                      <button class="btn-pagar-sm" (click)="irAPagar(r.codigo)" title="Pagar esta remesa">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      </button>
                    }
                    @if (r.estado === 7) {
                      <button class="btn-confirm-sm" (click)="confirmarDepositoDesdeReporte(r)" title="Confirmar deposito" [disabled]="confirmandoDeposito">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                      </button>
                    }
                    @if (r.idPago) {
                      <button class="btn-print-sm" (click)="abrirPdfPopup(r.idPago!)" title="Comprobante PDF">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (!loading && records.length === 0 && searched) {
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <p>No se encontraron remesas para los filtros seleccionados.</p>
        </div>
      }

      <!-- ===== DETAIL DRAWER ===== -->
      @if (detalle) {
        <div class="drawer-overlay" (click)="detalle = null"></div>
        <div class="drawer">
          <div class="drawer-header" [class.header-pending]="detalle.estado === 0 || detalle.estado === 7" [class.header-paid]="detalle.estado === 1" [class.header-returned]="detalle.estado === 2 || detalle.estado === 5">
            <div class="drawer-title-row">
              <span class="drawer-icon"><mat-icon>payments</mat-icon></span>
              <div class="drawer-heading-copy"><h3>Detalle de remesa</h3><span class="drawer-code">Remesa #{{ detalle.codigo }} · {{ detalle.fechaEnvio }}</span></div>
            </div>
            <div class="drawer-header-actions">
              <span class="estado-badge" [class.pendiente]="detalle.estado === 0" [class.pagada]="detalle.estado === 1" [class.devuelta]="detalle.estado === 2" [class.anulada]="detalle.estado === 5" [class.en-proceso]="detalle.estado === 7">{{ detalle.estadoDesc }}</span>
            <button class="btn-close" (click)="detalle = null">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            </div>
          </div>

          <div class="drawer-body">
            <div class="amount-highlight" [class.amount-paid]="detalle.estado === 1" [class.amount-pending]="detalle.estado === 0 || detalle.estado === 7">
              <div><span class="amount-caption">Monto de la remesa</span><span class="amount-reference">Código {{ detalle.codigo }}</span></div>
              <strong>{{ detalle.monto | number:'1.2-2' }} <small>{{ detalle.moneda }}</small></strong>
            </div>

            <div class="route-section">
              <div class="route-party route-origin">
                <span class="route-icon"><mat-icon>flight_takeoff</mat-icon></span>
                <div class="route-copy"><span class="route-label">Origen</span><strong>{{ detalle.origen || 'No disponible' }}</strong><span class="route-location"><span class="country-flag">🇨🇱</span> Chile</span></div>
              </div>
              <span class="route-arrow"><mat-icon>east</mat-icon></span>
              <div class="route-party route-destination">
                <span class="route-icon"><mat-icon>flight_land</mat-icon></span>
                <div class="route-copy"><span class="route-label">Destino</span><strong>{{ detalle.destino || detalle.agenciaPago || 'No disponible' }}</strong><span class="route-location"><span class="country-flag">🇧🇴</span> Bolivia</span></div>
              </div>
            </div>

            <div class="drawer-section person-section">
              <div class="section-head">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <span>Remitente</span>
              </div>
              <div class="detail-grid">
                <div class="dg-item span2">
                  <span class="dg-label">Nombre</span>
                  <span class="dg-value fw700">{{ detalle.remitente || '-' }}</span>
                </div>
              </div>
            </div>

            <div class="drawer-section person-section">
              <div class="section-head">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6"/><path d="M23 11h-6"/></svg>
                <span>Beneficiario</span>
              </div>
              <div class="detail-grid">
                <div class="dg-item span2">
                  <span class="dg-label">Nombre</span>
                  <span class="dg-value fw700">{{ detalle.destinatario || '-' }}</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Documento</span>
                  <span class="dg-value">{{ detalle.docDestinatario || '-' }}</span>
                </div>
              </div>
            </div>

            @if (detalle.estado === 7 && detalle.fechaPreproceso) {
              <div class="drawer-section">
                <div class="section-head">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span>Datos del Preproceso</span>
                </div>
                <div class="detail-grid">
                  <div class="dg-item">
                    <span class="dg-label">Fecha Inicio</span>
                    <span class="dg-value">{{ detalle.fechaPreproceso }}</span>
                  </div>
                  <div class="dg-item">
                    <span class="dg-label">Cajero</span>
                    <span class="dg-value">{{ detalle.cajero || '-' }}</span>
                  </div>
                  <div class="dg-item">
                    <span class="dg-label">Agencia</span>
                    <span class="dg-value">{{ detalle.agenciaPago || '-' }}</span>
                  </div>
                </div>
              </div>
            }

            @if (detalle.idPago) {
              <div class="drawer-section">
                <div class="section-head">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                  <span>Datos del Pago</span>
                </div>
                <div class="detail-grid">
                  <div class="dg-item">
                    <span class="dg-label">Fecha Pago</span>
                    <span class="dg-value">{{ detalle.fechaPago }}</span>
                  </div>
                  <div class="dg-item">
                    <span class="dg-label">Forma de Pago</span>
                    <span class="dg-value">
                      <span class="pago-badge" [class.deposito]="detalle.formaPago === 2" [class.efectivo]="detalle.formaPago !== 2">
                        {{ detalle.formaPagoDesc }}
                      </span>
                    </span>
                  </div>
                  <div class="dg-item">
                    <span class="dg-label">Cajero</span>
                    <span class="dg-value">{{ detalle.cajero || '-' }}</span>
                  </div>
                  <div class="dg-item">
                    <span class="dg-label">Agencia</span>
                    <span class="dg-value">{{ detalle.agenciaPago || '-' }}</span>
                  </div>
                </div>
              </div>
            }
          </div>

          <div class="drawer-footer">
            @if (detalle.estado === 0) {
              <button class="btn-pagar" (click)="irAPagar(detalle.codigo)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                Pagar Remesa
              </button>
            }
            @if (detalle.estado === 7) {
              <button class="btn-pagar en-proceso" (click)="confirmarDepositoDesdeReporte(detalle)" [disabled]="confirmandoDeposito">
                @if (confirmandoDeposito) {
                  <div class="spinner-sm"></div> Confirmando...
                } @else {
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                  Confirmar Deposito
                }
              </button>
            }
            @if (detalle.idPago) {
              <button class="btn-print" (click)="abrirPdfPopup(detalle.idPago!)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Comprobante PDF
              </button>
            }
          </div>
        </div>
      }

      <!-- ===== PDF POPUP ===== -->
      @if (showPdfPopup) {
        <div class="pdf-overlay" (click)="cerrarPdfPopup()">
          <div class="pdf-modal" (click)="$event.stopPropagation()">
            <div class="pdf-modal-header">
              <h3>Comprobante de Pago</h3>
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
    .report-heading { display: flex; align-items: center; gap: 12px; margin: 0 0 16px; }
    .report-heading-icon { width: 44px; height: 44px; display: grid; place-items: center; border-radius: 12px; color: #b45309; background: #fff1e6; }
    .report-heading h1 { margin: 0; color: var(--text-primary, #14213d); font-size: 20px; font-weight: 700; }
    .report-heading p { margin: 4px 0 0; color: var(--text-muted, #8292aa); font-size: 13px; }

    /* ===== FILTER BAR ===== */
    .filter-bar {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      background: var(--card-bg, #fff); border: 1px solid var(--border, #e5e7eb); border-radius: 12px;
      padding: 16px; margin-bottom: 16px; flex-wrap: wrap;
    }
    .filter-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; flex: 1; }
    .report-filter { width: 170px; margin-bottom: -1.25em; }
    .report-filter.date-filter { width: 165px; }
    .report-filter.code-filter { width: 140px; }
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
      border-color: #F58634; box-shadow: 0 0 0 3px rgba(245,134,52,.12);
    }
    .input-sm { width: 100px; }
    .btn-search {
      display: inline-flex; align-items: center; gap: 6px;
      min-height: 48px; padding: 0 20px; background: #f58634 !important; color: #fff !important; border: none;
      border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    .btn-search mat-icon { margin-right: 2px; }
    .btn-search:hover:not(:disabled) { background: #df7020 !important; }
    .btn-search:disabled { opacity: .5; cursor: not-allowed; }
    .count-badge {
      font-size: 12px; font-weight: 600; color: var(--text-muted, #94a3b8); padding: 6px 12px;
      background: var(--hover-bg, #f1f5f9); border-radius: 20px;
    }
    .count-badge.has { color: var(--text-primary, #14213d); background: var(--info-bg, #e0f2fe); }

    /* ===== LOADING ===== */
    .loading-box {
      display: flex; align-items: center; justify-content: center; gap: 12px;
      padding: 60px 0; color: var(--text-secondary, #64748b); font-size: 14px;
    }

    /* ===== TABLE ===== */
    .table-wrapper {
      background: var(--card-bg, #fff); border: 1px solid var(--border, #e5e7eb); border-radius: 12px; overflow: hidden;
    }
    .table-search {
      display: flex; align-items: center; gap: 8px; padding: 8px 16px 0;
      border-bottom: 1px solid var(--border-light, #f1f5f9);
    }
    .table-search-field { width: 100%; margin-bottom: -1.25em; }
    .table-search-field mat-icon { color: var(--text-muted, #94a3b8); margin-right: 8px; }
    .search-input {
      flex: 1; border: none; outline: none; font-size: 13px; color: var(--text-primary, #1e293b);
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
      padding: 10px 12px; border-bottom: 1px solid var(--border-light, #f1f5f9); color: var(--text-primary, #334155);
    }
    .data-table tbody tr { transition: background .1s; }
    .data-table tbody tr:hover { background: var(--hover-bg, #f8fafc); }
    .data-table tbody tr.selected { background: var(--orange-bg, #fff8f0); }
    .th-num, .td-num { text-align: right; font-variant-numeric: tabular-nums; }
    .th-act { width: 100px; }
    .td-code { font-weight: 700; color: #F58634; }
    .td-fecha { white-space: nowrap; font-size: 12px; color: var(--text-secondary, #64748b); }
    .td-cliente { max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .td-doc { font-size: 12px; white-space: nowrap; }
    .td-origen { font-size: 12px; white-space: nowrap; }
    .td-total { font-weight: 700; color: #F58634; }
    .td-act { display: flex; gap: 4px; }

    .mon-badge {
      display: inline-block; padding: 2px 7px; border-radius: 4px;
      background: var(--info-bg, #e0f2fe); color: var(--info-text, #0369a1); font-size: 11px; font-weight: 700;
    }

    .estado-badge {
      display: inline-block; padding: 3px 8px; border-radius: 5px;
      font-size: 10px; font-weight: 800; letter-spacing: .03em; white-space: nowrap;
    }
    .estado-badge.pendiente { background: #fef3c7; color: #92400e; }
    .estado-badge.pagada { background: var(--success-bg, #dcfce7); color: var(--success-text, #15803d); }
    .estado-badge.devuelta { background: #e0f2fe; color: #0369a1; }
    .estado-badge.anulada { background: #fee2e2; color: #991b1b; }
    .estado-badge.en-proceso { background: #fff7ed; color: #c2410c; }

    .pago-badge {
      display: inline-block; padding: 3px 8px; border-radius: 5px;
      font-size: 10px; font-weight: 800; letter-spacing: .03em; white-space: nowrap;
    }
    .pago-badge.efectivo { background: var(--success-bg, #dcfce7); color: var(--success-text, #15803d); }
    .pago-badge.deposito { background: var(--info-bg, #e0f2fe); color: var(--info-text, #0369a1); }

    .btn-icon-pdf {
      background: transparent; border: 1px solid #e0e0e0; border-radius: 4px; cursor: pointer;
      padding: 2px 4px; display: inline-flex; align-items: center; justify-content: center;
      transition: all .15s; vertical-align: middle;
    }
    .btn-icon-pdf:hover { background: #fef2f2; border-color: #fca5a5; }
    .td-comprobantes { text-align: center; white-space: nowrap; width: 30px; }
    .th-comprobantes { width: 30px; }
    .btn-eye, .btn-print-sm, .btn-pagar-sm {
      width: 30px; height: 30px; border: 1px solid var(--border, #e5e7eb); border-radius: 7px;
      background: var(--card-bg, #fff); color: var(--text-secondary, #64748b); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .btn-eye:hover { background: var(--hover-bg, #f8fafc); color: var(--text-primary, #14213d); border-color: #F58634; }
    .btn-print-sm:hover { background: var(--orange-bg, #fff8f0); color: #F58634; border-color: #F58634; }
    .btn-pagar-sm { color: #15803d; }
    .btn-pagar-sm:hover { background: #dcfce7; border-color: #15803d; }
    .btn-confirm-sm { width: 30px; height: 30px; border: 1px solid #F58634; border-radius: 7px; background: var(--card-bg, #fff); color: #F58634; cursor: pointer; display: flex; align-items: center; justify-content: center; }
    .btn-confirm-sm:hover:not(:disabled) { background: #F58634; color: #fff; }
    .btn-confirm-sm:disabled { opacity: .5; cursor: not-allowed; }

    /* ===== EMPTY ===== */
    .empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted, #94a3b8); }
    .empty-state p { margin-top: 12px; font-size: 14px; }

    /* ===== DRAWER ===== */
    .drawer-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.35); z-index: 100;
      animation: fadeIn .2s ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    .drawer {
      position: fixed; top: 0; right: 0; bottom: 0; width: 500px; max-width: 100vw;
      background: var(--card-bg, #fff); box-shadow: -4px 0 30px rgba(0,0,0,.15);
      z-index: 101; display: flex; flex-direction: column;
      animation: slideIn .25s ease-out;
    }
    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
    .drawer-header {
      display: flex; align-items: center; justify-content: space-between;
      gap: 14px; padding: 16px 20px; border-bottom: 1px solid #dbe5f1; border-left: 4px solid #f58634;
      background: linear-gradient(110deg, #fffaf5 0%, #fff 72%); flex-shrink: 0;
    }
    .drawer-header.header-pending { border-left-color: #f58634; background: linear-gradient(110deg, #fff8f0 0%, #fff 75%); }
    .drawer-header.header-paid { border-left-color: #15945b; background: linear-gradient(110deg, #effaf4 0%, #fff 75%); }
    .drawer-header.header-returned { border-left-color: #d14343; background: linear-gradient(110deg, #fff4f3 0%, #fff 75%); }
    .drawer-title-row { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .drawer-icon { width: 42px; height: 42px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 12px; color: #bd5b0b; background: #ffecd9; }
    .header-paid .drawer-icon { color: #147b4d; background: #dff5e9; }
    .header-returned .drawer-icon { color: #b42318; background: #fee4e2; }
    .drawer-icon mat-icon { width: 22px; height: 22px; font-size: 22px; }
    .drawer-heading-copy { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .drawer-title-row h3 { font-size: 16px; font-weight: 700; color: var(--text-primary, #14213d); margin: 0; }
    .drawer-code { color: #8192aa; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .drawer-header-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .btn-close {
      width: 38px; height: 38px; border: 0; border-radius: 50%;
      background: #f1f3f5; color: var(--text-secondary, #64748b); cursor: pointer;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .btn-close:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }
    .drawer-body { flex: 1; overflow-y: auto; padding: 16px 20px 20px; }
    .amount-highlight { min-height: 68px; box-sizing: border-box; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; border: 1px solid #fed7aa; border-radius: 12px; background: #fff8f1; margin-bottom: 16px; }
    .amount-highlight.amount-paid { border-color: #b7ebcf; background: #f1fbf5; }
    .amount-highlight > div { display: flex; flex-direction: column; gap: 4px; }
    .amount-caption { color: #8192aa; font-size: 12px; }
    .amount-reference { color: #9aa9bc; font-size: 10px; }
    .amount-highlight strong { color: #c75d0b; font-size: 23px; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .amount-paid strong { color: #137b4c; }
    .amount-highlight small { font-size: 13px; }
    .route-section { display: grid; grid-template-columns: minmax(0,1fr) 28px minmax(0,1fr); gap: 8px; align-items: center; margin-bottom: 10px; }
    .route-party { min-width: 0; min-height: 92px; box-sizing: border-box; padding: 13px 12px; display: flex; align-items: flex-start; gap: 10px; border: 1px solid #cfe0ff; border-radius: 12px; background: #f5f9ff; }
    .route-destination { border-color: #bce8d6; background: #f2fbf7; }
    .route-icon { width: 34px; height: 34px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 9px; background: #e4efff; color: #2864ae; }
    .route-destination .route-icon { color: #14805e; background: #ddf4e9; }
    .route-icon mat-icon { font-size: 19px; width: 19px; height: 19px; }
    .route-copy { display: flex; min-width: 0; flex-direction: column; gap: 4px; }
    .route-label { color: #8192aa; font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .route-copy strong { color: #14213d; font-size: 12px; line-height: 1.35; overflow-wrap: anywhere; }
    .route-location { display: flex; align-items: center; gap: 5px; color: #7588a3; font-size: 10px; }
    .country-flag { font-size: 14px; line-height: 1; }
    .route-arrow { display: grid; place-items: center; color: #e1782b; }
    .route-arrow mat-icon { font-size: 22px; width: 22px; height: 22px; }
    .drawer-section { padding: 15px 2px; border-bottom: 1px solid var(--border-light, #edf1f6); }
    .person-section .detail-grid { grid-template-columns: 1fr; }
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
    .btn-pagar {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 9px 18px; background: #15803d; color: #fff; border: none;
      border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer;
      font-family: inherit;
    }
    .btn-pagar:hover { background: #116c32; }
    .btn-pagar.en-proceso { background: #F58634; }
    .btn-pagar.en-proceso:hover { background: #e0740a; }

    /* ===== SPINNER ===== */
    .spinner {
      width: 28px; height: 28px; border: 3px solid var(--border, #e5e7eb); border-top-color: #F58634;
      border-radius: 50%; animation: spin .7s linear infinite;
    }
    .spinner-sm { width: 16px; height: 16px; border: 2px solid var(--border, #e5e7eb); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ===== PDF POPUP ===== */
    .pdf-overlay {
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
    .pdf-modal-header h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--text-primary, #14213d); }
    .pdf-modal-actions { display: flex; align-items: center; gap: 8px; }
    .btn-secondary {
      padding: 9px 18px; border: 1px solid var(--border, #d1d5db); border-radius: 8px;
      background: var(--card-bg, #fff); color: var(--text-primary, #334155); font-size: 13px; font-weight: 600;
      cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 4px;
    }
    .btn-secondary:hover { background: var(--hover-bg, #f8fafc); border-color: var(--text-muted, #94a3b8); }
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

    /* ===== MOBILE ===== */
    @media (max-width: 700px) {
      .filter-left { flex-direction: column; align-items: stretch; }
      .report-filter, .report-filter.date-filter, .report-filter.code-filter { width: 100%; }
      .data-table { font-size: 12px; }
      .td-cliente { max-width: 100px; }
      .drawer { width: 100%; }
      .detail-grid { grid-template-columns: 1fr; }
      .dg-item.span2 { grid-column: span 1; }
      .drawer-header { padding: 14px 16px; }
      .drawer-header-actions { gap: 6px; }
      .route-section { grid-template-columns: minmax(0,1fr) 20px minmax(0,1fr); gap: 5px; }
      .route-party { padding: 10px 8px; gap: 7px; }
      .route-copy strong { font-size: 11px; }
      .amount-highlight strong { font-size: 20px; }
    }
  `],
})
export class HistorialPagoRemesaComponent implements OnInit {
  private remesaSvc = inject(RemesaService);
  private snack = inject(MatSnackBar);
  private sanitizer = inject(DomSanitizer);
  private router = inject(Router);

  loading = false;
  searched = false;
  desde = '';
  hasta = '';
  filterEstado = '';
  filterTipoPago = '';
  filterCodigo = '';
  searchTerm = '';
  records: ReporteRemesaRecord[] = [];
  selectedCodigo = 0;

  detalle: ReporteRemesaRecord | null = null;
  confirmandoDeposito = false;

  showPdfPopup = false;
  pdfPopupUrl: SafeResourceUrl | null = null;
  pdfPopupLoading = false;
  private pdfBlobUrl: string | null = null;

  get filtered(): ReporteRemesaRecord[] {
    if (!this.searchTerm.trim()) return this.records;
    const term = this.searchTerm.toLowerCase();
    return this.records.filter(r =>
      (r.remitente || '').toLowerCase().includes(term) ||
      (r.destinatario || '').toLowerCase().includes(term) ||
      (r.docDestinatario || '').toLowerCase().includes(term) ||
      r.codigo.toString().includes(term)
    );
  }

  get rangoFechasInvalido(): boolean {
    return !!this.desde && !!this.hasta && this.hasta < this.desde;
  }

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.desde = today;
    this.hasta = today;
    this.buscar();
  }

  buscar(): void {
    this.searched = true;
    if (!this.desde || this.rangoFechasInvalido) return;
    this.loading = true;

    const estado = this.filterEstado !== '' ? +this.filterEstado : undefined;
    const tipoPago = this.filterTipoPago !== '' ? +this.filterTipoPago : undefined;
    const codigo = this.filterCodigo.trim() ? +this.filterCodigo.trim() : undefined;

    this.remesaSvc.reporteRemesas(this.desde, this.hasta || undefined, estado, codigo, tipoPago).subscribe({
      next: records => {
        this.records = records;
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.snack.open(err.message || 'Error al cargar reporte', 'OK', { duration: 5000 });
      },
    });
  }

  verDetalle(r: ReporteRemesaRecord): void {
    this.selectedCodigo = r.codigo;
    this.detalle = r;
  }

  irAPagar(codigo: number): void {
    this.router.navigate(['/pago-remesa'], { queryParams: { codigo } });
  }

  abrirComprobanteEnvio(codigo: number): void {
    this.pdfPopupLoading = true;
    this.pdfPopupUrl = null;
    this.showPdfPopup = true;

    this.remesaSvc.descargarComprobanteEnvioChilePdf(codigo).subscribe({
      next: blob => {
        if (this.pdfBlobUrl) URL.revokeObjectURL(this.pdfBlobUrl);
        this.pdfBlobUrl = URL.createObjectURL(blob);
        this.pdfPopupUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfBlobUrl);
        this.pdfPopupLoading = false;
      },
      error: () => {
        this.pdfPopupLoading = false;
        this.showPdfPopup = false;
        this.snack.open('Error al generar el comprobante de envío', 'OK', { duration: 3000 });
      },
    });
  }

  abrirPdfPopup(idPago: number): void {
    this.pdfPopupLoading = true;
    this.pdfPopupUrl = null;
    this.showPdfPopup = true;

    this.remesaSvc.descargarComprobantePagoPdf(idPago).subscribe({
      next: blob => {
        if (this.pdfBlobUrl) URL.revokeObjectURL(this.pdfBlobUrl);
        this.pdfBlobUrl = URL.createObjectURL(blob);
        this.pdfPopupUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfBlobUrl);
        this.pdfPopupLoading = false;
      },
      error: () => {
        this.pdfPopupLoading = false;
        this.showPdfPopup = false;
        this.snack.open('Error al generar comprobante PDF', 'OK', { duration: 3000 });
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

  confirmarDepositoDesdeReporte(r: ReporteRemesaRecord): void {
    Swal.fire({
      title: 'Confirmar Deposito Acreditado',
      html: `
        <div style="text-align:left; font-size:14px; line-height:1.8;">
          <p><strong>Codigo:</strong> ${r.codigo}</p>
          <p><strong>Beneficiario:</strong> ${r.destinatario}</p>
          <p><strong>Monto:</strong> ${r.monto.toFixed(2)} ${r.moneda}</p>
        </div>
        <p style="font-size:13px; color:#666;">¿Confirma que el deposito fue acreditado?</p>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Si, deposito acreditado',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#15803d',
    }).then(result => {
      if (!result.isConfirmed) return;
      this.confirmandoDeposito = true;
      const uuid = crypto.randomUUID();
      this.remesaSvc.confirmarPreproceso({ codigo: r.codigo, uuid }).subscribe({
        next: () => {
          this.confirmandoDeposito = false;
          this.detalle = null;
          this.snack.open(`Remesa ${r.codigo} pagada correctamente`, 'OK', { duration: 4000 });
          this.buscar();
        },
        error: (e) => {
          this.confirmandoDeposito = false;
          this.snack.open(e.message || 'Error al confirmar deposito', 'OK', { duration: 5000 });
        }
      });
    });
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '';
    const d = fecha.split(' ')[0];
    const h = fecha.split(' ')[1];
    return h ? `${d} ${h.substring(0, 5)}` : d;
  }
}
