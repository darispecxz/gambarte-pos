import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CambioService } from '../../core/cambio.service';
import { CajeroService } from '../../core/cajero.service';
import { FormaPagoCobro } from '../../core/remesa.service';
import { SearchableSelectComponent } from '../../shared/searchable-select.component';
import { TelInputComponent } from '../../shared/tel-input.component';
import {
  CotizacionInfo, ClienteInfo, Catalogos,
  CambioResponse, OperacionCambioInput, UifCheckResponse, Pcc06Data,
  ComplementoData, CuentaBancariaCobro, UifAlerta, UifSenal,
} from '../../core/models';
import { forkJoin } from 'rxjs';
import Swal from 'sweetalert2';

type Mode = 'select' | 'cliente' | 'operacion' | 'resultado';

const OBSERVACIONES_PREDEFINIDAS = [
  'Operaciones cercanas al umbral de reporte (posible estructuración)',
  'Cliente realiza operaciones con alta frecuencia',
  'Monto inconsistente con actividad económica declarada',
  'Cliente muestra nerviosismo o apuro inusual',
  'Cliente acompañado por persona que dirige la operación',
  'Cliente no puede justificar origen de fondos',
  'Documentación presentada con inconsistencias',
  'Cliente desconoce datos básicos de la operación',
];

@Component({
  selector: 'app-cambio',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, MatSnackBarModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule,
    SearchableSelectComponent, TelInputComponent, RouterLink,
  ],
  template: `
    <div class="cambio-page">

      <!-- HEADER -->
      <div class="header-strip no-print">
        <div class="header-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
        </div>
        <div class="header-text">
          <h1>{{ idOperacion === 1 ? 'Compra de Moneda' : idOperacion === 2 ? 'Venta de Moneda' : 'Cambio de Moneda' }}</h1>
          <span>{{ idOperacion === 1 ? 'El cliente vende divisa, recibe BOB' : idOperacion === 2 ? 'El cliente compra divisa, entrega BOB' : 'Compra y venta de divisas' }}</span>
        </div>
        <a class="manual-help" routerLink="/manuales/cambio" [queryParams]="{tipo: idOperacion === 2 ? 'venta' : 'compra'}">？ Manual de ayuda</a>
      </div>

      <!-- ===== LOADING ===== -->
      @if (loading) {
        <div class="loading-box">
          <div class="spinner"></div>
          <span>Cargando...</span>
        </div>
      }

      <!-- ===== SELECT OPERATION TYPE ===== -->
      @if (!loading && mode === 'select') {
        <div class="section-card">
          <h2 class="section-title">Tipo de Operación</h2>
          <p class="section-desc">Seleccione el tipo de operación de cambio de moneda</p>
          <div class="op-buttons">
            <button class="op-btn compra" (click)="selectOperacion(1)"
                    [disabled]="cotizaciones.length === 0">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 19V5"/><polyline points="5 12 12 5 19 12"/></svg>
              <span class="op-label">COMPRA</span>
              <span class="op-desc">El cliente vende divisa, recibe BOB</span>
            </button>
            <button class="op-btn venta" (click)="selectOperacion(2)"
                    [disabled]="cotizaciones.length === 0">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14"/><polyline points="19 12 12 19 5 12"/></svg>
              <span class="op-label">VENTA</span>
              <span class="op-desc">El cliente compra divisa, entrega BOB</span>
            </button>
          </div>
        </div>
      }

      <!-- ===== CLIENTE IDENTIFICATION ===== -->
      @if (mode === 'cliente' || mode === 'operacion') {
        <div class="section-card no-print">
          <div class="section-header">
            <div class="op-badge" [class.compra]="idOperacion === 1" [class.venta]="idOperacion === 2">
              {{ idOperacion === 1 ? 'COMPRA' : 'VENTA' }}
            </div>
            @if (mode === 'cliente') {
              <button class="btn-back" (click)="goBack()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
                Volver
              </button>
            }
          </div>

          <h2 class="section-title">Identificación del Cliente</h2>

          <div class="form-row three">
            <mat-form-field appearance="outline">
              <mat-label>Tipo Documento</mat-label>
              <mat-icon matPrefix>badge</mat-icon>
              <mat-select [(ngModel)]="clienteDoc.tipoDoc" (selectionChange)="resetClienteSearch()">
                @for (t of cat.tipos_documento; track t['id_tipo_doc_identidad']) {
                  <mat-option [value]="t['id_tipo_doc_identidad'] + ''">{{ t['descripcion'] }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Nro. Documento</mat-label>
              <mat-icon matPrefix>pin</mat-icon>
              <input matInput [(ngModel)]="clienteDoc.documento" (blur)="buscarCliente()" placeholder="Ej: 12345678" autocomplete="off">
            </mat-form-field>
            @if (esCedula) {
              <mat-form-field appearance="outline">
                <mat-label>Expedición</mat-label>
                <mat-icon matPrefix>place</mat-icon>
                <mat-select [(ngModel)]="clienteDoc.expedicion" (selectionChange)="buscarCliente()">
                  @for (e of cat.expediciones; track e['id_expedicion']) {
                    <mat-option [value]="e['id_expedicion'] + ''">{{ e['descripcion'] }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            }
          </div>

          @if (buscandoCliente) {
            <div class="search-status">
              <div class="spinner sm"></div>
              Buscando cliente...
            </div>
          }

          @if (clienteEncontrado !== null && !buscandoCliente) {
            @if (clienteEncontrado) {
              <div class="cliente-found">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <div class="cliente-info">
                  <strong>{{ cliente.nombres }} {{ cliente.ape_pat }} {{ cliente.ape_mat }}</strong>
                  <span>{{ cliente.celular }} · {{ cliente.domicilio }}</span>
                </div>
                <button class="btn-edit-cliente" (click)="showClienteForm = !showClienteForm" [title]="showClienteForm ? 'Ocultar formulario' : 'Editar datos'">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  {{ showClienteForm ? 'Ocultar' : 'Editar' }}
                </button>
              </div>
            } @else {
              <div class="cliente-new">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F5820A" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                <span>Cliente nuevo — complete los datos</span>
              </div>
            }
          }

          @if (showClienteForm) {
            <div class="cliente-form">
              @if (isExtranjero) {
                <div class="profile-badge extranjero">Perfil Extranjero — validacion simplificada</div>
              }
              <div class="form-row three" [formGroup]="clienteForm">
                <mat-form-field appearance="outline">
                  <mat-label>Nombres</mat-label>
                  <mat-icon matPrefix>person</mat-icon>
                  <input matInput formControlName="nombres" autocomplete="off">
                  <mat-error>Los nombres son obligatorios</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Apellido Paterno</mat-label>
                  <input matInput formControlName="ape_pat" autocomplete="off">
                  <mat-error>El apellido paterno es obligatorio</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Apellido Materno</mat-label>
                  <input matInput formControlName="ape_mat" autocomplete="off">
                </mat-form-field>
              </div>
              @if (!isExtranjero) {
                <div class="form-row" [formGroup]="clienteForm">
                  <div class="nit-toggle-row">
                    <button type="button" class="nit-toggle" [class.active]="showNitField" (click)="toggleNit()">
                      <span class="nit-toggle-track"><span class="nit-toggle-thumb"></span></span>
                      {{ showNitField ? 'Con NIT' : 'Sin NIT' }}
                    </button>
                    @if (showNitField) {
                      <mat-form-field appearance="outline" style="flex:0 1 280px">
                        <mat-label>NIT</mat-label>
                        <mat-icon matPrefix>receipt_long</mat-icon>
                        <input matInput formControlName="nit" autocomplete="off" placeholder="Ingrese NIT">
                        <mat-error>El NIT es obligatorio</mat-error>
                      </mat-form-field>
                    }
                  </div>
                </div>
              }
              <div class="form-row three" [formGroup]="clienteForm">
                <mat-form-field appearance="outline">
                  <mat-label>Fecha Nacimiento</mat-label>
                  <mat-icon matPrefix>event</mat-icon>
                  <input matInput type="date" formControlName="fecha_nacimiento">
                  <mat-error>La fecha de nacimiento es obligatoria</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Sexo</mat-label>
                  <mat-select formControlName="id_sexo">
                    @for (s of cat.sexos; track s['id_sexo']) {
                      <mat-option [value]="s['id_sexo']">{{ s['descripcion'] }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>{{ isExtranjero ? 'País *' : 'País' }}</mat-label>
                  <mat-icon matPrefix>public</mat-icon>
                  <app-searchable-select [items]="cat.paises" valueKey="id_pais" labelKey="descripcion" placeholder="Buscar país..." formControlName="id_pais"></app-searchable-select>
                </mat-form-field>
              </div>
              <div class="form-row three" [formGroup]="clienteForm">
                <mat-form-field appearance="outline">
                  <mat-label>Lugar Nacimiento</mat-label>
                  <input matInput formControlName="lugar_nacimiento" autocomplete="off">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Estado Civil</mat-label>
                  <mat-select formControlName="id_estado_civil">
                    @for (ec of cat.estados_civiles; track ec['id_estado_civil']) {
                      <mat-option [value]="ec['id_estado_civil']">{{ ec['descripcion'] }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Ocupación</mat-label>
                  <mat-icon matPrefix>work_outline</mat-icon>
                  <app-searchable-select [items]="sortedOcupaciones" valueKey="id_ocupacion" labelKey="descripcion" placeholder="Buscar ocupación..." formControlName="id_ocupacion" (selectionChange)="onOcupacionChange()"></app-searchable-select>
                </mat-form-field>
              </div>
              @if (!isExtranjero) {
                <div class="form-row three" [formGroup]="clienteForm">
                  <mat-form-field appearance="outline">
                    <mat-label>Actividad Económica *</mat-label>
                    <mat-icon matPrefix>category</mat-icon>
                    <app-searchable-select [items]="cat.actividades_economicas" valueKey="id_actividad_economica" labelKey="descripcion" placeholder="Buscar actividad..." formControlName="id_actividad_economica"></app-searchable-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Departamento</mat-label>
                    <mat-select formControlName="departamento" (selectionChange)="filterCiudades()">
                      <mat-option value="0">Seleccione</mat-option>
                      @for (d of cat.departamentos; track d['id_departamento']) {
                        <mat-option [value]="d['id_departamento'] + ''">{{ d['descripcion'] }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Ciudad *</mat-label>
                    <mat-icon matPrefix>location_city</mat-icon>
                    <app-searchable-select [items]="ciudadesFiltradas" valueKey="id_ciudad_pcc" labelKey="descripcion" placeholder="Buscar ciudad..." formControlName="id_ciudad"></app-searchable-select>
                    <mat-error>Seleccione una ciudad</mat-error>
                  </mat-form-field>
                </div>
                <div class="form-row two" [formGroup]="clienteForm">
                  <mat-form-field appearance="outline">
                    <mat-label>Zona</mat-label>
                    <input matInput formControlName="zona" autocomplete="off">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Domicilio *</mat-label>
                    <mat-icon matPrefix>home</mat-icon>
                    <input matInput formControlName="domicilio" autocomplete="off">
                    <mat-error>El domicilio es obligatorio</mat-error>
                  </mat-form-field>
                </div>
              } @else {
                <div class="form-row two" [formGroup]="clienteForm">
                  <mat-form-field appearance="outline">
                    <mat-label>Actividad Económica</mat-label>
                    <mat-icon matPrefix>category</mat-icon>
                    <app-searchable-select [items]="cat.actividades_economicas" valueKey="id_actividad_economica" labelKey="descripcion" placeholder="Buscar actividad..." formControlName="id_actividad_economica"></app-searchable-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Domicilio (pais de origen)</mat-label>
                    <mat-icon matPrefix>home</mat-icon>
                    <input matInput formControlName="domicilio" autocomplete="off" placeholder="Direccion en su pais o alojamiento temporal">
                    <mat-error>El domicilio es obligatorio</mat-error>
                  </mat-form-field>
                </div>
              }
              <div class="form-row three" [formGroup]="clienteForm">
                <div class="cel-col">
                  <button type="button" class="nit-toggle" [class.active]="mismoNro" (click)="toggleMismoNro()"
                          title="Repetir el celular en Tel. Domicilio y Tel. Trabajo">
                    <span class="nit-toggle-track"><span class="nit-toggle-thumb"></span></span>
                    Mismo número
                  </button>
                  <mat-form-field appearance="outline">
                    <mat-label>Celular</mat-label>
                    <mat-icon matPrefix>smartphone</mat-icon>
                    <app-tel-input formControlName="celular"></app-tel-input>
                    <mat-error>El celular es obligatorio</mat-error>
                  </mat-form-field>
                </div>
                @if (!mismoNro) {
                  <mat-form-field appearance="outline">
                    <mat-label>Tel. Domicilio</mat-label>
                    <mat-icon matPrefix>call</mat-icon>
                    <app-tel-input formControlName="tel_dom"></app-tel-input>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Tel. Trabajo</mat-label>
                    <mat-icon matPrefix>call</mat-icon>
                    <app-tel-input formControlName="tel_trab"></app-tel-input>
                  </mat-form-field>
                }
                <mat-form-field appearance="outline">
                  <mat-label>Email (opcional)</mat-label>
                  <mat-icon matPrefix>mail</mat-icon>
                  <input matInput type="email" formControlName="email" autocomplete="off" placeholder="correo@ejemplo.com">
                  <mat-error>No es un email válido</mat-error>
                </mat-form-field>
              </div>

              <!-- Datos de empleo -->
              @if (!isExtranjero) {
                <div class="form-row three" [formGroup]="clienteForm">
                  <mat-form-field appearance="outline">
                    <mat-label>Lugar de Trabajo</mat-label>
                    <mat-icon matPrefix>business</mat-icon>
                    <input matInput formControlName="e_trabajo" autocomplete="off">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Cargo</mat-label>
                    <mat-icon matPrefix>badge</mat-icon>
                    <input matInput formControlName="e_cargo" autocomplete="off">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Direccion Trabajo</mat-label>
                    <mat-icon matPrefix>place</mat-icon>
                    <input matInput formControlName="e_direccion" autocomplete="off">
                  </mat-form-field>
                </div>
              }
            </div>
          }

        </div>
      }

      <!-- ===== OPERATION DATA ===== -->
      @if (mode === 'operacion' || (mode === 'cliente' && clienteReady)) {
        <div class="section-card no-print">
          <h2 class="section-title">Datos de la Operación</h2>

          <div class="form-row three">
            <mat-form-field appearance="outline">
              <mat-label>{{ idOperacion === 1 ? 'Moneda Recibida' : 'Moneda a Entregar' }}</mat-label>
              <mat-icon matPrefix>payments</mat-icon>
              <mat-select [(ngModel)]="selectedMoneda" (selectionChange)="onMonedaChange()">
                <mat-option value="0" disabled>Seleccione moneda</mat-option>
                @for (c of cotizaciones; track c.id_moneda) {
                  <mat-option [value]="c.id_moneda + ''">{{ c.moneda }} - {{ c.moneda_desc }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" floatLabel="always" class="ff-readonly">
              <mat-label>Tipo de Cambio</mat-label>
              <span matTextPrefix>Bs&nbsp;</span>
              <input matInput type="number" [(ngModel)]="tipoCambio" disabled step="0.0001" style="text-align:right">
            </mat-form-field>
            <mat-form-field appearance="outline" floatLabel="always" class="ff-readonly">
              <mat-label>Diferencial</mat-label>
              <input matInput [value]="diferencial | number:'1.4-4'" readonly style="text-align:right">
            </mat-form-field>
          </div>

          <div class="form-row three">
            <mat-form-field appearance="outline" floatLabel="always">
              <mat-label>Monto</mat-label>
              <input matInput type="number" [(ngModel)]="monto" step="0.01" min="0" (input)="calcular()" placeholder="0.00" autocomplete="off" style="text-align:right">
            </mat-form-field>
            <mat-form-field appearance="outline" floatLabel="always">
              <mat-label>Confirmar Monto</mat-label>
              <input matInput type="number" [(ngModel)]="confirma" step="0.01" min="0" (input)="calcular()" placeholder="0.00" autocomplete="off" style="text-align:right">
            </mat-form-field>
            <mat-form-field appearance="outline" floatLabel="always" class="ff-readonly ff-total">
              <mat-label>Total Cambio</mat-label>
              <span matTextPrefix>Bs&nbsp;</span>
              <input matInput [value]="totalCambio | number:'1.2-2'" readonly style="text-align:right">
            </mat-form-field>
          </div>

          @if (montoMismatch) {
            <div class="warn-bar">
              Los montos no coinciden. Verifique el monto ingresado.
            </div>
          }

          <div class="form-row three">
            <mat-form-field appearance="outline" floatLabel="always">
              <mat-label>{{ idOperacion === 1 ? 'Recibido' : 'Entregado' }}</mat-label>
              <input matInput type="number" [(ngModel)]="recibido" step="0.01" [readonly]="true" style="text-align:right">
            </mat-form-field>
            <mat-form-field appearance="outline" floatLabel="always">
              <mat-label>{{ idOperacion === 1 ? 'Entregado [BOB]' : 'Recibido [BOB]' }}</mat-label>
              <span matTextPrefix>Bs&nbsp;</span>
              <input matInput type="number" [(ngModel)]="entregado" step="0.01" (input)="calcularCambio()" autocomplete="off" style="text-align:right">
            </mat-form-field>
            <mat-form-field appearance="outline" floatLabel="always" class="ff-readonly" [class.ff-negative]="cambioDevolucion < 0">
              <mat-label>Cambio</mat-label>
              <input matInput [value]="cambioDevolucion | number:'1.2-2'" readonly style="text-align:right">
            </mat-form-field>
          </div>

          <!-- ===== UIF STATUS ===== -->
          @if (uifResult) {
            <div class="uif-status" [class.uif-ok]="!requierePcc06 && !requiereFormulario"
                 [class.uif-warn]="requiereFormulario && !requierePcc06"
                 [class.uif-danger]="requierePcc06">
              <div class="uif-icon">
                @if (!requierePcc06 && !requiereFormulario) {
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                } @else {
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                }
              </div>
              <div class="uif-text">
                @if (!requierePcc06 && !requiereFormulario) {
                  <strong>Dentro de límites UIF</strong>
                } @else if (requierePcc06) {
                  <strong>Requiere PCC-06</strong>
                } @else {
                  <strong>Requiere Formulario Complemento</strong>
                  @if (esUsuarioHabitual) {
                    <small class="uif-reason">Motivo: cliente habitual (3 operaciones en la ventana configurada)</small>
                  } @else {
                    <small class="uif-reason">Motivo: se alcanzó el umbral individual o acumulado</small>
                  }
                }
                <span>Dolarizado: USD {{ uifResult.dolarizado | number:'1.2-2' }} ·
                  {{ uifResult.operaciones_previas.cantidad }} ops previas en {{ uifResult.operaciones_previas.dias_ventana }} días
                  (USD {{ uifResult.operaciones_previas.total_dolarizado | number:'1.2-2' }})
                </span>
              </div>
            </div>
          }
          @if (checkingUif) {
            <div class="uif-status uif-checking">
              <div class="spinner sm"></div>
              <span>Verificando controles UIF...</span>
            </div>
          }

          <!-- ===== ALERTAS PEP / LISTAS DE RIESGO ===== -->
          @if (alertasUif.length > 0) {
            <div class="alertas-uif-section">
              @for (alerta of alertasUif; track alerta.tipo) {
                <div class="alerta-uif" [class.alerta-critico]="alerta.nivel === 'critico'"
                     [class.alerta-alto]="alerta.nivel === 'alto'">
                  <div class="alerta-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  </div>
                  <div class="alerta-content">
                    <strong>{{ alerta.mensaje }}</strong>
                    @if (alerta.detalle) {
                      <span class="alerta-detalle">{{ alerta.detalle }}</span>
                    }
                  </div>
                </div>
              }
            </div>
          }

          <!-- ===== DD INCOMPLETA / BLOQUEADO ===== -->
          @if (ddBloqueado) {
            <div class="uif-status uif-danger dd-block">
              <div class="uif-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </div>
              <div class="uif-text">
                <strong>Operación Bloqueada — DD Incompleta (Art. 51)</strong>
                <span>Cliente de riesgo alto sin Debida Diligencia completa. Complete el formulario complemento o solicite autorización de supervisor.</span>
              </div>
            </div>
          } @else if (ddIncompleta) {
            <div class="uif-status uif-warn">
              <div class="uif-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div class="uif-text">
                <strong>Debida Diligencia Incompleta</strong>
                <span>Se recomienda completar el formulario complemento para este cliente.</span>
              </div>
            </div>
          }

          <!-- ===== ORIGEN/DESTINO POR UMBRAL (sin PCC completo) ===== -->
          @if (requiereOrigenDestino && !requierePcc06) {
            <div class="pcc06-section">
              <h3 class="pcc06-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                Origen y Destino de Fondos
              </h3>
              <div class="form-row two">
                <div class="field">
                  <label class="required">Origen de Fondos *</label>
                  <textarea [(ngModel)]="pcc06.origen" rows="2" maxlength="200"
                            placeholder="Describa el origen de los recursos"></textarea>
                </div>
                <div class="field">
                  <label class="required">Destino de Fondos *</label>
                  <textarea [(ngModel)]="pcc06.destino" rows="2" maxlength="200"
                            placeholder="Describa el destino de los recursos"></textarea>
                </div>
              </div>
            </div>
          }

          <!-- ===== PCC-06 FORM ===== -->
          @if (requierePcc06) {
            <div class="pcc06-section">
              <h3 class="pcc06-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                Control PCC-06 — Datos Adicionales
              </h3>
              <div class="form-row two">
                <mat-form-field appearance="outline">
                  <mat-label>Origen de Fondos *</mat-label>
                  <mat-icon matPrefix>login</mat-icon>
                  <textarea matInput [(ngModel)]="pcc06.origen" rows="2" maxlength="200" placeholder="Describa el origen de los recursos (mín. 20 caracteres)"></textarea>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Destino de Fondos *</mat-label>
                  <mat-icon matPrefix>logout</mat-icon>
                  <textarea matInput [(ngModel)]="pcc06.destino" rows="2" maxlength="200" placeholder="Describa el destino de los recursos (mín. 20 caracteres)"></textarea>
                </mat-form-field>
              </div>
              <div class="form-row two">
                <mat-form-field appearance="outline">
                  <mat-label>¿Dinero propio?</mat-label>
                  <mat-select [(ngModel)]="pcc06.dinero_si">
                    <mat-option [value]="1">Sí</mat-option>
                    <mat-option [value]="0">No (a nombre de tercero)</mat-option>
                  </mat-select>
                </mat-form-field>
                @if (pcc06.dinero_si === 0) {
                  <mat-form-field appearance="outline">
                    <mat-label>Tipo de Persona</mat-label>
                    <mat-select [(ngModel)]="pcc06.select_per">
                      <mat-option [value]="1">Persona Natural</mat-option>
                      <mat-option [value]="2">Persona Jurídica</mat-option>
                    </mat-select>
                  </mat-form-field>
                }
              </div>
              @if (pcc06.dinero_si === 0) {
                <div class="form-row two">
                  <mat-form-field appearance="outline">
                    <mat-label>{{ pcc06.select_per === 2 ? 'Razon Social' : 'Nombre Completo' }} *</mat-label>
                    <input matInput [(ngModel)]="pcc06.nombres_dd" autocomplete="off">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>{{ pcc06.select_per === 2 ? 'NIT' : 'Documento' }} *</mat-label>
                    <input matInput [(ngModel)]="pcc06.doc_nit_dd" autocomplete="off">
                  </mat-form-field>
                </div>
                <div class="form-row three">
                  <mat-form-field appearance="outline">
                    <mat-label>Domicilio *</mat-label>
                    <mat-icon matPrefix>home</mat-icon>
                    <input matInput [(ngModel)]="pcc06.domicilio_dd" autocomplete="off">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Telefono *</mat-label>
                    <mat-icon matPrefix>call</mat-icon>
                    <input matInput [(ngModel)]="pcc06.telefono_dd" autocomplete="off">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Zona</mat-label>
                    <input matInput [(ngModel)]="pcc06.zona_dd" autocomplete="off">
                  </mat-form-field>
                </div>
              }
            </div>
          }

          <!-- ===== FORMULARIO COMPLEMENTO UIF ===== -->
          @if (requiereFormulario) {
            <div class="complemento-section">
              <div class="complemento-header" (click)="showComplementoSection = !showComplementoSection">
                <h3 class="complemento-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Formulario Complemento UIF
                </h3>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                     [style.transform]="showComplementoSection ? 'rotate(180deg)' : 'rotate(0)'"
                     style="transition: transform .2s">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>

              @if (showComplementoSection) {
                <!-- Datos personales complementarios -->
                <div class="form-row three">
                  @if (showApellidoCasada) {
                    <mat-form-field appearance="outline">
                      <mat-label>Apellido de Casada</mat-label>
                      <input matInput [(ngModel)]="complemento.c_apellido_casada" autocomplete="off">
                    </mat-form-field>
                  }
                  <mat-form-field appearance="outline">
                    <mat-label>Pais de Residencia *</mat-label>
                    <mat-icon matPrefix>public</mat-icon>
                    <app-searchable-select [items]="cat.paises" valueKey="id_pais" labelKey="descripcion" placeholder="Buscar pais..." [(ngModel)]="complemento.c_pais_residencia_id"></app-searchable-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Ciudad de Residencia *</mat-label>
                    <mat-icon matPrefix>location_city</mat-icon>
                    <input matInput [(ngModel)]="complemento.c_ciudad_residencia" autocomplete="off">
                  </mat-form-field>
                </div>

                <div class="form-row four">
                  <mat-form-field appearance="outline" floatLabel="always">
                    <mat-label>Ingresos Mensuales *</mat-label>
                    <span matTextPrefix>Bs&nbsp;</span>
                    <input matInput type="number" [(ngModel)]="complemento.c_ingresos" step="0.01" min="0" autocomplete="off" style="text-align:right">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Exp. Años</mat-label>
                    <input matInput type="number" [(ngModel)]="expAnios" min="0" max="50" (input)="onExpChange()">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Exp. Meses</mat-label>
                    <input matInput type="number" [(ngModel)]="expMeses" min="0" max="11" (input)="onExpChange()">
                  </mat-form-field>
                  <mat-form-field appearance="outline" floatLabel="always" class="ff-readonly">
                    <mat-label>Fecha Ingreso</mat-label>
                    <mat-icon matPrefix>event</mat-icon>
                    <input matInput [value]="complemento.c_fecha_ingreso || '—'" readonly>
                  </mat-form-field>
                </div>

                <!-- Actividad secundaria -->
                <div class="form-row" [class.four]="showActividadSecundaria">
                  <mat-form-field appearance="outline">
                    <mat-label>Actividad Secundaria</mat-label>
                    <mat-icon matPrefix>category</mat-icon>
                    <app-searchable-select [items]="cat.actividades_economicas" valueKey="id_actividad_economica" labelKey="descripcion" placeholder="Buscar actividad..." nullOption="Ninguna" [(ngModel)]="complemento.c_actividad_secundaria_id"></app-searchable-select>
                  </mat-form-field>
                  @if (showActividadSecundaria) {
                    <mat-form-field appearance="outline" floatLabel="always">
                      <mat-label>Ingresos Act. Sec.</mat-label>
                      <span matTextPrefix>Bs&nbsp;</span>
                      <input matInput type="number" [(ngModel)]="complemento.c_ingresos_actividad_secundaria" step="0.01" min="0" autocomplete="off" style="text-align:right">
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Exp. Sec. Años</mat-label>
                      <input matInput type="number" [(ngModel)]="expSecAnios" min="0" max="50" (input)="onExpSecChange()">
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Exp. Sec. Meses</mat-label>
                      <input matInput type="number" [(ngModel)]="expSecMeses" min="0" max="11" (input)="onExpSecChange()">
                    </mat-form-field>
                  }
                </div>

                <!-- Referencias -->
                <div class="form-row three">
                  <mat-form-field appearance="outline">
                    <mat-label>Referencias Bancarias</mat-label>
                    <textarea matInput [(ngModel)]="complemento.c_referencias_bancarias" rows="2" autocomplete="off"></textarea>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Referencias Comerciales</mat-label>
                    <textarea matInput [(ngModel)]="complemento.c_referencias_comerciales" rows="2" autocomplete="off"></textarea>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Referencias Personales</mat-label>
                    <textarea matInput [(ngModel)]="complemento.c_referencias_personales" rows="2" autocomplete="off"></textarea>
                  </mat-form-field>
                </div>

                <!-- PEP Anterior -->
                <div class="pep-subsection">
                  <h4 class="pep-subtitle">Dependiente del Estado — Anterior</h4>
                  <div class="form-row two">
                    <mat-form-field appearance="outline">
                      <mat-label>Fue dependiente del Estado? *</mat-label>
                      <mat-select [(ngModel)]="complemento.c_dependiente_estado_anterior">
                        <mat-option value="N">NO</mat-option>
                        <mat-option value="S">SI</mat-option>
                      </mat-select>
                    </mat-form-field>
                    @if (complemento.c_dependiente_estado_anterior === 'S') {
                      <mat-form-field appearance="outline">
                        <mat-label>Entidad donde trabajo *</mat-label>
                        <input matInput [(ngModel)]="complemento.c_entidad_trabajo_anterior" autocomplete="off">
                      </mat-form-field>
                    }
                  </div>
                  @if (complemento.c_dependiente_estado_anterior === 'S') {
                    <div class="form-row three">
                      <mat-form-field appearance="outline">
                        <mat-label>Fecha Inicio *</mat-label>
                        <input matInput type="date" [(ngModel)]="complemento.c_fecha_inicio_trabajo_anterior">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Fecha Fin *</mat-label>
                        <input matInput type="date" [(ngModel)]="complemento.c_fecha_fin_trabajo_anterior">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Cargo *</mat-label>
                        <mat-select [(ngModel)]="complemento.c_cargo_trabajo_anterior_id">
                          @for (cargo of cat.cargos; track cargo['id']) {
                            <mat-option [value]="cargo['id']">{{ cargo['descripcion'] }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                    </div>
                  }
                </div>

                <!-- PEP Actual -->
                <div class="pep-subsection">
                  <h4 class="pep-subtitle">Dependiente del Estado — Actual</h4>
                  <div class="form-row two">
                    <mat-form-field appearance="outline">
                      <mat-label>Es dependiente del Estado? *</mat-label>
                      <mat-select [(ngModel)]="complemento.c_dependiente_estado_actual">
                        <mat-option value="N">NO</mat-option>
                        <mat-option value="S">SI</mat-option>
                      </mat-select>
                    </mat-form-field>
                    @if (complemento.c_dependiente_estado_actual === 'S') {
                      <mat-form-field appearance="outline">
                        <mat-label>Entidad donde trabaja *</mat-label>
                        <input matInput [(ngModel)]="complemento.c_entidad_trabajo_actual" autocomplete="off">
                      </mat-form-field>
                    }
                  </div>
                  @if (complemento.c_dependiente_estado_actual === 'S') {
                    <div class="form-row two">
                      <mat-form-field appearance="outline">
                        <mat-label>Cargo *</mat-label>
                        <mat-select [(ngModel)]="complemento.c_cargo_trabajo_actual_id">
                          @for (cargo of cat.cargos; track cargo['id']) {
                            <mat-option [value]="cargo['id']">{{ cargo['descripcion'] }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                    </div>
                  }
                </div>

                <!-- Conyuge (solo si estado civil = casado/union libre) -->
                @if (showConyugeFields) {
                  <div class="pep-subsection">
                    <h4 class="pep-subtitle">Datos del Conyuge</h4>
                    <div class="form-row three">
                      <mat-form-field appearance="outline">
                        <mat-label>Nombres *</mat-label>
                        <mat-icon matPrefix>person</mat-icon>
                        <input matInput [(ngModel)]="complemento.c_nombres_conyugue" autocomplete="off">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Apellido Paterno *</mat-label>
                        <input matInput [(ngModel)]="complemento.c_apellido_paterno_conyugue" autocomplete="off">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Apellido Materno</mat-label>
                        <input matInput [(ngModel)]="complemento.c_apellido_materno_conyugue" autocomplete="off">
                      </mat-form-field>
                    </div>
                    <div class="form-row three">
                      <mat-form-field appearance="outline">
                        <mat-label>Apellido de Casada</mat-label>
                        <input matInput [(ngModel)]="complemento.c_apellido_casada_conyugue" autocomplete="off">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Profesión</mat-label>
                        <mat-select [(ngModel)]="complemento.c_profesion_conyugue_id">
                          <mat-option [value]="0">Seleccione</mat-option>
                          @for (o of cat.ocupaciones; track o['id_ocupacion']) {
                            <mat-option [value]="o['id_ocupacion']">{{ o['descripcion'] }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Actividad Principal</mat-label>
                        <mat-select [(ngModel)]="complemento.c_actividad_principal_conyugue_id">
                          <mat-option [value]="0">Seleccione</mat-option>
                          @for (ae of cat.actividades_economicas; track ae['id_actividad_economica']) {
                            <mat-option [value]="ae['id_actividad_economica']">{{ ae['descripcion'] }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                    </div>
                    <div class="form-row three">
                      <mat-form-field appearance="outline">
                        <mat-label>Actividad Secundaria</mat-label>
                        <mat-select [(ngModel)]="complemento.c_actividad_secundaria_conyugue_id">
                          <mat-option [value]="0">Ninguna</mat-option>
                          @for (ae of cat.actividades_economicas; track ae['id_actividad_economica']) {
                            <mat-option [value]="ae['id_actividad_economica']">{{ ae['descripcion'] }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Lugar de Trabajo</mat-label>
                        <mat-icon matPrefix>business</mat-icon>
                        <input matInput [(ngModel)]="complemento.c_lugar_trabajo_conyugue" autocomplete="off">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Cargo</mat-label>
                        <mat-select [(ngModel)]="complemento.c_cargo_conyugue_id">
                          <mat-option [value]="0">Seleccione</mat-option>
                          @for (cargo of cat.cargos; track cargo['id']) {
                            <mat-option [value]="cargo['id']">{{ cargo['descripcion'] }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                    </div>
                    <div class="form-row three">
                      <mat-form-field appearance="outline" floatLabel="always">
                        <mat-label>Ingreso Mensual</mat-label>
                        <span matTextPrefix>Bs&nbsp;</span>
                        <input matInput type="number" [(ngModel)]="complemento.c_ingreso_mensual_conyugue" step="0.01" min="0" autocomplete="off" style="text-align:right">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Exp. Años</mat-label>
                        <input matInput type="number" [(ngModel)]="expConAnios" min="0" max="50" (input)="onExpConChange()">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Exp. Meses</mat-label>
                        <input matInput type="number" [(ngModel)]="expConMeses" min="0" max="11" (input)="onExpConChange()">
                      </mat-form-field>
                    </div>
                  </div>
                }
              }
            </div>
          }

          <!-- ===== MÉTODO DE PAGO (COBRO) ===== -->
          <div class="form-section">
            <h4 class="form-section-title">Forma de Cobro al Cliente</h4>
            <div class="cobro-section">
              @for (mp of metodosPago; track $index) {
                <div class="mp-row">
                  <mat-form-field appearance="outline">
                    <mat-label>Forma Pago</mat-label>
                    <mat-select [(ngModel)]="mp.id_forma_pago">
                      @for (fp of formasPagoCobro; track fp.id) {
                        <mat-option [value]="fp.id">{{ fp.descripcion }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline" floatLabel="always">
                    <mat-label>Monto</mat-label>
                    <span matTextPrefix>Bs&nbsp;</span>
                    <input matInput type="number" [(ngModel)]="mp.monto" step="0.01" min="0" style="text-align:right">
                  </mat-form-field>
                  @if (mp.id_forma_pago !== 1) {
                    <mat-form-field appearance="outline">
                      <mat-label>Cuenta Bancaria</mat-label>
                      <mat-icon matPrefix>account_balance</mat-icon>
                      <mat-select [(ngModel)]="mp._cuentaKey" (ngModelChange)="onSelectCuenta(mp, $event)">
                        <mat-option value="">Seleccione</mat-option>
                        @for (cb of cuentasBancarias; track cuentaKey(cb)) {
                          @if (cb.moneda === 'BOB') {
                            <mat-option [value]="cuentaKey(cb)">{{ cb.entidad }} - {{ cb.num_cuenta_bancaria }} ({{ cb.tipo_cuenta }})</mat-option>
                          }
                        }
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Referencia</mat-label>
                      <input matInput [(ngModel)]="mp.referencia" placeholder="Nro. transacción" autocomplete="off">
                    </mat-form-field>
                  }
                  @if (metodosPago.length > 1) {
                    <button type="button" class="btn-remove-mp" (click)="removeMetodoPago($index)" title="Quitar método" aria-label="Quitar método">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  }
                </div>
              }
              <div class="cobro-actions-row">
                <button class="btn-link" (click)="addMetodoPago()">+ Agregar método (mixto)</button>
                @if (metodosPago.length > 1) {
                  <span class="cobro-total" [class.cobro-ok]="cobroCuadra"
                        [class.cobro-err]="!cobroCuadra">
                    Suma: {{ totalMetodosPago | number:'1.2-2' }} / {{ totalCambio | number:'1.2-2' }} BOB
                  </span>
                }
              </div>

            </div>
          </div>

          <div class="form-actions">
            @if (mode === 'operacion') {
              <button class="btn-secondary" (click)="mode = 'cliente'">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
                Volver
              </button>
            }
            <button class="btn-primary" (click)="abrirConfirmacion()"
                    [disabled]="!canRegister || registrando">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Registrar Operación
            </button>
          </div>
        </div>

        <!-- ===== CONFIRM DIALOG ===== -->
        @if (showConfirmDialog) {
          <div class="overlay" (click)="showConfirmDialog = false">
            <div class="confirm-dialog" (click)="$event.stopPropagation()">
              <div class="cd-head">
                <mat-icon>swap_horiz</mat-icon>
                <div class="cd-head-txt">
                  <h3>Confirmar Operación</h3>
                  <small>{{ idOperacion === 1 ? 'Compra de moneda' : 'Venta de moneda' }} — revisá los datos</small>
                </div>
              </div>
              <div class="cd-rows">
                <div class="cd-row"><span><mat-icon>swap_horiz</mat-icon> Tipo</span><strong>{{ idOperacion === 1 ? 'COMPRA' : 'VENTA' }}</strong></div>
                <div class="cd-row"><span><mat-icon>person</mat-icon> Cliente</span><strong>{{ cliente.nombres }} {{ cliente.ape_pat }}</strong></div>
                <div class="cd-row"><span><mat-icon>badge</mat-icon> Documento</span><strong>{{ clienteDoc.documento }}</strong></div>
                <div class="cd-row"><span><mat-icon>payments</mat-icon> Moneda</span><strong>{{ getMonedaLabel() }}</strong></div>
                <div class="cd-row"><span><mat-icon>trending_up</mat-icon> Tipo de cambio</span><strong>{{ tipoCambio | number:'1.2-5' }}</strong></div>
                @if (requierePcc06 || requiereFormulario) {
                  <div class="cd-row"><span><mat-icon>assignment</mat-icon> UIF</span><strong>{{ requierePcc06 ? 'PCC-06' : 'Formulario' }} incluido</strong></div>
                }
              </div>
              <div class="cd-amounts">
                <div class="cd-amt"><span>Monto</span><b>{{ monto | number:'1.2-2' }}</b></div>
                @if (esSoloEfectivo) {
                  <div class="cd-amt"><span>Recibido</span><b>Bs {{ sumaMetodosReal | number:'1.2-2' }}</b></div>
                  <div class="cd-amt cd-amt-cambio"><span>Cambio</span><b>Bs {{ vueltoEfectivo | number:'1.2-2' }}</b></div>
                }
              </div>
              <div class="cd-total">
                <span>Total a Cobrar</span>
                <strong>{{ totalCambio | number:'1.2-2' }} <small>BOB</small></strong>
              </div>
              <div class="confirm-actions">
                <button class="btn-secondary" (click)="showConfirmDialog = false" [disabled]="registrando">Cancelar</button>
                <button class="btn-primary" (click)="confirmarRegistro()" [disabled]="registrando">
                  @if (registrando) {
                    <div class="spinner sm white"></div> Registrando...
                  } @else {
                    <mat-icon>check_circle</mat-icon> Confirmar y registrar
                  }
                </button>
              </div>
            </div>
          </div>
        }
      }

      <!-- ===== RESULT / RECEIPT ===== -->
      @if (mode === 'resultado' && resultado) {
        <div class="section-card result-card">
          <div class="result-icon no-print">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <h2 class="result-title no-print">Operación Registrada</h2>
          <div class="result-grid">
            <div class="result-item">
              <span class="result-label">Nro. Operación</span>
              <span class="result-value">#{{ resultado.id_cambio }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">Tipo</span>
              <span class="result-value">{{ resultado.tipo_operacion }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">Fecha</span>
              <span class="result-value">{{ resultado.fecha }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">Cliente</span>
              <span class="result-value sm">{{ resultado.cliente_nombre }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">Documento</span>
              <span class="result-value">{{ resultado.cliente_documento }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">Agencia</span>
              <span class="result-value sm">{{ resultado.agencia }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">Monto {{ resultado.moneda_recibida }}</span>
              <span class="result-value">{{ resultado.monto | number:'1.2-2' }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">T.C.</span>
              <span class="result-value">{{ resultado.tipo_cambio | number:'1.2-5' }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">Total [BOB]</span>
              <span class="result-value big">{{ resultado.total_cambio | number:'1.2-2' }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">Recibido</span>
              <span class="result-value">{{ resultado.recibido | number:'1.2-2' }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">Entregado</span>
              <span class="result-value">{{ resultado.entregado | number:'1.2-2' }}</span>
            </div>
            <div class="result-item">
              <span class="result-label">Cambio</span>
              <span class="result-value">{{ resultado.cambio | number:'1.2-2' }}</span>
            </div>
          </div>
          @if (resultado.factura) {
            <div class="factura-section">
              <div class="factura-header">Factura Electrónica</div>
              <div class="result-grid">
                <div class="result-item">
                  <span class="result-label">Nro. Factura</span>
                  <span class="result-value">{{ resultado.factura.numero_factura }}</span>
                </div>
                <div class="result-item">
                  <span class="result-label">NIT Emisor</span>
                  <span class="result-value">{{ resultado.factura.nit_emisor }}</span>
                </div>
                <div class="result-item full-width">
                  <span class="result-label">CUF</span>
                  <span class="result-value cuf">{{ resultado.factura.cuf }}</span>
                </div>
                <div class="result-item">
                  <span class="result-label">Estado</span>
                  <span class="result-value" [class.contingencia]="resultado.factura.estado === 'CONTINGENCIA'">{{ resultado.factura.estado }}</span>
                </div>
                <div class="result-item">
                  <span class="result-label">Total Facturado</span>
                  <span class="result-value">{{ resultado.factura.monto_total | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>
          }
          <div class="form-actions no-print">
            @if (resultado.factura) {
              <button class="btn-secondary" (click)="abrirPdfPopup('factura')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                Imprimir Factura
              </button>
            }
            <button class="btn-outline" (click)="nuevaOperacionMismoCliente()">
              Mismo Cliente
            </button>
            <button class="btn-primary" (click)="nuevaOperacion()">
              Nueva Operación
            </button>
          </div>
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

    .cambio-page {
      margin: 0;
    }

    /* ===== HEADER ===== */
    .header-strip {
      display: flex; align-items: center; gap: 12px; padding: 12px 16px;
      background: var(--card-bg, #fff); border-radius: 10px; margin-bottom: 16px;
      border: 1px solid var(--border, #e5e5e5);
    }
    .header-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: #F58634; color: #fff; flex-shrink: 0; }
    .header-text h1 { font-size: 1.15rem; font-weight: 700; margin: 0; color: var(--text, #1a1a1a); }
    .header-text span { font-size: 0.8rem; color: var(--text-secondary, #666); }
    .manual-help { margin-left:auto; padding:8px 11px; border:1px solid #efd2b8; border-radius:8px; color:#a95715; background:#fff9f3; font-size:11px; font-weight:700; text-decoration:none; white-space:nowrap; }
    .manual-help:hover { background:#fff0e2; }

    /* ===== LOADING ===== */
    .loading-box {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 60px 0;
      color: var(--text-secondary, #64748b);
      font-size: 14px;
    }

    /* ===== SECTION CARD ===== */
    .section-card {
      background: var(--card-bg, #fff);
      border: 1px solid var(--card-border, #e5e7eb);
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 16px;
    }
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .section-title {
      font-size: 17px;
      font-weight: 700;
      color: var(--text-primary, #14213d);
      margin: 0 0 4px;
    }
    .section-desc {
      color: var(--text-secondary, #64748b);
      font-size: 13px;
      margin: 0 0 20px;
    }

    /* ===== OP BUTTONS ===== */
    .op-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .op-btn {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 32px 20px; border-radius: 14px; border: 2px solid var(--border, #e5e7eb);
      background: var(--card-bg, #fff); cursor: pointer; transition: all .15s;
    }
    .op-btn:hover:not(:disabled) { border-color: #F5820A; background: var(--orange-bg, #fff8f0); }
    .op-btn:disabled { opacity: .4; cursor: not-allowed; }
    .op-btn.compra svg { color: #16a34a; }
    .op-btn.venta svg { color: #dc2626; }
    .op-label { font-size: 18px; font-weight: 800; color: var(--text-primary, #14213d); letter-spacing: .02em; }
    .op-desc { font-size: 12px; color: var(--text-secondary, #64748b); }

    /* ===== OP BADGE ===== */
    .op-badge {
      display: inline-flex; padding: 4px 12px; border-radius: 6px;
      font-size: 11px; font-weight: 800; letter-spacing: .04em;
    }
    .op-badge.compra { background: var(--success-bg, #dcfce7); color: var(--success-text, #15803d); }
    .op-badge.venta { background: var(--error-bg, #fee2e2); color: var(--error-text, #b91c1c); }

    /* ===== FORM ===== */
    .form-section { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border, #e5e7eb); }
    .form-section-title {
      font-size: 11px; font-weight: 700; color: var(--text-muted, #94a3b8); text-transform: uppercase;
      letter-spacing: .04em; margin: 0 0 12px;
    }
    .form-row { display: grid; gap: 14px; margin-bottom: 14px; }
    .form-row.two { grid-template-columns: 1fr 1fr; }
    .form-row.three { grid-template-columns: 1fr 1fr 1fr; }
    .form-row.four { grid-template-columns: 1fr 1fr 1fr 1fr; }

    .field label {
      display: block; font-size: 11.5px; font-weight: 600; color: var(--text-secondary, #64748b);
      margin-bottom: 4px; text-transform: uppercase; letter-spacing: .03em;
    }
    .field label.highlight { color: #F5820A; }
    .field label.required { color: #dc2626; }
    .field input, .field select, .field textarea {
      width: 100%; padding: 9px 12px; border: 1px solid var(--border, #d1d5db); border-radius: 8px;
      font-size: 14px; color: var(--text-primary, #1e293b); background: var(--card-bg, #fff); outline: none; box-sizing: border-box; text-transform: uppercase;
      font-family: inherit;
    }
    .field input.email-input { text-transform: none; }
    .field input:focus, .field select:focus, .field textarea:focus {
      border-color: #F5820A; box-shadow: 0 0 0 3px rgba(245,130,10,.12);
    }
    .field input[readonly] { background: var(--hover-bg, #f8fafc); color: var(--text-secondary, #64748b); }
    .field textarea { resize: vertical; min-height: 50px; }

    .input-with-btn { display: flex; gap: 6px; align-items: stretch; }
    .input-with-btn input { flex: 1; min-width: 0; }
    .btn-copy-tel {
      padding: 0 10px; border: 1px solid var(--border, #d1d5db); border-radius: 8px;
      background: var(--hover-bg, #f8fafc); color: var(--text-secondary, #64748b); font-size: 11px; font-weight: 600;
      cursor: pointer; white-space: nowrap; font-family: inherit;
    }
    .btn-copy-tel:hover { background: #e0f2fe; color: #0369a1; border-color: #93c5fd; }

    /* Toggle tipo slider (NIT y "Mismo número") alineado a la altura del input */
    .nit-toggle-row { display: flex; align-items: flex-end; gap: 8px; }
    .nit-toggle {
      display: inline-flex; align-items: center; gap: 8px; flex: 0 0 auto;
      height: 40px; margin-bottom: 22px; padding: 0 12px;
      border: 1px solid var(--border, #d8d8d8); border-radius: 8px; background: #fff;
      cursor: pointer; font-size: 12px; font-weight: 600; color: var(--text-secondary, #666);
      white-space: nowrap; transition: all .15s;
    }
    .nit-toggle.active { border-color: #F58634; color: #F58634; background: var(--mat-sys-primary-container, #fde8d0); }
    .nit-toggle-track {
      width: 28px; height: 16px; border-radius: 8px; background: var(--border, #d1d5db);
      position: relative; transition: background .15s; flex: 0 0 auto;
    }
    .nit-toggle.active .nit-toggle-track { background: #F58634; }
    .nit-toggle-thumb {
      position: absolute; top: 2px; left: 2px; width: 12px; height: 12px;
      border-radius: 50%; background: #fff; transition: transform .15s;
    }
    .nit-toggle.active .nit-toggle-thumb { transform: translateX(12px); }
    .nit-input { flex: 1; min-width: 100px; }

    /* Columna del celular: slider "Mismo número" a la izquierda y campo a la derecha. */
    .cel-col { display: flex; flex-direction: row; align-items: flex-end; gap: 8px; }
    .cel-col > .mat-mdc-form-field { flex: 1 1 auto; min-width: 0; }

    .empleo-toggle {
      display: flex; align-items: center; gap: 6px; padding: 8px 0;
      font-size: 12px; font-weight: 600; color: var(--text-muted, #94a3b8); cursor: pointer;
      text-transform: uppercase; letter-spacing: .03em; margin-top: 4px;
    }
    .empleo-toggle:hover { color: var(--text-secondary, #64748b); }
    .empleo-toggle svg { transition: transform .2s; }

    .btn-outline {
      padding: 10px 20px; border: 2px solid #F5820A; border-radius: 10px;
      background: transparent; color: #F5820A; font-size: 14px; font-weight: 600;
      cursor: pointer; font-family: inherit;
    }
    .btn-outline:hover { background: var(--orange-bg, #fff8f0); }

    .tc-input { font-weight: 700; font-size: 15px !important; }
    .monto-input { font-weight: 600; font-size: 15px !important; }

    .computed .computed-value {
      padding: 9px 12px; background: var(--hover-bg, #f1f5f9); border: 1px solid var(--border, #e2e8f0);
      border-radius: 8px; font-size: 15px; font-weight: 700; color: var(--text-primary, #14213d);
    }
    .computed-value.big { font-size: 18px; color: #F5820A; }
    .computed-value.negative { color: #dc2626; }

    /* ===== WARN ===== */
    .warn-bar {
      background: #fef3c7; border: 1px solid #fde68a; color: #92400e;
      padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 500; margin-bottom: 14px;
    }

    /* ===== UIF STATUS ===== */
    .uif-status {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 12px 16px; border-radius: 10px; margin: 14px 0;
    }
    .uif-ok { background: var(--success-bg, #f0fdf4); border: 1px solid var(--success-border, #bbf7d0); color: var(--success-text, #15803d); }
    .uif-warn { background: var(--warning-bg, #fffbeb); border: 1px solid var(--warning-border, #fde68a); color: var(--warning-text, #92400e); }
    .uif-danger { background: var(--error-bg, #fef2f2); border: 1px solid var(--error-border, #fecaca); color: var(--error-text, #b91c1c); }
    .uif-checking { background: var(--hover-bg, #f8fafc); border: 1px solid var(--border, #e2e8f0); color: var(--text-secondary, #64748b); }
    .uif-icon { flex-shrink: 0; margin-top: 1px; }
    .uif-text { display: flex; flex-direction: column; gap: 2px; }
    .uif-text strong { font-size: 13px; }
    .uif-text .uif-reason { font-size: 11px; opacity: .82; }
    .uif-text span { font-size: 12px; opacity: .8; }

    /* ===== ALERTAS PEP/LISTAS ===== */
    .alertas-uif-section { display: flex; flex-direction: column; gap: 8px; margin: 14px 0; }
    .alerta-uif {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 10px 14px; border-radius: 8px;
      background: var(--warning-bg, #fffbeb); border: 1px solid var(--warning-border, #fde68a); color: var(--warning-text, #92400e);
    }
    .alerta-uif.alerta-critico { background: var(--error-bg, #fef2f2); border-color: var(--error-border, #fca5a5); color: var(--error-text, #b91c1c); }
    .alerta-uif.alerta-alto { background: var(--orange-bg, #fff7ed); border-color: var(--orange-border, #fdba74); color: var(--warning-text, #c2410c); }
    .alerta-icon { flex-shrink: 0; margin-top: 1px; }
    .alerta-content { display: flex; flex-direction: column; gap: 2px; }
    .alerta-content strong { font-size: 13px; }
    .alerta-detalle { font-size: 12px; opacity: .8; }

    /* ===== SEÑALES DE ALERTA ===== */
    .senales-section {
      border: 1px solid var(--warning-border, #fde68a); border-radius: 10px;
      padding: 14px 16px; margin: 14px 0; background: var(--warning-bg, #fffbeb);
    }
    .senales-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 600; color: var(--warning-text, #92400e); margin: 0 0 10px;
    }
    .senal-item {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 10px; font-size: 12px; border-radius: 6px; margin: 4px 0;
      background: rgba(0,0,0,.03);
    }
    .senal-item.senal-alto { background: var(--error-bg, #fef2f2); color: var(--error-text, #b91c1c); }
    .senal-item.senal-medio { background: var(--warning-bg, #fffbeb); color: var(--warning-text, #92400e); }
    .senal-badge {
      font-size: 10px; font-weight: 700; padding: 2px 6px;
      border-radius: 4px; background: #f59e0b; color: #fff;
    }
    .senal-item.senal-alto .senal-badge { background: #ef4444; }

    /* ===== DD BLOCK ===== */
    .dd-block { animation: pulse-border 2s infinite; }
    @keyframes pulse-border { 0%,100% { border-color: #fecaca; } 50% { border-color: #ef4444; } }

    /* ===== OBSERVACIONES ===== */
    .observaciones-section {
      border: 1px solid var(--border, #e2e8f0); border-radius: 10px;
      padding: 14px 16px; margin: 14px 0; background: var(--hover-bg, #f8fafc);
    }
    .observaciones-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 600; color: var(--text-primary, #334155); margin: 0 0 10px;
    }
    .obs-checkboxes { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
    .obs-check {
      display: flex; align-items: flex-start; gap: 8px; font-size: 12px;
      color: var(--text-secondary, #475569); cursor: pointer;
    }
    .obs-check input[type="checkbox"] { margin-top: 2px; accent-color: #F58634; }

    /* ===== PCC-06 SECTION ===== */
    .pcc06-section {
      border: 1px solid var(--border, #e8e8e8); border-left: 4px solid #ef4444; border-radius: 12px;
      padding: 18px; margin: 14px 0; background: var(--card-bg, #fff);
    }
    .pcc06-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 14px; font-weight: 700; color: #b91c1c; margin: 0 0 14px;
    }

    /* ===== COMPLEMENTO UIF ===== */
    .complemento-section {
      border: 1px solid var(--border, #e8e8e8); border-left: 4px solid #F58634; border-radius: 12px;
      padding: 18px; margin: 14px 0; background: var(--card-bg, #fff);
    }
    .complemento-header {
      display: flex; align-items: center; justify-content: space-between;
      cursor: pointer;
    }
    .complemento-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 14px; font-weight: 700; color: #b45309; margin: 0;
    }
    .pep-subsection {
      border-top: 1px solid var(--border, #ececec); padding-top: 14px; margin-top: 14px;
    }
    .pep-subtitle {
      font-size: 12px; font-weight: 700; color: var(--text-secondary, #666);
      text-transform: uppercase; letter-spacing: .03em; margin: 0 0 12px;
    }

    /* ===== COBRO SECTION ===== */
    .cobro-section {
      padding: 14px 16px; background: var(--card-bg, #fff); border-radius: 12px;
      border: 1px solid var(--border, #e8e8e8);
    }
    .cobro-row { display: flex; gap: 6px; align-items: center; margin-bottom: 6px; flex-wrap: wrap; }
    /* Método de pago con mat-form-field */
    .mp-row { display: flex; gap: 10px; align-items: flex-end; margin-bottom: 8px; flex-wrap: wrap; }
    .mp-row > .mat-mdc-form-field { min-width: 120px; flex: 1 1 0; }
    .btn-remove-mp {
      display: inline-flex; align-items: center; justify-content: center;
      width: 36px; height: 40px; margin-bottom: 22px; flex: 0 0 auto;
      background: none; border: none; border-radius: 8px; cursor: pointer;
      color: var(--mat-sys-error, #d32f2f); transition: background .15s;
    }
    .btn-remove-mp:hover { background: rgba(211,47,47,.1); }
    .btn-remove-mp mat-icon { font-size: 20px; width: 20px; height: 20px; line-height: 20px; }
    .cobro-select { flex: 1; min-width: 0; font-size: 12px; padding: 6px 8px; border: 1px solid var(--border, #d1d5db); border-radius: 6px; }
    .cobro-monto { width: 100px; font-size: 12px; padding: 6px 8px; border: 1px solid var(--border, #d1d5db); border-radius: 6px; }
    .cobro-ref { width: 120px; font-size: 12px; padding: 6px 8px; border: 1px solid var(--border, #d1d5db); border-radius: 6px; }
    .cobro-select-cuenta { flex: 1; min-width: 0; font-size: 12px; padding: 6px 8px; border: 1px solid var(--border, #d1d5db); border-radius: 6px; }
    .cobro-actions-row { display: flex; justify-content: space-between; align-items: center; margin-top: 4px; }
    .btn-link {
      background: none; border: none; color: #0369a1; cursor: pointer;
      font-size: 12px; font-weight: 600; padding: 2px 0;
    }
    .btn-link:hover { text-decoration: underline; }
    .btn-icon-sm {
      width: 24px; height: 24px; border-radius: 50%; border: 1px solid #cbd5e1;
      background: var(--card-bg, #fff); cursor: pointer; font-size: 12px; color: var(--text-secondary, #64748b);
      display: flex; align-items: center; justify-content: center;
    }
    .btn-icon-sm:hover { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }
    .cobro-total { font-size: 12px; font-weight: 600; }
    .cobro-ok { color: #16a34a; }
    .cobro-err { color: #dc2626; }

    /* Cambio (vuelto) en el popup de confirmación */
    .confirm-row.cambio-row strong { color: #16a34a; }

    /* Campos calculados de solo lectura con apariencia mat-form-field */
    .ff-readonly ::ng-deep .mat-mdc-text-field-wrapper { background: var(--hover-bg, #f6f6f6); border-radius: 4px; }
    .ff-readonly ::ng-deep input { font-weight: 700; color: var(--text, #373435); }
    .ff-total ::ng-deep input { color: #F58634; font-size: 1.05rem; }
    .ff-total ::ng-deep .mat-mdc-text-field-wrapper { background: var(--mat-sys-primary-container, #fde8d0); }
    .ff-negative ::ng-deep input { color: #dc2626; }

    /* ===== SEARCH STATUS ===== */
    .search-status {
      display: flex; align-items: center; gap: 8px; padding: 12px 0; color: var(--text-secondary, #64748b); font-size: 13px;
    }

    /* ===== CLIENTE FOUND / NEW ===== */
    .cliente-found, .cliente-new {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px; border-radius: 10px; margin: 12px 0;
    }
    .cliente-found { background: var(--success-bg, #f0fdf4); border: 1px solid var(--success-border, #bbf7d0); }
    .btn-edit-cliente { margin-left: auto; display: flex; align-items: center; gap: 4px; padding: 4px 10px; border: 1px solid var(--border, #d1d5db); border-radius: 6px; background: var(--card-bg, #fff); color: var(--text-secondary, #64748b); font-size: 12px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: all .15s; }
    .btn-edit-cliente:hover { border-color: #F58634; color: #F58634; }
    .cliente-new { background: var(--orange-bg, #fff8f0); border: 1px solid var(--orange-border, #fed7aa); }
    .cliente-info { display: flex; flex-direction: column; gap: 2px; }
    .cliente-info strong { font-size: 14px; color: var(--text-primary, #14213d); }
    .cliente-info span { font-size: 12px; color: var(--text-secondary, #64748b); }
    .cliente-new span { font-size: 13px; color: #9a3412; font-weight: 500; }
    .cliente-form { border-top: 1px solid var(--border, #e5e7eb); padding-top: 16px; margin-top: 12px; }
    .profile-badge {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 600;
      margin-bottom: 12px;
    }
    .profile-badge.extranjero { background: var(--info-bg, #dbeafe); color: var(--info-text, #1e40af); }

    /* ===== ACTIONS ===== */
    .form-actions {
      display: flex; justify-content: flex-end; gap: 10px;
      padding-top: 16px; border-top: 1px solid var(--border-light, #f1f5f9); margin-top: 16px;
    }
    .btn-primary {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 10px 22px; background: #F5820A; color: #fff; border: none;
      border-radius: 9px; font-size: 14px; font-weight: 700; cursor: pointer;
    }
    .btn-primary:hover:not(:disabled) { background: #e07009; }
    .btn-primary:disabled { opacity: .5; cursor: not-allowed; }
    .campos-faltantes {
      display: flex; align-items: center; gap: 6px; justify-content: flex-end;
      margin-top: 8px; font-size: 12px; color: var(--warning-text, #92400e);
      background: var(--warning-bg, #fffbeb); border: 1px solid var(--warning-border, #fde68a);
      padding: 6px 12px; border-radius: 8px;
    }
    .campos-faltantes svg { flex-shrink: 0; color: var(--warning-text, #f59e0b); }
    .btn-link-inline {
      background: none; border: none; color: #F58634; font-size: 12px; font-weight: 600;
      cursor: pointer; text-decoration: underline; padding: 0; margin-left: auto;
    }
    .btn-link-inline:hover { color: #e07528; }
    .btn-secondary {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 10px 18px; background: var(--card-bg, #fff); color: var(--text-secondary, #64748b); border: 1px solid var(--border, #d1d5db);
      border-radius: 9px; font-size: 14px; font-weight: 600; cursor: pointer;
    }
    .btn-secondary:hover { background: var(--hover-bg, #f8fafc); color: var(--text-primary, #14213d); }
    .btn-back {
      display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px;
      background: transparent; border: 1px solid var(--border, #d1d5db); border-radius: 7px;
      color: var(--text-secondary, #64748b); font-size: 13px; cursor: pointer;
    }
    .btn-back:hover { background: var(--hover-bg, #f8fafc); color: var(--text-primary, #14213d); }

    /* ===== CONFIRM OVERLAY ===== */
    .overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 100;
      display: flex; align-items: center; justify-content: center;
    }
    /* Popup de confirmación (mismo estilo que Giro Nacional) */
    .confirm-dialog { background: var(--card-bg, #fff); border-radius: 16px; padding: 22px; max-width: 460px; width: 92%; box-shadow: 0 20px 50px rgba(0,0,0,.25); }
    .cd-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
    .cd-head mat-icon { color: #F58634; background: var(--mat-sys-primary-container, #fde8d0); border-radius: 10px; padding: 8px; font-size: 22px; width: 22px; height: 22px; box-sizing: content-box; }
    .cd-head-txt h3 { margin: 0; font-size: 1.05rem; font-weight: 700; color: var(--text, #373435); }
    .cd-head-txt small { font-size: 0.75rem; color: var(--text-secondary, #8a8a8a); }
    .cd-rows { border: 1px solid var(--border, #ececec); border-radius: 12px; overflow: hidden; }
    .cd-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 10px 14px; font-size: 0.85rem; }
    .cd-row:not(:last-child) { border-bottom: 1px solid var(--border-light, #f3f3f3); }
    .cd-row > span { display: inline-flex; align-items: center; gap: 7px; color: var(--text-secondary, #8a8a8a); white-space: nowrap; }
    .cd-row > span mat-icon { font-size: 17px; width: 17px; height: 17px; color: var(--text-muted, #b4b4b4); }
    .cd-row > strong { color: var(--text, #373435); text-align: right; font-weight: 600; }
    .cd-amounts { display: flex; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
    .cd-amt { flex: 1 1 110px; display: flex; flex-direction: column; gap: 2px; background: var(--hover-bg, #f8f8f8); border-radius: 10px; padding: 9px 12px; }
    .cd-amt span { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-secondary, #8a8a8a); }
    .cd-amt b { font-size: 0.95rem; color: var(--text, #373435); font-variant-numeric: tabular-nums; }
    .cd-amt-cambio b { color: #16a34a; }
    .cd-total { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; padding: 14px 18px; border-radius: 12px; background: linear-gradient(135deg, #F58634 0%, #e0701a 100%); color: #fff; box-shadow: 0 6px 16px rgba(245,134,52,.3); }
    .cd-total span { font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.6px; opacity: 0.92; }
    .cd-total strong { font-size: 1.55rem; font-weight: 800; font-variant-numeric: tabular-nums; }
    .cd-total strong small { font-size: 0.8rem; font-weight: 600; opacity: 0.85; }
    .confirm-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
    .confirm-actions .btn-primary { display: inline-flex; align-items: center; gap: 6px; }
    .confirm-actions .btn-primary mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* ===== RESULT ===== */
    .result-card { text-align: center; }
    .result-icon { margin-bottom: 12px; }
    .result-title { font-size: 20px; font-weight: 700; color: #16a34a; margin: 0 0 20px; }
    .result-grid {
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; text-align: left;
    }
    .result-item { background: var(--hover-bg, #f8fafc); border-radius: 10px; padding: 14px; }
    .result-label {
      display: block; font-size: 11px; font-weight: 600; color: var(--text-muted, #94a3b8);
      text-transform: uppercase; letter-spacing: .04em; margin-bottom: 4px;
    }
    .result-value { font-size: 16px; font-weight: 700; color: var(--text-primary, #14213d); }
    .result-value.big { font-size: 22px; color: #F5820A; }
    .result-value.sm { font-size: 13px; }

    .result-item.full-width { grid-column: 1 / -1; }
    .result-value.cuf { font-size: 11px; word-break: break-all; font-family: monospace; font-weight: 500; }
    .result-value.contingencia { color: #dc2626; }
    .factura-section {
      margin-top: 16px; padding-top: 16px; border-top: 1px dashed var(--border, #cbd5e1);
    }
    .factura-header {
      font-size: 13px; font-weight: 700; color: var(--text-primary, #14213d); text-transform: uppercase;
      letter-spacing: .05em; margin-bottom: 12px;
    }

    /* ===== RECEIPT PRINT ===== */
    .receipt-header, .receipt-footer, .print-only { display: none; }

    /* ===== SPINNER ===== */
    .spinner {
      width: 28px; height: 28px; border: 3px solid var(--border, #e5e7eb); border-top-color: #F5820A;
      border-radius: 50%; animation: spin .7s linear infinite;
    }
    .spinner.sm { width: 16px; height: 16px; border-width: 2px; }
    .spinner.white { border-color: rgba(255,255,255,.3); border-top-color: #fff; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ===== MOBILE ===== */
    @media (max-width: 700px) {
      .form-row.two, .form-row.three, .form-row.four { grid-template-columns: 1fr; }
      .op-buttons { grid-template-columns: 1fr; }
      .result-grid { grid-template-columns: 1fr 1fr; }
      .cotiz-strip { flex-wrap: wrap; }
      .confirm-modal { width: 100%; }
    }

    /* ===== PRINT ===== */
    @media print {
      .no-print { display: none !important; }
      .print-only { display: block !important; }
      .receipt-header {
        display: flex !important; flex-direction: column; align-items: center;
        margin-bottom: 20px; padding-bottom: 12px; border-bottom: 2px solid #14213d;
      }
      .receipt-header strong { font-size: 18px; color: var(--text-primary, #14213d); }
      .receipt-header span { font-size: 13px; color: var(--text-secondary, #64748b); }
      .receipt-footer {
        display: flex !important; justify-content: space-around; margin-top: 40px; padding-top: 20px;
      }
      .sign-line { text-align: center; }
      .sign-space { width: 180px; border-bottom: 1px solid #333; height: 50px; }
      .sign-line span { font-size: 12px; color: var(--text-secondary, #64748b); display: block; margin-top: 6px; }
      .section-card { border: none; box-shadow: none; padding: 0; }
      .result-item { border: 1px solid var(--border, #ddd); }
      .form-actions { display: none !important; }
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
      font-weight: 600; font-size: 15px;
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
      align-items: center; justify-content: center;
    }
    .btn-popup-close:hover { background: #e5e7eb; }
    .pdf-popup-body { flex: 1; overflow: hidden; }
    .pdf-popup-loading {
      display: flex; align-items: center; justify-content: center;
      height: 100%; color: var(--text-secondary, #6b7280); font-size: 14px;
    }
  `],
})
export class CambioComponent implements OnInit {
  private cambioSvc = inject(CambioService);
  private cajeroSvc = inject(CajeroService);
  private snack = inject(MatSnackBar);
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  showPdfPopup = false;
  pdfPopupUrl: SafeResourceUrl | null = null;
  pdfPopupTitulo = '';
  pdfPopupLoading = false;
  private pdfBlobUrl: string | null = null;

  loading = true;
  mode: Mode = 'select';
  cotizaciones: CotizacionInfo[] = [];
  cat: Catalogos = {
    tipos_documento: [], expediciones: [], monedas: [],
    sexos: [], estados_civiles: [], ocupaciones: [],
    actividades_economicas: [], paises: [], departamentos: [], ciudades: [],
    cargos: [],
    defaults: { id_pais: 26, id_departamento: 0 },
  };
  ciudadesFiltradas: any[] = [];
  selectedDpto = '0';

  idOperacion = 0;

  /**
   * Identificador de idempotencia de la operación en curso.
   *
   * Se genera UNA vez por operación y se reutiliza en cada reintento. Antes se
   * generaba un uuid nuevo en cada click de "Registrar", lo que anulaba la
   * protección del backend: si la petición llegaba al servidor pero la respuesta
   * se perdía (timeout), reintentar creaba una SEGUNDA operación real —doble
   * cambio, doble factura y doble asiento— en lugar de devolver el comprobante ya
   * emitido. El backend ya soporta el replay contra `pos_operacion_log.uuid`.
   *
   * Se limpia solo al iniciar una operación nueva (`resetAll`): un error de red
   * debe conservarlo para que el reintento sea idempotente, y un éxito también,
   * para que un doble click tardío no duplique.
   */
  private operacionUuid: string | null = null;

  private uuidOperacion(): string {
    if (this.operacionUuid) return this.operacionUuid;

    // `crypto.randomUUID` exige contexto seguro (HTTPS o localhost). Si el POS se
    // sirve por HTTP en una red interna no existe, así que hay fallback.
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      this.operacionUuid = crypto.randomUUID();
    } else {
      this.operacionUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }

    return this.operacionUuid;
  }

  clienteDoc = { tipoDoc: '1', documento: '', expedicion: '0' };
  cliente: ClienteInfo = this.emptyCliente();
  clienteEncontrado: boolean | null = null;
  buscandoCliente = false;
  showClienteForm = false;
  // Slider "Mismo número": replica el celular en Tel. Domicilio y Tel. Trabajo.
  mismoNro = true;

  /** Formulario reactivo del cliente; espeja a `cliente` (patrón puente). */
  clienteForm = this.fb.group({
    nombres: ['', Validators.required],
    ape_pat: ['', Validators.required],
    ape_mat: [''],
    celular: ['', Validators.required],
    email: ['', Validators.email],
    fecha_nacimiento: ['', Validators.required],
    id_sexo: [1 as number],
    id_pais: [26 as number],
    lugar_nacimiento: [''],
    id_estado_civil: [1 as number],
    id_ocupacion: [1 as number],
    id_actividad_economica: [1 as number],
    departamento: ['0'],
    id_ciudad: [0 as number, Validators.min(1)],
    zona: [''],
    domicilio: ['', Validators.required],
    tel_dom: [''],
    tel_trab: [''],
    nit: [''],
    e_trabajo: [''],
    e_cargo: [''],
    e_direccion: [''],
  });

  selectedMoneda = '0';
  tipoCambio = 0;
  diferencial = 0;
  monto = 0;
  confirma = 0;
  totalCambio = 0;
  recibido = 0;
  entregado = 0;
  cambioDevolucion = 0;
  registrando = false;
  resultado: CambioResponse | null = null;

  uifResult: UifCheckResponse | null = null;
  checkingUif = false;
  requiereFormulario = false;
  requierePcc06 = false;
  alertasUif: UifAlerta[] = [];
  senalesAlerta: UifSenal[] = [];
  esUsuarioHabitual = false;
  requiereOrigenDestino = false;
  ddIncompleta = false;
  ddBloqueado = false;
  observacionesUif = '';
  senalesSeleccionadas: string[] = [];
  pcc06: Pcc06Data = this.emptyPcc06();
  complemento: ComplementoData = this.emptyComplemento();
  showComplementoSection = false;
  expAnios = 0;
  expMeses = 0;
  expSecAnios = 0;
  expSecMeses = 0;
  expConAnios = 0;
  expConMeses = 0;
  showConfirmDialog = false;
  formasPagoCobro: FormaPagoCobro[] = [];
  cuentasBancarias: CuentaBancariaCobro[] = [];
  metodosPago: {
    id_forma_pago: number; monto: number; referencia: string;
    num_cuenta_bancaria: string; id_entidad_financiera: number;
    id_agencia: number; id_moneda_cuenta: number; id_tipo_cuenta_bancaria: number;
    _cuentaKey: string;
  }[] = [
    this.emptyMetodoPago(),
  ];
  showEmpleoSection = false;
  showNitField = false;

  private readonly ocupacionToActividad: Record<number, number> = {
    0: 0,     // OTRA → OTRA
    1: 18,    // ABOGADO → OTRAS ACT. SERVICIO COMUNITARIO
    2: 18,    // ADMINISTRADOR DE EMPRESAS → OTRAS ACT. SERVICIO
    3: 4,     // AGRICULTOR → AGRICULTURA, GANADERIA
    4: 7,     // ALBAÑIL → CONSTRUCCION
    5: 0,     // AMA DE CASA → OTRA
    6: 18,    // ANALISTA DE SISTEMAS → OTRAS ACT. SERVICIO
    7: 8,     // ANTROPOLOGO → ENSEÑANZA, EDUCACION
    8: 8,     // ARQUEOLOGO → ENSEÑANZA, EDUCACION
    9: 7,     // ARQUITECTO → CONSTRUCCION
    10: 16,   // AUDITOR → INTERMEDIACION FINANCIERA
    11: 8,    // BIBLIOTECARIO → ENSEÑANZA, EDUCACION
    12: 20,   // BIOLOGO → SERVICIOS SOCIALES Y DE SALUD
    13: 20,   // BIOQUIMICO → SERVICIOS SOCIALES Y DE SALUD
    14: 20,   // BIOTECNOLOGO → SERVICIOS SOCIALES Y DE SALUD
    15: 16,   // CAJERO → INTERMEDIACION FINANCIERA
    16: 15,   // CARPINTERO → INDUSTRIAS MANUF. NO METALICAS
    17: 14,   // CHAPISTA → INDUSTRIAS MANUF. METALICAS
    18: 21,   // CHOFER → TRANSPORTE
    19: 13,   // COCINERO → HOTELES Y RESTAURANTES
    20: 5,    // COMERCIANTE → COMERCIO AL POR MAYOR Y MENOR
    21: 21,   // COMUNICADOR SOCIAL → TRANSPORTE, COMUNICACIONES
    22: 18,   // CONSULTOR → OTRAS ACT. SERVICIO
    23: 16,   // CONTADOR → INTERMEDIACION FINANCIERA
    24: 7,    // CONTRATISTA → CONSTRUCCION
    25: 18,   // COSMETOLOGA → OTRAS ACT. SERVICIO
    26: 1,    // DISEÑADOR GRAFICO → ACT. DE IMPRESION
    27: 16,   // ECONOMISTA → INTERMEDIACION FINANCIERA
    28: 19,   // ELECTRICISTA → SUMINISTRO ELECTRICIDAD
    29: 18,   // EMPLEADO → OTRAS ACT. SERVICIO
    30: 20,   // ENFERMERA → SERVICIOS SOCIALES Y DE SALUD
    31: 15,   // ENOLOGO → INDUSTRIAS MANUF. NO METALICAS
    32: 18,   // ESTADISTICO → OTRAS ACT. SERVICIO
    33: 8,    // ESTUDIANTE → ENSEÑANZA, EDUCACION
    34: 20,   // FARMACEUTICO → SERVICIOS SOCIALES Y DE SALUD
    35: 8,    // FISICO → ENSEÑANZA, EDUCACION
    36: 20,   // FISIOTERAPEUTA → SERVICIOS SOCIALES Y DE SALUD
    37: 18,   // FOTOGRAFO → OTRAS ACT. SERVICIO
    38: 4,    // GANADERO → AGRICULTURA, GANADERIA
    39: 9,    // GEOLOGO → EXPLOTACION MINAS
    40: 8,    // HISTORIADOR → ENSEÑANZA, EDUCACION
    41: 18,   // INFORMATICO → OTRAS ACT. SERVICIO
    42: 18,   // INGENIERO DE SISTEMAS → OTRAS ACT. SERVICIO
    43: 18,   // INGENIERO ELECTRONICO → OTRAS ACT. SERVICIO
    44: 21,   // INGENIERO AERONAUTICO → TRANSPORTE
    45: 4,    // INGENIERO AGRONOMO → AGRICULTURA
    46: 18,   // INGENIERO AMBIENTAL → OTRAS ACT. SERVICIO
    47: 7,    // INGENIERO CIVIL → CONSTRUCCION
    48: 5,    // INGENIERO COMERCIAL → COMERCIO
    49: 19,   // INGENIERO ELECTRICO → SUMINISTRO ELECTRICIDAD
    50: 15,   // INGENIERO EN ALIMENTOS → INDUSTRIAS MANUF. NO METALICAS
    51: 14,   // INGENIERO EN METALURGICA → INDUSTRIAS MANUF. METALICAS
    52: 21,   // INGENIERO EN TELECOMUNICACIONES → TRANSPORTE, COMUNICACIONES
    53: 4,    // INGENIERO FORESTAL → AGRICULTURA
    54: 9,    // INGENIERO GEOGRAFICO → EXPLOTACION MINAS
    55: 9,    // INGENIERO GEOLOGICO → EXPLOTACION MINAS
    56: 12,   // INGENIERO INDUSTRIAL → FABRICACION MAQUINARIA
    57: 11,   // INGENIERO PETROLERO → EXTRACCION PETROLEO
    58: 15,   // INGENIERO QUIMICO → INDUSTRIAS MANUF. NO METALICAS
    59: 0,    // JUBILADO O RENTISTA → OTRA
    60: 3,    // LIC. EN CIENCIAS POLITICAS → ADM. PUBLICA
    61: 5,    // LIC. EN COMERCIO INTERNACIONAL → COMERCIO
    62: 20,   // LIC. EN TECNOLOGIA MEDICA → SERVICIOS SOCIALES Y DE SALUD
    63: 13,   // LIC. EN TURISMO → HOTELES Y RESTAURANTES
    64: 4,    // MADERERO → AGRICULTURA, GANADERIA, EXTRACCION MADERA
    65: 8,    // MATEMATICO → ENSEÑANZA, EDUCACION
    66: 12,   // MECANICO AUTOMOTRIZ → FABRICACION MAQUINARIA
    67: 12,   // MECANICO INDUSTRIAL → FABRICACION MAQUINARIA
    68: 20,   // MEDICO → SERVICIOS SOCIALES Y DE SALUD
    69: 21,   // MENSAJERO → TRANSPORTE
    70: 14,   // METALURGICO → INDUSTRIAS MANUF. METALICAS
    71: 18,   // METEOROLOGO → OTRAS ACT. SERVICIO
    72: 3,    // MILITAR → ADM. PUBLICA Y DEFENSA
    73: 9,    // MINERO → EXPLOTACION MINAS
    74: 17,   // MISIONERA → ONG, FUNDACIONES
    75: 15,   // MODISTA → INDUSTRIAS MANUF. NO METALICAS (TEXTILES)
    76: 18,   // MUCAMA → OTRAS ACT. SERVICIO
    77: 18,   // MUSICO → OTRAS ACT. SERVICIO
    78: 20,   // NATURISTA → SERVICIOS SOCIALES Y DE SALUD
    79: 20,   // NUTRICIONISTA → SERVICIOS SOCIALES Y DE SALUD
    80: 20,   // ODONTOLOGO → SERVICIOS SOCIALES Y DE SALUD
    81: 20,   // ORTOPEDISTA → SERVICIOS SOCIALES Y DE SALUD
    82: 15,   // PANADERO → INDUSTRIAS MANUF. NO METALICAS (ALIMENTOS)
    83: 18,   // PEINADORA → OTRAS ACT. SERVICIO
    84: 18,   // PELUQUERA → OTRAS ACT. SERVICIO
    85: 21,   // PERIODISTA → TRANSPORTE, COMUNICACIONES
    86: 7,    // PINTOR → CONSTRUCCION
    87: 10,   // PISCICULTOR → CRIADEROS DE PECES
    88: 7,    // PLOMERO → CONSTRUCCION
    89: 3,    // POLICIA → ADM. PUBLICA Y DEFENSA
    90: 8,    // PROFESOR → ENSEÑANZA, EDUCACION
    91: 18,   // PROGRAMADOR → OTRAS ACT. SERVICIO
    92: 20,   // PSICOLOGO → SERVICIOS SOCIALES Y DE SALUD
    93: 18,   // PUBLICISTA → OTRAS ACT. SERVICIO
    94: 15,   // QUIMICO → INDUSTRIAS MANUF. NO METALICAS
    95: 20,   // QUIMICO FARMACEUTICO → SERVICIOS SOCIALES Y DE SALUD
    96: 15,   // QUIMICO INDUSTRIAL → INDUSTRIAS MANUF. NO METALICAS
    97: 21,   // RADIOTECNICO → TRANSPORTE, COMUNICACIONES
    98: 5,    // RELOJERO → COMERCIO
    99: 17,   // SACERDOTE → ONG, FUNDACIONES
    100: 15,  // SASTRE → INDUSTRIAS MANUF. NO METALICAS (TEXTILES)
    101: 18,  // SECRETARIA → OTRAS ACT. SERVICIO
    102: 8,   // SOCIOLOGO → ENSEÑANZA, EDUCACION
    103: 3,   // SOLDADO → ADM. PUBLICA Y DEFENSA
    104: 14,  // SOLDADOR → INDUSTRIAS MANUF. METALICAS
    105: 21,  // TAXISTA → TRANSPORTE
    106: 18,  // TECNICO → OTRAS ACT. SERVICIO
    107: 7,   // TOPOGRAFO GEODESTA → CONSTRUCCION
    108: 18,  // TRABAJADORA DEL HOGAR → OTRAS ACT. SERVICIO
    109: 20,  // TRABAJADORA SOCIAL → SERVICIOS SOCIALES Y DE SALUD
    110: 8,   // TRADUCTOR → ENSEÑANZA, EDUCACION
    111: 21,  // TRANSPORTISTA → TRANSPORTE
    112: 20,  // VETERINARIO → SERVICIOS SOCIALES Y DE SALUD
    113: 20,  // VISITADOR MEDICO → SERVICIOS SOCIALES Y DE SALUD
    114: 15,  // ZAPATERO → INDUSTRIAS MANUF. NO METALICAS (CUERO)
  };

  private readonly frecuentOcupaciones = ['COMERCIANTE', 'EMPLEADO', 'AMA DE CASA', 'CHOFER'];

  get montoMismatch(): boolean {
    return this.monto > 0 && this.confirma > 0 && Math.abs(this.monto - this.confirma) > 0.01;
  }

  get isExtranjero(): boolean {
    return +this.cliente.id_pais !== 26;
  }

  /** La expedición sólo aplica a Cédula de Identidad (id_tipo_doc 1). */
  get esCedula(): boolean {
    return +this.clienteDoc.tipoDoc === 1;
  }

  get tieneNit(): boolean {
    return (this.cliente.nit ?? '').trim().length > 0;
  }

  get clienteReady(): boolean {
    return this.camposFaltantesCliente.length === 0;
  }

  get camposFaltantesCliente(): string[] {
    const f: string[] = [];
    if (!this.cliente.nombres) f.push('Nombres');
    if (!this.cliente.ape_pat) f.push('Apellido Paterno');
    if (!this.cliente.celular) f.push('Celular');
    if (!this.cliente.fecha_nacimiento) f.push('Fecha Nacimiento');
    if (this.isExtranjero) {
      if (+this.cliente.id_pais <= 0) f.push('País');
    } else {
      if (this.esCedula && +this.clienteDoc.expedicion === 0) f.push('Expedición');
      if (!this.cliente.domicilio?.trim()) f.push('Domicilio');
      if (+this.cliente.id_actividad_economica <= 0) f.push('Actividad Económica');
      if (+this.cliente.id_ciudad <= 0) f.push('Ciudad');
    }
    if (this.showNitField && !this.cliente.nit?.trim()) f.push('NIT');
    return f;
  }

  get sortedOcupaciones(): any[] {
    if (!this.cat.ocupaciones.length) return [];
    const freq = this.frecuentOcupaciones;
    return [...this.cat.ocupaciones].sort((a, b) => {
      const aIdx = freq.indexOf((a['descripcion'] || '').toUpperCase());
      const bIdx = freq.indexOf((b['descripcion'] || '').toUpperCase());
      if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
      if (aIdx >= 0) return -1;
      if (bIdx >= 0) return 1;
      return 0;
    });
  }

  get showApellidoCasada(): boolean {
    if (+this.cliente.id_sexo !== 2) return false;
    const ecId = +this.cliente.id_estado_civil;
    const ec = this.cat.estados_civiles.find(e => +e['id_estado_civil'] === ecId);
    if (!ec) return false;
    const desc = (ec['descripcion'] || '').toUpperCase();
    return desc.includes('CASAD') || desc.includes('VIUD');
  }

  get showActividadSecundaria(): boolean {
    return +this.complemento.c_actividad_secundaria_id > 0;
  }

  get showConyugeFields(): boolean {
    const ecId = +this.cliente.id_estado_civil;
    const ec = this.cat.estados_civiles.find(e => +e['id_estado_civil'] === ecId);
    if (!ec) return false;
    const desc = (ec['descripcion'] || '').toUpperCase();
    return desc.includes('CASAD') || desc.includes('UNION') || desc.includes('UNIÓN');
  }

  get canRegister(): boolean {
    if (this.ddBloqueado) return false;
    if (+this.selectedMoneda <= 0 || this.monto <= 0 || this.montoMismatch) return false;
    if (this.confirma <= 0 || this.totalCambio <= 0 || this.entregado <= 0) return false;

    // La validación de la suma de métodos vs. total se hace al presionar Registrar
    // (ver abrirConfirmacion), para poder explicar el problema con un SweetAlert.

    if (this.requierePcc06) {
      if (!this.pcc06.origen || this.pcc06.origen.length < 20) return false;
      if (!this.pcc06.destino || this.pcc06.destino.length < 20) return false;
      if (this.pcc06.dinero_si === 0) {
        if (!this.pcc06.nombres_dd) return false;
        if (!this.pcc06.doc_nit_dd) return false;
        if (!this.pcc06.domicilio_dd) return false;
        if (!this.pcc06.telefono_dd) return false;
      }
    } else if (this.requiereOrigenDestino) {
      if (!this.pcc06.origen || this.pcc06.origen.length < 5) return false;
      if (!this.pcc06.destino || this.pcc06.destino.length < 5) return false;
    }

    if (this.requiereFormulario && !this.isComplementoValid) return false;

    return true;
  }

  observacionesPredefinidas = OBSERVACIONES_PREDEFINIDAS;

  toggleObservacion(obs: string): void {
    const idx = this.senalesSeleccionadas.indexOf(obs);
    if (idx >= 0) {
      this.senalesSeleccionadas.splice(idx, 1);
    } else {
      this.senalesSeleccionadas.push(obs);
    }
  }

  getObservacionesCompletas(): string {
    const partes = [...this.senalesSeleccionadas];
    if (this.observacionesUif.trim()) partes.push(this.observacionesUif.trim());
    return partes.join(' | ');
  }

  get isComplementoValid(): boolean {
    if (+this.complemento.c_pais_residencia_id <= 0) return false;
    if (!this.complemento.c_ciudad_residencia?.trim()) return false;
    if (+this.complemento.c_ingresos <= 0) return false;
    if (!this.complemento.c_fecha_ingreso) return false;

    if (this.complemento.c_dependiente_estado_anterior === 'S') {
      if (!this.complemento.c_entidad_trabajo_anterior?.trim()) return false;
      if (+this.complemento.c_cargo_trabajo_anterior_id <= 0) return false;
      if (!this.complemento.c_fecha_inicio_trabajo_anterior) return false;
      if (!this.complemento.c_fecha_fin_trabajo_anterior) return false;
    }

    if (this.complemento.c_dependiente_estado_actual === 'S') {
      if (!this.complemento.c_entidad_trabajo_actual?.trim()) return false;
      if (+this.complemento.c_cargo_trabajo_actual_id <= 0) return false;
    }

    if (this.showConyugeFields) {
      if (!this.complemento.c_nombres_conyugue?.trim()) return false;
      if (!this.complemento.c_apellido_paterno_conyugue?.trim()) return false;
    }

    return true;
  }

  ngOnInit(): void {
    const qOp = this.route.snapshot.queryParamMap.get('op');

    // Puente formulario → objeto cliente (mantiene la lógica existente).
    this.clienteForm.valueChanges.subscribe(v => {
      const c = this.cliente;
      c.nombres = v.nombres ?? ''; c.ape_pat = v.ape_pat ?? ''; c.ape_mat = v.ape_mat ?? '';
      c.celular = v.celular ?? ''; c.email = v.email ?? '';
      c.fecha_nacimiento = v.fecha_nacimiento ?? '';
      c.id_sexo = v.id_sexo ?? 1; c.id_pais = v.id_pais ?? 26;
      c.lugar_nacimiento = v.lugar_nacimiento ?? '';
      c.id_estado_civil = v.id_estado_civil ?? 1; c.id_ocupacion = v.id_ocupacion ?? 1;
      c.id_actividad_economica = v.id_actividad_economica ?? 1; c.id_ciudad = v.id_ciudad ?? 0;
      c.zona = v.zona ?? ''; c.domicilio = v.domicilio ?? '';
      c.tel_dom = v.tel_dom ?? ''; c.tel_trab = v.tel_trab ?? ''; c.nit = v.nit ?? '';
      c.e_trabajo = v.e_trabajo ?? ''; c.e_cargo = v.e_cargo ?? ''; c.e_direccion = v.e_direccion ?? '';
      this.selectedDpto = v.departamento ?? '0';
    });
    this.clienteForm.get('celular')!.valueChanges.subscribe(cel => {
      if (this.mismoNro) {
        this.clienteForm.patchValue({ tel_dom: cel ?? '', tel_trab: cel ?? '' }, { emitEvent: true });
      }
    });

    forkJoin({
      cotizaciones: this.cambioSvc.cotizaciones(),
      catalogos: this.cambioSvc.catalogos(),
      formasPagoCobro: this.cambioSvc.formasPagoCobro(),
      cuentasBancarias: this.cajeroSvc.cuentasBancariasCobro(),
    }).subscribe({
      next: ({ cotizaciones, catalogos, formasPagoCobro, cuentasBancarias }) => {
        this.cotizaciones = cotizaciones;
        this.cat = catalogos;
        this.formasPagoCobro = formasPagoCobro;
        this.cuentasBancarias = cuentasBancarias;
        this.loading = false;

        this.aplicarOpParam(qOp);
      },
      error: (err) => {
        this.snack.open(err.message || 'Error al cargar datos', 'OK', { duration: 5000 });
        this.loading = false;
      },
    });

    this.route.queryParamMap.subscribe(params => {
      if (this.loading) return;
      this.aplicarOpParam(params.get('op'));
    });
  }

  private aplicarOpParam(op: string | null): void {
    if (op === 'compra' && this.idOperacion !== 1) {
      if (this.idOperacion !== 0) this.goBack();
      this.selectOperacion(1);
    } else if (op === 'venta' && this.idOperacion !== 2) {
      if (this.idOperacion !== 0) this.goBack();
      this.selectOperacion(2);
    }
  }

  loadCotizaciones(): void {
    this.cambioSvc.cotizaciones().subscribe({
      next: (cots) => {
        this.cotizaciones = cots;
        const mid = +this.selectedMoneda;
        const cot = cots.find(c => c.id_moneda === mid);
        if (cot) {
          this.tipoCambio = (this.idOperacion === 1 ? cot.compra : cot.venta) ?? 0;
          this.calcular();
        }
      },
    });
  }

  selectOperacion(op: number): void {
    this.idOperacion = op;
    this.mode = 'cliente';
  }

  goBack(): void {
    this.mode = 'select';
    this.resetAll();
  }

  resetClienteSearch(): void {
    this.clienteEncontrado = null;
    this.showClienteForm = false;
  }

  buscarCliente(): void {
    const doc = this.clienteDoc.documento.trim();
    const exp = +this.clienteDoc.expedicion;
    if (!doc || !exp) return;

    this.buscandoCliente = true;
    this.cambioSvc.buscarCliente(doc, +this.clienteDoc.tipoDoc, exp).subscribe({
      next: (found) => {
        this.buscandoCliente = false;
        if (found) {
          this.cliente = { ...found };
          this.clienteEncontrado = true;
          this.showNitField = !!(found.nit && found.nit !== '0' && found.nit.trim());
          this.showClienteForm = false;
        } else {
          this.cliente = this.emptyCliente();
          this.cliente.id_tipo_doc_identidad = +this.clienteDoc.tipoDoc;
          this.cliente.num_doc_identidad = doc;
          this.cliente.id_expedicion = exp;
          this.clienteEncontrado = false;
          this.showClienteForm = true;
          if (this.cat.defaults?.id_departamento) {
            this.selectedDpto = String(this.cat.defaults.id_departamento);
            this.filterCiudades();
          }
        }
        this.sincronizarClienteForm();
        this.aplicarValidadorNit();
        // Mostrar los obligatorios en rojo al entrar al formulario.
        this.clienteForm.markAllAsTouched();
      },
      error: () => {
        this.buscandoCliente = false;
        Swal.fire({
          icon: 'warning',
          title: 'No se pudo buscar el cliente',
          text: 'Ocurrió un error al buscar el cliente.',
          confirmButtonColor: '#F58634',
        });
      },
    });
  }

  filterCiudades(): void {
    const dpto = +this.selectedDpto;
    this.ciudadesFiltradas = dpto
      ? this.cat.ciudades.filter(c => +c['id_departamento'] === dpto)
      : this.cat.ciudades;
  }

  /** Replica el celular en Tel. Domicilio y Tel. Trabajo. */
  private replicarCelular(): void {
    const cel = this.clienteForm.get('celular')!.value ?? '';
    this.clienteForm.patchValue({ tel_dom: cel, tel_trab: cel });
  }

  toggleMismoNro(): void {
    this.mismoNro = !this.mismoNro;
    if (this.mismoNro) { this.replicarCelular(); }
  }

  /** El NIT es obligatorio sólo cuando el toggle "Con NIT" está activo. */
  private aplicarValidadorNit(): void {
    const c = this.clienteForm.get('nit')!;
    c.setValidators(this.showNitField ? [Validators.required] : []);
    c.updateValueAndValidity({ emitEvent: false });
    if (this.showNitField) { c.markAsTouched(); }
  }

  /** Vuelca `cliente` al formulario reactivo (tras poblarlo desde la API). */
  private sincronizarClienteForm(): void {
    const c = this.cliente;
    const cel = c.celular ?? '', td = c.tel_dom ?? '', tt = c.tel_trab ?? '';
    this.mismoNro = (!td && !tt) || (td === cel && tt === cel);
    this.clienteForm.patchValue({
      nombres: c.nombres ?? '', ape_pat: c.ape_pat ?? '', ape_mat: c.ape_mat ?? '',
      celular: c.celular ?? '', email: c.email ?? '',
      fecha_nacimiento: c.fecha_nacimiento ?? '',
      id_sexo: c.id_sexo ?? 1, id_pais: c.id_pais ?? 26,
      lugar_nacimiento: c.lugar_nacimiento ?? '',
      id_estado_civil: c.id_estado_civil ?? 1, id_ocupacion: c.id_ocupacion ?? 1,
      id_actividad_economica: c.id_actividad_economica ?? 1, id_ciudad: c.id_ciudad ?? 0,
      zona: c.zona ?? '', domicilio: c.domicilio ?? '',
      tel_dom: c.tel_dom ?? '', tel_trab: c.tel_trab ?? '', nit: c.nit ?? '',
      e_trabajo: c.e_trabajo ?? '', e_cargo: c.e_cargo ?? '', e_direccion: c.e_direccion ?? '',
      departamento: this.selectedDpto ?? '0',
    }, { emitEvent: false });
  }

  onOcupacionChange(): void {
    const ocupId = +this.cliente.id_ocupacion;
    const actId = this.ocupacionToActividad[ocupId];
    if (actId !== undefined) {
      this.cliente.id_actividad_economica = actId;
    }
  }

  onExpChange(): void {
    const a = Math.max(0, Math.floor(this.expAnios));
    const m = Math.max(0, Math.min(11, Math.floor(this.expMeses)));
    this.complemento.c_experiencia_trabajo = `${a} AÑOS ${m} MESES`;
    const d = new Date();
    d.setFullYear(d.getFullYear() - a);
    d.setMonth(d.getMonth() - m);
    this.complemento.c_fecha_ingreso = d.toISOString().slice(0, 10);
  }

  onExpSecChange(): void {
    const a = Math.max(0, Math.floor(this.expSecAnios));
    const m = Math.max(0, Math.min(11, Math.floor(this.expSecMeses)));
    this.complemento.c_experiencia_actividad_secundaria = `${a} AÑOS ${m} MESES`;
  }

  onExpConChange(): void {
    const a = Math.max(0, Math.floor(this.expConAnios));
    const m = Math.max(0, Math.min(11, Math.floor(this.expConMeses)));
    this.complemento.c_experiencia_trabajo_conyugue = `${a} AÑOS ${m} MESES`;
  }

  prefillComplementoFromCliente(): void {
    this.complemento.c_pais_residencia_id = +this.cliente.id_pais || 26;
    const ciudad = this.cat.ciudades.find(c => +c['id_ciudad_pcc'] === +this.cliente.id_ciudad);
    if (ciudad) {
      this.complemento.c_ciudad_residencia = ciudad['descripcion'] || '';
    }
  }

  nuevaOperacionMismoCliente(): void {
    const savedCliente = { ...this.cliente };
    const savedDoc = { ...this.clienteDoc };
    this.resetAll();
    this.cliente = savedCliente;
    this.clienteDoc = savedDoc;
    this.clienteEncontrado = true;
    this.showNitField = !!(savedCliente.nit && savedCliente.nit !== '0' && savedCliente.nit.trim());
    this.sincronizarClienteForm();
    this.aplicarValidadorNit();
    this.mode = 'select';
  }

  toggleNit(): void {
    this.showNitField = !this.showNitField;
    if (!this.showNitField) {
      this.cliente.nit = '';
      this.clienteForm.patchValue({ nit: '' });
    }
    this.aplicarValidadorNit();
  }

  goToOperacion(): void {
    // Extranjero no usa ciudad; si quedó sin elegir se envía un valor por defecto.
    if (this.isExtranjero && +this.cliente.id_ciudad <= 0) this.cliente.id_ciudad = 1;
    this.cambioSvc.actualizarCliente({
      ...this.cliente,
      id_tipo_doc_identidad: +this.clienteDoc.tipoDoc,
      num_doc_identidad: this.clienteDoc.documento.trim(),
      id_expedicion: +this.clienteDoc.expedicion,
    }).subscribe({ error: () => {} });

    this.mode = 'operacion';
    this.selectedMoneda = '0';
    this.monto = 0;
    this.confirma = 0;
    this.tipoCambio = 0;
    this.totalCambio = 0;
    this.recibido = 0;
    this.entregado = 0;
    this.cambioDevolucion = 0;
    this.uifResult = null;
    this.requiereFormulario = false;
    this.requierePcc06 = false;
    this.alertasUif = [];
    this.senalesAlerta = [];
    this.esUsuarioHabitual = false;
    this.requiereOrigenDestino = false;
    this.ddIncompleta = false;
    this.ddBloqueado = false;
    this.observacionesUif = '';
    this.senalesSeleccionadas = [];
    this.pcc06 = this.emptyPcc06();
    this.complemento = this.emptyComplemento();
    this.showComplementoSection = false;
    this.expAnios = 0; this.expMeses = 0;
    this.expSecAnios = 0; this.expSecMeses = 0;
    this.expConAnios = 0; this.expConMeses = 0;
  }

  onMonedaChange(): void {
    const mid = +this.selectedMoneda;
    const cot = this.cotizaciones.find(c => c.id_moneda === mid);
    if (!cot) return;

    this.tipoCambio = this.idOperacion === 1 ? (cot.compra ?? 0) : (cot.venta ?? 0);
    this.diferencial = Math.abs((cot.venta ?? 0) - (cot.compra ?? 0));
    this.calcular();
  }

  calcular(): void {
    this.totalCambio = +(this.monto * this.tipoCambio).toFixed(2);

    if (this.idOperacion === 1) {
      this.recibido = this.monto;
      this.entregado = this.totalCambio;
    } else {
      this.recibido = this.monto;
      this.entregado = this.totalCambio;
    }
    this.cambioDevolucion = 0;

    if (this.monto > 0 && !this.montoMismatch && this.confirma > 0 && +this.selectedMoneda > 0) {
      this.checkUif();
    }
  }

  calcularCambio(): void {
    this.cambioDevolucion = +(this.entregado - this.totalCambio).toFixed(2);
  }

  checkUif(): void {
    if (this.checkingUif) return;

    this.checkingUif = true;
    this.cambioSvc.calcularCambioUif({
      id_operacion: this.idOperacion,
      id_moneda: +this.selectedMoneda,
      monto: this.monto,
      documento: this.clienteDoc.documento.trim(),
      tipo_doc: +this.clienteDoc.tipoDoc,
      expedicion: +this.clienteDoc.expedicion,
    }).subscribe({
      next: (res) => {
        this.checkingUif = false;
        this.uifResult = res;
        this.requiereFormulario = res.requiere_formulario;
        this.requierePcc06 = res.requiere_pcc06;
        this.alertasUif = res.alertas ?? [];
        this.senalesAlerta = res.senales_alerta ?? [];
        this.esUsuarioHabitual = res.usuario_habitual ?? false;
        this.requiereOrigenDestino = res.requiere_origen_destino ?? false;
        this.ddIncompleta = res.dd_incompleta ?? false;
        this.ddBloqueado = res.dd_bloqueado ?? false;
        if (res.requiere_formulario) {
          this.showComplementoSection = true;
          this.prefillComplementoFromCliente();
        }
      },
      error: () => {
        this.checkingUif = false;
      },
    });
  }

  getMonedaLabel(): string {
    const mid = +this.selectedMoneda;
    const cot = this.cotizaciones.find(c => c.id_moneda === mid);
    return cot ? `${cot.moneda} - ${cot.moneda_desc}` : '';
  }

  confirmarRegistro(): void {
    this.registrar();
  }

  /**
   * Total realmente cobrado.
   *
   * Con un único método de pago el importe se completa solo con el total
   * (`registrar()` lo fuerza), así que para el cuadre equivale al total aunque el
   * cajero no lo haya tecleado. Tolerancia de 0.01 por redondeo, igual que el
   * backend.
   */
  get totalMetodosPago(): number {
    if (this.metodosPago.length === 1) return this.totalCambio;
    return this.metodosPago.reduce((s, m) => s + (m.monto || 0), 0);
  }

  get cobroCuadra(): boolean {
    return Math.abs(this.totalMetodosPago - this.totalCambio) <= 0.01;
  }

  /** ¿Todos los métodos de pago son en efectivo? (forma de pago 1) */
  get esSoloEfectivo(): boolean {
    return this.metodosPago.length > 0 && this.metodosPago.every(m => +m.id_forma_pago === 1);
  }

  /** Suma real de lo ingresado en los métodos (sin el ajuste de método único). */
  get sumaMetodosReal(): number {
    return this.metodosPago.reduce((s, m) => s + (+m.monto || 0), 0);
  }

  /** Cambio (vuelto) a entregar cuando el cobro es en efectivo y se recibe de más. */
  get vueltoEfectivo(): number {
    if (!this.esSoloEfectivo) return 0;
    const v = Math.round((this.sumaMetodosReal - this.totalCambio) * 100) / 100;
    return v > 0 ? v : 0;
  }

  abrirConfirmacion(): void {
    // Autocompleta el monto del único método sólo si está vacío.
    if (this.metodosPago.length === 1 && !(+this.metodosPago[0].monto)) {
      this.metodosPago[0].monto = this.totalCambio;
    }
    const err = this.validarFormaCobro();
    if (err) {
      Swal.fire({ icon: 'warning', title: 'Revisá la Forma de Cobro', html: err, confirmButtonColor: '#F58634' });
      return;
    }
    this.showConfirmDialog = true;
  }

  /**
   * Valida la suma de los métodos de pago contra el Total a Cobrar.
   * - Sólo efectivo: se admite entregar de más (cambio), pero debe cubrir el total.
   * - QR / Transferencia / Mixta: la suma debe ser exactamente igual al total.
   */
  private validarFormaCobro(): string | null {
    const total = Math.round((this.totalCambio ?? 0) * 100) / 100;
    const metodos = this.metodosPago.map(m => ({ forma: +m.id_forma_pago, monto: +(m.monto || 0) }));
    const suma = Math.round(metodos.reduce((s, m) => s + m.monto, 0) * 100) / 100;
    const soloEfectivo = metodos.length > 0 && metodos.every(m => m.forma === 1);
    const bs = (n: number) => 'Bs ' + n.toFixed(2);

    if (soloEfectivo) {
      if (suma < total) {
        return `El efectivo ingresado (<b>${bs(suma)}</b>) no cubre el Total a Cobrar (<b>${bs(total)}</b>).`;
      }
      return null;
    }
    if (suma !== total) {
      const dif = Math.round((suma - total) * 100) / 100;
      const difColor = dif > 0 ? '#b45309' : '#b91c1c';
      const difTxt = dif > 0 ? `${bs(dif)} de más` : `Faltan ${bs(-dif)}`;
      return `
        <div style="text-align:left;font-size:14px;color:#373435">
          <p style="margin:0 0 12px">Con <b>QR, Transferencia o pago mixto</b> no se puede dar cambio:
          la suma de los métodos debe coincidir <b>exactamente</b> con el Total a Cobrar.</p>
          <div style="border:1px solid #e8e8e8;border-radius:10px;overflow:hidden">
            <div style="display:flex;justify-content:space-between;padding:9px 14px">
              <span style="color:#777">Suma de métodos</span><b>${bs(suma)}</b>
            </div>
            <div style="display:flex;justify-content:space-between;padding:9px 14px;background:#fafafa;border-top:1px solid #efefef">
              <span style="color:#777">Total a Cobrar</span><b>${bs(total)}</b>
            </div>
            <div style="display:flex;justify-content:space-between;padding:10px 14px;border-top:1px solid #efefef;background:#fff7f1">
              <span style="color:${difColor};font-weight:700">Diferencia</span>
              <b style="color:${difColor}">${difTxt}</b>
            </div>
          </div>
          <p style="margin:12px 0 0;color:#777;font-size:12.5px">Ajustá los montos para que la suma dé <b>${bs(total)}</b>.</p>
        </div>`;
    }
    return null;
  }

  emptyMetodoPago() {
    return {
      id_forma_pago: 1, monto: 0, referencia: '',
      num_cuenta_bancaria: '', id_entidad_financiera: 0,
      id_agencia: 0, id_moneda_cuenta: 0, id_tipo_cuenta_bancaria: 0,
      _cuentaKey: '',
    };
  }

  addMetodoPago(): void {
    this.metodosPago.push(this.emptyMetodoPago());
  }

  onCuentaBancariaChange(mp: any): void {
    const selected = this.cuentasBancarias.find(
      c => c.num_cuenta_bancaria === mp.num_cuenta_bancaria
        && c.id_entidad_financiera === mp.id_entidad_financiera
    );
    if (selected) {
      mp.id_agencia = selected.id_agencia;
      mp.id_moneda_cuenta = selected.id_moneda;
      mp.id_tipo_cuenta_bancaria = selected.id_tipo_cuenta_bancaria;
    }
  }

  cuentaKey(c: CuentaBancariaCobro): string {
    return `${c.id_entidad_financiera}|${c.num_cuenta_bancaria}`;
  }

  onSelectCuenta(mp: any, key: string): void {
    const [idEnt, numCta] = key.split('|');
    const selected = this.cuentasBancarias.find(
      c => c.id_entidad_financiera === +idEnt && c.num_cuenta_bancaria === numCta
    );
    if (selected) {
      mp.num_cuenta_bancaria = selected.num_cuenta_bancaria;
      mp.id_entidad_financiera = selected.id_entidad_financiera;
      mp.id_agencia = selected.id_agencia;
      mp.id_moneda_cuenta = selected.id_moneda;
      mp.id_tipo_cuenta_bancaria = selected.id_tipo_cuenta_bancaria;
    }
  }

  removeMetodoPago(idx: number): void {
    this.metodosPago.splice(idx, 1);
  }

  registrar(): void {
    if (!this.canRegister || this.registrando) return;

    const mid = +this.selectedMoneda;
    let monRec: number, monEnt: number;

    if (this.idOperacion === 1) {
      monRec = mid;
      monEnt = 2;
    } else {
      monRec = 2;
      monEnt = mid;
    }

    const operacion: OperacionCambioInput = {
      mon_rec: monRec,
      mon_ent: monEnt,
      tipo_cambio: this.tipoCambio,
      monto: this.monto,
      total_cambio: this.totalCambio,
      recibido: this.recibido,
      entregado: this.entregado,
      cambio: this.cambioDevolucion,
    };

    if (this.requierePcc06) {
      operacion.origen = this.pcc06.origen;
      operacion.destino = this.pcc06.destino;
      operacion.dinero_si = this.pcc06.dinero_si;
      operacion.select_per = this.pcc06.dinero_si === 0 ? this.pcc06.select_per : 0;
      operacion.nombres_dd = this.pcc06.nombres_dd;
      operacion.doc_nit_dd = this.pcc06.doc_nit_dd;
      operacion.domicilio_dd = this.pcc06.domicilio_dd;
      operacion.telefono_dd = this.pcc06.telefono_dd;
      operacion.zona_dd = this.pcc06.zona_dd;
      operacion.impresion_pcc06 = 'S';
    } else if (this.requiereOrigenDestino) {
      operacion.origen = this.pcc06.origen;
      operacion.destino = this.pcc06.destino;
    }

    const obsCompletas = this.getObservacionesCompletas();
    if (obsCompletas) {
      (operacion as any).observaciones_uif = obsCompletas;
    }

    this.cliente.id_tipo_doc_identidad = +this.clienteDoc.tipoDoc;
    this.cliente.num_doc_identidad = this.clienteDoc.documento.trim();
    this.cliente.id_expedicion = +this.clienteDoc.expedicion;

    this.registrando = true;
    const uuid = this.uuidOperacion();
    if (this.metodosPago.length === 1) {
      this.metodosPago[0].monto = this.totalCambio;
    }

    this.cambioSvc.registrarCambio(
      this.idOperacion, this.cliente, operacion, uuid,
      this.metodosPago,
      this.requiereFormulario ? this.complemento : undefined,
    ).subscribe({
      next: (res) => {
        this.registrando = false;
        this.resultado = res;
        this.mode = 'resultado';
        this.showConfirmDialog = false;
        Swal.fire({ icon: 'success', title: 'Operación registrada', text: 'La operación se registró correctamente', confirmButtonColor: '#F58634' });
      },
      error: (err) => {
        this.registrando = false;
        this.showConfirmDialog = false;
        const msg = err.error?.message || err.message || 'Error al registrar operación';
        const esBovCaja = /b[oó]veda|caja/i.test(msg);
        Swal.fire({
          icon: esBovCaja ? 'warning' : 'error',
          title: esBovCaja ? 'Sesión no disponible' : 'Error al registrar',
          text: msg,
          confirmButtonColor: '#F58634',
        });
      },
    });
  }

  abrirPdfPopup(tipo: 'factura'): void {
    if (!this.resultado) return;
    this.pdfPopupLoading = true;
    this.showPdfPopup = true;
    this.pdfPopupTitulo = 'Factura';

    this.cambioSvc.descargarFacturaPdf(this.resultado.id_cambio).subscribe({
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

  abrirPdfPopupPorId(id: number): void {
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

  nuevaOperacion(): void {
    this.resetAll();
    this.mode = 'select';
  }

  private resetAll(): void {
    this.idOperacion = 0;
    this.operacionUuid = null;
    this.clienteDoc = { tipoDoc: '1', documento: '', expedicion: '0' };
    this.cliente = this.emptyCliente();
    this.clienteEncontrado = null;
    this.buscandoCliente = false;
    this.showClienteForm = false;
    this.selectedMoneda = '0';
    this.tipoCambio = 0;
    this.diferencial = 0;
    this.monto = 0;
    this.confirma = 0;
    this.totalCambio = 0;
    this.recibido = 0;
    this.entregado = 0;
    this.cambioDevolucion = 0;
    this.registrando = false;
    this.resultado = null;
    this.selectedDpto = '0';
    this.ciudadesFiltradas = [];
    this.uifResult = null;
    this.checkingUif = false;
    this.requiereFormulario = false;
    this.requierePcc06 = false;
    this.alertasUif = [];
    this.senalesAlerta = [];
    this.esUsuarioHabitual = false;
    this.requiereOrigenDestino = false;
    this.ddIncompleta = false;
    this.ddBloqueado = false;
    this.observacionesUif = '';
    this.senalesSeleccionadas = [];
    this.pcc06 = this.emptyPcc06();
    this.complemento = this.emptyComplemento();
    this.showComplementoSection = false;
    this.expAnios = 0; this.expMeses = 0;
    this.expSecAnios = 0; this.expSecMeses = 0;
    this.expConAnios = 0; this.expConMeses = 0;
    this.metodosPago = [this.emptyMetodoPago()];
    this.showConfirmDialog = false;
    this.showEmpleoSection = false;
    this.showNitField = false;
    this.mismoNro = true;
    this.sincronizarClienteForm();
    this.aplicarValidadorNit();
  }

  private emptyCliente(): ClienteInfo {
    const defaults = this.cat.defaults;
    return {
      id_tipo_doc_identidad: 1, num_doc_identidad: '', id_expedicion: 0,
      nombres: '', ape_pat: '', ape_mat: '', id_sexo: 1,
      fecha_nacimiento: '', id_pais: defaults?.id_pais || 26, lugar_nacimiento: '',
      id_estado_civil: 1, id_ocupacion: 1, id_actividad_economica: 1,
      id_ciudad: 0, zona: '', domicilio: '', tel_dom: '', tel_trab: '',
      celular: '', e_trabajo: '', e_cargo: '', e_direccion: '', nit: '', email: '',
    };
  }

  private emptyPcc06(): Pcc06Data {
    return {
      origen: '', destino: '', dinero_si: 1, select_per: 1,
      nombres_dd: '', doc_nit_dd: '', act_eco_dd: 0,
      domicilio_dd: '', id_departamento_dd: 0, id_ciudad_pcc: 0,
      telefono_dd: '', zona_dd: '',
    };
  }

  private emptyComplemento(): ComplementoData {
    const defaults = this.cat?.defaults;
    return {
      c_apellido_casada: '',
      c_pais_residencia_id: defaults?.id_pais || 26,
      c_ciudad_residencia: '',
      c_ingresos: 0,
      c_fecha_ingreso: '',
      c_experiencia_trabajo: '',
      c_actividad_secundaria_id: 0,
      c_ingresos_actividad_secundaria: 0,
      c_experiencia_actividad_secundaria: '',
      c_referencias_bancarias: '',
      c_referencias_comerciales: '',
      c_referencias_personales: '',
      c_dependiente_estado_anterior: 'N',
      c_entidad_trabajo_anterior: '',
      c_fecha_inicio_trabajo_anterior: '',
      c_fecha_fin_trabajo_anterior: '',
      c_cargo_trabajo_anterior_id: 1,
      c_dependiente_estado_actual: 'N',
      c_entidad_trabajo_actual: '',
      c_cargo_trabajo_actual_id: 1,
      c_nombres_conyugue: '',
      c_apellido_paterno_conyugue: '',
      c_apellido_materno_conyugue: '',
      c_apellido_casada_conyugue: '',
      c_profesion_conyugue_id: 0,
      c_actividad_principal_conyugue_id: 0,
      c_actividad_secundaria_conyugue_id: 0,
      c_lugar_trabajo_conyugue: '',
      c_cargo_conyugue_id: 0,
      c_ingreso_mensual_conyugue: 0,
      c_experiencia_trabajo_conyugue: '',
    };
  }
}
