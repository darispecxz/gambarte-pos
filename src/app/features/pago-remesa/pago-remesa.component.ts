import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroupDirective, FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ErrorStateMatcher } from '@angular/material/core';
import { Subscription } from 'rxjs';
import { RemesaService, RemesaPendientePago, RemesaBusquedaPago, PreprocesoRemesaRecord } from '../../core/remesa.service';
import { CajeroService } from '../../core/cajero.service';
import { CambioService } from '../../core/cambio.service';
import { AuthService } from '../../core/auth.service';
import { CuentaBancariaCobro, Catalogos } from '../../core/models';
import Swal from 'sweetalert2';

interface DestinatarioParsed {
  nombre: string;
  banco: string;
  cuenta: string;
}

interface RemesaUnificada {
  codigo: number;
  remitente: string;
  destinatario: string;
  monto: number;
  moneda: string;
  fecha: string;
  origen: string;
  destino: string;
  tipo: 'pendiente' | 'en_proceso';
  cajero?: string;
  fechaInicio?: string;
  banco?: string;
  numCuenta?: string;
  agenciaPago?: string;
}

class ImmediateInvalidErrorMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, _form: FormGroupDirective | NgForm | null): boolean {
    return !!control?.invalid;
  }
}

@Component({
  selector: 'app-pago-remesa',
  standalone: true,
  imports: [CommonModule, FormsModule, MatSnackBarModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatButtonModule, MatCheckboxModule],
  template: `
    <div class="page" [class.detail-mode]="!!remesaBuscada">
      <!-- HEADER -->
      @if (!remesaBuscada) {
      <div class="header-strip">
        <div class="header-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        </div>
        <div class="header-text">
          <h1>{{ tipoPago === 1 ? 'Pago por Deposito' : 'Pago en Efectivo' }}</h1>
          <span>Pago de remesas Chile a Bolivia</span>
        </div>
      </div>
      }

      @if (loading) {
        <div class="loading-box"><div class="spinner"></div><span>Cargando...</span></div>
      }

      <!-- RESULTADO EXITOSO -->
      @if (!loading && pagoExitoso) {
        <div class="section-card">
          <div class="resultado-header">
            @if (pagoExitoso.preproceso) {
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <div>
                <h2>Deposito Registrado</h2>
                <p>Codigo: <strong>{{ pagoExitoso.codigo }}</strong> - Monto: <strong>{{ pagoExitoso.monto | number:'1.2-2' }} {{ pagoExitoso.moneda }}</strong></p>
                <p class="preproceso-info">Confirme cuando el deposito haya sido acreditado en la cuenta.</p>
              </div>
            } @else {
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <div>
                <h2>Remesa Pagada</h2>
                <p>Codigo: <strong>{{ pagoExitoso.codigo }}</strong> - Monto: <strong>{{ pagoExitoso.monto | number:'1.2-2' }} {{ pagoExitoso.moneda }}</strong></p>
                @if (pagoExitoso.chile_synced === false) {
                  <p class="sync-warning">La sincronizacion con Chile quedo pendiente. Se reintentara automaticamente.</p>
                }
              </div>
            }
          </div>
          <div class="resultado-actions">
            @if (pagoExitoso.preproceso) {
              <button class="btn primary" (click)="confirmarDeposito(pagoExitoso.codigo)" [disabled]="confirmandoPreproceso">
                @if (confirmandoPreproceso) { <div class="spinner sm"></div> Confirmando... } @else {
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                  Confirmar Deposito
                }
              </button>
              <button class="btn secondary" (click)="nuevoPago()">Confirmar despues</button>
            } @else {
              <button class="btn secondary" (click)="descargarComprobantePago()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Comprobante PDF
              </button>
              <button class="btn secondary" (click)="mostrarEmailDialog()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                Enviar por Email
              </button>
              <button class="btn primary" (click)="nuevoPago()">Nuevo Pago</button>
            }
          </div>

          @if (showEmailDialog) {
            <div class="email-dialog">
              <div class="form-row two">
                <mat-form-field appearance="outline" class="email-field">
                  <mat-label>Email del beneficiario</mat-label>
                  <mat-icon matPrefix>mail</mat-icon>
                  <input matInput type="email" [(ngModel)]="emailEnvio" name="emailEnvio" #emailControl="ngModel" email placeholder="correo@ejemplo.com" autocomplete="off" (keydown.enter)="enviarPorEmail()">
                  @if (emailControl.hasError('email') && (emailControl.dirty || emailControl.touched)) {
                    <mat-error>Ingresa un correo electrónico válido.</mat-error>
                  }
                </mat-form-field>
                <div class="field field-btn">
                  <button class="btn primary" [disabled]="!emailEnvio || emailControl.invalid || enviandoEmail" (click)="enviarPorEmail()">
                    @if (enviandoEmail) { <div class="spinner sm"></div> } @else { Enviar }
                  </button>
                </div>
              </div>
            </div>
          }

          @if (!pagoExitoso.preproceso) {
            <div class="upload-section">
              <h3 class="subsection-title">Boleta de Pago Firmada <span class="optional-tag">(opcional)</span></h3>
              @if (boletaSubida) {
                <div class="upload-done">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  <span>Comprobante subido correctamente</span>
                </div>
              } @else {
                <div class="upload-area" (click)="fileInputResult.click()" (dragover)="$event.preventDefault()" (drop)="onFileDrop($event)">
                  <input #fileInputResult type="file" accept="image/*,.pdf" hidden (change)="onFileSelect($event)">
                  @if (comprobanteFile) {
                    <div class="upload-preview">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                      <span>{{ comprobanteFile.name }}</span>
                      <button class="upload-remove" (click)="removeComprobante($event)">&#x2715;</button>
                    </div>
                  } @else {
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span class="upload-text">Haga clic o arrastre la boleta firmada</span>
                    <span class="upload-hint">JPG, PNG o PDF (max 5MB)</span>
                  }
                </div>
                @if (comprobanteFile) {
                  <div class="upload-actions">
                    <button class="btn primary" [disabled]="subiendoBoleta" (click)="subirBoleta()">
                      @if (subiendoBoleta) { <div class="spinner sm"></div> Subiendo... } @else {
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        Subir Comprobante
                      }
                    </button>
                  </div>
                }
              }
            </div>
          }
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

      @if (!loading && !pagoExitoso) {
        <!-- VISTA 1: LISTA UNIFICADA (sin remesa seleccionada) -->
        @if (!remesaBuscada) {

          <!-- FILTROS Y BUSQUEDA -->
          <div class="section-card">
            <div class="section-header">
              <h2 class="section-title">Remesas</h2>
              <div class="header-right">
                @if (tipoPago === 1 && pestanaDeposito === 'pendientes' && codigosSeleccionados.length > 0) {
                  <button mat-flat-button type="button" class="btn-lote" (click)="prepararLote()">
                    <mat-icon>playlist_add_check</mat-icon>Preparar {{ codigosSeleccionados.length }} depósito(s)
                  </button>
                }
              </div>
            </div>

            <!-- FILTROS -->
            <div class="filtros-row">
              <mat-form-field appearance="outline" class="filter-code">
                <mat-label>Código</mat-label><mat-icon matPrefix>tag</mat-icon>
                <input matInput type="number" min="1" name="filtroCodigo" [(ngModel)]="filtroCodigo" placeholder="Ej. 80672" (keydown.enter)="buscarRemesa()">
              </mat-form-field>
              <mat-form-field appearance="outline" class="filter-text">
                <mat-label>Remitente o beneficiario</mat-label><mat-icon matPrefix>person_search</mat-icon>
                <input matInput type="text" name="filtroTexto" [(ngModel)]="filtroTexto" placeholder="Escribe un nombre o código">
              </mat-form-field>
              <button mat-flat-button type="button" class="material-primary btn-buscar" [disabled]="buscando" (click)="buscarRemesa()">
                <mat-icon>{{ buscando ? 'hourglass_top' : 'search' }}</mat-icon>{{ buscando ? 'Buscando…' : 'Buscar' }}
              </button>
            </div>

            @if (tipoPago === 1) {
              <div class="deposit-tabs" role="tablist" aria-label="Estado de los depósitos">
                <button type="button" role="tab" [attr.aria-selected]="pestanaDeposito === 'pendientes'" [class.active]="pestanaDeposito === 'pendientes'" (click)="pestanaDeposito = 'pendientes'">
                  <mat-icon>playlist_add</mat-icon>
                  <span>Pendientes por preparar</span>
                </button>
                <button type="button" role="tab" [attr.aria-selected]="pestanaDeposito === 'proceso'" [class.active]="pestanaDeposito === 'proceso'" (click)="pestanaDeposito = 'proceso'">
                  <mat-icon>pending_actions</mat-icon>
                  <span>En proceso</span>
                </button>
              </div>
            }

            <!-- TABLA UNIFICADA -->
            @if (cargandoPendientes) {
              <div class="search-status"><div class="spinner sm"></div> Cargando...</div>
            }
            @if (!cargandoPendientes && remesasFiltradas.length === 0) {
              <div class="empty-state">No hay remesas que coincidan con los filtros</div>
            }
            @if (!cargandoPendientes && remesasFiltradas.length > 0) {
              <div class="table-wrapper">
                <table class="data-table compact">
                  <thead>
                    <tr>
                      @if (tipoPago === 1 && pestanaDeposito === 'pendientes') { <th class="th-select"><mat-checkbox [checked]="todasPendientesSeleccionadas" (click)="$event.stopPropagation()" (change)="toggleTodasPendientes($event.checked)" aria-label="Seleccionar todas"></mat-checkbox></th> }
                      <th class="th-center th-comprobantes"></th>
                      <th>Codigo</th>
                      <th>Estado</th>
                      <th>Remitente</th>
                      <th>Destinatario</th>
                      <th class="th-right">Monto</th>
                      <th class="th-center">Ruta</th>
                      <th>Fecha Envio</th>
                      @if (tipoPago === 1) {
                        <th>Banco / Cuenta</th>
                        <th>Cajero</th>
                        <th>Tiempo</th>
                      }
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (r of remesasFiltradas; track r.codigo) {
                      <tr [class.pp-highlight]="ppHighlightCodigo === r.codigo" [class.row-en-proceso]="r.tipo === 'en_proceso'" [class.row-seleccionada]="estaSeleccionada(r.codigo)">
                        @if (tipoPago === 1 && pestanaDeposito === 'pendientes') {
                          <td class="td-select">
                            @if (r.tipo === 'pendiente') {
                              <mat-checkbox [checked]="estaSeleccionada(r.codigo)" (click)="$event.stopPropagation()" (change)="togglePendiente(r.codigo, $event.checked)" [attr.aria-label]="'Seleccionar remesa ' + r.codigo"></mat-checkbox>
                            }
                          </td>
                        }
                        <td class="td-comprobantes">
                          <button class="btn-icon-pdf" title="Comprobante de envio" (click)="abrirComprobanteEnvio(r.codigo)">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                          </button>
                        </td>
                        <td><strong>{{ r.codigo }}</strong></td>
                        <td>
                          @if (r.tipo === 'pendiente') {
                            <span class="estado-chip pendiente">PENDIENTE</span>
                          } @else {
                            <span class="estado-chip en-proceso">EN PROCESO</span>
                          }
                        </td>
                        <td class="td-nombre">{{ r.remitente }}</td>
                        <td class="td-nombre">{{ parseDestinatario(r.destinatario).nombre }}</td>
                        <td class="td-monto">{{ r.monto | number:'1.2-2' }} {{ r.moneda }}</td>
                        <td class="td-ruta">{{ r.origen }} → {{ r.destino }}</td>
                        <td class="td-fecha">{{ formatFecha(r.fecha) }}</td>
                        @if (tipoPago === 1) {
                          <td class="td-banco">
                            @if (r.banco) {
                              <span class="banco-info">{{ r.banco }}</span>
                              <span class="cuenta-info">{{ r.numCuenta }}</span>
                            } @else if (parseDestinatario(r.destinatario).banco) {
                              <span class="banco-info">{{ parseDestinatario(r.destinatario).banco }}</span>
                              <span class="cuenta-info">{{ parseDestinatario(r.destinatario).cuenta }}</span>
                            } @else {
                              <span class="text-muted">-</span>
                            }
                          </td>
                          <td class="td-cajero">{{ r.cajero || '-' }}</td>
                          <td>
                            @if (r.fechaInicio) {
                              <span class="elapsed-badge">{{ tiempoTranscurrido(r.fechaInicio) }}</span>
                            } @else {
                              <span class="text-muted">-</span>
                            }
                          </td>
                        }
                        <td class="td-action">
                          @if (r.tipo === 'pendiente') {
                            <button mat-stroked-button type="button" class="btn-pagar" (click)="seleccionarPendiente(r)"><mat-icon>payments</mat-icon> Pagar</button>
                          } @else {
                            <button mat-stroked-button type="button" class="btn-confirm" (click)="confirmarDeposito(r.codigo)" [disabled]="confirmandoPreproceso">
                              @if (confirmandoPreproceso && confirmandoCodigo === r.codigo) {
                                <mat-icon>hourglass_top</mat-icon>
                              } @else {
                                <ng-container><mat-icon>task_alt</mat-icon> Confirmar</ng-container>
                              }
                            </button>
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </div>
        }

        <!-- VISTA 2: DETALLE + FORMULARIO DE PAGO (remesa seleccionada) -->
        @if (remesaBuscada) {
          <section class="section-card payment-operation-card">
            <div class="section-header operation-header">
              <h2 class="section-title">Datos de la Operación</h2>
              <div class="header-right">
                <span class="remesa-estado" [class.pendiente]="remesaBuscada.estado === 0" [class.pagado]="remesaBuscada.estado === 1" [class.devuelto]="remesaBuscada.estado === 2" [class.anulado]="remesaBuscada.estado === 5">
                  {{ remesaBuscada.estadoDesc }}
                </span>
                <button mat-stroked-button type="button" class="btn-back" (click)="volverALista()">
                  <mat-icon>chevron_left</mat-icon>Volver
                </button>
              </div>
            </div>

            @if (remesaBuscada.yaPagada) {
              <div class="estado-msg msg-pagada">
                <mat-icon>check_circle</mat-icon>
                <span>Esta remesa ya fue <strong>pagada</strong> el {{ remesaBuscada.fechaPago }}.</span>
              </div>
            } @else if (remesaBuscada.estado !== 0) {
              <div class="estado-msg msg-info">
                <mat-icon>info</mat-icon>
                <span>Esta remesa está <strong>{{ remesaBuscada.estadoDesc }}</strong> y no se puede pagar.</span>
              </div>
            } @else {
              <div class="operation-summary">
                <div class="remesa-route-participants">
                  <div class="route-participant origin">
                    <span class="route-person-icon"><mat-icon>person</mat-icon></span>
                    <div class="route-participant-copy">
                      <span class="route-role">Remitente</span>
                      <strong>{{ remesaBuscada.remitente }}</strong>
                      <small><span class="country-flag" role="img" aria-label="Bandera de Chile"><svg viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="20" fill="#fff"/><rect y="10" width="30" height="10" fill="#d52b1e"/><rect width="12" height="10" fill="#0039a6"/><polygon points="6,2.2 6.9,4.8 9.7,4.8 7.4,6.4 8.3,9 6,7.4 3.7,9 4.6,6.4 2.3,4.8 5.1,4.8" fill="#fff"/></svg></span><mat-icon>account_balance</mat-icon>{{ agenciaOrigenPago }}</small>
                    </div>
                  </div>
                  <span class="route-direction" aria-label="hacia"><mat-icon>east</mat-icon></span>
                  <div class="route-participant destination">
                    <span class="route-person-icon"><mat-icon>person</mat-icon></span>
                    <div class="route-participant-copy">
                      <span class="route-role">Destinatario</span>
                      <strong>{{ remesaBuscada.destinatario }}</strong>
                      @if (remesaBuscada.docDestinatario) { <small class="recipient-document">{{ remesaBuscada.docDestinatario }}</small> }
                      <small><span class="country-flag" role="img" aria-label="Bandera de Bolivia"><svg viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="6.67" fill="#d52b1e"/><rect y="6.67" width="30" height="6.66" fill="#f9e300"/><rect y="13.33" width="30" height="6.67" fill="#007934"/></svg></span><mat-icon>account_balance</mat-icon>{{ agenciaDestinoPago }}</small>
                    </div>
                  </div>
                </div>
              </div>

              <form class="pago-form" #formPago="ngForm" (ngSubmit)="confirmarPago()" novalidate>
                @if (tipoPago === 1) {
                  <h3 class="subsection-title">Cuenta Bancaria de Destino</h3>
                  @if (remesaBuscada.bancoDestinatario || remesaBuscada.cuentaDestinatario) {
                    <div class="beneficiary-account-fields">
                      <mat-form-field appearance="outline">
                        <mat-label>Banco del beneficiario</mat-label>
                        <mat-icon matPrefix>account_balance</mat-icon>
                        <input matInput [value]="remesaBuscada.bancoDestinatario || 'Banco no informado'" disabled>
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Número de cuenta</mat-label>
                        <mat-icon matPrefix>credit_card</mat-icon>
                        <input matInput [value]="remesaBuscada.cuentaDestinatario || 'No informado'" disabled>
                      </mat-form-field>
                    </div>
                  }
                  <div class="form-row material-form-row account-selection-row">
                    <mat-form-field appearance="outline">
                      <mat-label>Moneda de la cuenta</mat-label>
                      <mat-icon matPrefix>payments</mat-icon>
                      <mat-select [(ngModel)]="monedaCuentaSeleccionada" name="monedaCuenta" (selectionChange)="onMonedaCuentaChange()">
                        <mat-option [value]="2">BOB - Bolivianos</mat-option>
                        <mat-option [value]="1">USD - Dólares estadounidenses</mat-option>
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline" class="account-field">
                      <mat-label>Cuenta operativa de la agencia</mat-label><mat-icon matPrefix>account_balance</mat-icon>
                      <mat-select [(ngModel)]="cuentaSeleccionada" name="cuentaDestino" #cuentaDestino="ngModel" [errorStateMatcher]="errorActivoDesdeInicio" required>
                        <mat-option value="">Seleccione una cuenta</mat-option>
                        @for (cb of cuentasBancariasFiltradas; track cb.num_cuenta_bancaria) {
                          <mat-option [value]="cb.num_cuenta_bancaria">{{ cb.entidad_desc }} · {{ cb.num_cuenta_bancaria }} ({{ cb.moneda }})</mat-option>
                        }
                      </mat-select>
                      @if (cuentaDestino.invalid) { <mat-error>Selecciona la cuenta operativa para registrar el depósito.</mat-error> }
                      @if (!cuentasBancariasFiltradas.length) { <mat-hint>No hay cuentas bancarias activas en {{ monedaCuentaSeleccionada === 2 ? 'BOB' : 'USD' }} para esta agencia.</mat-hint> }
                    </mat-form-field>
                  </div>
                }

                <section class="operation-confirmation-summary" aria-label="Resumen de la operación">
                  <h3><mat-icon>summarize</mat-icon>Resumen de la operación</h3>
                  <div class="confirmation-summary-card">
                    <div class="confirmation-amount">
                      <span class="country-flag summary-country-flag" role="img" aria-label="Bandera de Bolivia"><svg viewBox="0 0 30 20" aria-hidden="true"><rect width="30" height="6.67" fill="#d52b1e"/><rect y="6.67" width="30" height="6.66" fill="#f9e300"/><rect y="13.33" width="30" height="6.67" fill="#007934"/></svg></span>
                      <div><strong>{{ remesaBuscada.monto | number:'1.2-2' }} {{ remesaBuscada.moneda }}</strong><small>El beneficiario recibe en Bolivia</small></div>
                      <span class="confirmation-code">Remesa #{{ remesaBuscada.codigo }}</span>
                    </div>
                    <div class="confirmation-detail">
                      <span>Beneficiario</span>
                      <strong>{{ remesaBuscada.destinatario }}</strong>
                    </div>
                    <div class="confirmation-detail">
                      <span>Forma de pago</span>
                      <strong>{{ tipoPago === 0 ? 'Efectivo por ventanilla' : 'Depósito bancario' }}</strong>
                    </div>
                    <div class="confirmation-detail">
                      <span>Fecha y hora de envío</span>
                      <strong>{{ formatFecha(remesaBuscada.fecha) }}</strong>
                    </div>
                    @if (tipoPago === 1) {
                      <div class="confirmation-detail">
                        <span>Banco del beneficiario</span>
                        <strong>{{ remesaBuscada.bancoDestinatario || 'No informado' }}</strong>
                      </div>
                      <div class="confirmation-detail">
                        <span>Número de cuenta del beneficiario</span>
                        <strong>{{ remesaBuscada.cuentaDestinatario || 'No informado' }}</strong>
                      </div>
                      <div class="confirmation-detail">
                        <span>Cuenta operativa de la agencia</span>
                        <strong>{{ cuentaDestinoActual?.entidad_desc || 'Selecciona una cuenta' }}</strong>
                      </div>
                      <div class="confirmation-detail">
                        <span>Número de cuenta operativa</span>
                        <strong>{{ cuentaDestinoActual?.num_cuenta_bancaria || '—' }}</strong>
                      </div>
                    }
                    <div class="confirmation-operation-total">
                      <span><mat-icon>flag</mat-icon>Total a entregar al beneficiario</span>
                      <strong>{{ remesaBuscada.monto | number:'1.2-2' }} <small>{{ remesaBuscada.moneda }}</small></strong>
                    </div>
                  </div>
                </section>

                <div class="section-actions">
                  <button mat-flat-button type="submit" class="material-primary btn-pago-full" [disabled]="pagando || formPago.invalid">
                    <mat-icon>{{ pagando ? 'hourglass_top' : (tipoPago === 0 ? 'payments' : 'account_balance') }}</mat-icon>
                    {{ pagando ? 'Procesando…' : (tipoPago === 0 ? 'Pagar en efectivo' : 'Registrar depósito') }}
                  </button>
                </div>
              </form>
            }
          </section>
        }
      }
    </div>
  `,
  styles: [`
    .page { max-width: 100%; margin: 0; padding: 36px 12px 18px; }
    .page.detail-mode { padding: 12px; }

    .header-strip {
      display: flex; align-items: center; gap: 14px; padding: 14px 18px;
      background: var(--card-bg, #fff); border-radius: 12px; margin-bottom: 16px;
      border: 1px solid var(--border, #e5e7eb); box-shadow: 0 1px 2px rgba(20, 33, 61, .025);
    }
    .header-icon { width: 44px; height: 44px; border-radius: 11px; display: flex; align-items: center; justify-content: center; background: #f58634; color: #fff; flex-shrink: 0; box-shadow: 0 3px 8px rgba(245, 134, 52, .2); }
    .header-text h1 { font-size: 1.2rem; font-weight: 700; margin: 0 0 2px; color: var(--text-primary, #14213d); letter-spacing: -.02em; }
    .header-text span { font-size: 0.82rem; color: var(--text-secondary, #718096); }

    .section-card { background: var(--card-bg, #fff); border-radius: 14px; padding: 20px; margin-bottom: 16px; border: 1px solid var(--border, #e5e7eb); box-shadow: 0 1px 3px rgba(20, 33, 61, .025); }
    .section-header { display: flex; justify-content: space-between; align-items: center; gap: 14px; margin-bottom: 16px; }
    .section-title { font-size: 1.05rem; font-weight: 700; margin: 0; color: var(--text-primary, #14213d); letter-spacing: -.01em; }
    .section-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
    .payment-operation-card { padding: 24px; }
    .operation-header { padding-bottom: 14px; border-bottom: 1px solid #e8edf3; margin-bottom: 20px; }

    .header-right { display: flex; align-items: center; gap: 12px; }
    .count-chip {
      display: inline-flex; align-items: center; justify-content: center;
      height: 26px; border-radius: 13px;
      font-size: 11px; font-weight: 700; padding: 0 11px; white-space: nowrap;
    }
    .count-chip.pendiente { background: #fef3c7; color: #92400e; }
    .count-chip.en-proceso { background: #dbeafe; color: #1e40af; }
    .btn-lote { display: inline-flex; align-items: center; gap: 5px; min-height: 34px; padding: 0 11px; border-radius: 8px; background: #f58634 !important; color: #fff !important; font-size: .74rem; font-weight: 700; }
    .btn-lote:hover { background: #df7020 !important; }
    .btn-lote mat-icon { width: 17px; height: 17px; font-size: 17px; }
    .deposit-tabs { display: flex; gap: 4px; margin: 2px 0 14px; padding: 4px; border: 1px solid #e1e8f1; border-radius: 10px; background: #f5f7fa; }
    .deposit-tabs button { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 38px; padding: 0 14px; border: 0; border-radius: 7px; background: transparent; color: #6c7d94; cursor: pointer; font-size: .76rem; font-weight: 700; transition: all .16s ease; }
    .deposit-tabs button:hover { color: #2b4668; background: #fff; }
    .deposit-tabs button.active { color: #9a4d00; background: #fff; box-shadow: 0 2px 6px rgba(20, 33, 61, .08); }
    .deposit-tabs button:nth-child(2).active { color: #1e5792; }
    .deposit-tabs mat-icon { width: 18px; height: 18px; font-size: 18px; }
    .deposit-tabs b { min-width: 21px; padding: 3px 6px; border-radius: 999px; background: #e7edf5; color: #526984; font-size: .66rem; }
    .deposit-tabs button.active:first-child b { background: #ffe4c7; color: #9a4d00; }
    .deposit-tabs button.active:nth-child(2) b { background: #dbeafe; color: #1e5792; }

    .filtros-row {
      display: flex; gap: 12px; margin: 2px 0 16px; align-items: center; flex-wrap: wrap;
    }
    .filtro-field { display: flex; }
    .filtro-field.grow { flex: 1; min-width: 160px; }
    .filtro-field input, .filtro-field select {
      width: 100%; padding: 7px 10px; border: 1px solid var(--border, #e5e5e5); border-radius: 6px;
      font-size: 0.82rem; background: var(--input-bg, #fff); color: var(--text, #1a1a1a);
      transition: border-color .15s;
    }
    .filtro-field input[type="number"] { width: 120px; }
    .filtro-field select { min-width: 130px; }
    .filtro-field input:focus, .filtro-field select:focus { border-color: #F58634; outline: none; }
    .btn-buscar {
      padding: 7px 14px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center;
      min-width: 40px; height: 36px;
    }
    .filtros-row .filter-code { width: 180px; margin-bottom: -1.25em; }
    .filtros-row .filter-text { flex: 1; min-width: 300px; margin-bottom: -1.25em; }
    .filtros-row .material-primary { background: #f58634 !important; color: #fff !important; }
    .filtros-row .material-primary:hover:not(:disabled), .material-primary:hover:not(:disabled) { background: #df7020 !important; }
    .filtros-row mat-icon { margin-right: 4px; }
    :host ::ng-deep .filtros-row .mat-mdc-form-field-infix,
    :host ::ng-deep .material-form-row .mat-mdc-form-field-infix { min-height: 48px; }

    .form-row { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
    .form-row.two > .field { flex: 1; min-width: 200px; }
    .form-row.three > .field { flex: 1; min-width: 150px; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field label { font-size: 0.75rem; font-weight: 600; color: var(--text-secondary, #666); text-transform: uppercase; letter-spacing: 0.3px; }
    .field input, .field select {
      padding: 8px 10px; border: 1px solid var(--border, #e5e5e5); border-radius: 6px;
      font-size: 0.85rem; background: var(--input-bg, #fff); color: var(--text, #1a1a1a); text-transform: uppercase;
      transition: border-color .15s;
    }
    .field input:focus, .field select:focus { border-color: #F58634; outline: none; }
    .field-btn { display: flex; align-items: flex-end; }

    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all .15s; }
    .btn.primary { background: #F58634; color: #fff; }
    .btn.primary:hover:not(:disabled) { background: #e0751f; }
    .btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-link { background: none; border: none; color: #F58634; font-weight: 600; cursor: pointer; font-size: 0.8rem; padding: 4px 0; display: inline-flex; align-items: center; gap: 4px; }
    .btn-back { display: inline-flex; align-items: center; gap: 2px; min-height: 40px; padding: 0 12px; border: 1px solid var(--border, #e5e5e5) !important; border-radius: 8px !important; background: #fff; cursor: pointer; font-size: 0.82rem; color: var(--text-secondary, #42536d) !important; }
    .btn-back:hover { border-color: #F58634; color: #F58634; }
    .btn-back mat-icon { width: 18px; height: 18px; font-size: 18px; }

    .btn-icon-pdf {
      background: transparent; border: 1px solid #e0e0e0; border-radius: 4px; cursor: pointer;
      padding: 2px 4px; display: inline-flex; align-items: center; justify-content: center;
      transition: all .15s; vertical-align: middle;
    }
    .btn-icon-pdf:hover { background: #fef2f2; border-color: #fca5a5; }
    .btn-pagar {
      min-height: 38px; padding: 0 14px; border-color: #e9a16e; border-radius: 8px; background: #fff;
      color: #a34d00; font-size: 0.78rem; font-weight: 700; cursor: pointer;
      transition: all .15s; white-space: nowrap;
    }
    .btn-pagar mat-icon, .btn-confirm mat-icon { width: 18px; height: 18px; font-size: 18px; margin-right: 4px; }
    .btn-pagar:hover { background: #fff7f0; border-color: #f58634; color: #9a4d00; }
    .btn-confirm {
      min-height: 38px; padding: 0 14px; background: #fff; color: #14733d; border: 1px solid #91d2ab; border-radius: 8px;
      font-size: 0.78rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 3px;
      transition: all .15s; white-space: nowrap;
    }
    .btn-confirm:hover:not(:disabled) { background: #f0fbf4; border-color: #32a263; }
    .btn-confirm:disabled { opacity: .5; cursor: not-allowed; }

    .search-status { display: flex; align-items: center; gap: 8px; padding: 10px; font-size: 0.85rem; color: var(--text-secondary, #666); }
    .loading-box { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 40px; font-size: 0.9rem; color: var(--text-secondary, #666); }
    .empty-state { text-align: center; padding: 20px; color: var(--text-secondary, #666); font-size: 0.85rem; }

    .spinner { width: 24px; height: 24px; border: 3px solid var(--border, #e5e5e5); border-top-color: #F58634; border-radius: 50%; animation: spin .6s linear infinite; }
    .spinner.sm { width: 16px; height: 16px; border-width: 2px; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .estado-chip {
      display: inline-block; padding: 2px 8px; border-radius: 10px;
      font-size: 0.62rem; font-weight: 700; letter-spacing: 0.3px; white-space: nowrap;
    }
    .estado-chip.pendiente { background: #fef3c7; color: #92400e; }
    .estado-chip.en-proceso { background: #dbeafe; color: #1e40af; }

    .td-nombre { max-width: 130px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .td-monto { white-space: nowrap; font-weight: 600; text-align: right; }
    .th-right { text-align: right !important; }
    .td-ruta { white-space: nowrap; text-align: center; }
    .td-fecha { white-space: nowrap; }
    .td-banco { max-width: 120px; }
    .td-comprobantes { text-align: center; white-space: nowrap; width: 30px; }
    .th-comprobantes { width: 30px; }
    .td-select, .th-select { width: 42px; padding-left: 5px !important; padding-right: 5px !important; text-align: center !important; }
    .td-action { white-space: nowrap; }
    .th-center { text-align: center !important; }
    .banco-info { display: block; font-weight: 600; color: var(--text, #1a1a1a); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cuenta-info { display: block; font-size: 0.65rem; color: var(--text-secondary, #666); white-space: nowrap; }
    .text-muted { color: var(--text-secondary, #999); }

    .elapsed-badge { font-size: 0.65rem; color: #92400e; background: #fef3c7; padding: 2px 6px; border-radius: 10px; font-weight: 600; white-space: nowrap; }
    .pp-highlight { background: #fffbeb; }
    .row-seleccionada td { background: #fff7ed; }
    .row-seleccionada td:first-child { border-left: 3px solid #f58634; padding-left: 3px; }
    .row-en-proceso td:first-child { border-left: 3px solid #3b82f6; padding-left: 3px; }
    .list-divider td { padding: 10px 12px !important; border-top: 1px solid #dbe4ef; border-bottom: 1px solid #dbe4ef !important; font-size: .72rem; font-weight: 800; letter-spacing: .025em; text-transform: uppercase; }
    .list-divider td > * { vertical-align: middle; }
    .list-divider mat-icon { width: 17px; height: 17px; margin-right: 7px; font-size: 17px; }
    .list-divider span { color: #304967; }
    .list-divider b { float: right; padding: 3px 8px; border-radius: 999px; font-size: .66rem; }
    .pending-divider td { background: #fff8ef; }
    .pending-divider mat-icon { color: #e87520; }
    .pending-divider b { color: #9a4d00; background: #ffe4c7; }
    .process-divider td { background: #f3f7ff; }
    .process-divider mat-icon { color: #3976ba; }
    .process-divider b { color: #1e5792; background: #dbeafe; }

    .table-wrapper { overflow-x: auto; border: 1px solid var(--border, #e5e7eb); border-radius: 10px; }
    .data-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.8rem; }
    .data-table.compact td, .data-table.compact th { padding: 10px 9px; }
    .data-table th { text-align: left; padding: 11px 9px; font-size: 0.66rem; font-weight: 700; color: #70819a; background: #f5f7fa; text-transform: uppercase; letter-spacing: .025em; border-bottom: 1px solid var(--border, #e2e8f0); white-space: nowrap; }
    .data-table th:first-child { border-top-left-radius: 9px; }
    .data-table th:last-child { border-top-right-radius: 9px; }
    .data-table td { padding: 10px 9px; border-bottom: 1px solid #edf1f5; color: var(--text-primary, #24334d); vertical-align: middle; }
    .data-table tbody tr:last-child td { border-bottom: 0; }
    .lote-confirm-content { text-align: left; color: #52647d; font-size: .85rem; }
    .lote-confirm-content p { margin: 0 0 12px; }
    .lote-confirm-list { max-height: 250px; overflow: auto; border: 1px solid #e3eaf2; border-radius: 8px; background: #f8fafc; }
    .lote-confirm-row { display: grid; grid-template-columns: 70px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 9px 11px; border-bottom: 1px solid #e8edf3; font-size: .77rem; }
    .lote-confirm-row:last-child { border-bottom: 0; }
    .lote-confirm-row strong { color: #f58634; }
    .lote-confirm-row span { overflow: hidden; color: #24334d; text-overflow: ellipsis; white-space: nowrap; }
    .lote-confirm-row b { color: #14213d; white-space: nowrap; }
    .lote-confirm-more { padding: 8px 11px; color: #7789a1; font-size: .75rem; }
    .lote-confirm-total { display: flex; justify-content: space-between; margin-top: 12px; padding: 11px 13px; border-radius: 8px; color: #9a4d00; background: #fff4e8; font-weight: 700; }
    .data-table tbody tr:hover { background: #fafbfd; }

    .detalle-layout { display: grid; grid-template-columns: minmax(0, 1.02fr) minmax(0, 1fr); gap: 18px; align-items: start; }
    .detalle-col-info { }
    .detalle-col-pago { }
    .detalle-col-info, .detalle-col-pago { min-width: 0; }

    .remesa-estado { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; }
    .remesa-estado.pendiente { background: var(--warning-bg, #fef3c7); color: var(--warning-text, #92400e); }
    .remesa-estado.pagado { background: var(--success-bg, #dcfce7); color: var(--success-text, #166534); }
    .remesa-estado.devuelto { background: var(--orange-bg, #fff7ed); color: #9a3412; }
    .remesa-estado.anulado { background: var(--error-bg, #fef2f2); color: var(--error-text, #991b1b); }

    .operation-summary { padding: 0 0 20px; margin-bottom: 20px; border-bottom: 1px solid #e8edf3; }
    .detalle-monto-bar {
      display: grid; grid-template-columns: 1.1fr .8fr 1fr 1fr; gap: 20px; margin-bottom: 16px;
      min-height: 92px; align-items: center; padding: 18px; background: #f5f7fa; border-radius: 10px; border: 1px solid #e2e8f0;
    }
    .monto-principal { display: flex; flex-direction: column; gap: 2px; }
    .monto-label { font-size: 0.7rem; color: var(--text-secondary, #666); text-transform: uppercase; letter-spacing: 0.3px; font-weight: 600; }
    .monto-valor { font-size: 1.7rem; font-weight: 800; color: #f5822a; letter-spacing: -.025em; }
    .monto-valor small { font-size: 0.9rem; font-weight: 600; }
    .monto-codigo { display: flex; flex-direction: column; gap: 2px; text-align: center; }
    .codigo-valor { font-size: 1.3rem; font-weight: 700; color: var(--text, #1a1a1a); }
    .monto-ruta { display: flex; flex-direction: column; gap: 2px; text-align: center; }
    .ruta-valor { font-size: 1rem; font-weight: 600; color: var(--text, #1a1a1a); white-space: nowrap; }
    .monto-fecha { display: flex; flex-direction: column; gap: 4px; text-align: right; }
    .fecha-valor { font-size: .9rem; font-weight: 700; color: var(--text-primary, #14213d); white-space: nowrap; }

    .remesa-route-participants { display: grid; grid-template-columns: minmax(0, 1fr) 44px minmax(0, 1fr); align-items: center; gap: 12px; }
    .route-participant { display: flex; align-items: flex-start; gap: 12px; min-width: 0; min-height: 90px; padding: 14px; border: 1px solid; border-radius: 10px; }
    .route-participant.origin { border-color: #cfe0ff; background: #f5f9ff; }
    .route-participant.destination { border-color: #c9e9dc; background: #f3fbf7; }
    .route-person-icon { display: grid; place-items: center; width: 38px; height: 38px; flex: 0 0 38px; border-radius: 9px; color: #2166ad; background: #e3efff; }
    .destination .route-person-icon { color: #14805e; background: #ddf4ea; }
    .route-person-icon mat-icon { width: 20px; height: 20px; font-size: 20px; }
    .route-participant-copy { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
    .route-role { color: #68809f; font-size: .68rem; font-weight: 700; letter-spacing: .035em; text-transform: uppercase; }
    .route-participant-copy strong { color: #172b49; font-size: .86rem; line-height: 1.35; }
    .route-participant-copy small { display: inline-flex; align-items: center; gap: 5px; color: #71829a; font-size: .72rem; line-height: 1.3; }
    .route-participant-copy small mat-icon { width: 15px; height: 15px; font-size: 15px; }
    .country-flag { display: inline-flex; flex: 0 0 24px; width: 24px; height: 16px; overflow: hidden; border: 1px solid rgba(30, 45, 65, .16); border-radius: 2px; box-shadow: 0 1px 2px rgba(20, 33, 61, .12); vertical-align: middle; }
    .country-flag svg { display: block; width: 100%; height: 100%; }
    .route-participant-copy .recipient-document { color: #8695aa; }
    .route-direction { display: grid; place-items: center; width: 40px; height: 40px; border: 1px solid #ffd0af; border-radius: 50%; background: #fff8f2; color: #e87520; }
    .route-direction mat-icon { width: 22px; height: 22px; font-size: 22px; }

    .detalle-meta { display: flex; gap: 20px; }
    .detalle-meta div { display: flex; flex-direction: column; gap: 4px; padding: 2px 0; }
    .detalle-meta span { font-size: 0.68rem; color: #71819a; text-transform: uppercase; letter-spacing: .035em; font-weight: 600; }
    .detalle-meta strong { font-size: 0.88rem; color: var(--text-primary, #14213d); }

    .pago-title { margin-bottom: 16px; }
    .pago-form { padding: 0; border: 0; border-radius: 0; background: transparent; }
    .material-form-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 4px; }
    .material-form-row mat-form-field { width: 100%; }
    .material-form-row.account-field, .account-field { width: 100%; }
    .material-form-row:has(.account-field) { grid-template-columns: minmax(0, 1fr); }
    .account-selection-row { grid-template-columns: minmax(220px, .65fr) minmax(0, 1.35fr) !important; }
    .pago-form .subsection-title { margin-top: 0; margin-bottom: 14px; color: #34445f; font-size: .86rem; letter-spacing: .01em; }
    .material-primary { background: #f58634 !important; color: #fff !important; min-height: 46px; border-radius: 8px !important; font-weight: 700; box-shadow: 0 2px 5px rgba(245, 134, 52, .2) !important; }
    .material-primary mat-icon { margin-right: 6px; }
    .operation-confirmation-summary { margin-top: 12px; padding: 16px; border: 1px solid #dce6f2; border-radius: 10px; background: #f8fafc; }
    .operation-confirmation-summary h3 { display: flex; align-items: center; gap: 8px; margin: 0 0 12px; color: #14213d; font-size: .92rem; font-weight: 700; }
    .operation-confirmation-summary h3 mat-icon { color: #52749e; }
    .confirmation-summary-card { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border: 1px solid #dce6f2; border-radius: 9px; background: #fff; overflow: hidden; }
    .confirmation-amount { grid-column: 1 / -1; display: flex; align-items: center; gap: 12px; min-width: 0; padding: 14px 16px; border-bottom: 1px solid #e8edf3; }
    .summary-country-flag { width: 30px; height: 20px; flex-basis: 30px; }
    .confirmation-amount div { display: flex; flex-direction: column; gap: 2px; }
    .confirmation-amount strong { color: #14213d; font-size: 1.12rem; font-weight: 800; white-space: nowrap; }
    .confirmation-amount small { color: #73839b; font-size: .73rem; }
    .confirmation-code { margin-left: auto; padding: 5px 9px; border-radius: 6px; color: #53749e; background: #f2f6fb; font-size: .72rem; font-weight: 700; white-space: nowrap; }
    .confirmation-detail { min-width: 0; padding: 11px 16px; border-bottom: 1px solid #edf1f5; }
    .confirmation-detail:nth-of-type(even) { border-left: 1px solid #edf1f5; }
    .confirmation-detail span { display: block; margin-bottom: 4px; color: #75849a; font-size: .68rem; font-weight: 700; letter-spacing: .035em; text-transform: uppercase; }
    .confirmation-detail strong { display: block; overflow: hidden; color: #1c2d49; font-size: .82rem; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
    .beneficiary-account-fields { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 1fr); gap: 14px; margin: -2px 0 14px; }
    .beneficiary-account-fields mat-form-field { width: 100%; }
    .beneficiary-account-fields input:disabled { color: #162b47; font-weight: 700; opacity: 1; }
    .confirmation-operation-total { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; background: #f7f6f3; }
    .confirmation-operation-total span { display: inline-flex; align-items: center; gap: 8px; color: #24334d; font-size: .78rem; font-weight: 700; }
    .confirmation-operation-total mat-icon { color: #62836d; font-size: 18px; width: 18px; height: 18px; }
    .confirmation-operation-total strong { color: #14213d; font-size: 1rem; font-weight: 800; white-space: nowrap; }
    .confirmation-operation-total small { font-size: .72rem; }

    .estado-msg {
      display: flex; align-items: center; gap: 12px;
      padding: 20px; border-radius: 10px; font-size: 0.9rem; margin-top: 20px;
    }
    .estado-msg.msg-pagada { background: #dcfce7; color: #166534; }
    .estado-msg.msg-info { background: #fef3c7; color: #92400e; }

    .subsection-title { font-size: 0.85rem; font-weight: 700; margin: 16px 0 10px; color: var(--text-secondary, #666); }
    .subsection-title:first-child { margin-top: 0; }

    .upload-area {
      border: 2px dashed var(--border, #d1d5db); border-radius: 10px; padding: 20px;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
      cursor: pointer; transition: all .2s; min-height: 80px; margin-bottom: 8px;
      background: var(--hover-bg, #f8fafc);
    }
    .upload-area:hover { border-color: #F58634; background: #fff8f0; }
    .upload-text { font-size: 0.85rem; color: var(--text-secondary, #666); }
    .upload-hint { font-size: 0.72rem; color: var(--text-muted, #999); }
    .upload-preview { display: flex; align-items: center; gap: 10px; }
    .upload-preview span { font-size: 0.85rem; color: var(--text, #1a1a1a); font-weight: 600; }
    .upload-remove {
      width: 24px; height: 24px; border-radius: 50%; border: 1px solid #e0e0e0; background: #fff;
      cursor: pointer; font-size: 12px; display: flex; align-items: center; justify-content: center;
      color: #666; transition: all .15s;
    }
    .upload-remove:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }
    .upload-section { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border, #e5e5e5); }
    .optional-tag { font-size: 0.75rem; font-weight: 400; color: var(--text-muted, #999); }
    .upload-actions { display: flex; justify-content: flex-end; margin-top: 10px; }
    .upload-done { display: flex; align-items: center; gap: 8px; padding: 12px 16px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; color: #15803d; font-size: 0.9rem; font-weight: 600; }

    .btn-pago-full { width: 280px; justify-content: center; padding: 12px 20px; font-size: 0.95rem; }

    @media (max-width: 1000px) {
      .detalle-monto-bar { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .monto-fecha { text-align: center; }
    }
    @media (max-width: 700px) {
      .payment-operation-card { padding: 16px; }
      .remesa-route-participants { grid-template-columns: 1fr; gap: 8px; }
      .route-direction { justify-self: center; transform: rotate(90deg); width: 34px; height: 34px; }
      .operation-header { align-items: flex-start; }
      .operation-header .header-right { flex-wrap: wrap; justify-content: flex-end; }
      .btn-pago-full { width: 100%; }
      .confirmation-summary-card { grid-template-columns: 1fr; }
      .confirmation-detail { border-left: 0 !important; }
      .beneficiary-account-fields { grid-template-columns: 1fr; gap: 0; }
      .confirmation-operation-total { align-items: flex-start; flex-direction: column; }
    }

    .resultado-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
    .resultado-header h2 { margin: 0; font-size: 1.2rem; color: var(--success-text, #16a34a); }
    .resultado-header p { margin: 2px 0 0; font-size: 0.9rem; color: var(--text-secondary, #666); }
    .resultado-actions { display: flex; gap: 10px; }
    .sync-warning { color: var(--warning-text, #92400e); font-size: 0.8rem; font-style: italic; }
    .btn.secondary { background: var(--hover-bg, #f5f5f5); color: var(--text, #1a1a1a); border: 1px solid var(--border, #e5e5e5); }
    .btn.secondary:hover { background: var(--border, #e5e5e5); }
    .email-dialog { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border, #e5e5e5); }
    .email-dialog .email-field { width: 100%; }
    .email-dialog input, .email-dialog .mat-mdc-input-element { text-transform: none !important; }
    .preproceso-info { color: #92400e; font-size: 0.85rem; margin-top: 4px; }

    .overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 100;
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
    .btn-secondary { display: inline-flex; align-items: center; gap: 4px; }
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

    @media (max-width: 600px) {
      .form-row.two > .field, .form-row.three > .field { min-width: 100%; }
      .material-form-row { grid-template-columns: 1fr; }
      .filtros-row .filter-code, .filtros-row .filter-text { width: 100%; min-width: 0; }
      .info-grid { grid-template-columns: 1fr 1fr; }
      .filtros-row { flex-direction: column; }
      .filtro-field input[type="number"] { width: 100%; }
    }
  `]
})
export class PagoRemesaComponent implements OnInit, OnDestroy {
  private remesaService = inject(RemesaService);
  private cajeroService = inject(CajeroService);
  private cambioService = inject(CambioService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);

  loading = true;
  cat: Catalogos = { tipos_documento: [], expediciones: [], monedas: [], sexos: [], estados_civiles: [], ocupaciones: [], actividades_economicas: [], paises: [], departamentos: [], ciudades: [], cargos: [] };

  // Busqueda y filtros
  filtroCodigo: number | null = null;
  filtroTexto = '';
  filtroEstado = '';
  buscando = false;
  remesaBuscada: RemesaBusquedaPago | null = null;
  pestanaDeposito: 'pendientes' | 'proceso' = 'pendientes';

  // Pendientes
  pendientes: RemesaPendientePago[] = [];
  cargandoPendientes = false;
  codigosSeleccionados: number[] = [];

  get remesasPendientesSeleccionadas(): RemesaPendientePago[] {
    const seleccionados = new Set(this.codigosSeleccionados);
    return this.pendientes.filter(r => seleccionados.has(r.codigo));
  }

  get todasPendientesSeleccionadas(): boolean {
    return this.pendientes.length > 0 && this.pendientes.every(r => this.codigosSeleccionados.includes(r.codigo));
  }

  get totalLoteSeleccionado(): number {
    return this.remesasPendientesSeleccionadas.reduce((total, r) => total + Number(r.monto || 0), 0);
  }

  get resumenLoteMonedas(): string {
    const totales = this.remesasPendientesSeleccionadas.reduce<Record<string, number>>((acc, r) => {
      const moneda = r.moneda || 'BOB';
      acc[moneda] = (acc[moneda] || 0) + Number(r.monto || 0);
      return acc;
    }, {});
    return Object.entries(totales)
      .map(([moneda, total]) => `${total.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${moneda}`)
      .join(' · ');
  }

  // Preprocesos (depositos en proceso)
  preprocesos: PreprocesoRemesaRecord[] = [];
  confirmandoPreproceso = false;
  confirmandoCodigo: number | null = null;
  ppHighlightCodigo: number | null = null;

  // Pago
  destDoc: { tipo: number; documento: string; expedicion: number | null } = { tipo: 1, documento: '', expedicion: null };
  tipoPago = 0;
  cuentasBancarias: CuentaBancariaCobro[] = [];
  monedaCuentaSeleccionada = 2;
  cuentaSeleccionada = '';
  pagando = false;
  pagoIntentado = false;
  readonly errorActivoDesdeInicio = new ImmediateInvalidErrorMatcher();
  pagoExitoso: any = null;
  showEmailDialog = false;
  emailEnvio = '';
  enviandoEmail = false;

  comprobanteFile: File | null = null;
  subiendoBoleta = false;
  boletaSubida = false;

  get cuentaDestinoActual(): CuentaBancariaCobro | undefined {
    return this.cuentasBancarias.find(c => c.num_cuenta_bancaria === this.cuentaSeleccionada);
  }

  get cuentasBancariasFiltradas(): CuentaBancariaCobro[] {
    return this.cuentasBancarias.filter(c => Number(c.id_moneda) === Number(this.monedaCuentaSeleccionada));
  }

  get agenciaOrigenPago(): string {
    const origen = this.remesaBuscada?.origen?.trim();
    return origen ? `Agencia ${origen}` : 'Agencia de origen';
  }

  get agenciaDestinoPago(): string {
    return this.auth.agencia?.descripcion || this.remesaBuscada?.destino || 'Agencia de destino';
  }

  get expedicionSeleccionada(): string {
    const expedicion = this.cat.expediciones.find(e => Number(e['id_expedicion']) === Number(this.destDoc.expedicion));
    return expedicion?.['descripcion'] || 'Sin expedición';
  }

  // PDF popup
  showPdfPopup = false;
  pdfPopupLoading = false;
  pdfPopupUrl: SafeResourceUrl | null = null;
  pdfPopupTitulo = 'Comprobante';
  private pdfBlobUrl: string | null = null;
  private qpSub!: Subscription;

  get remesasUnificadas(): RemesaUnificada[] {
    const lista: RemesaUnificada[] = [];

    if (this.tipoPago === 0 || this.tipoPago === 1) {
      for (const p of this.pendientes) {
        lista.push({
          codigo: p.codigo,
          remitente: p.remitente,
          destinatario: p.destinatario,
          monto: p.monto,
          moneda: p.moneda,
          fecha: p.fecha,
          origen: p.origen,
          destino: p.destino,
          tipo: 'pendiente',
        });
      }
    }

    if (this.tipoPago === 1) {
      for (const pp of this.preprocesos) {
        lista.push({
          codigo: pp.codigo,
          remitente: pp.remitente,
          destinatario: pp.destinatario,
          monto: pp.monto,
          moneda: pp.moneda,
          fecha: pp.fechaRemesa || pp.fechaInicio,
          origen: pp.origen,
          destino: pp.destino,
          tipo: 'en_proceso',
          cajero: pp.cajero,
          fechaInicio: pp.fechaInicio,
          banco: pp.banco,
          numCuenta: pp.numCuenta,
          agenciaPago: pp.agenciaPago,
        });
      }
    }

    return lista;
  }

  get remesasFiltradas(): RemesaUnificada[] {
    let lista = this.remesasUnificadas;

    if (this.filtroEstado) {
      lista = lista.filter(r => r.tipo === this.filtroEstado);
    }

    if (this.filtroTexto) {
      const txt = this.filtroTexto.toUpperCase();
      lista = lista.filter(r =>
        r.remitente.toUpperCase().includes(txt) ||
        r.destinatario.toUpperCase().includes(txt) ||
        r.codigo.toString().includes(txt)
      );
    }

    if (this.tipoPago === 1) {
      lista = lista.filter(r => r.tipo === (this.pestanaDeposito === 'pendientes' ? 'pendiente' : 'en_proceso'));
    }

    return lista;
  }

  ngOnInit(): void {
    this.cambioService.catalogos().subscribe({
      next: c => {
        this.cat = c;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Error cargando catalogos', 'OK', { duration: 4000 });
      }
    });
    this.cargarCuentasBancarias();

    this.qpSub = this.route.queryParamMap.subscribe(params => {
      const tipoParam = params.get('tipo');
      if (tipoParam === 'deposito') this.tipoPago = 1;
      else if (tipoParam === 'efectivo') this.tipoPago = 0;
      this.cargarPendientes();

      this.pagoExitoso = null;
      this.remesaBuscada = null;
      this.filtroCodigo = null;
      this.filtroTexto = '';
      this.filtroEstado = '';
      this.pestanaDeposito = 'pendientes';
      this.cuentaSeleccionada = '';
      this.monedaCuentaSeleccionada = 2;
      this.codigosSeleccionados = [];
      this.destDoc = { tipo: 1, documento: '', expedicion: null };
      this.pagoIntentado = false;

      const codigoParam = params.get('codigo');
      this.remesaService.preprocesosActivos().subscribe({
        next: r => {
          this.preprocesos = r;
          if (codigoParam) {
            const cod = +codigoParam;
            const esPreproceso = r.some(pp => pp.codigo === cod);
            if (esPreproceso) {
              this.ppHighlightCodigo = cod;
              setTimeout(() => { this.ppHighlightCodigo = null; }, 5000);
            } else {
              this.filtroCodigo = cod;
              this.buscarRemesa();
            }
          }
        },
        error: () => {
          if (codigoParam) {
            this.filtroCodigo = +codigoParam;
            this.buscarRemesa();
          }
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.qpSub?.unsubscribe();
  }

  cargarPendientes(): void {
    this.cargandoPendientes = true;
    this.remesaService.remesasPendientesPago(this.tipoPago).subscribe({
      next: r => {
        this.pendientes = r;
        const disponibles = new Set(r.map(item => item.codigo));
        this.codigosSeleccionados = this.codigosSeleccionados.filter(codigo => disponibles.has(codigo));
        this.cargandoPendientes = false;
      },
      error: () => { this.cargandoPendientes = false; }
    });
  }

  cargarCuentasBancarias(): void {
    this.cajeroService.cuentasBancariasCobro().subscribe({
      next: r => {
        this.cuentasBancarias = r;
        this.autocompletarDatosPago();
      },
      error: () => {}
    });
  }

  cargarPreprocesos(): void {
    this.remesaService.preprocesosActivos().subscribe({
      next: r => this.preprocesos = r,
      error: () => {}
    });
  }

  actualizarTodo(): void {
    this.cargarPendientes();
    this.cargarPreprocesos();
  }

  parseDestinatario(raw: string): DestinatarioParsed {
    if (!raw) return { nombre: '', banco: '', cuenta: '' };
    const parts = raw.split('//').map(s => s.trim());
    let nombre = parts[0] || '';
    let banco = parts.length >= 3 ? parts[1] || '' : '';
    let cuenta = parts.length >= 3 ? parts.slice(2).join(' // ') : parts[1] || '';

    // Chile suele enviar "BENEFICIARIO / BANCO // CUENTA (MONEDA)".
    // En formatos anteriores, nombre, banco y cuenta vienen en segmentos separados por //.
    if (parts.length === 2) {
      const beneficiarioYBanco = nombre.split(/\s+\/\s+/).map(segmento => segmento.trim()).filter(Boolean);
      if (beneficiarioYBanco.length > 1) {
        banco = beneficiarioYBanco.pop() || '';
        nombre = beneficiarioYBanco.join(' / ');
      } else {
        banco = parts[1] || '';
        cuenta = '';
      }
    }

    return {
      nombre,
      banco,
      cuenta: cuenta.replace(/\s*\([^)]*\)\s*$/, '').trim(),
    };
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '-';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return fecha;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear());
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} ${hh}:${mi}`;
  }

  confirmarDeposito(codigo: number): void {
    const preproceso = this.preprocesos.find(item => item.codigo === codigo);
    const destinatario = this.parseDestinatario(preproceso?.destinatario || '');
    const fila = (icono: string, etiqueta: string, valor: unknown) => `
      <div class="remesa-confirm-row">
        <span class="remesa-confirm-icon"><span class="material-icons">${icono}</span></span>
        <span class="remesa-confirm-label">${this.escapeHtml(etiqueta)}</span>
        <strong class="remesa-confirm-value">${this.escapeHtml(valor)}</strong>
      </div>`;
    const filas = [
      fila('tag', 'Código de remesa', codigo),
      fila('groups', 'Beneficiario', destinatario.nombre || '—'),
      fila('public', 'Agencia destino', preproceso?.agenciaPago || this.agenciaDestinoPago),
      fila('account_balance', 'Entidad financiera', preproceso?.banco || destinatario.banco || '—'),
      fila('credit_card', 'Cuenta de destino', preproceso?.numCuenta || destinatario.cuenta || '—'),
      fila('event', 'Fecha y hora de envío', this.formatFecha(preproceso?.fechaRemesa || preproceso?.fechaInicio || '')),
    ].join('');

    Swal.fire({
      title: 'Confirmar depósito acreditado',
      html: `
        <div class="remesa-confirm-content">
          <div class="remesa-confirm-intro"><span class="material-icons">account_balance</span><span>Verifica los datos y confirma que el depósito fue acreditado en la cuenta.</span></div>
          <div class="remesa-confirm-list">${filas}</div>
          <div class="remesa-confirm-total"><span><span class="material-icons">account_balance_wallet</span>Total a pagar al beneficiario</span><strong>${(preproceso?.monto ?? 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${this.escapeHtml(preproceso?.moneda || 'BOB')}</strong></div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Confirmar depósito',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#15803d',
      reverseButtons: true,
      width: 560,
      customClass: {
        popup: 'remesa-payment-popup',
        title: 'remesa-payment-title',
        htmlContainer: 'remesa-payment-html',
        actions: 'remesa-payment-actions',
        confirmButton: 'remesa-payment-confirm',
        cancelButton: 'remesa-payment-cancel',
      },
    }).then(result => {
      if (!result.isConfirmed) return;
      this.confirmandoPreproceso = true;
      this.confirmandoCodigo = codigo;
      const uuid = crypto.randomUUID();
      this.remesaService.confirmarPreproceso({ codigo, uuid }).subscribe({
        next: (data) => {
          this.confirmandoPreproceso = false;
          this.confirmandoCodigo = null;
          this.pagoExitoso = { ...data, preproceso: false };
          this.cargarPreprocesos();
          this.cargarPendientes();
        },
        error: (e) => {
          this.confirmandoPreproceso = false;
          this.confirmandoCodigo = null;
          this.snack.open(e.message || 'Error al confirmar deposito', 'OK', { duration: 5000 });
        }
      });
    });
  }

  buscarRemesa(): void {
    if (!this.filtroCodigo) return;
    this.buscando = true;
    this.pagoIntentado = false;
    this.remesaBuscada = null;
    this.cuentaSeleccionada = '';
    this.destDoc = { tipo: 1, documento: '', expedicion: null };
    this.remesaService.buscarRemesaPago(this.filtroCodigo).subscribe({
      next: r => {
        if (this.tipoPago === 1 && !r.cuentaDestinatario?.trim()) {
          this.buscando = false;
          this.snack.open('Esta remesa corresponde a pago en efectivo, no a depósito.', 'OK', { duration: 4000 });
          return;
        }
        this.remesaBuscada = r;
        this.buscando = false;
        this.autocompletarDatosPago();
      },
      error: (e) => {
        this.buscando = false;
        this.snack.open(e.message || 'Remesa no encontrada', 'OK', { duration: 4000 });
      }
    });
  }

  /**
   * Completa los datos que vienen asociados a la remesa. La cuenta usada para
   * el movimiento contable se selecciona solo cuando existe una coincidencia
   * inequívoca; nunca se elige una cuenta arbitraria.
   */
  private autocompletarDatosPago(): void {
    const remesa = this.remesaBuscada;
    if (!remesa) return;

    const documento = (remesa.docDestinatario || '').trim();
    // El backend filtra el tipo aislado (por ejemplo CIB) y aquí solo llega
    // un valor cuando realmente existe un documento del beneficiario.
    if (documento) {
      this.destDoc.documento = documento;
    }
    if (remesa.tipoDocDestinatario) {
      this.destDoc.tipo = Number(remesa.tipoDocDestinatario);
    }
    if (remesa.expedicionDestinatario) {
      this.destDoc.expedicion = Number(remesa.expedicionDestinatario);
    }

    if (this.tipoPago !== 1 || this.cuentaSeleccionada || !this.cuentasBancarias.length) return;

    const cuentaRemesa = (remesa.cuentaDestinatario || '').trim();
    const bancoRemesa = this.normalizarTexto(remesa.bancoDestinatario || '');
    const cuentasDisponibles = this.cuentasBancariasFiltradas;
    const porCuenta = cuentaRemesa
      ? cuentasDisponibles.filter(c => c.num_cuenta_bancaria === cuentaRemesa)
      : [];
    const porBanco = bancoRemesa
      ? cuentasDisponibles.filter(c => {
          const banco = this.normalizarTexto(c.entidad_desc || c.entidad || '');
          return banco.includes(bancoRemesa) || bancoRemesa.includes(banco);
        })
      : [];

    if (porCuenta.length === 1) {
      this.cuentaSeleccionada = porCuenta[0].num_cuenta_bancaria;
    } else if (!cuentaRemesa && porBanco.length === 1) {
      this.cuentaSeleccionada = porBanco[0].num_cuenta_bancaria;
    } else {
      // Como último caso seguro, si la agencia tiene una sola cuenta activa
      // para la moneda de la remesa, esa es la cuenta operativa por defecto.
      const porMoneda = cuentasDisponibles;
      if (porMoneda.length === 1) {
        this.cuentaSeleccionada = porMoneda[0].num_cuenta_bancaria;
      }
    }
  }

  private normalizarTexto(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim();
  }

  seleccionarPendiente(r: RemesaUnificada): void {
    this.filtroCodigo = r.codigo;
    this.buscarRemesa();
  }

  estaSeleccionada(codigo: number): boolean {
    return this.codigosSeleccionados.includes(codigo);
  }

  togglePendiente(codigo: number, seleccionado: boolean): void {
    if (seleccionado) {
      if (!this.codigosSeleccionados.includes(codigo)) this.codigosSeleccionados = [...this.codigosSeleccionados, codigo];
    } else {
      this.codigosSeleccionados = this.codigosSeleccionados.filter(item => item !== codigo);
    }
  }

  toggleTodasPendientes(seleccionado: boolean): void {
    this.codigosSeleccionados = seleccionado ? this.pendientes.map(r => r.codigo) : [];
  }

  prepararLote(): void {
    const remesas = this.remesasPendientesSeleccionadas;
    if (!remesas.length) return;

    const detalle = remesas.slice(0, 8).map(r => `
      <div style="display:grid;grid-template-columns:72px minmax(0,1fr) auto;align-items:center;gap:10px;padding:11px 12px;border-bottom:1px solid #e8edf3;text-align:left;">
        <strong style="color:#e87520;font-size:13px;">#${r.codigo}</strong><span style="overflow:hidden;color:#24334d;font-size:13px;text-overflow:ellipsis;white-space:nowrap;">${this.escapeHtml(this.parseDestinatario(r.destinatario).nombre || r.destinatario)}</span><b style="color:#14213d;font-size:13px;white-space:nowrap;">${r.monto.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${this.escapeHtml(r.moneda)}</b>
      </div>`).join('');
    const restantes = remesas.length > 8 ? `<p style="margin:0;padding:10px 12px;color:#7789a1;font-size:12px;text-align:left;">y ${remesas.length - 8} remesa(s) más…</p>` : '';

    Swal.fire({
      title: 'Preparar pagos por lote',
      html: `
        <div style="color:#52647d;font-size:14px;text-align:left;">
          <div style="display:flex;align-items:flex-start;gap:9px;margin:0 0 14px;padding:11px 12px;border:1px solid #fed7aa;border-radius:8px;background:#fff7ed;color:#7c4a19;line-height:1.4;">
            <span style="font-size:18px;line-height:1;">ⓘ</span>
            <span>Las remesas pasarán a <strong style="color:#9a4d00;">En proceso</strong>. Después podrás confirmar cada depósito individualmente.</span>
          </div>
          <div style="overflow:hidden;border:1px solid #e1e8f1;border-radius:9px;background:#f8fafc;">${detalle}${restantes}</div>
          <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px;padding:12px 14px;border-radius:8px;background:#fff1e4;color:#9a4d00;font-size:13px;font-weight:700;">
            <span>${remesas.length} remesa(s) seleccionada(s)</span><strong style="font-size:15px;">${this.escapeHtml(this.resumenLoteMonedas)}</strong>
          </div>
        </div>`,
      showCancelButton: true,
      confirmButtonText: 'Preparar lote',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#F58634',
      reverseButtons: true,
      width: 620,
      customClass: { popup: 'remesa-payment-popup', title: 'remesa-payment-title', htmlContainer: 'remesa-payment-html' },
    }).then(result => {
      if (!result.isConfirmed) return;
      this.buscando = true;
      this.remesaService.preprocesarRemesas(this.codigosSeleccionados, crypto.randomUUID()).subscribe({
        next: response => {
          this.buscando = false;
          this.codigosSeleccionados = [];
          this.cargarPendientes();
          this.cargarPreprocesos();
          const omitidas = response.omitidas?.length ? ` ${response.omitidas.length} omitida(s).` : '';
          this.snack.open(`${response.total} remesa(s) preparada(s) para pago.${omitidas}`, 'OK', { duration: 5000 });
        },
        error: e => {
          this.buscando = false;
          Swal.fire('No se pudo preparar el lote', e.message || 'Intente nuevamente.', 'error');
        }
      });
    });
  }

  volverALista(): void {
    this.remesaBuscada = null;
    this.filtroCodigo = null;
    this.destDoc = { tipo: 1, documento: '', expedicion: null };
    this.monedaCuentaSeleccionada = 2;
    this.cuentaSeleccionada = '';
    this.pagoIntentado = false;
  }

  onCuentaChange(): void {}

  onMonedaCuentaChange(): void {
    this.cuentaSeleccionada = '';
    const cuentas = this.cuentasBancariasFiltradas;
    if (cuentas.length === 1) {
      this.cuentaSeleccionada = cuentas[0].num_cuenta_bancaria;
    }
  }

  tiempoTranscurrido(fecha: string): string {
    if (!fecha) return '';
    const inicio = new Date(fecha).getTime();
    const ahora = Date.now();
    const diffMs = ahora - inicio;
    if (diffMs < 0) return 'recien';
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'recien';
    if (mins < 60) return `hace ${mins} min`;
    const hrs = Math.floor(mins / 60);
    const minsRest = mins % 60;
    if (hrs < 24) return minsRest > 0 ? `hace ${hrs}h ${minsRest}m` : `hace ${hrs}h`;
    const dias = Math.floor(hrs / 24);
    return `hace ${dias}d ${hrs % 24}h`;
  }

  confirmarPago(): void {
    if (!this.remesaBuscada) return;

    this.pagoIntentado = true;
    const cuentaValida = +this.tipoPago !== 1 || !!this.cuentaSeleccionada;
    if (!cuentaValida) {
      this.snack.open('Completa los datos obligatorios para continuar', 'OK', { duration: 3000 });
      return;
    }

    if (+this.tipoPago === 1 && !this.cuentaSeleccionada) {
      this.snack.open('Seleccione una cuenta bancaria', 'OK', { duration: 3000 });
      return;
    }

    const cuenta = this.cuentasBancarias.find(c => c.num_cuenta_bancaria === this.cuentaSeleccionada);
    const modalidadPago = +this.tipoPago === 0 ? 'Efectivo por ventanilla' : 'Depósito bancario';
    const filaConfirmacion = (icono: string, etiqueta: string, valor: unknown) => `
      <div class="remesa-confirm-row">
        <span class="remesa-confirm-icon"><span class="material-icons">${icono}</span></span>
        <span class="remesa-confirm-label">${this.escapeHtml(etiqueta)}</span>
        <strong class="remesa-confirm-value">${this.escapeHtml(valor)}</strong>
      </div>`;
    const filas = [
      filaConfirmacion('groups', 'Beneficiario', this.remesaBuscada.destinatario),
      filaConfirmacion('public', 'Agencia destino', this.agenciaDestinoPago),
      filaConfirmacion('payments', 'Forma de pago', modalidadPago),
      filaConfirmacion('currency_exchange', 'Moneda', this.remesaBuscada.moneda),
      ...(cuenta ? [
        filaConfirmacion('account_balance', 'Entidad financiera', cuenta.entidad_desc),
        filaConfirmacion('credit_card', 'Cuenta de destino', cuenta.num_cuenta_bancaria),
      ] : []),
      filaConfirmacion('event', 'Fecha y hora de envío', this.formatFecha(this.remesaBuscada.fecha)),
    ].join('');

    Swal.fire({
      title: 'Confirmar pago de remesa',
      html: `
        <div class="remesa-confirm-content">
          <div class="remesa-confirm-intro"><span class="material-icons">payments</span><span>Revisa los datos antes de confirmar el pago.</span></div>
          <div class="remesa-confirm-list">
            ${filaConfirmacion('tag', 'Código de remesa', this.remesaBuscada.codigo)}
            ${filas}
          </div>
          <div class="remesa-confirm-total"><span><span class="material-icons">account_balance_wallet</span>Total a entregar al beneficiario</span><strong>${this.remesaBuscada.monto.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${this.escapeHtml(this.remesaBuscada.moneda)}</strong></div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Confirmar pago',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#F58634',
      reverseButtons: true,
      width: 560,
      customClass: {
        popup: 'remesa-payment-popup',
        title: 'remesa-payment-title',
        htmlContainer: 'remesa-payment-html',
        actions: 'remesa-payment-actions',
        confirmButton: 'remesa-payment-confirm',
        cancelButton: 'remesa-payment-cancel',
      },
    }).then(result => {
      if (result.isConfirmed) {
        this.ejecutarPago(cuenta);
      }
    });
  }

  private escapeHtml(value: unknown): string {
    const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return String(value ?? '').replace(/[&<>"']/g, char => entities[char]);
  }

  private ejecutarPago(cuenta: CuentaBancariaCobro | undefined): void {
    if (!this.remesaBuscada) return;
    this.pagando = true;

    const uuid = crypto.randomUUID();
    const body: any = {
      codigo: this.remesaBuscada.codigo,
      destinatario_doc: {
        id_tipo_doc_identidad: +this.destDoc.tipo,
        num_doc_identidad: this.destDoc.documento,
        id_expedicion: Number(this.destDoc.expedicion ?? 0),
      },
      tipo_pago: +this.tipoPago,
      uuid,
    };

    if (+this.tipoPago === 1 && cuenta) {
      body.datos_bancarios = {
        num_cuenta_bancaria: cuenta.num_cuenta_bancaria,
        id_entidad_financiera: cuenta.id_entidad_financiera,
        id_moneda_cuenta: cuenta.id_moneda,
        id_tipo_cuenta_bancaria: cuenta.id_tipo_cuenta_bancaria,
        codsubcuenta: cuenta.codsubcuenta,
        entidad_desc: cuenta.entidad_desc,
      };
    }

    this.remesaService.pagarRemesa(body).subscribe({
      next: r => {
        this.pagando = false;
        this.pagoExitoso = r;
      },
      error: (e) => {
        this.pagando = false;
        Swal.fire('Error', e.message || 'No se pudo procesar el pago', 'error');
      }
    });
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.comprobanteFile = input.files[0];
    }
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      this.comprobanteFile = event.dataTransfer.files[0];
    }
  }

  removeComprobante(event: Event): void {
    event.stopPropagation();
    this.comprobanteFile = null;
  }

  subirBoleta(): void {
    if (!this.comprobanteFile || !this.pagoExitoso?.codigo) return;
    this.subiendoBoleta = true;
    this.remesaService.subirBoletaPagoRemesa(this.pagoExitoso.codigo, this.comprobanteFile).subscribe({
      next: () => {
        this.subiendoBoleta = false;
        this.boletaSubida = true;
        this.comprobanteFile = null;
        this.snack.open('Comprobante subido correctamente', 'OK', { duration: 4000 });
      },
      error: (e) => {
        this.subiendoBoleta = false;
        this.snack.open(e.message || 'Error al subir comprobante', 'OK', { duration: 5000 });
      }
    });
  }

  abrirComprobanteEnvio(codigo: number): void {
    this.pdfPopupTitulo = 'Comprobante de Envío';
    this.pdfPopupLoading = true;
    this.pdfPopupUrl = null;
    this.showPdfPopup = true;

    this.remesaService.descargarComprobanteEnvioChilePdf(codigo).subscribe({
      next: blob => {
        if (this.pdfBlobUrl) URL.revokeObjectURL(this.pdfBlobUrl);
        this.pdfBlobUrl = URL.createObjectURL(blob);
        this.pdfPopupUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfBlobUrl);
        this.pdfPopupLoading = false;
      },
      error: () => {
        this.pdfPopupLoading = false;
        this.showPdfPopup = false;
        this.snack.open('Error al generar el comprobante de envío', 'OK', { duration: 4000 });
      },
    });
  }

  descargarComprobantePago(): void {
    if (!this.pagoExitoso?.id_pago) return;
    this.pdfPopupTitulo = 'Comprobante de Pago';
    this.pdfPopupLoading = true;
    this.pdfPopupUrl = null;
    this.showPdfPopup = true;

    this.remesaService.descargarComprobantePagoPdf(this.pagoExitoso.id_pago).subscribe({
      next: blob => {
        if (this.pdfBlobUrl) URL.revokeObjectURL(this.pdfBlobUrl);
        this.pdfBlobUrl = URL.createObjectURL(blob);
        this.pdfPopupUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfBlobUrl);
        this.pdfPopupLoading = false;
      },
      error: () => {
        this.pdfPopupLoading = false;
        this.showPdfPopup = false;
        this.snack.open('Error al generar el comprobante PDF', 'OK', { duration: 4000 });
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

  mostrarEmailDialog(): void {
    this.showEmailDialog = !this.showEmailDialog;
  }

  enviarPorEmail(): void {
    if (!this.emailEnvio || !this.esEmailValido(this.emailEnvio) || !this.pagoExitoso?.id_pago) return;
    this.enviandoEmail = true;
    this.remesaService.enviarComprobantePagoEmail(this.pagoExitoso.id_pago, this.emailEnvio).subscribe({
      next: () => {
        this.enviandoEmail = false;
        this.showEmailDialog = false;
        this.snack.open('Comprobante enviado correctamente', 'OK', { duration: 4000 });
      },
      error: (e) => {
        this.enviandoEmail = false;
        this.snack.open(e.message || 'Error al enviar email', 'OK', { duration: 4000 });
      },
    });
  }

  private esEmailValido(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  nuevoPago(): void {
    this.pagoExitoso = null;
    this.remesaBuscada = null;
    this.filtroCodigo = null;
    this.filtroTexto = '';
    this.filtroEstado = '';
    this.destDoc = { tipo: 1, documento: '', expedicion: null };
    this.cuentaSeleccionada = '';
    this.comprobanteFile = null;
    this.boletaSubida = false;
    this.cargarPendientes();
    this.cargarPreprocesos();
  }
}
