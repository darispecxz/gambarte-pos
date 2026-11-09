import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RemesaService, HistorialRemesaRecord, CotizacionRemesaRecord } from '../../core/remesa.service';

@Component({
  selector: 'app-historial-remesa',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatSnackBarModule],
  template: `
    <div class="page">

      <div class="manual-link-row"><a routerLink="/manuales/giro-internacional" [queryParams]="{tipo:'reportes'}">？ Manual de ayuda</a></div>

      <!-- ===== TABS ===== -->
      <div class="tab-bar">
        <button class="tab" [class.active]="tab === 'remesas'" (click)="tab = 'remesas'">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          Remesas
        </button>
        <button class="tab" [class.active]="tab === 'cotizaciones'" (click)="switchTab('cotizaciones')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
          Cotizaciones
        </button>
      </div>

      <!-- ═══════════════════ TAB: REMESAS ═══════════════════ -->
      @if (tab === 'remesas') {

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
                <option value="5">Anulado</option>
              </select>
            </div>
            <div class="field-inline">
              <label>Codigo</label>
              <input type="text" [(ngModel)]="filterCodigo" placeholder="Ej: 80672" class="input-sm">
            </div>
            <button class="btn-search" (click)="buscarRemesas()" [disabled]="loadingRemesas">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Buscar
            </button>
          </div>
          <div class="filter-right">
            <span class="count-badge" [class.has]="remesas.length > 0">
              {{ remesas.length }} remesas
            </span>
          </div>
        </div>

        @if (loadingRemesas) {
          <div class="loading-box">
            <div class="spinner"></div>
            <span>Cargando remesas...</span>
          </div>
        }

        <!-- TABLE -->
        @if (!loadingRemesas && remesas.length > 0) {
          <div class="table-wrapper">
            <div class="table-search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="text" [(ngModel)]="searchTerm" placeholder="Buscar por nombre, destino, codigo..."
                     class="search-input">
            </div>
            <table class="data-table remesas-table">
              <thead>
                <tr>
                  <th class="th-comprobantes"></th>
                  <th>Codigo</th>
                  <th>Fecha de Registro</th>
                  <th>Remitente</th>
                  <th>Destinatario</th>
                  <th>Destino</th>
                  <th>Mon.</th>
                  <th class="th-num">Monto en BOB</th>
                  <th class="th-num">% Com total</th>
                  <th class="th-num">Comisión</th>
                  <th class="th-num">Costos Corresp. BOB</th>
                  <th class="th-num">IVA BOB</th>
                  <th class="th-num">Total [BOB]</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                @for (r of filteredRemesas; track r.id) {
                  <tr [class.selected]="selectedId === r.id" (click)="verComprobante(r.id)">
                    <td class="td-comprobantes">
                      <button class="btn-icon-pdf" title="Comprobante de envio" (click)="abrirPdfPopup('comprobante', r.id); $event.stopPropagation()">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M15 3v5h5"/><path d="m8 15 2 2 5-5"/></svg>
                      </button>
                      <button class="btn-print-sm" (click)="abrirPdfPopup('factura', r.id); $event.stopPropagation()" title="Factura PDF">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M15 3v5h5"/><path d="M8 12h8M8 16h5"/></svg>
                      </button>
                      <span class="btn-payment-proof disabled" title="Comprobante de pago no disponible" aria-label="Comprobante de pago no disponible" aria-disabled="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      </span>
                      <span class="pago-icon" [class.deposito]="r.formaPago === 2" [class.efectivo]="r.formaPago !== 2"
                            [title]="r.formaPagoDesc" [attr.aria-label]="r.formaPagoDesc">
                        @if (r.formaPago === 2) {
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v2H6a3 3 0 0 0 0 6h14v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M6 9h15v6H6a3 3 0 0 1 0-6z"/><path d="M17 12h.01"/></svg>
                        } @else {
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9h.01M18 15h.01"/></svg>
                        }
                      </span>
                    </td>
                    <td class="td-code">{{ r.codigo }}</td>
                    <td class="td-hora">{{ formatFechaHora(r.fecha) }}</td>
                    <td class="td-cliente">{{ r.remitente }}</td>
                    <td class="td-cliente">{{ r.destinatario }}</td>
                    <td>{{ r.destino }}</td>
                    <td><span class="mon-badge">{{ r.moneda }}</span></td>
                    <td class="td-num">{{ r.montoBob | number:'1.2-2' }}</td>
                    <td class="td-num">{{ r.porcentajeComision | number:'1.2-2' }}%</td>
                    <td class="td-num">{{ r.comision | number:'1.2-2' }}</td>
                    <td class="td-num">{{ r.gastosCorresponsalBob | number:'1.2-2' }}</td>
                    <td class="td-num">{{ r.ivaBob | number:'1.2-2' }}</td>
                    <td class="td-num td-total">{{ r.totalBob | number:'1.2-2' }}</td>
                    <td>
                      <span class="estado-badge"
                        [class.pendiente]="r.estado === 0"
                        [class.pagado]="r.estado === 1"
                        [class.devuelto]="r.estado === 2"
                        [class.anulado]="r.estado === 5">
                        {{ r.estadoDesc }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (!loadingRemesas && remesas.length === 0 && searchedRemesas) {
          <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <p>No se encontraron remesas para los filtros seleccionados.</p>
          </div>
        }

      }

      <!-- ═══════════════════ TAB: COTIZACIONES ═══════════════════ -->
      @if (tab === 'cotizaciones') {

        <div class="filter-bar">
          <div class="filter-left">
            <div class="field-inline">
              <label>Estado</label>
              <select [(ngModel)]="filterEstadoCot" (ngModelChange)="buscarCotizaciones()">
                <option value="">Todas</option>
                <option value="vigente">Vigentes</option>
                <option value="aplicada">Aplicadas</option>
                <option value="expirada">Expiradas</option>
              </select>
            </div>
          </div>
          <div class="filter-right">
            <span class="count-badge" [class.has]="cotizaciones.length > 0">
              {{ cotizaciones.length }} cotizaciones
            </span>
          </div>
        </div>

        @if (loadingCot) {
          <div class="loading-box">
            <div class="spinner"></div>
            <span>Cargando cotizaciones...</span>
          </div>
        }

        @if (!loadingCot && cotizaciones.length > 0) {
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Codigo</th>
                  <th>Mon.</th>
                  <th>Destino</th>
                  <th class="th-num">Monto</th>
                  <th>Estado</th>
                  <th>Valida hasta</th>
                  <th>Creada</th>
                  <th>Remesa</th>
                </tr>
              </thead>
              <tbody>
                @for (c of cotizaciones; track c.id) {
                  <tr>
                    <td class="td-code">{{ c.codigo }}</td>
                    <td><span class="mon-badge">{{ c.moneda }}</span></td>
                    <td>{{ c.destino }}</td>
                    <td class="td-num">{{ c.monto | number:'1.2-2' }}</td>
                    <td>
                      <span class="estado-badge"
                        [class.vigente]="c.estado === 'vigente'"
                        [class.aplicada]="c.estado === 'aplicada'"
                        [class.expirada]="c.estado === 'expirada'">
                        {{ c.estado | uppercase }}
                      </span>
                    </td>
                    <td class="td-hora">{{ formatFechaHora(c.validoHasta) }}</td>
                    <td class="td-hora">{{ formatFechaHora(c.createdAt) }}</td>
                    <td>
                      @if (c.aplicadaEn) {
                        <button class="btn-link" (click)="verComprobante(c.aplicadaEn)">
                          #{{ c.aplicadaEn }}
                        </button>
                      } @else {
                        <span class="text-muted">-</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (!loadingCot && cotizaciones.length === 0 && searchedCot) {
          <div class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            <p>No se encontraron cotizaciones.</p>
          </div>
        }

      }

      <!-- ===== DETAIL DRAWER ===== -->
      @if (comprobante) {
        <div class="drawer-overlay" (click)="comprobante = null"></div>
        <div class="drawer">
          <div class="drawer-header">
            <div class="drawer-title-row">
              <span class="drawer-icon">$</span>
              <div class="drawer-heading-copy">
                <h3>Detalle de remesa</h3>
                <span class="drawer-code">Remesa #{{ comprobante.codigo }} · {{ comprobante.fec_crea_remesa }}</span>
              </div>
            </div>
            <div class="drawer-header-actions">
              <button class="btn-close" (click)="comprobante = null">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>

          <div class="drawer-body">
            <div class="route-section">
              <div class="route-party route-origin">
                <span class="route-icon">↗</span>
                <div class="route-copy"><span class="route-label">Origen</span><strong>{{ comprobante.agencia }}</strong><span class="route-location">🇧🇴 Bolivia</span></div>
              </div>
              <span class="route-arrow">→</span>
              <div class="route-party route-destination">
                <span class="route-icon">↙</span>
                <div class="route-copy"><span class="route-label">Destino</span><strong>{{ comprobante.destino_desc }}</strong><span class="route-location">🇨🇱 Chile</span></div>
              </div>
            </div>
            <div class="drawer-section">
              <div class="section-head">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/></svg>
                <span>Datos de la Operacion</span>
              </div>
              <div class="detail-grid">
                <div class="dg-item">
                  <span class="dg-label">Codigo</span>
                  <span class="dg-value big orange">{{ comprobante.codigo }}</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Fecha</span>
                  <span class="dg-value">{{ comprobante.fec_crea_remesa }}</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Agencia</span>
                  <span class="dg-value">{{ comprobante.agencia }}</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Destino</span>
                  <span class="dg-value">{{ comprobante.destino_desc }}</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Forma de Pago</span>
                  <span class="dg-value">
                    <span class="pago-badge" [class.deposito]="comprobante.id_forma_pago_chile === 2" [class.efectivo]="comprobante.id_forma_pago_chile !== 2">
                      {{ comprobante.id_forma_pago_chile === 2 ? 'Depósito a Cuenta' : 'Efectivo por Ventanilla' }}
                    </span>
                  </span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Estado</span>
                  <span class="dg-value"><span class="estado-badge" [class.pendiente]="comprobante.estado === 0" [class.pagado]="comprobante.estado === 1" [class.devuelto]="comprobante.estado === 2" [class.anulado]="comprobante.estado === 5">
                    {{ comprobante.estado === 1 ? 'PAGADO' : comprobante.estado === 2 ? 'DEVUELTO' : comprobante.estado === 5 ? 'ANULADO' : 'PENDIENTE' }}
                  </span></span>
                </div>
                @if (comprobante.id_forma_pago_chile === 2) {
                  @if (comprobante.banco_chile_nombre) {
                    <div class="dg-item">
                      <span class="dg-label">Banco Destino</span>
                      <span class="dg-value fw700">{{ comprobante.banco_chile_nombre }}</span>
                    </div>
                  }
                  @if (comprobante.dest_cuenta) {
                    <div class="dg-item">
                      <span class="dg-label">Nro. Cuenta</span>
                      <span class="dg-value fw700">{{ comprobante.dest_cuenta }}</span>
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
                  <span class="dg-value fw700">{{ comprobante.nombres }} {{ comprobante.ape_pat }} {{ comprobante.ape_mat }}</span>
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
                  <span class="dg-value fw700">{{ comprobante.dest_nombres }} {{ comprobante.dest_ape_pat }} {{ comprobante.dest_ape_mat }}</span>
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
                  <span class="dg-label">Moneda Recibida</span>
                  <span class="dg-value"><span class="mon-badge">{{ comprobante.moneda_recibida }}</span></span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Moneda Enviada</span>
                  <span class="dg-value"><span class="mon-badge">{{ comprobante.moneda_enviada }}</span></span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Monto</span>
                  <span class="dg-value big">{{ comprobante.monto | number:'1.2-2' }}</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Tipo de Cambio</span>
                  <span class="dg-value">{{ comprobante.tipo_cambio | number:'1.2-5' }}</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Comision BOB</span>
                  <span class="dg-value">{{ comprobante.comision_bob | number:'1.2-2' }}</span>
                </div>
                <div class="dg-item">
                  <span class="dg-label">Total BOB</span>
                  <span class="dg-value big orange">{{ comprobante.total_bob | number:'1.2-2' }} BOB</span>
                </div>
              </div>
            </div>

            <div class="drawer-section">
              <div class="section-head">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Documentos</span>
              </div>
              <div class="doc-list">
                <button class="doc-item" (click)="abrirPdfPopup('comprobante', comprobante.id_remesa)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F58634" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  <div class="doc-info">
                    <span class="doc-name">Comprobante de Envio</span>
                    <span class="doc-sub">Codigo {{ comprobante.codigo }}</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </button>
                <button class="doc-item" (click)="abrirPdfPopup('factura', comprobante.id_remesa)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F58634" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <div class="doc-info">
                    <span class="doc-name">Factura de Comision</span>
                    <span class="doc-sub">Remesa #{{ comprobante.codigo }}</span>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </button>
              </div>
            </div>
          </div>

          <div class="drawer-footer">
            <button class="btn-print" (click)="abrirPdfPopup('comprobante', comprobante.id_remesa)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Comprobante
            </button>
            <button class="btn-print" (click)="abrirPdfPopup('factura', comprobante.id_remesa)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Factura
            </button>
          </div>
        </div>
      }

      <!-- ===== PDF POPUP ===== -->
      @if (showPdfPopup) {
        <div class="pdf-overlay" (click)="cerrarPdfPopup()">
          <div class="pdf-modal" (click)="$event.stopPropagation()">
            <div class="pdf-modal-header">
              <h3>{{ pdfPopupTitulo }}</h3>
              <div class="pdf-modal-actions">
                <button class="btn-secondary btn-sm" (click)="imprimirPdf()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                  Imprimir
                </button>
                <button class="btn-icon-close" (click)="cerrarPdfPopup()">✕</button>
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
    .manual-link-row { display:flex; justify-content:flex-end; margin:0 0 8px; }
    .manual-link-row a { display:inline-flex; align-items:center; padding:7px 11px; border:1px solid #f1c49e; border-radius:8px; color:#a4510d; background:#fffaf5; font-size:11px; font-weight:700; text-decoration:none; }
    .manual-link-row a:hover { background:#fff0e2; }

    /* ===== TABS ===== */
    .tab-bar {
      display: flex; gap: 4px; margin-bottom: 16px;
      background: var(--hover-bg, #f1f5f9); padding: 4px; border-radius: 10px;
    }
    .tab {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 10px 20px; border: none; border-radius: 8px;
      background: transparent; color: var(--text-secondary, #64748b); font-size: 13px; font-weight: 600;
      cursor: pointer; font-family: inherit; transition: all .15s;
    }
    .tab:hover { color: var(--text-primary, #14213d); }
    .tab.active { background: var(--card-bg, #fff); color: var(--text-primary, #14213d); box-shadow: 0 1px 3px rgba(0,0,0,.08); }

    /* ===== FILTER BAR ===== */
    .filter-bar {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      background: var(--card-bg, #fff); border: 1px solid var(--border, #e5e7eb); border-radius: 12px;
      padding: 14px 18px; margin-bottom: 16px; flex-wrap: wrap;
    }
    .filter-left { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
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
    .input-sm { width: 100px; }
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

    /* ===== LOADING ===== */
    .loading-box {
      display: flex; align-items: center; justify-content: center; gap: 12px;
      padding: 60px 0; color: var(--text-secondary, #64748b); font-size: 14px;
    }

    /* ===== TABLE ===== */
    .table-wrapper {
      background: var(--card-bg, #fff); border: 1px solid var(--border, #e5e7eb); border-radius: 12px; overflow-x: auto;
    }
    .table-search {
      display: flex; align-items: center; gap: 8px; padding: 12px 16px;
      border-bottom: 1px solid var(--border-light, #f1f5f9);
    }
    .table-search svg { color: var(--text-muted, #94a3b8); flex-shrink: 0; }
    .search-input {
      flex: 1; border: none; outline: none; font-size: 13px; color: var(--text-primary, #1e293b);
      font-family: inherit; background: transparent;
    }
    .data-table { width: 100%; min-width: 1450px; table-layout: fixed; border-collapse: collapse; font-size: 13px; }
    .data-table thead { background: var(--hover-bg, #f8fafc); }
    .data-table th {
      padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 700;
      color: var(--text-secondary, #64748b); text-transform: uppercase; letter-spacing: .04em;
      border-bottom: 1px solid var(--border, #e5e7eb); white-space: normal; line-height: 1.15;
    }
    .data-table td {
      padding: 10px 12px; border-bottom: 1px solid var(--border-light, #f1f5f9); color: var(--text-primary, #334155);
    }
    .data-table th:nth-child(8), .data-table td:nth-child(8) { width: 6%; }
    .data-table th:nth-child(9), .data-table td:nth-child(9) { width: 6%; }
    .data-table th:nth-child(10), .data-table td:nth-child(10) { width: 7%; }
    .data-table th:nth-child(11), .data-table td:nth-child(11) { width: 7%; }
    .data-table th:nth-child(12), .data-table td:nth-child(12) { width: 5%; }
    .data-table th:nth-child(13), .data-table td:nth-child(13) { width: 7%; }
    .data-table th:nth-child(14), .data-table td:nth-child(14) { width: 6%; }
    .data-table th:nth-child(15), .data-table td:nth-child(15) { width: 7%; }
    .data-table th:nth-child(7), .data-table td:nth-child(7) { width: 54px; padding-left: 4px; padding-right: 4px; }
    .data-table th:nth-child(8), .data-table td:nth-child(8) { width: 92px; padding-left: 4px; padding-right: 4px; }
    .data-table th:nth-child(2), .data-table td:nth-child(2) { width: 70px; padding-left: 6px; padding-right: 6px; }
    .data-table th:nth-child(3), .data-table td:nth-child(3) { width: 110px; padding-left: 6px; padding-right: 6px; }
    .data-table th:nth-child(6), .data-table td:nth-child(6) { width: 100px; padding-left: 6px; padding-right: 6px; }
    .data-table tbody tr { transition: background .15s ease, box-shadow .15s ease; }
    .remesas-table tbody tr { cursor: pointer; }
    .remesas-table tbody tr:hover { background: #fff7ed; box-shadow: inset 3px 0 0 #f58634; }
    .remesas-table tbody tr.selected { background: #fff7ed; box-shadow: inset 3px 0 0 #f58634; }
    .th-num, .td-num { text-align: center; font-variant-numeric: tabular-nums; }
    .data-table td.td-num { white-space: nowrap; padding-left: 5px; padding-right: 5px; }
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
    .pago-icon { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 7px; }
    .pago-icon.deposito { background: #e0f2fe; color: #0369a1; }
    .pago-icon.efectivo { background: #dcfce7; color: #15803d; }
    .estado-badge {
      display: inline-block; padding: 3px 8px; border-radius: 5px;
      font-size: 10px; font-weight: 800; letter-spacing: .03em;
    }
    .estado-badge.pendiente { background: var(--warning-bg, #fef3c7); color: var(--warning-text, #92400e); }
    .estado-badge.pagado { background: var(--success-bg, #dcfce7); color: var(--success-text, #15803d); }
    .estado-badge.devuelto { background: var(--info-bg, #e0f2fe); color: var(--info-text, #0369a1); }
    .estado-badge.anulado { background: var(--error-bg, #fee2e2); color: var(--error-text, #b91c1c); }
    .estado-badge.vigente { background: var(--success-bg, #dcfce7); color: var(--success-text, #15803d); }
    .estado-badge.aplicada { background: var(--info-bg, #e0f2fe); color: var(--info-text, #0369a1); }
    .estado-badge.expirada { background: var(--hover-bg, #f1f5f9); color: var(--text-secondary, #64748b); }

    .btn-icon-pdf {
      width: 30px; height: 30px; background: var(--card-bg, #fff); color: #334155;
      border: 1px solid var(--border, #e2e8f0); border-radius: 7px; cursor: pointer;
      padding: 0; display: inline-flex; align-items: center; justify-content: center;
      transition: all .15s; vertical-align: middle;
    }
    .btn-icon-pdf:hover { background: #fef2f2; color: #dc2626; border-color: #fca5a5; transform: translateY(-1px); }
    .td-comprobantes { display: flex; align-items: center; justify-content: center; gap: 5px; text-align: center; white-space: nowrap; width: 146px; }
    .th-comprobantes { width: 146px; }
    .td-comprobantes .pago-icon { flex: 0 0 28px; }
    .btn-eye, .btn-print-sm {
      width: 30px; height: 30px; border: 1px solid var(--border, #e5e7eb); border-radius: 7px;
      background: var(--card-bg, #fff); color: var(--text-secondary, #64748b); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .btn-eye:hover { background: var(--hover-bg, #f8fafc); color: var(--text-primary, #14213d); border-color: #F58634; }
    .btn-print-sm:hover { background: var(--orange-bg, #fff8f0); color: #F58634; border-color: #F58634; }
    .btn-payment-proof {
      width: 30px; height: 30px; border: 1px solid var(--border, #e2e8f0); border-radius: 7px;
      background: var(--card-bg, #fff); color: #334155; cursor: pointer;
      display: flex; align-items: center; justify-content: center; transition: all .15s;
    }
    .btn-payment-proof:hover { background: #eff8ff; border-color: #7dd3fc; color: #0284c7; transform: translateY(-1px); }
    .btn-payment-proof.disabled {
      cursor: not-allowed; background: #f8fafc; border-color: #e2e8f0; color: #cbd5e1;
    }

    .btn-link {
      background: none; border: none; color: #F58634; font-weight: 700;
      cursor: pointer; font-size: 13px; text-decoration: underline;
    }
    .btn-link:hover { color: #e0740a; }
    .text-muted { color: var(--text-muted, #94a3b8); }

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
    .drawer-header.header-returned { border-left-color: #d14343; background: linear-gradient(110deg, #fff4f3 0%, #fff 75%); }
    .drawer-title-row { gap: 12px; min-width: 0; }
    .drawer-icon { width: 42px; height: 42px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 12px; color: #bd5b0b; background: #ffecd9; font-size: 23px; font-weight: 700; }
    .header-paid .drawer-icon { color: #147b4d; background: #dff5e9; }
    .header-returned .drawer-icon { color: #b42318; background: #fee4e2; }
    .drawer-heading-copy { display: flex; min-width: 0; flex-direction: column; gap: 4px; }
    .drawer-code { color: #8192aa; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .drawer-header-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .drawer-body { padding: 16px 20px 20px; }
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
    .drawer-section { padding: 15px 2px; border-bottom-color: #edf1f6; }
    .estado-badge.devuelto { background: var(--info-bg, #e0f2fe); color: var(--info-text, #0369a1); }
    .estado-badge.anulado { background: var(--error-bg, #fee2e2); color: var(--error-text, #b91c1c); }
    .btn-secondary {
      padding: 9px 18px; border: 1px solid var(--border, #d1d5db); border-radius: 8px;
      background: var(--card-bg, #fff); color: var(--text-primary, #334155); font-size: 13px; font-weight: 600;
      cursor: pointer; font-family: inherit;
    }
    .btn-secondary:hover { background: var(--hover-bg, #f8fafc); border-color: var(--text-muted, #94a3b8); }

    /* ===== SPINNER ===== */
    .spinner {
      width: 28px; height: 28px; border: 3px solid var(--border, #e5e7eb); border-top-color: #F58634;
      border-radius: 50%; animation: spin .7s linear infinite;
    }
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
      .data-table { font-size: 12px; }
      .td-cliente { max-width: 100px; }
      .drawer { width: 100%; }
      .route-section { grid-template-columns: 1fr; }
      .route-arrow { transform: rotate(90deg); }
      .detail-grid { grid-template-columns: 1fr; }
      .dg-item.span2 { grid-column: span 1; }
      .tab-bar { flex-direction: column; }
    }
  `],
})
export class HistorialRemesaComponent implements OnInit {
  private remesaSvc = inject(RemesaService);
  private snack = inject(MatSnackBar);

  tab: 'remesas' | 'cotizaciones' = 'remesas';

  // Remesas tab
  loadingRemesas = false;
  searchedRemesas = false;
  desde = '';
  hasta = '';
  filterEstado = '';
  filterCodigo = '';
  searchTerm = '';
  remesas: HistorialRemesaRecord[] = [];
  selectedId = 0;

  // Cotizaciones tab
  loadingCot = false;
  searchedCot = false;
  filterEstadoCot = '';
  cotizaciones: CotizacionRemesaRecord[] = [];

  // Comprobante modal
  comprobante: any = null;

  // PDF Popup
  showPdfPopup = false;
  pdfPopupUrl: SafeResourceUrl | null = null;
  pdfPopupTitulo = '';
  pdfPopupLoading = false;
  private pdfBlobUrl: string | null = null;
  private sanitizer = inject(DomSanitizer);


  get filteredRemesas(): HistorialRemesaRecord[] {
    if (!this.searchTerm.trim()) return this.remesas;
    const term = this.searchTerm.toLowerCase();
    return this.remesas.filter(r =>
      (r.remitente || '').toLowerCase().includes(term) ||
      (r.destinatario || '').toLowerCase().includes(term) ||
      (r.destino || '').toLowerCase().includes(term) ||
      (r.moneda || '').toLowerCase().includes(term) ||
      r.codigo.toString().includes(term)
    );
  }

  ngOnInit(): void {
    const today = new Date().toISOString().slice(0, 10);
    this.desde = today;
    this.hasta = today;
    this.buscarRemesas();
  }

  buscarRemesas(): void {
    if (!this.desde) return;
    this.loadingRemesas = true;
    this.searchedRemesas = true;

    const estado = this.filterEstado !== '' ? +this.filterEstado : undefined;
    const codigo = this.filterCodigo.trim() ? +this.filterCodigo.trim() : undefined;

    this.remesaSvc.historialRemesa(this.desde, this.hasta || undefined, estado, codigo).subscribe({
      next: (records) => {
        this.remesas = records;
        this.loadingRemesas = false;
      },
      error: (err) => {
        this.loadingRemesas = false;
        this.snack.open(err.message || 'Error al cargar historial', 'OK', { duration: 5000 });
      },
    });
  }

  switchTab(t: 'remesas' | 'cotizaciones'): void {
    this.tab = t;
    if (t === 'cotizaciones' && !this.searchedCot) {
      this.buscarCotizaciones();
    }
  }

  buscarCotizaciones(): void {
    this.loadingCot = true;
    this.searchedCot = true;
    const estado = this.filterEstadoCot || undefined;

    this.remesaSvc.cotizacionesRemesa(estado).subscribe({
      next: (records) => {
        this.cotizaciones = records;
        this.loadingCot = false;
      },
      error: (err) => {
        this.loadingCot = false;
        this.snack.open(err.message || 'Error al cargar cotizaciones', 'OK', { duration: 5000 });
      },
    });
  }

  verComprobante(id: number): void {
    this.remesaSvc.comprobanteRemesa(id).subscribe({
      next: (data) => this.comprobante = data,
      error: () => this.snack.open('Error al cargar comprobante', 'OK', { duration: 3000 }),
    });
  }

  abrirPdfPopup(tipo: 'comprobante' | 'factura' | 'comprobantePago', id: number): void {
    this.pdfPopupTitulo = tipo === 'comprobante'
      ? 'Comprobante de Envío'
      : tipo === 'factura' ? 'Factura de Comisión' : 'Comprobante de Pago';
    this.pdfPopupLoading = true;
    this.pdfPopupUrl = null;
    this.showPdfPopup = true;

    const obs = tipo === 'comprobante'
      ? this.remesaSvc.descargarComprobantePdf(id)
      : tipo === 'factura'
        ? this.remesaSvc.descargarFacturaPdf(id)
        : this.remesaSvc.descargarComprobantePagoPdf(id);

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
        const documento = tipo === 'comprobante' ? 'el comprobante de envío' : tipo === 'factura' ? 'la factura' : 'el comprobante de pago';
        this.snack.open(`Error al generar ${documento} PDF`, 'OK', { duration: 3000 });
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

  formatFechaHora(fecha: string): string {
    if (!fecha) return '';
    return fecha.substring(0, 16);
  }
}
