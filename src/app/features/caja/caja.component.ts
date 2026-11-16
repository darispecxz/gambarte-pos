import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CajeroService } from '../../core/cajero.service';
import { AuthService } from '../../core/auth.service';
import { CajaInfo, Denominacion, DenominacionInput } from '../../core/models';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';

interface PhysicalCaja {
  num_caja: string;
  id_agencia: number;
  agencia: string;
  agencia_abr: string;
  monedas: CajaInfo[];
}

interface DenomEntry {
  id_corte: number;
  valor: number;
  grupoLabel: string;
  grupoMultiplicador: number;
  grupoAgrupacionId: number;
  grupoCantidad: number;
  unidadAgrupacionId: number;
  unidadCantidad: number;
  subtotal: number;
}

interface TipoCorteSection {
  tipo: string;
  id_tipo_corte: number;
  grupoLabel: string;
  entries: DenomEntry[];
}

interface MonedaStep {
  caja: CajaInfo;
  sections: TipoCorteSection[];
  totalCalculado: number;
  totalConfirmado: number | null;
  isValid: boolean;
  visited: boolean;
  isExtra?: boolean;
}

interface MonedaSelection {
  caja: CajaInfo;
  selected: boolean;
  hasBoveda: boolean;
  disponible: number;
}

@Component({
  selector: 'app-caja',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule],
  template: `
    <!-- ==================== OVERVIEW MODE ==================== -->
    @if (mode === 'overview') {
      <div class="page-head">
        <div class="head-left">
          <h1>Punto de Venta</h1>
          <p class="date">{{ agenciaDesc }} — {{ hoy }}</p>
        </div>
        <div class="head-actions">
          <button class="manual-trigger" type="button" (click)="irAlManualApertura()" aria-label="Abrir manual de apertura de cajas">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
            Manual de apertura
          </button>
          <button class="manual-trigger" type="button" (click)="irAlManualCierre()" aria-label="Abrir manual de cierre de cajas">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
            Manual de cierre
          </button>
          <div class="head-stats" *ngIf="!loading && cajas.length">
            <div class="hstat">
              <span class="hstat-v">{{ totalMonedas }}</span>
              <span class="hstat-l">Monedas</span>
            </div>
            <div class="hstat-sep"></div>
            <div class="hstat">
              <span class="hstat-v color-green">{{ totalAbiertas }}</span>
              <span class="hstat-l">Abiertas</span>
            </div>
            <div class="hstat-sep"></div>
            <div class="hstat">
              <span class="hstat-v color-amber">{{ totalPendientes }}</span>
              <span class="hstat-l">Sin abrir</span>
            </div>
          </div>
        </div>
      </div>

      @if (loading) {
        <div class="loader-wrap">
          <div class="loader"></div>
          <span class="loader-text">Cargando cajas...</span>
        </div>
      }

      @if (!loading && physicalCajas.length === 0) {
        <div class="empty-state">
          <div class="empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
          </div>
          <h3>Sin cajas asignadas</h3>
          <p>No se encontraron cajas para su usuario en {{ agenciaDesc }}.</p>
        </div>
      }

      @if (!loading && bovedaCerrada) {
        <div class="boveda-warn-banner">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div class="bwb-text">
            <strong>Boveda no abierta</strong>
            <span>La boveda de la agencia no ha sido abierta para hoy. No se pueden realizar aperturas de caja.</span>
          </div>
        </div>
      }

      @for (pc of physicalCajas; track pc.num_caja + '_' + pc.id_agencia) {
        <div class="caja-panel">
          <div class="caja-panel-head">
            <div class="cph-left">
              <div class="cph-badge">{{ pc.num_caja }}</div>
              <div class="cph-info">
                <span class="cph-title">Caja {{ pc.num_caja }}</span>
                <span class="cph-sub">{{ pc.agencia }}</span>
              </div>
            </div>
            <div class="cph-actions">
              @if (canOpen(pc)) {
                <button class="btn btn-primary" (click)="startApertura(pc)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                  Abrir Caja
                </button>
              }
              @if (canClose(pc)) {
                <button class="btn btn-navy" (click)="startCierre(pc)">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  Cerrar Caja
                </button>
              }
            </div>
          </div>

          <div class="moneda-table-wrap">
            <table class="moneda-table">
              <thead>
                <tr>
                  <th>Moneda</th>
                  <th>Estado</th>
                  <th class="col-right">Saldo</th>
                  <th class="col-right hide-sm">Rango</th>
                  <th class="hide-sm">Apertura</th>
                  <th class="hide-sm">Cierre</th>
                </tr>
              </thead>
              <tbody>
                @for (m of pc.monedas; track m.id_caja) {
                  <tr [class.row-open]="m.sesion_hoy?.estado === 'abierta'">
                    <td>
                      <div class="mon-cell">
                        <img class="mon-flag" [src]="flagUrl(m.moneda)" [alt]="m.moneda" width="28" height="21">
                        <span class="mon-code">{{ m.moneda }}</span>
                        <span class="mon-name hide-sm">{{ m.moneda_desc }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="status-badge" [class]="statusClass(m)">
                        <span class="status-dot"></span>
                        {{ estadoLabel(m) }}
                      </span>
                    </td>
                    <td class="col-right">
                      <span class="saldo-num" [class.saldo-warn]="isSaldoWarning(m)">{{ m.saldo_actual | number:'1.2-2' }}</span>
                    </td>
                    <td class="col-right hide-sm">
                      <span class="range-text">{{ m.minimo | number:'1.0-0' }} — {{ m.maximo | number:'1.0-0' }}</span>
                    </td>
                    <td class="hide-sm">
                      @if (m.sesion_hoy?.hora_apertura) {
                        <span class="time-text">{{ formatTime($any(m.sesion_hoy).hora_apertura) }}</span>
                      } @else {
                        <span class="na-text">—</span>
                      }
                    </td>
                    <td class="hide-sm">
                      @if (m.sesion_hoy?.hora_cierre) {
                        <span class="time-text">{{ formatTime($any(m.sesion_hoy).hora_cierre) }}</span>
                      } @else {
                        <span class="na-text">—</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    }

    <!-- ==================== CIERRE SELECTION MODE ==================== -->
    @if (mode === 'cierre-select') {
      <div class="stepper-head">
        <button class="back-link" (click)="cancelStepper()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Volver
        </button>
        <h1 class="stepper-title">
          CIERRE DE CAJA
          <span class="stepper-title-badge">{{ activeCaja!.num_caja }}</span>
          — {{ activeCaja!.agencia }}
        </h1>
        <p class="stepper-subtitle">Las cajas abiertas se cerrarán obligatoriamente. Puede agregar monedas que recibió durante la jornada.</p>
      </div>

      <div class="selection-panel">
        @if (cierreMandatory.length > 0) {
          <div class="sel-section-head">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            Cajas Abiertas — Cierre Obligatorio
          </div>
          <div class="sel-chips">
            @for (m of cierreMandatory; track m.id_caja) {
              <div class="cierre-chip cierre-mandatory">
                <span class="chip-code">{{ m.moneda }}</span>
                <span class="chip-desc">{{ m.moneda_desc }}</span>
                <span class="chip-tag">Obligatorio</span>
              </div>
            }
          </div>
        }

        @if (cierreExtras.length > 0) {
          <div class="sel-section-head sel-section-extra">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v8"/><path d="M8 12h8"/></svg>
            Monedas Recibidas Durante la Jornada (Opcional)
          </div>
          <div class="sel-table-wrap">
            <table class="sel-table">
              <thead>
                <tr>
                  <th class="sel-th-check"></th>
                  <th>Moneda</th>
                  <th>Descripción</th>
                </tr>
              </thead>
              <tbody>
                @for (sel of cierreExtraSelections; track sel.caja.id_caja) {
                  <tr [class.sel-row-selected]="sel.selected">
                    <td class="sel-check-cell">
                      <label class="custom-check">
                        <input type="checkbox" [(ngModel)]="sel.selected">
                        <span class="check-box">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        </span>
                      </label>
                    </td>
                    <td>
                      <div class="mon-cell">
                        <span class="mon-code">{{ sel.caja.moneda }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="mon-name">{{ sel.caja.moneda_desc }}</span>
                      <span class="extra-note">Se hará apertura(0) + cierre en una transacción</span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        <div class="sel-summary">
          <div class="sel-summary-left">
            <span class="sel-count">{{ cierreMandatory.length }} obligatorias + {{ cierreExtraSelectedCount }} extras seleccionadas</span>
          </div>
          <button class="btn btn-navy" (click)="confirmCierreSelection()">
            Continuar al Arqueo
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
    }

    <!-- ==================== STEPPER MODE ==================== -->
    @if (mode === 'apertura' || mode === 'cierre') {
      <div class="stepper-head">
        <button class="back-link" (click)="cancelStepper()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Volver
        </button>
        <h1 class="stepper-title">
          {{ mode === 'apertura' ? 'APERTURA' : 'CIERRE' }} DE CAJA
          <span class="stepper-title-badge">{{ activeCaja!.num_caja }}</span>
          — {{ activeCaja!.agencia }}
        </h1>
      </div>

      @if (loadingDenoms) {
        <div class="loader-wrap">
          <div class="loader"></div>
          <span class="loader-text">Cargando denominaciones...</span>
        </div>
      }

      @if (!loadingDenoms && steps.length > 0) {
        <div class="stepper-layout">
          <!-- LEFT NAV -->
          <div class="stepper-nav">
            @for (step of steps; track step.caja.id_caja; let i = $index) {
              <div class="step-item"
                   [class.step-active]="currentStep === i"
                   [class.step-valid]="step.isValid && step.visited"
                   [class.step-invalid]="!step.isValid && step.visited && currentStep !== i"
                   [class.step-extra]="step.isExtra"
                   (click)="goToStep(i)">
                <div class="step-connector" *ngIf="i < steps.length - 1"></div>
                <div class="step-number">{{ i + 1 }}</div>
                <div class="step-label">
                  <span class="step-code">{{ step.caja.moneda }}</span>
                  <span class="step-desc">{{ step.caja.moneda_desc }}</span>
                  @if (step.isExtra) {
                    <span class="step-extra-tag">extra</span>
                  }
                </div>
              </div>
            }
          </div>

          <!-- MAIN FORM -->
          <div class="step-form">
            @if (activeStep) {
              <div class="step-form-head">
                <span class="sfh-code">{{ activeStep.caja.moneda }}</span>
                <span class="sfh-name">{{ activeStep.caja.moneda_desc }}</span>
                @if (activeStep.isExtra) {
                  <span class="sfh-extra">Moneda extra — apertura(0) + cierre</span>
                }
                @if (mode === 'cierre' && !activeStep.isExtra && activeStep.caja.saldo_actual != null) {
                  <span class="sfh-expected">Saldo esperado: <strong>{{ activeStep.caja.saldo_actual | number:'1.2-2' }} {{ activeStep.caja.moneda }}</strong></span>
                }
              </div>

              @for (section of activeStep.sections; track section.id_tipo_corte) {
                <div class="denom-section">
                  <div class="ds-head">{{ section.tipo }}</div>
                  <div class="ds-table-wrap">
                    <table class="ds-table">
                      <thead>
                        <tr>
                          <th class="ds-th-valor">VALOR</th>
                          <th class="ds-th-input">{{ section.grupoLabel }}</th>
                          <th class="ds-th-input">UNIDAD</th>
                          <th class="ds-th-total">TOTAL [{{ activeStep.caja.moneda }}]</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (entry of section.entries; track entry.id_corte) {
                          <tr [class.has-value]="entry.subtotal > 0">
                            <td class="ds-valor">{{ entry.valor | number:'1.2-2' }}</td>
                            <td class="ds-input-cell">
                              <input type="number" min="0" class="denom-input"
                                     [value]="entry.grupoCantidad"
                                     (input)="onDenomInput($event, entry, 'grupo')"
                                     placeholder="0">
                            </td>
                            <td class="ds-input-cell">
                              <input type="number" min="0" class="denom-input"
                                     [value]="entry.unidadCantidad"
                                     (input)="onDenomInput($event, entry, 'unidad')"
                                     placeholder="0">
                            </td>
                            <td class="ds-subtotal" [class.ds-subtotal-active]="entry.subtotal > 0">
                              {{ entry.subtotal | number:'1.2-2' }}
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                </div>
              }

              <!-- TOTALS -->
              <div class="step-totals">
                <div class="st-row">
                  <span class="st-label">TOTAL {{ getSectionLabels() }} [{{ activeStep.caja.moneda }}]</span>
                  <span class="st-value">{{ activeStep.totalCalculado | number:'1.2-2' }}</span>
                </div>
                @if (mode === 'apertura' && activeStep.caja.boveda_disponible !== null && activeStep.totalCalculado > activeStep.caja.boveda_disponible) {
                  <div class="vault-limit-error" role="alert">
                    El monto supera el disponible en bóveda: {{ activeStep.caja.boveda_disponible | number:'1.2-2' }} {{ activeStep.caja.moneda }}.
                  </div>
                }
                <div class="st-row st-confirm">
                  <span class="st-label">Confirmar Monto [{{ activeStep.caja.moneda }}]</span>
                  <input type="text" inputmode="decimal" autocomplete="off" class="confirm-input"
                         [(ngModel)]="confirmInputValue"
                         (ngModelChange)="onConfirmInput($event)"
                         (blur)="formatConfirmInput()"
                         aria-label="Confirmar monto"
                         [class.confirm-match]="activeStep.isValid"
                         [class.confirm-mismatch]="activeStep.totalConfirmado !== null && !activeStep.isValid && activeStep.totalConfirmado !== activeStep.totalCalculado">
                </div>
                @if (mode === 'cierre' && !activeStep.isExtra && activeStep.caja.saldo_actual != null && activeStep.totalCalculado > 0) {
                  <div class="st-row st-diff">
                    <span class="st-label">Diferencia</span>
                    <span class="st-value" [class.diff-positive]="activeStep.totalCalculado - activeStep.caja.saldo_actual >= 0"
                          [class.diff-negative]="activeStep.totalCalculado - activeStep.caja.saldo_actual < 0">
                      {{ activeStep.totalCalculado - activeStep.caja.saldo_actual | number:'1.2-2' }}
                    </span>
                  </div>
                }
              </div>

              <!-- NAVIGATION -->
              <div class="step-nav">
                <button class="btn btn-outline" *ngIf="currentStep > 0" (click)="prevStep()">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                  Anterior
                </button>
                <div class="step-nav-spacer"></div>
                @if (currentStep < steps.length - 1) {
                  <button class="btn btn-primary" (click)="nextStep()" [disabled]="!activeStep.isValid">
                    Siguiente
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                }
                @if (currentStep === steps.length - 1) {
                  <button class="btn btn-submit" (click)="submitAll()" [disabled]="!allStepsValid || submitting">
                    @if (submitting) {
                      <div class="btn-spinner"></div>
                    }
                    {{ mode === 'apertura' ? 'Abrir Caja' : 'Cerrar Caja' }}
                  </button>
                }
              </div>
            }
          </div>
        </div>
      }
    }

  `,
  styles: [`
    :host { display: block; }

    /* ===== OVERVIEW ===== */
    .page-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
    }
    .page-head h1 { font-size: 20px; font-weight: 700; color: var(--text-primary, #14213d); margin: 0; letter-spacing: -0.3px; }
    .date { font-size: 13px; color: var(--text-muted, #8a97b5); margin: 2px 0 0; }
    .head-stats {
      display: flex; align-items: center; gap: 16px;
      background: var(--card-bg, #fff); border: 1px solid var(--border, #e2e5eb); border-radius: 10px; padding: 10px 18px;
    }
    .hstat { display: flex; flex-direction: column; align-items: center; gap: 1px; }
    .hstat-v { font-size: 18px; font-weight: 700; color: var(--text-primary, #14213d); font-variant-numeric: tabular-nums; }
    .hstat-l { font-size: 10px; color: var(--text-muted, #8a97b5); text-transform: uppercase; letter-spacing: .5px; font-weight: 600; }
    .hstat-sep { width: 1px; height: 28px; background: var(--border, #e2e5eb); }
    .color-green { color: #16a34a; }
    .color-amber { color: #d97706; }

    /* ===== BOVEDA WARNING ===== */
    .boveda-warn-banner {
      display: flex; align-items: flex-start; gap: 12px;
      background: #FEF3C7; border: 1px solid #FDE68A; border-radius: 10px;
      padding: 14px 18px; margin-bottom: 16px; color: #92400E;
    }
    .boveda-warn-banner svg { flex-shrink: 0; margin-top: 1px; }
    .bwb-text { display: flex; flex-direction: column; gap: 2px; }
    .bwb-text strong { font-size: 13px; font-weight: 700; }
    .bwb-text span { font-size: 12px; line-height: 1.4; }

    /* ===== CAJA PANEL ===== */
    .caja-panel {
      background: var(--card-bg, #fff); border: 1px solid var(--border, #e2e5eb); border-radius: 12px;
      overflow: hidden; margin-bottom: 16px;
    }
    .caja-panel-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; border-bottom: 1px solid var(--border-light, #f0f1f4); gap: 12px; flex-wrap: wrap;
    }
    .cph-left { display: flex; align-items: center; gap: 12px; }
    .cph-badge {
      background: #14213d; color: #fff; font-size: 13px; font-weight: 700;
      padding: 6px 14px; border-radius: 8px; font-variant-numeric: tabular-nums;
      font-family: 'JetBrains Mono', 'Menlo', monospace; letter-spacing: .03em;
    }
    .cph-info { display: flex; flex-direction: column; }
    .cph-title { font-size: 16px; font-weight: 700; color: var(--text-primary, #14213d); }
    .cph-sub { font-size: 12px; color: var(--text-muted, #8a97b5); }
    .cph-actions { display: flex; gap: 8px; flex-wrap: wrap; }

    /* ===== MONEDA TABLE ===== */
    .moneda-table-wrap { overflow-x: auto; }
    .moneda-table {
      width: 100%; border-collapse: collapse; font-size: 13px;
    }
    .moneda-table thead th {
      padding: 10px 16px; text-align: left; font-size: 10.5px;
      font-weight: 600; text-transform: uppercase; letter-spacing: .5px;
      color: var(--text-muted, #8a97b5); border-bottom: 1px solid var(--border, #e2e5eb); white-space: nowrap;
    }
    .moneda-table tbody td {
      padding: 12px 16px; border-bottom: 1px solid var(--border-light, #f5f5f7); vertical-align: middle;
    }
    .moneda-table tbody tr:last-child td { border-bottom: none; }
    .moneda-table tbody tr:hover { background: var(--hover-bg, #fafbfc); }
    .row-open { background: var(--hover-bg, #f8fdf9); }
    .col-right { text-align: right !important; }

    .mon-cell { display: flex; align-items: center; gap: 8px; }
    .mon-flag { display: block; width: 28px; height: 21px; flex: none; object-fit: cover; border-radius: 3px; box-shadow: 0 1px 3px rgba(0,0,0,.18); }
    .mon-code {
      font-weight: 700; font-size: 12px; background: var(--hover-bg, #f0f1f4);
      padding: 3px 8px; border-radius: 4px; letter-spacing: .04em;
      font-family: 'JetBrains Mono', 'Menlo', monospace;
    }
    .mon-name { font-size: 12px; color: var(--text-secondary, #5b6472); }

    .status-badge {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px;
    }
    .status-dot { width: 6px; height: 6px; border-radius: 50%; }
    .status-open { background: #DCFCE7; color: #166534; }
    .status-open .status-dot { background: #16a34a; }
    .status-closed { background: var(--hover-bg, #F3F4F6); color: var(--text-secondary, #6b7280); }
    .status-closed .status-dot { background: #9CA3AF; }
    .status-pending { background: #FEF3C7; color: #92400E; }
    .status-pending .status-dot { background: #d97706; }

    .saldo-num {
      font-family: 'JetBrains Mono', 'Menlo', monospace;
      font-weight: 600; font-size: 14px; color: var(--text-primary, #14213d);
      font-variant-numeric: tabular-nums;
    }
    .saldo-warn { color: #DC2626; }
    .range-text { font-size: 12px; color: var(--text-secondary, #6b7280); font-variant-numeric: tabular-nums; }
    .time-text { font-family: 'JetBrains Mono', 'Menlo', monospace; font-size: 12px; color: var(--text-secondary, #5b6472); }
    .na-text { color: var(--border, #d1d5db); }

    /* ===== SELECTION PANEL ===== */
    .selection-panel {
      background: var(--card-bg, #fff); border: 1px solid var(--border, #e2e5eb); border-radius: 12px;
      overflow: hidden;
    }
    .sel-section-head {
      display: flex; align-items: center; gap: 8px;
      padding: 14px 20px; font-size: 13px; font-weight: 700; color: var(--text-primary, #14213d);
      background: var(--hover-bg, #f8f9fb); border-bottom: 1px solid var(--border, #e2e5eb);
    }
    .sel-section-extra { border-top: 1px solid #e2e5eb; }
    .sel-chips {
      display: flex; flex-wrap: wrap; gap: 8px; padding: 16px 20px;
      border-bottom: 1px solid var(--border-light, #f0f1f4);
    }
    .cierre-chip {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 14px; border-radius: 8px; border: 1px solid var(--border, #e2e5eb);
      background: var(--hover-bg, #f8fdf9);
    }
    .cierre-mandatory { border-color: #bbf7d0; }
    .chip-code {
      font-weight: 700; font-size: 12px;
      font-family: 'JetBrains Mono', 'Menlo', monospace;
      color: var(--text-primary, #14213d);
    }
    .chip-desc { font-size: 12px; color: var(--text-secondary, #5b6472); }
    .chip-tag {
      font-size: 10px; font-weight: 600; text-transform: uppercase;
      color: #166534; background: #DCFCE7; padding: 2px 8px; border-radius: 10px;
    }

    .sel-table-wrap { overflow-x: auto; }
    .sel-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .sel-table thead th {
      padding: 10px 16px; text-align: left; font-size: 10.5px;
      font-weight: 600; text-transform: uppercase; letter-spacing: .5px;
      color: var(--text-muted, #8a97b5); border-bottom: 1px solid var(--border, #e2e5eb); white-space: nowrap;
    }
    .sel-table tbody td {
      padding: 12px 16px; border-bottom: 1px solid var(--border-light, #f5f5f7); vertical-align: middle;
    }
    .sel-table tbody tr:last-child td { border-bottom: none; }
    .sel-table tbody tr:hover { background: var(--hover-bg, #fafbfc); }
    .sel-row-selected { background: var(--orange-bg, #fffbf0); }
    .sel-row-disabled { opacity: .6; }
    .sel-th-check { width: 48px; }
    .sel-check-cell { width: 48px; text-align: center; }

    .extra-note {
      display: block; font-size: 11px; color: var(--text-muted, #8a97b5); margin-top: 2px;
    }

    /* Custom checkbox */
    .custom-check { display: inline-flex; cursor: pointer; }
    .custom-check input { display: none; }
    .check-box {
      width: 20px; height: 20px; border: 2px solid var(--border, #d1d5db); border-radius: 4px;
      display: flex; align-items: center; justify-content: center;
      transition: all .15s; background: var(--card-bg, #fff);
    }
    .check-box svg { opacity: 0; color: #fff; transition: opacity .15s; }
    .custom-check input:checked + .check-box {
      background: #F5820A; border-color: #F5820A;
    }
    .custom-check input:checked + .check-box svg { opacity: 1; }

    .boveda-badge {
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 20px;
    }
    .boveda-ok { background: #DCFCE7; color: #166534; }
    .boveda-ok .status-dot { background: #16a34a; }
    .boveda-empty { background: #FEF3C7; color: #92400E; }
    .boveda-empty .status-dot { background: #d97706; }
    .boveda-none { background: var(--hover-bg, #F3F4F6); color: var(--text-secondary, #6b7280); }
    .boveda-none .status-dot { background: #9CA3AF; }

    .sel-summary {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px; border-top: 1px solid #e2e5eb; background: var(--hover-bg, #f8f9fb);
      flex-wrap: wrap; gap: 12px;
    }
    .sel-summary-left { display: flex; flex-direction: column; gap: 2px; }
    .sel-count { font-size: 13px; font-weight: 600; color: var(--text-primary, #14213d); }
    .sel-note { font-size: 11px; color: var(--text-muted, #8a97b5); }

    /* ===== STEPPER HEAD ===== */
    .stepper-head { margin-bottom: 20px; }
    .stepper-subtitle {
      font-size: 13px; color: var(--text-secondary, #5b6472); margin: 8px 0 0; line-height: 1.5;
    }
    .back-link {
      display: inline-flex; align-items: center; gap: 4px;
      background: none; border: none; font-family: inherit; font-size: 13px;
      color: var(--text-muted, #8a97b5); cursor: pointer; padding: 4px 0; margin-bottom: 8px;
      transition: color .15s;
    }
    .back-link:hover { color: var(--text-primary, #14213d); }
    .stepper-title {
      font-size: 18px; font-weight: 700; color: var(--text-primary, #14213d); margin: 0;
      letter-spacing: .02em;
    }
    .stepper-title-badge {
      background: #F5820A; color: #fff; font-size: 14px;
      padding: 2px 10px; border-radius: 6px; margin: 0 4px;
      font-family: 'JetBrains Mono', 'Menlo', monospace;
    }

    /* ===== STEPPER LAYOUT ===== */
    .stepper-layout {
      display: flex; gap: 0; background: var(--card-bg, #fff);
      border: 1px solid var(--border, #e2e5eb); border-radius: 12px; overflow: hidden;
      min-height: 500px;
    }

    /* ===== LEFT NAV ===== */
    .stepper-nav {
      width: 180px; min-width: 180px; padding: 24px 16px;
      background: var(--hover-bg, #f8f9fb); border-right: 1px solid #e2e5eb;
      display: flex; flex-direction: column; gap: 0;
    }
    .step-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 8px; cursor: pointer; border-radius: 8px;
      position: relative; transition: background .15s;
    }
    .step-item:hover { background: var(--hover-bg, #eef0f4); }
    .step-connector {
      position: absolute; left: 23px; top: 38px;
      width: 2px; height: calc(100% - 10px); background: var(--border, #e2e5eb);
    }
    .step-active .step-connector { background: #F5820A; }
    .step-valid .step-connector { background: #16a34a; }
    .step-number {
      width: 30px; height: 30px; border-radius: 8px;
      background: var(--border, #e2e5eb); color: var(--text-secondary, #6b7280);
      font-size: 13px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; position: relative; z-index: 1;
      transition: background .15s, color .15s;
    }
    .step-active .step-number { background: #F5820A; color: #fff; }
    .step-valid .step-number { background: #16a34a; color: #fff; }
    .step-invalid .step-number { background: #F59E0B; color: #fff; }
    .step-label { display: flex; flex-direction: column; min-width: 0; }
    .step-code { font-weight: 700; font-size: 13px; color: var(--text-primary, #14213d); }
    .step-active .step-code { color: #F5820A; }
    .step-desc {
      font-size: 10px; color: var(--text-muted, #8a97b5); white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; max-width: 100px;
    }
    .step-extra-tag {
      font-size: 9px; font-weight: 700; text-transform: uppercase;
      color: #F5820A; letter-spacing: .05em;
    }

    /* ===== STEP FORM ===== */
    .step-form { flex: 1; padding: 24px 28px; overflow-y: auto; }

    .step-form-head {
      display: flex; align-items: center; gap: 10px; margin-bottom: 20px;
      padding-bottom: 14px; border-bottom: 2px solid var(--border, #e2e5eb); flex-wrap: wrap;
    }
    .sfh-code {
      background: #14213d; color: #fff; font-size: 14px; font-weight: 700;
      padding: 4px 12px; border-radius: 6px;
      font-family: 'JetBrains Mono', 'Menlo', monospace;
    }
    .sfh-name { font-size: 16px; font-weight: 600; color: var(--text-primary, #14213d); }
    .sfh-extra {
      margin-left: auto; font-size: 11px; color: var(--warning-text, #92400E);
      background: var(--warning-bg, #FEF3C7); border: 1px solid var(--warning-border, #FDE68A);
      padding: 4px 12px; border-radius: 6px; font-weight: 600;
    }
    .sfh-expected {
      margin-left: auto; font-size: 12px; color: var(--text-secondary, #5b6472);
      background: var(--info-bg, #f0f9ff); border: 1px solid var(--info-border, #bae6fd);
      padding: 4px 12px; border-radius: 6px;
    }
    .sfh-expected strong { color: var(--info-text, #0369a1); }

    /* ===== DENOMINATION SECTION ===== */
    .denom-section { margin-bottom: 20px; }
    .ds-head {
      font-size: 11px; font-weight: 700; text-transform: uppercase;
      letter-spacing: .08em; color: var(--text-muted, #8a97b5); padding: 6px 0; margin-bottom: 4px;
      border-bottom: 1px solid var(--border-light, #f0f1f4);
    }
    .ds-table-wrap { overflow-x: auto; }
    .ds-table { width: 100%; border-collapse: collapse; }
    .ds-table thead th {
      padding: 8px 10px; font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted, #8a97b5);
      border-bottom: 1px solid var(--border, #e2e5eb); white-space: nowrap;
    }
    .ds-th-valor { width: 80px; }
    .ds-th-input { width: 110px; text-align: center !important; }
    .ds-th-total { text-align: right !important; width: 140px; }

    .ds-table tbody td { padding: 4px 10px; border-bottom: 1px solid var(--border-light, #f5f5f7); }
    .ds-table tbody tr:last-child td { border-bottom: none; }
    .ds-table tbody tr.has-value { background: var(--orange-bg, #fffbf5); }

    .ds-valor {
      font-family: 'JetBrains Mono', 'Menlo', monospace;
      font-weight: 600; font-size: 14px; color: var(--text-primary, #14213d);
    }
    .ds-input-cell { text-align: center; }
    .denom-input {
      width: 72px; text-align: center; border: 1px solid var(--border, #e2e5eb);
      border-radius: 6px; padding: 6px 8px; font-size: 14px;
      font-family: 'JetBrains Mono', 'Menlo', monospace;
      color: var(--text-primary, #14213d); background: var(--card-bg, #fff); outline: none;
      transition: border-color .15s, box-shadow .15s;
      -moz-appearance: textfield;
    }
    .denom-input::-webkit-outer-spin-button,
    .denom-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .denom-input:focus {
      border-color: #F5820A; box-shadow: 0 0 0 3px rgba(245, 130, 10, 0.12);
    }
    .ds-subtotal {
      text-align: right; font-family: 'JetBrains Mono', 'Menlo', monospace;
      font-size: 13px; color: var(--text-muted, #9CA3AF); font-variant-numeric: tabular-nums;
    }
    .ds-subtotal-active { color: var(--text-primary, #14213d); font-weight: 600; }

    /* ===== QUICK ZERO ===== */
    .btn-zero {
      display: inline-flex; align-items: center; gap: 6px;
      background: var(--hover-bg, #f8f9fb); border: 1px dashed var(--border, #d1d5db); border-radius: 8px;
      padding: 10px 16px; font-size: 13px; font-weight: 500; color: var(--text-secondary, #6b7280);
      cursor: pointer; font-family: inherit; transition: background .15s, border-color .15s;
      margin-top: 16px;
    }
    .btn-zero:hover { background: var(--hover-bg, #f0f1f4); border-color: var(--text-muted, #9CA3AF); color: var(--text-primary, #374151); }

    /* ===== TOTALS ===== */
    .step-totals {
      background: var(--hover-bg, #f8f9fb); border: 1px solid var(--border, #e2e5eb); border-radius: 10px;
      padding: 16px 20px; margin-top: 20px;
    }
    .st-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 0; gap: 16px;
    }
    .st-row + .st-row { border-top: 1px solid var(--border-light, #eef0f3); }
    .st-label {
      font-size: 12px; font-weight: 600; text-transform: uppercase;
      letter-spacing: .04em; color: var(--text-secondary, #5b6472);
    }
    .st-value {
      font-family: 'JetBrains Mono', 'Menlo', monospace;
      font-size: 18px; font-weight: 700; color: var(--text-primary, #14213d);
      font-variant-numeric: tabular-nums;
    }
    .st-confirm .st-label { color: var(--text-primary, #14213d); }
    .confirm-input {
      width: 160px; text-align: right; border: 2px solid var(--border, #e2e5eb);
      border-radius: 8px; padding: 8px 14px; font-size: 16px;
      font-family: 'JetBrains Mono', 'Menlo', monospace;
      font-weight: 600; color: var(--text-primary, #14213d); background: var(--card-bg, #fff); outline: none;
      transition: border-color .15s, box-shadow .15s;
      -moz-appearance: textfield;
    }
    .confirm-input::-webkit-outer-spin-button,
    .confirm-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .confirm-input:focus {
      border-color: #F5820A; box-shadow: 0 0 0 3px rgba(245, 130, 10, 0.12);
    }
    .confirm-match { border-color: #16a34a !important; box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1) !important; }
    .confirm-mismatch { border-color: #DC2626 !important; box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1) !important; }

    .st-diff { padding-top: 10px; }
    .vault-limit-error {
      margin-top: 10px;
      padding: 10px 12px;
      border: 1px solid #fecaca;
      border-radius: 8px;
      background: #fef2f2;
      color: #b91c1c;
      font-size: 12px;
      font-weight: 700;
    }
    .diff-positive { color: #16a34a; }
    .diff-negative { color: #DC2626; }

    /* ===== STEP NAVIGATION ===== */
    .step-nav {
      display: flex; align-items: center; gap: 12px;
      margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e5eb;
    }
    .step-nav-spacer { flex: 1; }

    /* ===== BUTTONS ===== */
    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 10px 20px; border: none; border-radius: 8px;
      font-size: 13px; font-weight: 600; cursor: pointer;
      font-family: inherit; transition: background .15s, transform .1s, opacity .15s;
      white-space: nowrap;
    }
    .btn:active { transform: scale(.97); }
    .btn:disabled { opacity: .5; cursor: not-allowed; }
    .btn:disabled:active { transform: none; }

    .btn-primary { background: #F5820A; color: #fff; }
    .btn-primary:hover:not(:disabled) { background: #d9700a; }
    .btn-navy { background: #14213d; color: #fff; }
    .btn-navy:hover:not(:disabled) { background: #1b2d52; }
    .btn-outline {
      background: var(--card-bg, #fff); color: var(--text-secondary, #5b6472); border: 1px solid var(--border, #e2e5eb);
    }
    .btn-outline:hover:not(:disabled) { background: var(--hover-bg, #f8f9fb); color: var(--text-primary, #14213d); }
    .btn-submit {
      background: linear-gradient(135deg, #F5820A, #e06d00);
      color: #fff; padding: 12px 28px; font-size: 14px;
      box-shadow: 0 2px 8px rgba(245, 130, 10, 0.3);
    }
    .btn-submit:hover:not(:disabled) { box-shadow: 0 4px 12px rgba(245, 130, 10, 0.4); }

    .btn-spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,.3); border-top-color: #fff;
      border-radius: 50%; animation: spin .6s linear infinite;
    }

    /* ===== LOADER ===== */
    .loader-wrap { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 60px 0; }
    .loader {
      width: 28px; height: 28px;
      border: 3px solid var(--border, #e2e5eb); border-top-color: var(--text-primary, #14213d);
      border-radius: 50%; animation: spin .7s linear infinite;
    }
    .loader-text { font-size: 13px; color: var(--text-muted, #8a97b5); }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ===== EMPTY ===== */
    .empty-state { text-align: center; padding: 60px 20px; }
    .empty-icon {
      width: 64px; height: 64px; border-radius: 50%;
      background: var(--hover-bg, #f3f4f6); color: var(--text-muted, #9CA3AF);
      display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;
    }
    .empty-state h3 { font-size: 16px; font-weight: 600; color: var(--text-primary, #14213d); margin: 0 0 6px; }
    .empty-state p { font-size: 13px; color: var(--text-muted, #8a97b5); margin: 0; }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 768px) {
      .head-stats { display: none; }
      .hide-sm { display: none !important; }
      .stepper-layout { flex-direction: column; }
      .stepper-nav {
        width: 100%; min-width: 0; flex-direction: row;
        overflow-x: auto; border-right: none; border-bottom: 1px solid var(--border, #e2e5eb);
        padding: 12px; gap: 4px;
      }
      .step-item { flex-direction: column; padding: 8px 12px; min-width: 60px; text-align: center; }
      .step-connector { display: none; }
      .step-desc { display: none; }
      .step-form { padding: 16px; }
      .denom-input { width: 56px; font-size: 13px; padding: 5px 4px; }
      .confirm-input { width: 120px; font-size: 14px; }
    }
  `],
})
export class CajaComponent implements OnInit {
  private cajeroService = inject(CajeroService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  cajas: CajaInfo[] = [];
  physicalCajas: PhysicalCaja[] = [];
  loading = true;
  mode: 'overview' | 'cierre-select' | 'apertura' | 'cierre' = 'overview';
  hoy = new Date().toLocaleDateString('es-BO', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  agenciaDesc = this.authService.agencia?.descripcion ?? '';

  // Selection state
  cierreMandatory: CajaInfo[] = [];
  cierreExtras: CajaInfo[] = [];
  cierreExtraSelections: MonedaSelection[] = [];

  // Stepper state
  activeCaja: PhysicalCaja | null = null;
  steps: MonedaStep[] = [];
  currentStep = 0;
  loadingDenoms = false;
  submitting = false;
  confirmInputValue = '0.00';
  private allDenoms: Denominacion[] = [];
  private zeroAperturaCajas: CajaInfo[] = [];

  ngOnInit(): void {
    this.loadCajas();
  }

  irAlManualApertura(): void {
    this.router.navigate(['/manuales/apertura-cajas'], { queryParams: { tipo: 'apertura' } });
  }

  irAlManualCierre(): void {
    this.router.navigate(['/manuales/apertura-cajas'], { queryParams: { tipo: 'cierre' } });
  }

  loadCajas(): void {
    this.loading = true;
    this.cajeroService.misCajas().subscribe({
      next: cajas => {
        this.cajas = cajas;
        this.buildPhysicalCajas();
        this.loading = false;
      },
      error: err => {
        this.snack.open(err.message || 'Error al cargar cajas', 'OK', { duration: 5000 });
        this.loading = false;
      },
    });
  }

  private buildPhysicalCajas(): void {
    const map = new Map<string, PhysicalCaja>();
    for (const c of this.cajas) {
      const key = `${c.num_caja}_${c.id_agencia}`;
      let pc = map.get(key);
      if (!pc) {
        pc = {
          num_caja: String(c.num_caja),
          id_agencia: c.id_agencia,
          agencia: c.agencia,
          agencia_abr: c.agencia_abr,
          monedas: [],
        };
        map.set(key, pc);
      }
      pc.monedas.push(c);
    }
    this.physicalCajas = Array.from(map.values());
  }

  get totalMonedas(): number { return this.cajas.length; }
  get totalAbiertas(): number { return this.cajas.filter(c => c.sesion_hoy?.estado === 'abierta').length; }
  get totalPendientes(): number { return this.cajas.filter(c => c.sesion_hoy?.estado === 'sin_abrir').length; }

  canOpen(pc: PhysicalCaja): boolean {
    return pc.monedas.some(m => m.sesion_hoy?.estado === 'sin_abrir' && m.boveda_abierta);
  }

  canClose(pc: PhysicalCaja): boolean {
    return pc.monedas.some(m => m.sesion_hoy?.estado === 'abierta');
  }

  get bovedaCerrada(): boolean {
    return this.cajas.length > 0 && this.cajas.every(c => !c.boveda_abierta);
  }

  estadoLabel(caja: CajaInfo): string {
    switch (caja.sesion_hoy?.estado) {
      case 'abierta': return 'Abierta';
      case 'cerrada': return 'Cerrada';
      default: return 'Sin abrir';
    }
  }

  statusClass(caja: CajaInfo): string {
    switch (caja.sesion_hoy?.estado) {
      case 'abierta': return 'status-open';
      case 'cerrada': return 'status-closed';
      default: return 'status-pending';
    }
  }

  isSaldoWarning(caja: CajaInfo): boolean {
    if (caja.saldo_actual > caja.maximo) return true;
    if (caja.saldo_actual < caja.minimo && caja.sesion_hoy?.estado === 'abierta') return true;
    return false;
  }

  formatTime(dateStr: string): string {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  }

  // ===== APERTURA =====

  startApertura(pc: PhysicalCaja): void {
    this.activeCaja = pc;
    const sinAbrir = pc.monedas.filter(m => m.sesion_hoy?.estado === 'sin_abrir' && m.boveda_abierta);

    const withFunds = sinAbrir.filter(c => c.boveda_disponible !== null && c.boveda_disponible > 0);
    const withoutFunds = sinAbrir.filter(c => c.boveda_disponible === null || c.boveda_disponible <= 0);

    this.zeroAperturaCajas = withoutFunds;
    this.mode = 'apertura';
    this.initStepper(withFunds);
  }

  // ===== CIERRE SELECTION =====

  startCierre(pc: PhysicalCaja): void {
    this.activeCaja = pc;
    this.cierreMandatory = pc.monedas.filter(m => m.sesion_hoy?.estado === 'abierta');
    this.cierreExtras = pc.monedas.filter(m => m.sesion_hoy?.estado === 'sin_abrir');

    this.cierreExtraSelections = this.cierreExtras.map(caja => ({
      caja,
      selected: false,
      hasBoveda: caja.boveda_disponible !== null,
      disponible: caja.boveda_disponible ?? 0,
    }));

    if (this.cierreExtras.length === 0) {
      this.mode = 'cierre';
      this.initStepper(this.cierreMandatory);
    } else {
      this.mode = 'cierre-select';
    }
  }

  get cierreExtraSelectedCount(): number {
    return this.cierreExtraSelections.filter(s => s.selected).length;
  }

  confirmCierreSelection(): void {
    const extras = this.cierreExtraSelections.filter(s => s.selected).map(s => s.caja);
    const allTarget = [...this.cierreMandatory, ...extras];
    this.mode = 'cierre';
    this.initStepper(allTarget, extras);
  }

  // ===== STEPPER =====

  private initStepper(targetCajas: CajaInfo[], extraCajas: CajaInfo[] = []): void {
    this.currentStep = 0;
    this.steps = [];
    this.loadingDenoms = true;
    this.submitting = false;

    const extraIds = new Set(extraCajas.map(c => c.id_caja));

    this.cajeroService.denominaciones().subscribe({
      next: denoms => {
        this.allDenoms = denoms;
        this.steps = targetCajas.map(caja => {
          const step = this.buildStep(caja, denoms);
          if (extraIds.has(caja.id_caja)) {
            step.isExtra = true;
          }
          return step;
        });
        this.syncConfirmInputValue();
        this.loadingDenoms = false;
      },
      error: () => {
        this.snack.open('Error al cargar denominaciones', 'OK', { duration: 4000 });
        this.loadingDenoms = false;
      },
    });
  }

  private buildStep(caja: CajaInfo, allDenoms: Denominacion[]): MonedaStep {
    const monedaDenoms = allDenoms.filter(d => d.id_moneda === caja.id_moneda);

    const tipoMap = new Map<number, { tipo: string; id: number; denoms: Denominacion[] }>();
    for (const d of monedaDenoms) {
      if (!tipoMap.has(d.id_tipo_corte)) {
        tipoMap.set(d.id_tipo_corte, { tipo: '', id: d.id_tipo_corte, denoms: [] });
      }
      tipoMap.get(d.id_tipo_corte)!.denoms.push(d);
    }

    const sections: TipoCorteSection[] = [];
    for (const [, group] of tipoMap) {
      const corteMap = new Map<number, { valor: number; grupo?: Denominacion; unidad?: Denominacion }>();
      for (const d of group.denoms) {
        if (!corteMap.has(d.id_corte)) {
          corteMap.set(d.id_corte, { valor: d.valor });
        }
        const entry = corteMap.get(d.id_corte)!;
        if (d.agrupacion.toUpperCase() === 'UNIDAD') {
          entry.unidad = d;
        } else {
          entry.grupo = d;
          if (!group.tipo) group.tipo = this.getTipoCorteLabel(d);
        }
      }

      let grupoLabel = 'GRUPO';
      const entries: DenomEntry[] = [];
      for (const [id_corte, pair] of corteMap) {
        if (pair.grupo) grupoLabel = pair.grupo.agrupacion.toUpperCase();
        entries.push({
          id_corte,
          valor: pair.valor,
          grupoLabel: pair.grupo?.agrupacion ?? 'GRUPO',
          grupoMultiplicador: pair.grupo?.multiplicador ?? 1,
          grupoAgrupacionId: pair.grupo?.id_agrupacion ?? 0,
          grupoCantidad: 0,
          unidadAgrupacionId: pair.unidad?.id_agrupacion ?? 4,
          unidadCantidad: 0,
          subtotal: 0,
        });
      }

      entries.sort((a, b) => b.valor - a.valor);

      sections.push({
        tipo: group.tipo || 'DENOMINACIÓN',
        id_tipo_corte: group.id,
        grupoLabel,
        entries,
      });
    }

    // Cero es un monto válido si el cajero no registra denominaciones.
    // Así el flujo permite abrir/cerrar una caja con saldo cero sin exigir
    // que vuelva a escribir manualmente "0.00".
    return { caja, sections, totalCalculado: 0, totalConfirmado: 0, isValid: true, visited: false };
  }

  private getTipoCorteLabel(d: Denominacion): string {
    if (d.valor >= 1) return 'BILLETE';
    return 'MONEDA';
  }

  get activeStep(): MonedaStep | null {
    return this.steps[this.currentStep] ?? null;
  }

  get allStepsValid(): boolean {
    return this.steps.length > 0 && this.steps.every(s => s.isValid);
  }

  get confirmationRows(): { key: string; moneda: string; descripcion: string; monto: number }[] {
    const rows = this.steps.map(step => ({
      key: `step-${step.caja.id_caja}`,
      moneda: step.caja.moneda,
      descripcion: step.caja.moneda_desc,
      monto: step.totalCalculado,
    }));

    if (this.mode === 'apertura') {
      rows.push(...this.zeroAperturaCajas.map(caja => ({
        key: `zero-${caja.id_caja}`,
        moneda: caja.moneda,
        descripcion: caja.moneda_desc,
        monto: 0,
      })));
    }

    return rows;
  }

  goToStep(index: number): void {
    if (this.activeStep) this.activeStep.visited = true;
    this.currentStep = index;
    this.syncConfirmInputValue();
  }

  prevStep(): void {
    if (this.currentStep > 0) {
      if (this.activeStep) this.activeStep.visited = true;
      this.currentStep--;
      this.syncConfirmInputValue();
    }
  }

  nextStep(): void {
    if (this.activeStep) this.activeStep.visited = true;
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.syncConfirmInputValue();
    }
  }

  onDenomInput(event: Event, entry: DenomEntry, field: 'grupo' | 'unidad'): void {
    const val = Math.max(0, Math.floor(+(event.target as HTMLInputElement).value) || 0);
    if (field === 'grupo') entry.grupoCantidad = val;
    else entry.unidadCantidad = val;
    this.recalcEntry(entry);
    this.recalcStep();
  }

  private recalcEntry(entry: DenomEntry): void {
    entry.subtotal =
      (entry.grupoCantidad * entry.grupoMultiplicador * entry.valor) +
      (entry.unidadCantidad * entry.valor);
  }

  private recalcStep(): void {
    const step = this.activeStep;
    if (!step) return;
    step.totalCalculado = 0;
    for (const section of step.sections) {
      for (const entry of section.entries) {
        step.totalCalculado += entry.subtotal;
      }
    }
    step.totalCalculado = Math.round(step.totalCalculado * 100) / 100;
    this.validateStep(step);
  }

  onConfirmInput(value: string): void {
    const trimmed = value.trim();
    const val = trimmed === '' ? NaN : Number(trimmed.replace(/,/g, ''));
    if (this.activeStep) {
      this.activeStep.totalConfirmado = isNaN(val) ? null : Math.round(val * 100) / 100;
      this.validateStep(this.activeStep);
    }
  }

  formatConfirmInput(): void {
    const value = this.activeStep?.totalConfirmado;
    this.confirmInputValue = value == null ? '0.00' : this.formatAmount(value);
  }

  private syncConfirmInputValue(): void {
    this.confirmInputValue = this.activeStep?.totalConfirmado == null
      ? '0.00'
      : this.formatAmount(this.activeStep.totalConfirmado);
  }

  private formatAmount(value: number): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  private validateStep(step?: MonedaStep): void {
    const s = step ?? this.activeStep;
    if (!s) return;
    const disponibleBoveda = s.caja.boveda_disponible;
    const dentroDeBoveda = this.mode !== 'apertura'
      || s.isExtra
      || (disponibleBoveda !== null && s.totalCalculado <= disponibleBoveda + 0.0001);
    s.isValid = s.totalConfirmado !== null
      && s.totalConfirmado === s.totalCalculado
      && dentroDeBoveda;
  }

  markZero(): void {
    const step = this.activeStep;
    if (!step) return;
    for (const section of step.sections) {
      for (const entry of section.entries) {
        entry.grupoCantidad = 0;
        entry.unidadCantidad = 0;
        entry.subtotal = 0;
      }
    }
    step.totalCalculado = 0;
    step.totalConfirmado = 0;
    this.confirmInputValue = '0.00';
    step.isValid = true;
    step.visited = true;
  }

  getSectionLabels(): string {
    if (!this.activeStep) return '';
    return this.activeStep.sections.map(s => s.tipo).join(' + ');
  }

  cancelStepper(): void {
    this.mode = 'overview';
    this.steps = [];
    this.activeCaja = null;
    this.zeroAperturaCajas = [];
    this.cierreMandatory = [];
    this.cierreExtras = [];
    this.cierreExtraSelections = [];
  }

  private buildMontos(step: MonedaStep): DenominacionInput[] {
    const montos: DenominacionInput[] = [];
    for (const section of step.sections) {
      for (const entry of section.entries) {
        if (entry.grupoCantidad > 0) {
          montos.push({
            id_corte: entry.id_corte,
            id_tipo_corte: section.id_tipo_corte,
            id_agrupacion: entry.grupoAgrupacionId,
            valor: entry.valor,
            multiplicador: entry.grupoMultiplicador,
            cantidad: entry.grupoCantidad,
          });
        }
        if (entry.unidadCantidad > 0) {
          montos.push({
            id_corte: entry.id_corte,
            id_tipo_corte: section.id_tipo_corte,
            id_agrupacion: entry.unidadAgrupacionId,
            valor: entry.valor,
            multiplicador: 1,
            cantidad: entry.unidadCantidad,
          });
        }
      }
    }
    return montos;
  }

  private readonly paisMoneda: Record<string, string> = {
    USD: 'us', EUR: 'eu', BRL: 'br', ARS: 'ar', PEN: 'pe',
    CLP: 'cl', PYG: 'py', GBP: 'gb', JPY: 'jp', CAD: 'ca',
    MXN: 'mx', COP: 'co', UYU: 'uy', BOB: 'bo', CHF: 'ch',
    AUD: 'au', CNY: 'cn', KRW: 'kr', SEK: 'se', NOK: 'no',
    DKK: 'dk', NZD: 'nz', ZAR: 'za', INR: 'in', TWD: 'tw',
  };

  flagUrl(moneda: string): string {
    const code = this.paisMoneda[moneda.toUpperCase()] || '';
    return code ? `https://flagcdn.com/w40/${code}.png` : '';
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
    }[char] ?? char));
  }

  submitAll(): void {
    if (!this.allStepsValid || this.submitting) return;
    const action = this.mode === 'apertura' ? 'abrir' : 'cerrar';
    const rows = this.confirmationRows.map(row => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;text-align:left">
        <img src="${this.flagUrl(row.moneda)}" alt="${this.escapeHtml(row.moneda)}" width="36" height="24" style="width:36px;height:24px;object-fit:cover;flex:none;border-radius:4px;box-shadow:0 1px 3px rgba(15,23,42,.15)">
        <div style="min-width:0;flex:1">
          <div style="font-weight:800;color:#14213d;font-size:14px">${this.escapeHtml(row.moneda)}</div>
          <div style="color:#64748b;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${this.escapeHtml(row.descripcion)}</div>
        </div>
        <strong style="color:#14213d;font-family:monospace;font-size:14px;white-space:nowrap">${row.monto.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
      </div>`).join('');

    Swal.fire({
      title: '<span style="color:#14213d;font-size:24px;font-weight:800">Confirmar montos</span>',
      html: `
        <div style="margin:-2px 0 16px;text-align:left;padding:10px 12px;border-radius:10px;background:#fff7ed;border-left:4px solid #f5820a">
          <div style="color:#c2410c;font-size:11px;font-weight:800;letter-spacing:.08em">${action.toUpperCase()} CAJA</div>
          <div style="color:#64748b;font-size:13px;margin-top:4px">Revise los importes antes de confirmar la operación.</div>
        </div>
        <div style="display:grid;gap:8px">${rows}</div>`,
      width: 620,
      padding: '22px 24px 20px',
      background: '#ffffff',
      showCancelButton: true,
      confirmButtonText: `Confirmar y ${action}`,
      cancelButtonText: 'Volver al arqueo',
      reverseButtons: true,
      focusCancel: true,
      buttonsStyling: true,
      confirmButtonColor: '#f5820a',
      cancelButtonColor: '#64748b',
    }).then(result => {
      if (result.isConfirmed) this.confirmSubmit();
    });
  }

  confirmSubmit(): void {
    if (this.submitting) return;
    this.submitting = true;

    const calls: any[] = [];

    if (this.mode === 'apertura') {
      // Zero-apertura calls for unselected currencies
      for (const caja of this.zeroAperturaCajas) {
        calls.push(this.cajeroService.apertura(caja.id_caja, []));
      }
      // Stepper calls with actual montos
      for (const step of this.steps) {
        calls.push(this.cajeroService.apertura(step.caja.id_caja, this.buildMontos(step)));
      }
    } else {
      // Cierre: regular steps use cierre, extra steps use cierreConApertura
      for (const step of this.steps) {
        const montos = this.buildMontos(step);
        if (step.isExtra) {
          calls.push(this.cajeroService.cierreConApertura(step.caja.id_caja, montos));
        } else {
          calls.push(this.cajeroService.cierre(step.caja.id_caja, montos));
        }
      }
    }

    if (calls.length === 0) {
      this.snack.open('No hay operaciones para realizar', 'OK', { duration: 3000 });
      this.submitting = false;
      return;
    }

    forkJoin(calls).subscribe({
      next: () => {
        const label = this.mode === 'apertura' ? 'abierta' : 'cerrada';
        this.snack.open(`Caja ${label} correctamente`, 'OK', { duration: 4000 });
        this.mode = 'overview';
        this.steps = [];
        this.activeCaja = null;
        this.zeroAperturaCajas = [];
        this.submitting = false;
        this.loadCajas();
      },
      error: (err: any) => {
        this.snack.open(err.message || 'Error en la operación', 'OK', { duration: 5000 });
        this.submitting = false;
      },
    });
  }
}
