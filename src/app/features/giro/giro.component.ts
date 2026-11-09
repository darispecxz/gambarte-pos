import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormArray, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ErrorStateMatcher } from '@angular/material/core';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CambioService } from '../../core/cambio.service';
import { GiroService, AgenciaDestino, DestinatarioGiro, ComisionGiroResult, GiroResponse, GiroBusqueda, UifGiroResponse, EntidadFinanciera } from '../../core/giro.service';
import { AuthService } from '../../core/auth.service';
import { SearchableSelectComponent } from '../../shared/searchable-select.component';
import { TelInputComponent } from '../../shared/tel-input.component';
import { CajeroService } from '../../core/cajero.service';
import { ClienteInfo, Catalogos, CuentaBancariaCobro, ComplementoData } from '../../core/models';
import { forkJoin, Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

type Tab = 'enviar' | 'pagar' | 'devolver';
type Step = 'cliente' | 'destinatario' | 'operacion' | 'resultado';

const OBSERVACIONES_PREDEFINIDAS = [
  'Operaciones cercanas al umbral de reporte (posible estructuración)',
  'Cliente realiza operaciones con alta frecuencia',
  'Monto inconsistente con actividad económica declarada',
  'Cliente muestra nerviosismo o apuro inusual',
  'Cliente acompañado por persona que dirige la operación',
  'Cliente no puede justificar origen de fondos',
  'Documentación presentada con inconsistencias',
  'Destinatario sin relación aparente con remitente',
];

class FondosErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: any): boolean {
    return !control || String(control.value ?? '').trim().length < 20;
  }
}

class RequiredValueErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: any): boolean {
    const value = control?.value;
    if (value === null || value === undefined) return true;
    if (typeof value === 'number') return value <= 0;
    if (typeof value === 'string') return value.trim().length === 0 || value.trim() === '0';
    return false;
  }
}

@Component({
  selector: 'app-giro',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, MatSnackBarModule, SearchableSelectComponent,
    MatFormFieldModule, MatInputModule, TextFieldModule, MatSelectModule, MatIconModule, MatButtonModule, TelInputComponent,
  ],
  template: `
    <div class="giro-page">
      <!-- HEADER -->
      <div class="header-strip no-print">
        <div class="header-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
        </div>
        <div class="header-text">
          <h1>Giro Nacional</h1>
          <span>Transferencias entre agencias Gambarte</span>
        </div>
      </div>

      <!-- ===== TAB ENVIAR ===== -->
      @if (tab === 'enviar') {
        @if (loading) {
          <div class="loading-box"><div class="spinner"></div><span>Cargando...</span></div>
        }

        <!-- STEP 1: CLIENTE -->
        @if (!loading && step !== 'resultado') {
          <div class="section-card">
            <div class="section-header"><h2 class="section-title">Datos del Remitente</h2></div>

            <div class="form-row three" [formGroup]="remitenteDocForm">
              <mat-form-field appearance="outline">
                <mat-label>Tipo Documento</mat-label>
                <mat-icon matPrefix>badge</mat-icon>
                <mat-select formControlName="tipoDoc" (selectionChange)="resetClienteSearch()">
                  @for (t of cat.tipos_documento; track t['id_tipo_doc_identidad']) {
                    <mat-option [value]="t['id_tipo_doc_identidad'] + ''">{{ t['descripcion'] }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Nro. Documento</mat-label>
                <mat-icon matPrefix>pin</mat-icon>
                <input matInput formControlName="documento" (blur)="buscarCliente()" placeholder="Ej: 12345678" autocomplete="off">
                <mat-error>El número de documento es obligatorio</mat-error>
              </mat-form-field>
              @if (esCedula) {
                <mat-form-field appearance="outline">
                  <mat-label>Expedición</mat-label>
                  <mat-icon matPrefix>place</mat-icon>
                  <mat-select formControlName="expedicion" (selectionChange)="buscarCliente()">
                    @for (e of cat.expediciones; track e['id_expedicion']) {
                      <mat-option [value]="e['id_expedicion'] + ''">{{ e['descripcion'] }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              }
            </div>

            @if (buscandoCliente) {
              <div class="search-status"><div class="spinner sm"></div> Buscando cliente...</div>
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F58634" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                  <span>Cliente nuevo — complete los datos</span>
                </div>
              }
            }

            @if (showClienteForm) {
              <div class="cliente-form">
                @if (isExtranjero) {
                  <div class="profile-badge extranjero">Perfil Extranjero — validación simplificada</div>
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
        <mat-option [value]="0">Seleccione</mat-option>
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
                  @if (!mismoNro) { <div class="form-break"></div> }
                  <mat-form-field appearance="outline">
                    <mat-label>Email (opcional)</mat-label>
                    <mat-icon matPrefix>mail</mat-icon>
                    <input matInput type="email" formControlName="email" autocomplete="off" placeholder="correo@ejemplo.com">
                    <mat-error>No es un email válido</mat-error>
                  </mat-form-field>
                </div>

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
              </div>

            }

            @if (clienteEncontrado !== null) {
              @if (!clienteReady && !showClienteForm) {
                <div class="campos-faltantes">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>Faltan datos obligatorios del remitente.</span>
                  <button class="btn-link-inline" (click)="showClienteForm = true">Completar datos</button>
                </div>
              }
            }
          </div>
        }

        <!-- STEP 2: DESTINATARIO -->
        @if (!loading && step !== 'resultado') {
          <div class="section-card">
            <div class="section-header">
              <h2 class="section-title">Datos del Destinatario (Beneficiario)</h2>
            </div>

            <!-- Destinatarios previos -->
            @if (destinatariosPrevios.length > 0 && !destinatarioNuevo) {
              <div class="prev-destinatarios">
                <h3>Destinatarios anteriores</h3>
                <div class="prev-list">
                  @for (dp of destinatariosPrevios; track dp.id_destinatario) {
                    <div class="prev-item" [class.selected]="destinatarioSeleccionado === dp.id_destinatario" (click)="seleccionarDestinatarioPrevio(dp)">
                      <strong>{{ dp.nombres }} {{ dp.ape_pat }} {{ dp.ape_mat }}</strong>
                      <span>{{ dp.num_doc_identidad_d }} · {{ dp.celular }}</span>
                    </div>
                  }
                </div>
                <button class="btn-link" (click)="nuevoDestinatario()">
                  + Nuevo destinatario
                </button>
              </div>
            }

            @if (destinatariosPrevios.length === 0 || destinatarioNuevo) {
              <div class="form-row three" [formGroup]="destinatarioForm">
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
              <div class="form-row three" [formGroup]="destinatarioForm">
                <div class="cel-col">
                  <button type="button" class="nit-toggle" [class.active]="mismoNroDest" (click)="toggleMismoNroDest()"
                          title="Repetir el celular en el Teléfono">
                    <span class="nit-toggle-track"><span class="nit-toggle-thumb"></span></span>
                    Mismo número
                  </button>
                  <mat-form-field appearance="outline">
                    <mat-label>Celular</mat-label>
                    <mat-icon matPrefix>smartphone</mat-icon>
                    <app-tel-input formControlName="celular"></app-tel-input>
                  </mat-form-field>
                </div>
                @if (!mismoNroDest) {
                  <mat-form-field appearance="outline">
                    <mat-label>Teléfono</mat-label>
                    <mat-icon matPrefix>call</mat-icon>
                    <app-tel-input formControlName="tel_dom"></app-tel-input>
                  </mat-form-field>
                }
              </div>
              <div class="form-row three" [formGroup]="destinatarioForm">
                <mat-form-field appearance="outline">
                  <mat-label>Tipo Documento</mat-label>
                  <mat-icon matPrefix>badge</mat-icon>
                  <mat-select formControlName="id_tipo_doc_identidad_d">
                    @for (t of cat.tipos_documento; track t['id_tipo_doc_identidad']) {
                      <mat-option [value]="t['id_tipo_doc_identidad']">{{ t['descripcion'] }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Nro. Documento</mat-label>
                  <mat-icon matPrefix>pin</mat-icon>
                  <input matInput formControlName="num_doc_identidad_d" autocomplete="off">
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Expedición</mat-label>
                  <mat-select formControlName="id_expedicion_d">
                    <mat-option [value]="0">Seleccione</mat-option>
                    @for (e of cat.expediciones; track e['id_expedicion']) {
                      <mat-option [value]="e['id_expedicion']">{{ e['descripcion'] }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
              </div>
              <div class="form-row two" [formGroup]="destinatarioForm">
                <mat-form-field appearance="outline">
                  <mat-label>Domicilio</mat-label>
                  <mat-icon matPrefix>home</mat-icon>
                  <input matInput formControlName="domicilio" autocomplete="off">
                </mat-form-field>
              </div>

              @if (destinatariosPrevios.length > 0) {
                <button class="btn-link" (click)="destinatarioNuevo = false">Seleccionar destinatario anterior</button>
              }
            }

            <!-- Forma de Pago -->
            <div class="pago-section">
              <h3 class="subsection-title">Forma de Pago</h3>
              <div class="form-row three" [formGroup]="pagoGiroForm">
                <mat-form-field appearance="outline">
                  <mat-label>Método de Pago</mat-label>
                  <mat-icon matPrefix>payments</mat-icon>
                  <mat-select formControlName="formaPagoGiro">
                    <mat-option [value]="0">Efectivo por Ventanilla</mat-option>
                    <mat-option [value]="1">Depósito a Cuenta Bancaria</mat-option>
                  </mat-select>
                </mat-form-field>
                @if (formaPagoGiro === 1) {
                  <mat-form-field appearance="outline">
                    <mat-label>Banco Destino</mat-label>
                    <mat-icon matPrefix>account_balance</mat-icon>
                    <mat-select formControlName="bancoGiro">
                      @for (ef of entidadesFinancieras; track ef.id) {
                        <mat-option [value]="ef.id + ''">{{ ef.nombre }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Nro. Cuenta</mat-label>
                    <mat-icon matPrefix>tag</mat-icon>
                    <input matInput formControlName="cuentaDestinoGiro" autocomplete="off" placeholder="Número de cuenta">
                  </mat-form-field>
                }
              </div>
            </div>

          </div>
        }

        <!-- STEP 3: OPERACION -->
        @if (!loading && step !== 'resultado') {
          <div class="section-card">
            <div class="section-header">
              <h2 class="section-title">Datos de la Operación</h2>
            </div>

            <div class="form-row three">
              <div class="ff-contents" [formGroup]="operacionForm" style="display:contents">
                <mat-form-field appearance="outline">
                  <mat-label>Moneda a Enviar *</mat-label>
                  <mat-icon matPrefix>payments</mat-icon>
                  <mat-select formControlName="moneda">
                    <mat-option value="2">BOB - Bolivianos</mat-option>
                    <mat-option value="1">USD - Dólares</mat-option>
                  </mat-select>
                  <mat-error>Seleccione una moneda</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Moneda a Entregar *</mat-label>
                  <mat-icon matPrefix>currency_exchange</mat-icon>
                  <mat-select [(ngModel)]="monedaEntrega" (selectionChange)="programarCalculo()">
                    <mat-option value="2">BOB - Bolivianos</mat-option>
                    <mat-option value="1">USD - Dólares</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline" floatLabel="always">
                  <mat-label>Monto a Enviar</mat-label>
                  <span matTextPrefix>{{ monedaAbr === 'USD' ? '$' : 'Bs' }}&nbsp;</span>
                  <input matInput type="number" formControlName="monto" min="1" step="0.01" placeholder="0.00" style="text-align:right">
                  <mat-error>Ingrese un monto mayor a 0</mat-error>
                </mat-form-field>
              </div>
              <mat-form-field appearance="outline">
                <mat-label>Destino *</mat-label>
                <mat-icon matPrefix>store</mat-icon>
                <app-searchable-select #agenciaDestinoModel="ngModel" [items]="agenciasDestino" valueKey="id_agencia" labelKey="descripcion" placeholder="Buscar agencia..." [(ngModel)]="selectedAgenciaDestino" required></app-searchable-select>
                @if (agenciaDestinoModel.invalid && (agenciaDestinoModel.touched || agenciaDestinoModel.dirty)) {
                  <mat-error>Seleccione un destino</mat-error>
                }
              </mat-form-field>
            </div>

            <label class="commission-toggle">
              <input type="checkbox" [checked]="pagoComision === 1" (change)="pagoComision = $any($event.target).checked ? 1 : 0; programarCalculo()">
              <span>Incluir comisión en el monto enviado</span>
            </label>

            <!-- Comisión calculada -->
            @if (calculando) {
              <div class="search-status"><div class="spinner sm"></div> Calculando comisión...</div>
            }

            @if (comisionResult && !calculando) {
              <div class="comision-card giro-summary">
                <h3 class="comision-title">Resumen de la operación</h3>
                <div class="transfer-summary">
                  <div class="transfer-line transfer-line-send">
                    <div class="transfer-description">
                      <span class="country-flag" role="img" aria-label="Bolivia">
                        <svg viewBox="0 0 24 16" aria-hidden="true"><path fill="#D52B1E" d="M2 1h20v4.67H2z"/><path fill="#F9E300" d="M2 5.67h20v4.66H2z"/><path fill="#007934" d="M2 10.33h20V15H2z"/><rect x="1.5" y=".5" width="21" height="15" rx="2" fill="none" stroke="#d1d5db"/></svg>
                      </span>
                      <div><strong>{{ comisionResult.monto | number:'1.2-2' }} {{ monedaAbr }}</strong><small>Envías desde Bolivia</small></div>
                    </div>
                    <div class="comision-details">
                      <div class="fees-breakdown">
                        <div class="fee-parent">
                          <span class="fee-label"><mat-icon>point_of_sale</mat-icon>Cargos de la operación</span>
                          <strong>{{ comisionResult.comision_bob + comisionResult.itf_bob | number:'1.2-2' }} BOB</strong>
                        </div>
                        <div class="fee-children">
                          <div class="fee-child"><span class="fee-label"><mat-icon>percent</mat-icon>Comisión</span><strong>{{ comisionResult.comision_bob | number:'1.2-2' }} BOB</strong></div>
                          <div class="fee-child"><span class="fee-label"><mat-icon>receipt_long</mat-icon>ITF</span><strong>{{ comisionResult.itf_bob | number:'1.2-2' }} BOB</strong></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="transfer-line">
                    <div class="transfer-description">
                      @if (monedaEntrega === '1') {
                        <span class="country-flag" role="img" aria-label="Estados Unidos">
                          <svg viewBox="0 0 24 16" aria-hidden="true"><path fill="#fff" d="M1 1h22v14H1z"/><path fill="#B22234" d="M1 1h22v1.08H1zm0 2.16h22v1.08H1zm0 2.16h22V6.4H1zm0 2.16h22v1.08H1zm0 2.16h22v1.08H1zm0 2.16h22v1.08H1zm0 2.16h22V15H1z"/><path fill="#3C3B6E" d="M1 1h10v7H1z"/><circle cx="3" cy="2.5" r=".35" fill="#fff"/><circle cx="5.5" cy="2.5" r=".35" fill="#fff"/><circle cx="8" cy="2.5" r=".35" fill="#fff"/><circle cx="4.25" cy="4.5" r=".35" fill="#fff"/><circle cx="6.75" cy="4.5" r=".35" fill="#fff"/><circle cx="3" cy="6.5" r=".35" fill="#fff"/><circle cx="5.5" cy="6.5" r=".35" fill="#fff"/><circle cx="8" cy="6.5" r=".35" fill="#fff"/><rect x=".5" y=".5" width="23" height="15" rx="2" fill="none" stroke="#d1d5db"/></svg>
                        </span>
                      } @else {
                        <span class="country-flag" role="img" aria-label="Bolivia">
                          <svg viewBox="0 0 24 16" aria-hidden="true"><path fill="#D52B1E" d="M2 1h20v4.67H2z"/><path fill="#F9E300" d="M2 5.67h20v4.66H2z"/><path fill="#007934" d="M2 10.33h20V15H2z"/><rect x="1.5" y=".5" width="21" height="15" rx="2" fill="none" stroke="#d1d5db"/></svg>
                        </span>
                      }
                      <div><strong>{{ comisionResult.total_cambio | number:'1.2-2' }} {{ monedaEntregaAbr }}</strong><small>Recibe el beneficiario en {{ getAgenciaDestinoLabel() }}</small></div>
                    </div>
                    @if (monedaEntrega !== monedaEnvio) {
                      <div class="transfer-equivalent">
                        <span class="country-flag" role="img" aria-label="Bolivia">
                          <svg viewBox="0 0 24 16" aria-hidden="true"><path fill="#D52B1E" d="M2 1h20v4.67H2z"/><path fill="#F9E300" d="M2 5.67h20v4.66H2z"/><path fill="#007934" d="M2 10.33h20V15H2z"/><rect x="1.5" y=".5" width="21" height="15" rx="2" fill="none" stroke="#d1d5db"/></svg>
                        </span>
                        <div><small>Equivalente {{ monedaEnvioAbr }}</small><strong>{{ comisionResult.monto | number:'1.2-2' }} {{ monedaEnvioAbr }}</strong></div>
                      </div>
                    }
                  </div>
                  <div class="transfer-total">
                    <span><span class="country-flag" role="img" aria-label="Bolivia"><svg viewBox="0 0 24 16" aria-hidden="true"><path fill="#D52B1E" d="M2 1h20v4.67H2z"/><path fill="#F9E300" d="M2 5.67h20v4.66H2z"/><path fill="#007934" d="M2 10.33h20V15H2z"/><rect x="1.5" y=".5" width="21" height="15" rx="2" fill="none" stroke="#d1d5db"/></svg></span> Total a cobrar al cliente</span>
                    <strong>{{ comisionResult.total_bob | number:'1.2-2' }} BOB</strong>
                  </div>
                </div>
              </div>
            }

            <!-- UIF Section -->
            @if (uifResult) {
              <div class="uif-section" [class.has-alerts]="uifResult.alertas.length > 0 || (uifResult.senales_alerta && uifResult.senales_alerta.length > 0)">
                <div class="uif-head">
                  <mat-icon class="uif-head-icon">verified_user</mat-icon>
                  <div class="uif-head-txt">
                    <h3>Verificación UIF/PLAFT</h3>
                    <small>Control antilavado de dinero</small>
                  </div>
                  @if (uifResult.dd_bloqueado) {
                    <span class="uif-status blocked"><mat-icon>block</mat-icon> Operación bloqueada</span>
                  } @else if (uifResult.requiere_pcc08 || uifResult.requiere_formulario) {
                    <span class="uif-status warn"><mat-icon>assignment</mat-icon> Requiere formulario</span>
                  } @else {
                    <span class="uif-status ok"><mat-icon>check_circle</mat-icon> Sin observaciones</span>
                  }
                </div>

                @if (uifResult.alertas.length > 0) {
                  <div class="alertas-box">
                    @for (a of uifResult.alertas; track a.tipo) {
                      <div class="alerta" [class.critico]="a.nivel === 'critico'" [class.alto]="a.nivel === 'alto'">
                        <strong>{{ a.tipo }}</strong>: {{ a.mensaje }}
                        @if (a.detalle) { <span class="alerta-det">{{ a.detalle }}</span> }
                      </div>
                    }
                  </div>
                }

                @if (uifResult.senales_alerta && uifResult.senales_alerta.length > 0) {
                  <div class="senales-box">
                    @for (s of uifResult.senales_alerta; track s.codigo) {
                      <div class="senal" [class.alto]="s.nivel === 'alto'" [class.medio]="s.nivel === 'medio'">
                        {{ s.mensaje }}
                      </div>
                    }
                  </div>
                }

                @if (uifResult.requiere_pcc08 || uifResult.requiere_formulario || uifResult.usuario_habitual) {
                  <div class="uif-badges">
                    @if (uifResult.requiere_pcc08) {
                      <span class="uif-badge red" title="Debe llenar el formulario de debida diligencia reforzada (PCC-08)">
                        <mat-icon>description</mat-icon> Requiere PCC-08
                      </span>
                    }
                    @if (uifResult.requiere_formulario) {
                      <span class="uif-badge amber" title="Se debe completar el formulario UIF para esta operación">
                        <mat-icon>assignment</mat-icon> Requiere formulario UIF
                      </span>
                    }
                    @if (uifResult.usuario_habitual) {
                      <span class="uif-badge blue" title="Cliente frecuente — exención Art. 37">
                        <mat-icon>badge</mat-icon> Usuario habitual
                      </span>
                    }
                  </div>
                }
                @if (uifResult.dd_bloqueado) {
                  <div class="dd-block">
                    <strong>OPERACIÓN BLOQUEADA</strong> — Debida Diligencia incompleta con alertas críticas (Art. 51)
                  </div>
                }

                <div class="uif-stats">
                  <div class="uif-stat">
                    <span>Monto en bolivianos</span>
                    <strong>{{ uifResult.bolivianizado | number:'1.2-2' }} BOB</strong>
                  </div>
                  <div class="uif-stat">
                    <span>Operaciones previas (últimos {{ uifResult.operaciones_previas.dias_ventana }} días)</span>
                    <strong>{{ uifResult.operaciones_previas.cantidad }} op. · {{ uifResult.operaciones_previas.total_bolivianizado | number:'1.2-2' }} BOB</strong>
                  </div>
                </div>
              </div>

            }

            @if (uifResult?.requiere_pcc08 && comisionResult) {
              <section class="pcc08-section" [formGroup]="fondosForm">
                <h3 class="pcc08-title"><mat-icon>description</mat-icon>Control de fondos</h3>
                <div class="form-row" [class.three]="requierePcc08">
                  <mat-form-field appearance="outline" floatLabel="always">
                    <mat-label>Origen de Fondos *</mat-label><mat-icon matPrefix>login</mat-icon>
                    <textarea matInput cdkTextareaAutosize cdkAutosizeMinRows="1" cdkAutosizeMaxRows="6" formControlName="origen" [errorStateMatcher]="fondosErrorStateMatcher" rows="1" maxlength="200" placeholder="Describa el origen de los fondos" autocomplete="off"></textarea>
                    @if (fondosForm.get('origen')?.invalid) { <mat-error>@if (!fondosForm.value.origen?.trim()) { Indique el origen de los fondos } @else { Ingrese al menos 20 caracteres }</mat-error> }
                  </mat-form-field>
                  <mat-form-field appearance="outline" floatLabel="always">
                    <mat-label>Destino de Fondos *</mat-label><mat-icon matPrefix>logout</mat-icon>
                    <textarea matInput cdkTextareaAutosize cdkAutosizeMinRows="1" cdkAutosizeMaxRows="6" formControlName="destinoPcc" [errorStateMatcher]="fondosErrorStateMatcher" rows="1" maxlength="200" placeholder="Describa el destino de los fondos" autocomplete="off"></textarea>
                    @if (fondosForm.get('destinoPcc')?.invalid) { <mat-error>@if (!fondosForm.value.destinoPcc?.trim()) { Indique el destino de los fondos } @else { Ingrese al menos 20 caracteres }</mat-error> }
                  </mat-form-field>
                  @if (requierePcc08) {
                    <mat-form-field appearance="outline">
                      <mat-label>¿Dinero propio?</mat-label><mat-icon matPrefix>account_balance_wallet</mat-icon>
                      <mat-select formControlName="dinero_si" (selectionChange)="aplicarValidadoresFondos()">
                        <mat-option [value]="1">Sí</mat-option><mat-option [value]="0">No (a nombre de tercero)</mat-option>
                      </mat-select>
                    </mat-form-field>
                  }
                </div>
                @if (requierePcc08 && fondosForm.value.dinero_si === 0) {
                  <div class="pcc08-additional">
                    <div class="form-row three">
                      <mat-form-field appearance="outline"><mat-label>Tipo de Persona</mat-label>
                        <mat-select formControlName="select_per" (selectionChange)="aplicarValidadoresFondos()"><mat-option [value]="1">Persona Natural</mat-option><mat-option [value]="2">Persona Jurídica</mat-option></mat-select>
                      </mat-form-field>
                      <mat-form-field appearance="outline"><mat-label>{{ fondosForm.value.select_per === 2 ? 'Razón Social' : 'Nombres' }} *</mat-label>
                        <input matInput formControlName="nombres_dd" autocomplete="off"><mat-error>Ingrese el nombre o razón social</mat-error>
                      </mat-form-field>
                      <mat-form-field appearance="outline"><mat-label>{{ fondosForm.value.select_per === 2 ? 'NIT' : 'Documento' }} *</mat-label>
                        <input matInput formControlName="doc_nit_dd" autocomplete="off"><mat-error>Ingrese el documento</mat-error>
                      </mat-form-field>
                    </div>
                    @if (fondosForm.value.select_per === 1) {
                      <div class="beneficiary-lookup-row">
                        <button type="button" class="btn secondary" (click)="buscarBeneficiarioFinal()" [disabled]="buscandoBeneficiario || !fondosForm.value.doc_nit_dd?.trim()">
                          {{ buscandoBeneficiario ? 'Buscando…' : 'Buscar beneficiario final' }}
                        </button>
                        @if (beneficiarioFinalEncontrado) { <small>Ficha encontrada; se vinculará al giro.</small> }
                      </div>
                      <div class="form-row three">
                        <mat-form-field appearance="outline"><mat-label>Apellido paterno *</mat-label><input matInput formControlName="apellido_paterno_dd" autocomplete="off"><mat-error>Ingrese el apellido paterno</mat-error></mat-form-field>
                        <mat-form-field appearance="outline"><mat-label>Apellido materno</mat-label><input matInput formControlName="apellido_materno_dd" autocomplete="off"></mat-form-field>
                        <mat-form-field appearance="outline"><mat-label>Tipo de documento *</mat-label><mat-select formControlName="tipo_doc_dd" [errorStateMatcher]="requiredValueErrorStateMatcher"><mat-option [value]="0">Seleccione</mat-option>@for (d of cat.tipos_documento; track d['id_tipo_doc_identidad']) {<mat-option [value]="d['id_tipo_doc_identidad']">{{ d['descripcion'] }}</mat-option>}</mat-select><mat-error>Seleccione el tipo de documento</mat-error></mat-form-field>
                      </div>
                    }
                    <div class="form-row three">
                      <mat-form-field appearance="outline"><mat-label>Actividad Económica</mat-label>
                        <mat-select formControlName="act_eco_dd" [errorStateMatcher]="requiredValueErrorStateMatcher"><mat-option [value]="0">Seleccione</mat-option>@for (a of cat.actividades_economicas; track a['id_actividad_economica']) {<mat-option [value]="a['id_actividad_economica']">{{ a['descripcion'] }}</mat-option>}</mat-select>
                        @if (fondosForm.get('act_eco_dd')?.invalid) { <mat-error>Seleccione una actividad económica</mat-error> }
                      </mat-form-field>
                      <mat-form-field appearance="outline"><mat-label>Domicilio *</mat-label><mat-icon matPrefix>home</mat-icon>
                        <input matInput formControlName="domicilio_dd" autocomplete="off"><mat-error>Indique el domicilio</mat-error>
                      </mat-form-field>
                      <mat-form-field appearance="outline"><mat-label>Teléfono *</mat-label><mat-icon matPrefix>call</mat-icon>
                        <input matInput formControlName="telefono_dd" autocomplete="off"><mat-error>Indique el teléfono</mat-error>
                      </mat-form-field>
                    </div>
                    <div class="form-row three">
                      <mat-form-field appearance="outline"><mat-label>Departamento</mat-label>
                        <mat-select formControlName="id_departamento" [errorStateMatcher]="requiredValueErrorStateMatcher" (selectionChange)="onPccDepartamentoChange($event.value)"><mat-option [value]="0">Seleccione</mat-option>@for (d of cat.departamentos; track d['id_departamento']) {<mat-option [value]="d['id_departamento']">{{ d['descripcion'] }}</mat-option>}</mat-select>
                        @if (fondosForm.get('id_departamento')?.invalid) { <mat-error>Seleccione un departamento</mat-error> }
                      </mat-form-field>
                      <mat-form-field appearance="outline"><mat-label>Ciudad</mat-label>
                        <mat-select formControlName="id_ciudad_pcc" [errorStateMatcher]="requiredValueErrorStateMatcher"><mat-option [value]="0">Seleccione</mat-option>@for (c of ciudadesPccFiltradas; track c['id_ciudad_pcc']) {<mat-option [value]="c['id_ciudad_pcc']">{{ c['descripcion'] }}</mat-option>}</mat-select>
                        @if (fondosForm.get('id_ciudad_pcc')?.invalid) { <mat-error>Seleccione una ciudad</mat-error> }
                      </mat-form-field>
                      <mat-form-field appearance="outline"><mat-label>Zona</mat-label><input matInput formControlName="zona_dd" autocomplete="off"></mat-form-field>
                    </div>
                  </div>
                }
              </section>
            }

            @if (uifResult?.requiere_formulario) {
              <section class="complemento-section">
                <div class="complemento-header" (click)="toggleComplementoSection()">
                  <h3 class="complemento-title"><mat-icon>description</mat-icon>Formulario Complemento UIF</h3>
                  <mat-icon>{{ showComplementoSection ? 'expand_less' : 'expand_more' }}</mat-icon>
                </div>
                @if (showComplementoSection) {
                  <div class="form-row three">
                    @if (showApellidoCasada) {
                      <mat-form-field appearance="outline"><mat-label>Apellido de Casada</mat-label><input matInput [(ngModel)]="complemento.c_apellido_casada" autocomplete="off"></mat-form-field>
                    }
                    <mat-form-field appearance="outline"><mat-label>País de Residencia *</mat-label><mat-icon matPrefix>public</mat-icon>
                      <app-searchable-select [items]="cat.paises" valueKey="id_pais" labelKey="descripcion" placeholder="Buscar país..." [(ngModel)]="complemento.c_pais_residencia_id" required></app-searchable-select>
                      @if (+complemento.c_pais_residencia_id <= 0) { <mat-error>Seleccione el país de residencia</mat-error> }
                    </mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Ciudad de Residencia *</mat-label><mat-icon matPrefix>location_city</mat-icon>
                      <input matInput [(ngModel)]="complemento.c_ciudad_residencia" [errorStateMatcher]="requiredValueErrorStateMatcher" required autocomplete="off"><mat-error>Ingrese la ciudad de residencia</mat-error>
                    </mat-form-field>
                  </div>
                  <div class="form-row four">
                    <mat-form-field appearance="outline" floatLabel="always"><mat-label>Ingresos Mensuales *</mat-label><span matTextPrefix>Bs&nbsp;</span>
                      <input matInput type="number" [(ngModel)]="complemento.c_ingresos" [errorStateMatcher]="requiredValueErrorStateMatcher" required min="0.01" step="0.01" style="text-align:right"><mat-error>Ingrese un monto mayor que 0</mat-error>
                    </mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Experiencia — Años</mat-label><input matInput type="number" [(ngModel)]="expAnios" min="0" max="50" (input)="onExpChange()"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Experiencia — Meses</mat-label><input matInput type="number" [(ngModel)]="expMeses" min="0" max="11" (input)="onExpChange()"></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Fecha de Ingreso *</mat-label><mat-icon matPrefix>event</mat-icon>
                      <input matInput readonly [ngModel]="complemento.c_fecha_ingreso" [errorStateMatcher]="requiredValueErrorStateMatcher" required><mat-error>Complete la experiencia para calcular la fecha</mat-error>
                    </mat-form-field>
                  </div>
                  <div class="form-row" [class.four]="showActividadSecundaria">
                    <mat-form-field appearance="outline"><mat-label>Actividad Secundaria</mat-label><mat-icon matPrefix>category</mat-icon>
                      <app-searchable-select [items]="cat.actividades_economicas" valueKey="id_actividad_economica" labelKey="descripcion" placeholder="Buscar actividad..." nullOption="Ninguna" [(ngModel)]="complemento.c_actividad_secundaria_id"></app-searchable-select>
                    </mat-form-field>
                    @if (showActividadSecundaria) {
                      <mat-form-field appearance="outline" floatLabel="always"><mat-label>Ingresos Act. Sec.</mat-label><span matTextPrefix>Bs&nbsp;</span><input matInput type="number" [(ngModel)]="complemento.c_ingresos_actividad_secundaria" min="0" step="0.01" style="text-align:right"></mat-form-field>
                      <mat-form-field appearance="outline"><mat-label>Exp. Sec. Años</mat-label><input matInput type="number" [(ngModel)]="expSecAnios" min="0" max="50" (input)="onExpSecChange()"></mat-form-field>
                      <mat-form-field appearance="outline"><mat-label>Exp. Sec. Meses</mat-label><input matInput type="number" [(ngModel)]="expSecMeses" min="0" max="11" (input)="onExpSecChange()"></mat-form-field>
                    }
                  </div>
                  <div class="form-row three">
                    <mat-form-field appearance="outline"><mat-label>Referencias Bancarias</mat-label><textarea matInput cdkTextareaAutosize cdkAutosizeMinRows="1" cdkAutosizeMaxRows="6" [(ngModel)]="complemento.c_referencias_bancarias" rows="1"></textarea></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Referencias Comerciales</mat-label><textarea matInput cdkTextareaAutosize cdkAutosizeMinRows="1" cdkAutosizeMaxRows="6" [(ngModel)]="complemento.c_referencias_comerciales" rows="1"></textarea></mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Referencias Personales</mat-label><textarea matInput cdkTextareaAutosize cdkAutosizeMinRows="1" cdkAutosizeMaxRows="6" [(ngModel)]="complemento.c_referencias_personales" rows="1"></textarea></mat-form-field>
                  </div>
                  <div class="pep-subsection">
                    <h4 class="pep-subtitle">Dependiente del Estado — Anterior</h4>
                    <div class="form-row two">
                      <mat-form-field appearance="outline"><mat-label>¿Fue dependiente del Estado? *</mat-label><mat-select [(ngModel)]="complemento.c_dependiente_estado_anterior" [errorStateMatcher]="requiredValueErrorStateMatcher" required><mat-option value="N">No</mat-option><mat-option value="S">Sí</mat-option></mat-select></mat-form-field>
                      @if (complemento.c_dependiente_estado_anterior === 'S') { <mat-form-field appearance="outline"><mat-label>Entidad donde trabajó *</mat-label><input matInput [(ngModel)]="complemento.c_entidad_trabajo_anterior" [errorStateMatcher]="requiredValueErrorStateMatcher" required><mat-error>Indique la entidad donde trabajó</mat-error></mat-form-field> }
                    </div>
                    @if (complemento.c_dependiente_estado_anterior === 'S') {
                      <div class="form-row three">
                        <mat-form-field appearance="outline"><mat-label>Fecha Inicio *</mat-label><input matInput type="date" [(ngModel)]="complemento.c_fecha_inicio_trabajo_anterior" [errorStateMatcher]="requiredValueErrorStateMatcher" required><mat-error>Seleccione la fecha de inicio</mat-error></mat-form-field>
                        <mat-form-field appearance="outline"><mat-label>Fecha Fin *</mat-label><input matInput type="date" [(ngModel)]="complemento.c_fecha_fin_trabajo_anterior" [errorStateMatcher]="requiredValueErrorStateMatcher" required><mat-error>Seleccione la fecha de fin</mat-error></mat-form-field>
                        <mat-form-field appearance="outline"><mat-label>Cargo *</mat-label><mat-select [(ngModel)]="complemento.c_cargo_trabajo_anterior_id" [errorStateMatcher]="requiredValueErrorStateMatcher" required><mat-option [value]="0">Seleccione</mat-option>@for (cargo of cat.cargos; track cargo['id']) {<mat-option [value]="cargo['id']">{{ cargo['descripcion'] }}</mat-option>}</mat-select><mat-error>Seleccione el cargo</mat-error></mat-form-field>
                      </div>
                    }
                  </div>
                  <div class="pep-subsection">
                    <h4 class="pep-subtitle">Dependiente del Estado — Actual</h4>
                    <div class="form-row two">
                      <mat-form-field appearance="outline"><mat-label>¿Es dependiente del Estado? *</mat-label><mat-select [(ngModel)]="complemento.c_dependiente_estado_actual" [errorStateMatcher]="requiredValueErrorStateMatcher" required><mat-option value="N">No</mat-option><mat-option value="S">Sí</mat-option></mat-select></mat-form-field>
                      @if (complemento.c_dependiente_estado_actual === 'S') { <mat-form-field appearance="outline"><mat-label>Entidad donde trabaja *</mat-label><input matInput [(ngModel)]="complemento.c_entidad_trabajo_actual" [errorStateMatcher]="requiredValueErrorStateMatcher" required><mat-error>Indique la entidad donde trabaja</mat-error></mat-form-field> }
                    </div>
                    @if (complemento.c_dependiente_estado_actual === 'S') {
                      <div class="form-row two"><mat-form-field appearance="outline"><mat-label>Cargo *</mat-label><mat-select [(ngModel)]="complemento.c_cargo_trabajo_actual_id" [errorStateMatcher]="requiredValueErrorStateMatcher" required><mat-option [value]="0">Seleccione</mat-option>@for (cargo of cat.cargos; track cargo['id']) {<mat-option [value]="cargo['id']">{{ cargo['descripcion'] }}</mat-option>}</mat-select><mat-error>Seleccione el cargo</mat-error></mat-form-field></div>
                    }
                  </div>
                  @if (showConyugeFields) {
                    <div class="pep-subsection">
                      <h4 class="pep-subtitle">Datos del Cónyuge</h4>
                      <div class="form-row three">
                        <mat-form-field appearance="outline"><mat-label>Nombres *</mat-label><input matInput [(ngModel)]="complemento.c_nombres_conyugue" [errorStateMatcher]="requiredValueErrorStateMatcher" required><mat-error>Ingrese los nombres</mat-error></mat-form-field>
                        <mat-form-field appearance="outline"><mat-label>Apellido Paterno *</mat-label><input matInput [(ngModel)]="complemento.c_apellido_paterno_conyugue" [errorStateMatcher]="requiredValueErrorStateMatcher" required><mat-error>Ingrese el apellido paterno</mat-error></mat-form-field>
                        <mat-form-field appearance="outline"><mat-label>Apellido Materno</mat-label><input matInput [(ngModel)]="complemento.c_apellido_materno_conyugue"></mat-form-field>
                      </div>
                      <div class="form-row three">
                        <mat-form-field appearance="outline"><mat-label>Apellido de Casada</mat-label><input matInput [(ngModel)]="complemento.c_apellido_casada_conyugue"></mat-form-field>
                        <mat-form-field appearance="outline"><mat-label>Profesión</mat-label><mat-select [(ngModel)]="complemento.c_profesion_conyugue_id"><mat-option [value]="0">Seleccione</mat-option>@for (o of cat.ocupaciones; track o['id_ocupacion']) {<mat-option [value]="o['id_ocupacion']">{{ o['descripcion'] }}</mat-option>}</mat-select></mat-form-field>
                        <mat-form-field appearance="outline"><mat-label>Actividad Principal</mat-label><mat-select [(ngModel)]="complemento.c_actividad_principal_conyugue_id"><mat-option [value]="0">Seleccione</mat-option>@for (a of cat.actividades_economicas; track a['id_actividad_economica']) {<mat-option [value]="a['id_actividad_economica']">{{ a['descripcion'] }}</mat-option>}</mat-select></mat-form-field>
                      </div>
                      <div class="form-row three">
                        <mat-form-field appearance="outline"><mat-label>Actividad Secundaria</mat-label><mat-select [(ngModel)]="complemento.c_actividad_secundaria_conyugue_id"><mat-option [value]="0">Ninguna</mat-option>@for (a of cat.actividades_economicas; track a['id_actividad_economica']) {<mat-option [value]="a['id_actividad_economica']">{{ a['descripcion'] }}</mat-option>}</mat-select></mat-form-field>
                        <mat-form-field appearance="outline"><mat-label>Lugar de Trabajo</mat-label><input matInput [(ngModel)]="complemento.c_lugar_trabajo_conyugue"></mat-form-field>
                        <mat-form-field appearance="outline"><mat-label>Cargo</mat-label><mat-select [(ngModel)]="complemento.c_cargo_conyugue_id"><mat-option [value]="0">Seleccione</mat-option>@for (cargo of cat.cargos; track cargo['id']) {<mat-option [value]="cargo['id']">{{ cargo['descripcion'] }}</mat-option>}</mat-select></mat-form-field>
                      </div>
                      <div class="form-row three">
                        <mat-form-field appearance="outline" floatLabel="always"><mat-label>Ingreso Mensual</mat-label><span matTextPrefix>Bs&nbsp;</span><input matInput type="number" [(ngModel)]="complemento.c_ingreso_mensual_conyugue" step="0.01" min="0"></mat-form-field>
                        <mat-form-field appearance="outline"><mat-label>Exp. Años</mat-label><input matInput type="number" [(ngModel)]="expConAnios" min="0" max="50" (input)="onExpConChange()"></mat-form-field>
                        <mat-form-field appearance="outline"><mat-label>Exp. Meses</mat-label><input matInput type="number" [(ngModel)]="expConMeses" min="0" max="11" (input)="onExpConChange()"></mat-form-field>
                      </div>
                    </div>
                  }
                  @if (!isComplementoValid) { <div class="complemento-validation">Complete los campos obligatorios del formulario para continuar.</div> }
                }
              </section>
            }

            <!-- Observaciones cumplimiento -->
            @if (comisionResult && (uifResult?.alertas?.length || uifResult?.senales_alerta?.length)) {
              <div class="section-card observaciones-section">
                <h3>Observaciones de Cumplimiento</h3>
                <div class="obs-chips">
                  @for (obs of observacionesPredefinidas; track obs) {
                    <button class="obs-chip" [class.selected]="senalesSeleccionadas.includes(obs)" (click)="toggleObservacion(obs)">{{ obs }}</button>
                  }
                </div>
                <div class="field">
                  <label>Observación adicional</label>
                  <textarea [(ngModel)]="observacionesUif" rows="2" placeholder="Detalle adicional del cajero..."></textarea>
                </div>
              </div>
            }

            <!-- Métodos de pago -->
            @if (comisionResult) {
              <div class="section-card metodos-pago">
                <h3>Forma de Cobro</h3>
                @for (grupo of metodosPagoControls; track $index; let i = $index) {
                  <div class="mp-row" [formGroup]="grupo">
                    <mat-form-field appearance="outline">
                      <mat-label>Forma Pago</mat-label>
                      <mat-select formControlName="id_forma_pago">
                        @for (fp of formasPagoCobro; track fp.id) {
                          <mat-option [value]="fp.id">{{ fp.descripcion }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline" floatLabel="always">
                      <mat-label>Monto</mat-label>
                      <span matTextPrefix>Bs&nbsp;</span>
                      <input matInput type="number" formControlName="monto" min="0" step="0.01" style="text-align:right">
                      <mat-error>Monto requerido</mat-error>
                    </mat-form-field>
                    @if (+grupo.get('id_forma_pago')!.value !== 1) {
                      <mat-form-field appearance="outline">
                        <mat-label>Cuenta Bancaria</mat-label>
                        <mat-icon matPrefix>account_balance</mat-icon>
                        <mat-select formControlName="_cuentaKey" (selectionChange)="onSelectCuenta(grupo, grupo.get('_cuentaKey')!.value)">
                          <mat-option value="">Seleccione</mat-option>
                          @for (c of cuentasBancarias; track cuentaKey(c)) {
                            <mat-option [value]="cuentaKey(c)">{{ c.entidad_desc }} · {{ c.num_cuenta_bancaria }} ({{ c.moneda }})</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Referencia</mat-label>
                        <input matInput formControlName="referencia" autocomplete="off" placeholder="Nro. transacción">
                      </mat-form-field>
                    }
                    @if (metodosPagoControls.length > 1) {
                      <button type="button" class="btn-remove-mp" (click)="removeMetodoPago(i)" title="Quitar método" aria-label="Quitar método">
                        <mat-icon>delete_outline</mat-icon>
                      </button>
                    }
                  </div>
                }
                <button class="btn-link" (click)="addMetodoPago()">+ Agregar método de pago</button>
              </div>
            }

            <div class="section-actions">
              <button class="btn primary" [disabled]="!canRegister || ddBloqueado" (click)="abrirConfirmDialog()">
                Registrar Giro
              </button>
            </div>
          </div>

          <!-- Confirm dialog -->
          @if (showConfirmDialog) {
            <div class="overlay" (click)="showConfirmDialog = false">
              <div class="confirm-dialog" (click)="$event.stopPropagation()">
                <div class="cd-head">
                  <mat-icon>send</mat-icon>
                  <div class="cd-head-txt">
                    <h3>Confirmar Envío de Giro</h3>
                    <small>Revisá los datos antes de registrar</small>
                  </div>
                </div>
                <div class="cd-rows">
                  <div class="cd-row"><span><mat-icon>person</mat-icon> Remitente</span><strong>{{ cliente.nombres }} {{ cliente.ape_pat }} {{ cliente.ape_mat }}</strong></div>
                  <div class="cd-row"><span><mat-icon>group</mat-icon> Destinatario</span><strong>{{ destinatario.nombres }} {{ destinatario.ape_pat }} {{ destinatario.ape_mat }}</strong></div>
                  <div class="cd-row"><span><mat-icon>store</mat-icon> Agencia destino</span><strong>{{ getAgenciaDestinoLabel() }}</strong></div>
                  <div class="cd-row"><span><mat-icon>payments</mat-icon> Forma de pago</span><strong>{{ formaPagoGiro === 1 ? 'Depósito a Cuenta Bancaria' : 'Efectivo por Ventanilla' }}</strong></div>
                </div>
                <div class="cd-amounts">
                  <div class="cd-amt"><span>Monto</span><b>{{ comisionResult!.monto | number:'1.2-2' }} {{ monedaAbr }}</b></div>
                  <div class="cd-amt"><span>Beneficiario recibe</span><b>{{ comisionResult!.total_cambio | number:'1.2-2' }} {{ monedaEntregaAbr }}</b></div>
                  <div class="cd-amt"><span>Comisión</span><b>{{ comisionResult!.comision_bob | number:'1.2-2' }} BOB</b></div>
                </div>
                <div class="cd-total">
                  <span>Total a Cobrar</span>
                  <strong>{{ comisionResult!.total_bob | number:'1.2-2' }} <small>BOB</small></strong>
                </div>
                @if (cambioEfectivo > 0) {
                  <div class="cd-cambio">
                    <span><mat-icon>currency_exchange</mat-icon> Cambio a Devolver</span>
                    <strong>{{ cambioEfectivo | number:'1.2-2' }} BOB</strong>
                  </div>
                }
                <div class="confirm-actions">
                  <button class="btn secondary" (click)="showConfirmDialog = false" [disabled]="registrando">Cancelar</button>
                  <button class="btn primary" (click)="confirmarRegistro()" [disabled]="registrando">
                    @if (registrando) { <div class="spinner sm"></div> Registrando... } @else { <mat-icon>check_circle</mat-icon> Confirmar y registrar }
                  </button>
                </div>
              </div>
            </div>
          }
        }

        <!-- STEP 4: RESULTADO -->
        @if (!loading && step === 'resultado' && resultado) {
          <div class="section-card resultado">
            <div class="resultado-header">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <div>
                <h2>Giro Registrado</h2>
                <p class="codigo-giro">Código: <strong>{{ resultado.codigo }}</strong></p>
              </div>
            </div>
            <div class="resultado-grid">
              <div class="rg-item"><span>Correlativo</span><strong>{{ resultado.correlativo_agencia }}</strong></div>
              <div class="rg-item"><span>Monto</span><strong>{{ resultado.monto | number:'1.2-2' }} {{ resultado.moneda }}</strong></div>
              <div class="rg-item"><span>Comisión</span><strong>{{ resultado.comision_bob | number:'1.2-2' }} BOB</strong></div>
              <div class="rg-item"><span>Total</span><strong>{{ resultado.total_bob | number:'1.2-2' }} BOB</strong></div>
              <div class="rg-item"><span>Agencia Destino</span><strong>{{ resultado.agencia_destino }}</strong></div>
              <div class="rg-item"><span>Destinatario</span><strong>{{ resultado.destinatario_nombre }}</strong></div>
            </div>
            <div class="resultado-actions">
              <button class="btn secondary" (click)="abrirPdfPopup('comprobante')">Comprobante PDF</button>
              @if (resultado.factura && resultado.factura.numero_factura) {
                <button class="btn secondary" (click)="abrirPdfPopup('factura')">Factura PDF</button>
              }
              <button class="btn primary" (click)="nuevoGiro()">Nuevo Giro</button>
            </div>
          </div>
        }
      }

      <!-- ===== TAB PAGAR ===== -->
      @if (tab === 'pagar') {
        <!-- Pago exitoso -->
        @if (pagoGiro) {
          <div class="section-card pago-success-card">
            <div class="pago-success-icon"><mat-icon>task_alt</mat-icon></div>
            <div class="pago-success-copy">
              <span class="pago-kicker">Operación completada</span>
              <h2>Giro pagado correctamente</h2>
              <p>Código <strong>{{ pagoGiro.codigo }}</strong></p>
            </div>
            <div class="pago-success-amount"><span>Monto entregado</span><strong>{{ pagoGiro.monto | number:'1.2-2' }} {{ pagoGiro.moneda }}</strong></div>
            <button mat-flat-button type="button" class="pago-primary-btn" (click)="resetPago()"><mat-icon>add</mat-icon> Pagar otro giro</button>
          </div>
        }

        <!-- VISTA 1: Búsqueda + Pendientes -->
        @if (!pagoGiro && !giroBuscado) {
          <div class="pago-layout">
            <section class="section-card pago-search-card">
              <div class="pago-section-heading">
                <div class="pago-heading-icon"><mat-icon>qr_code_scanner</mat-icon></div>
                <div><h2>Buscar un giro</h2><p>Ingresa el código que aparece en el comprobante de envío.</p></div>
              </div>
              <form class="pago-search-form" (ngSubmit)="buscarGiroParaPago()">
                <mat-form-field appearance="outline" class="pago-code-field">
                  <mat-label>Código del giro</mat-label>
                  <mat-icon matPrefix>tag</mat-icon>
                  <input matInput type="number" min="1" name="codigoPago" [(ngModel)]="codigoBusqueda" placeholder="Ej. 20458" autocomplete="off">
                  <mat-hint>También puedes seleccionar un giro pendiente abajo.</mat-hint>
                </mat-form-field>
                <button mat-flat-button type="submit" class="pago-primary-btn pago-search-btn" [disabled]="!codigoBusqueda || buscandoGiro">
                  <mat-icon [class.pago-spin]="buscandoGiro">{{ buscandoGiro ? 'progress_activity' : 'search' }}</mat-icon>
                  <span>{{ buscandoGiro ? 'Buscando…' : 'Buscar giro' }}</span>
                </button>
              </form>
            </section>

            <section class="section-card pago-pending-card">
              <div class="pago-list-heading">
                <div class="pago-section-heading">
                  <div class="pago-heading-icon pending"><mat-icon>pending_actions</mat-icon></div>
                  <div><h2>Giros por pagar</h2><p>Disponibles para esta agencia</p></div>
                  @if (!cargandoPendientes) { <span class="pago-count">{{ girosPendientes.length }}</span> }
                </div>
                <button mat-stroked-button type="button" class="pago-refresh-btn" (click)="cargarGirosPendientes()" [disabled]="cargandoPendientes">
                  <mat-icon [class.pago-spin]="cargandoPendientes">refresh</mat-icon> Actualizar
                </button>
              </div>
              @if (cargandoPendientes) {
                <div class="pago-loading"><mat-icon class="pago-spin">progress_activity</mat-icon><span>Cargando giros pendientes…</span></div>
              } @else if (girosPendientes.length === 0) {
                <div class="pago-empty"><mat-icon>task_alt</mat-icon><strong>No hay giros pendientes</strong><span>Cuando llegue un giro a esta agencia, aparecerá aquí.</span></div>
              } @else {
                <div class="pago-pending-table-wrap">
                  <table class="pago-pending-table" aria-label="Giros pendientes para pagar">
                    <thead><tr>
                      <th>N.º</th><th>Código</th><th class="pago-proof-heading"></th><th>Fecha de registro</th><th>Origen</th><th>Destino</th>
                      <th>Remitente</th><th>Destinatario</th><th>Forma de pago</th><th class="pago-align-right">Monto</th><th></th>
                    </tr></thead>
                    <tbody>
                      @for (gp of girosPendientes; track gp.id; let i = $index) {
                        <tr>
                          <td class="pago-row-number">{{ i + 1 }}</td>
                          <td><strong class="pago-code">{{ gp.codigo }}</strong></td>
                          <td><button mat-icon-button type="button" class="pago-proof-btn" title="Ver comprobante de envío" aria-label="Ver comprobante de envío" (click)="abrirComprobanteEnvioGiro(gp.id)"><mat-icon>description</mat-icon></button></td>
                          <td class="pago-date">{{ gp.fecha | date:'dd/MM/yyyy HH:mm' }}</td>
                          <td><span class="pago-agency"><mat-icon>outbound</mat-icon>{{ gp.agencia_origen || '—' }}</span></td>
                          <td><span class="pago-agency"><mat-icon>location_on</mat-icon>{{ gp.agencia_destino || '—' }}</span></td>
                          <td><span class="pago-person"><mat-icon>person_outline</mat-icon>{{ gp.remitente || 'No disponible' }}</span></td>
                          <td><span class="pago-person"><mat-icon>person</mat-icon>{{ gp.destinatario || 'No disponible' }}</span></td>
                          <td><div class="pago-method"><span class="pago-method-badge" [class.deposit]="gp.cuenta_bancaria === 1"><mat-icon>{{ gp.cuenta_bancaria === 1 ? 'account_balance' : 'payments' }}</mat-icon>{{ gp.formaPagoDesc || (gp.cuenta_bancaria === 1 ? 'Depósito' : 'Efectivo') }}</span>@if (gp.cuenta_bancaria === 1 && (gp.entidad_financiera || gp.numero_cuenta)) { <small>{{ gp.entidad_financiera || 'Entidad financiera' }} · {{ gp.numero_cuenta || 'Cuenta no disponible' }}</small> }</div></td>
                          <td class="pago-align-right"><strong class="pago-pending-amount">{{ gp.monto | number:'1.2-2' }} <small>{{ gp.moneda }}</small></strong></td>
                          <td><button mat-stroked-button type="button" class="pago-open-btn" (click)="codigoBusqueda = gp.codigo; buscarGiroParaPago()" [disabled]="buscandoGiro"><mat-icon>point_of_sale</mat-icon> Revisar y pagar</button></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            </section>
          </div>
        }

        <!-- VISTA 2: Detalle del giro -->
        @if (!pagoGiro && giroBuscado) {
          <div class="section-card pago-detail-card">
            <div class="pago-detail-heading">
              <div class="pago-heading-icon"><mat-icon>payments</mat-icon></div>
              <div class="pago-detail-title"><span class="pago-kicker">Verificación antes del pago</span><h2>Giro #{{ giroBuscado.codigo }}</h2></div>
              <span class="giro-estado" [class.pendiente]="giroBuscado.estado === 0" [class.pagado]="giroBuscado.estado === 1" [class.devuelto]="giroBuscado.estado === 2">{{ giroBuscado.estadoDesc }}</span>
              <button mat-stroked-button type="button" class="pago-back-btn" (click)="volverAListaPago()"><mat-icon>arrow_back</mat-icon> Volver a pendientes</button>
            </div>

            <div class="giro-detalle">
              <div class="pago-amount-banner">
                <div><span>Monto a entregar</span><strong>{{ giroBuscado.total_cambio | number:'1.2-2' }} <small>{{ giroBuscado.moneda_entrega || giroBuscado.moneda }}</small></strong></div>
                <div class="pago-bob-total"><span>Equivalente registrado</span><strong>{{ giroBuscado.total_bob | number:'1.2-2' }} BOB</strong></div>
              </div>
              <div class="giro-route-flow">
                <div class="giro-route-card giro-route-origin"><span class="giro-route-icon"><mat-icon>person</mat-icon></span><div><small>Remitente · Origen</small><strong>{{ giroBuscado.remitente }}</strong><span><b class="route-flag">🇧🇴</b> {{ giroBuscado.agencia_origen || 'Agencia de origen' }}</span></div></div>
                <mat-icon class="giro-route-arrow">east</mat-icon>
                <div class="giro-route-card giro-route-destination"><span class="giro-route-icon"><mat-icon>person</mat-icon></span><div><small>Destinatario · Agencia destino</small><strong>{{ giroBuscado.destinatario }}</strong><span><b class="route-flag">🇨🇱</b> {{ giroBuscado.agencia_destino || 'Agencia de destino' }}</span></div></div>
              </div>
              <div class="giro-info-grid">
                <div><mat-icon>schedule</mat-icon><span>Fecha de envío</span><strong>{{ giroBuscado.fecha | date:'dd/MM/yyyy HH:mm' }}</strong></div>
                <div><mat-icon>confirmation_number</mat-icon><span>Código del giro</span><strong>{{ giroBuscado.codigo }}</strong></div>
              </div>

              @if (giroBuscado.estado === 0) {
                <section class="pago-doc-section">
                  <div class="pago-doc-heading"><div class="pago-heading-icon pending"><mat-icon>badge</mat-icon></div><div><h3>Verificar identidad del destinatario</h3><p>Compara el documento físico con los datos registrados antes de entregar el dinero.</p></div></div>
                  <div class="pago-doc-fields">
                    <mat-form-field appearance="outline">
                      <mat-label>Tipo de documento</mat-label>
                      <mat-select [(ngModel)]="pagoDestinatarioDoc.tipo" name="tipoDocPago">
                        @for (t of cat.tipos_documento; track t['id_tipo_doc_identidad']) {
                          <mat-option [value]="t['id_tipo_doc_identidad']">{{ t['descripcion'] }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Número de documento</mat-label><mat-icon matPrefix>badge</mat-icon>
                      <input matInput type="text" [(ngModel)]="pagoDestinatarioDoc.documento" name="documentoPago" autocomplete="off">
                    </mat-form-field>
                    <mat-form-field appearance="outline">
                      <mat-label>Expedición</mat-label>
                      <mat-select [(ngModel)]="pagoDestinatarioDoc.expedicion" name="expedicionPago">
                        <mat-option value="0">Seleccione</mat-option>
                        @for (e of cat.expediciones; track e['id_expedicion']) {
                          <mat-option [value]="e['id_expedicion']">{{ e['descripcion'] }}</mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                  </div>
                </section>
                <div class="pago-confirm-bar"><span><mat-icon>info</mat-icon> Confirma que el nombre y documento coincidan con la persona presente.</span>
                  <button mat-flat-button type="button" class="pago-primary-btn pago-confirm-btn" (click)="confirmarPago()" [disabled]="pagandoGiro || !pagoDestinatarioDoc.documento.trim() || +pagoDestinatarioDoc.expedicion === 0">
                    <mat-icon [class.pago-spin]="pagandoGiro">{{ pagandoGiro ? 'progress_activity' : 'payments' }}</mat-icon>
                    <span>{{ pagandoGiro ? 'Procesando pago…' : 'Confirmar pago' }}</span>
                  </button>
                </div>
              } @else {
                <div class="estado-msg"><mat-icon>info</mat-icon><span>Este giro ya está <strong>{{ giroBuscado.estadoDesc }}</strong> y no se puede pagar.</span></div>
              }
            </div>
          </div>
        }
      }

      <!-- ===== TAB DEVOLVER ===== -->
      @if (tab === 'devolver') {
        <!-- Devolución exitosa -->
        @if (devolucionGiro) {
          <div class="section-card">
            <div class="resultado-header">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
              <div>
                <h2>Giro Devuelto</h2>
                <p>Código: <strong>{{ devolucionGiro.codigo }}</strong> — Monto: <strong>{{ devolucionGiro.monto | number:'1.2-2' }}</strong></p>
                <p>Motivo: {{ devolucionGiro.motivo }}</p>
              </div>
            </div>
            <div class="resultado-actions">
              <button class="btn primary" (click)="resetDevolucion()">Nueva Devolución</button>
            </div>
          </div>
        }

        <!-- VISTA 1: Búsqueda (sin giro seleccionado) -->
        @if (!devolucionGiro && !giroBuscadoDev) {
          <div class="section-card">
            <div class="section-header"><h2 class="section-title">Buscar Giro para Devolver</h2></div>
            <div class="form-row two">
              <div class="field">
                <label>Código del Giro</label>
                <input type="number" [(ngModel)]="codigoBusquedaDev" placeholder="Ingrese el código" autocomplete="off" (keydown.enter)="buscarGiroParaDevolucion()">
              </div>
              <div class="field field-btn">
                <button class="btn primary" [disabled]="!codigoBusquedaDev || buscandoGiroDev" (click)="buscarGiroParaDevolucion()">
                  @if (buscandoGiroDev) { <div class="spinner sm"></div> } @else { Buscar }
                </button>
              </div>
            </div>
          </div>
        }

        <!-- VISTA 2: Detalle del giro para devolver -->
        @if (!devolucionGiro && giroBuscadoDev) {
          <div class="section-card">
            <div class="section-header">
              <h2 class="section-title">Detalle del Giro</h2>
              <button class="btn-back" (click)="volverAListaDev()">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
                Volver
              </button>
            </div>

            <div class="giro-detalle">
              <div class="pago-amount-banner devolución-banner">
                <div><span>Monto del giro</span><strong>{{ giroBuscadoDev.monto | number:'1.2-2' }} <small>{{ giroBuscadoDev.moneda }}</small></strong></div>
                <span class="giro-estado" [class.pendiente]="giroBuscadoDev.estado === 0" [class.pagado]="giroBuscadoDev.estado === 1" [class.devuelto]="giroBuscadoDev.estado === 2">{{ giroBuscadoDev.estadoDesc }}</span>
              </div>
              <div class="giro-route-flow">
                <div class="giro-route-card giro-route-origin"><span class="giro-route-icon"><mat-icon>person</mat-icon></span><div><small>Remitente · Origen</small><strong>{{ giroBuscadoDev.remitente }}</strong><span><b class="route-flag">🇧🇴</b> {{ giroBuscadoDev.agencia_origen || 'Agencia de origen' }}</span></div></div>
                <mat-icon class="giro-route-arrow">east</mat-icon>
                <div class="giro-route-card giro-route-destination"><span class="giro-route-icon"><mat-icon>person</mat-icon></span><div><small>Destinatario · Agencia destino</small><strong>{{ giroBuscadoDev.destinatario }}</strong><span><b class="route-flag">🇨🇱</b> {{ giroBuscadoDev.agencia_destino || 'Agencia de destino' }}</span></div></div>
              </div>
              <div class="giro-info-grid">
                <div><mat-icon>schedule</mat-icon><span>Fecha de envío</span><strong>{{ giroBuscadoDev.fecha | date:'dd/MM/yyyy HH:mm' }}</strong></div>
                <div><mat-icon>confirmation_number</mat-icon><span>Código del giro</span><strong>{{ giroBuscadoDev.codigo }}</strong></div>
              </div>

              @if (giroBuscadoDev.estado === 0) {
                <div class="form-row">
                  <div class="field full">
                    <label>Motivo de Devolución *</label>
                    <textarea [(ngModel)]="motivoDevolucion" rows="3" placeholder="Ingrese el motivo de la devolución"></textarea>
                  </div>
                </div>
                <div class="section-actions">
                  <button class="btn danger" (click)="confirmarDevolucion()" [disabled]="!motivoDevolucion.trim() || devolviendoGiro">
                    @if (devolviendoGiro) { <div class="spinner sm"></div> Devolviendo... } @else { Devolver Giro }
                  </button>
                </div>
              } @else {
                <div class="estado-msg">Este giro ya está <strong>{{ giroBuscadoDev.estadoDesc }}</strong> y no se puede devolver.</div>
              }
            </div>
          </div>
        }
      }

      <!-- PDF Popup -->
      @if (showPdfPopup) {
        <div class="overlay" (click)="cerrarPdfPopup()">
          <div class="pdf-popup" (click)="$event.stopPropagation()">
            <div class="pdf-header">
              <h3>{{ pdfPopupTitulo }}</h3>
              <div class="pdf-actions">
                <button class="btn-icon" (click)="imprimirPdf()" title="Imprimir">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                </button>
                <button class="btn-icon" (click)="cerrarPdfPopup()" title="Cerrar">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
            @if (pdfPopupLoading) {
              <div class="pdf-loading"><div class="spinner"></div><span>Generando PDF...</span></div>
            }
            @if (pdfPopupUrl) {
              <iframe class="pdf-iframe" [src]="pdfPopupUrl"></iframe>
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .giro-page { margin: 0; padding: 16px; }

    .header-strip {
      display: flex; align-items: center; gap: 12px; padding: 12px 16px;
      background: var(--card-bg, #fff); border-radius: 10px; margin-bottom: 16px;
      border: 1px solid var(--border, #e5e5e5);
    }
    .header-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: #F58634; color: #fff; flex-shrink: 0; }
    .header-text h1 { font-size: 1.15rem; font-weight: 700; margin: 0; color: var(--text, #1a1a1a); }
    .header-text span { font-size: 0.8rem; color: var(--text-secondary, #666); }

    /* Tabs */
    /* Steps */
    .steps { display: flex; align-items: center; justify-content: center; gap: 0; margin-bottom: 16px; }
    .step { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px; }
    .step-num { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; background: var(--border, #e5e5e5); color: var(--text-secondary, #666); }
    .step-lbl { font-size: 0.8rem; color: var(--text-secondary, #666); font-weight: 500; }
    .step.active .step-num { background: #F58634; color: #fff; }
    .step.active .step-lbl { color: #F58634; font-weight: 700; }
    .step.done .step-num { background: #16a34a; color: #fff; }
    .step-line { flex: 0 0 24px; height: 2px; background: var(--border, #e5e5e5); }
    .step-line.done { background: #16a34a; }

    /* Cards */
    .section-card { background: var(--card-bg, #fff); border-radius: 10px; padding: 20px; margin-bottom: 16px; border: 1px solid var(--border, #e5e5e5); }
    .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .section-title { font-size: 1rem; font-weight: 700; margin: 0; color: var(--text, #1a1a1a); }
    .section-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; }
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

    /* Form */
    .form-row { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
    /* Salto de línea dentro de una fila flex (fuerza lo que sigue a la línea de abajo). */
    .form-break { flex-basis: 100%; height: 0; margin: 0; padding: 0; }
    .form-row.two > .field { flex: 1; min-width: 200px; }
    .form-row.three > .field { flex: 1; min-width: 150px; }
    /* Los mat-form-field / buscables reparten la fila igual que los .field.
       Se usa descendiente porque algunos van dentro de un wrapper [formGroup]. */
    .form-row > .mat-mdc-form-field,
    .form-row > app-searchable-select,
    .form-row > .input-with-btn,
    .form-row > .cel-col,
    .form-row .ff-contents > .mat-mdc-form-field,
    .form-row .ff-contents > app-searchable-select { flex: 1 1 0; min-width: 150px; }
    .form-row.two > .mat-mdc-form-field,
    .form-row.two > app-searchable-select,
    .form-row.two > .input-with-btn { min-width: 200px; }
    .input-with-btn > .mat-mdc-form-field { min-width: 0; }
    .field { display: flex; flex-direction: column; gap: 4px; }
    .field.full { flex: 1; }
    .field label { font-size: 0.75rem; font-weight: 600; color: var(--text-secondary, #666); text-transform: uppercase; letter-spacing: 0.3px; }
    .field input, .field select, .field textarea {
      padding: 8px 10px; border: 1px solid var(--border, #e5e5e5); border-radius: 6px;
      font-size: 0.85rem; background: var(--input-bg, #fff); color: var(--text, #1a1a1a); text-transform: uppercase;
      transition: border-color .15s;
    }
    .field input:focus, .field select:focus, .field textarea:focus { border-color: #F58634; outline: none; }
    .field-btn { display: flex; align-items: flex-end; }

    .input-with-btn { display: flex; gap: 6px; align-items: flex-end; }
    .input-with-btn input { flex: 1; }
    /* Botón "Mismo nro." con el mismo lenguaje que los mat-form-field:
       borde redondeado, color de marca y alineado a la altura del input. */
    .btn-copy-tel {
      display: inline-flex; align-items: center; gap: 5px; flex: 0 0 auto;
      height: 40px; margin-bottom: 22px; padding: 0 12px;
      border: 1px solid var(--mat-sys-primary, #F58634); border-radius: 8px;
      background: #fff; color: var(--mat-sys-primary, #F58634);
      font-size: 12px; font-weight: 600; white-space: nowrap; cursor: pointer;
      transition: background .15s;
    }
    .btn-copy-tel:hover { background: var(--mat-sys-primary-container, #fde8d0); }
    .btn-copy-tel mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Columna del celular: toggle "Mismo número" a la izquierda y campo a la derecha. */
    .cel-col { display: flex; flex-direction: row; align-items: flex-end; gap: 8px; }
    .cel-col > .mat-mdc-form-field { flex: 1 1 auto; min-width: 0; }

    /* Buttons */
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; border: none; border-radius: 8px; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all .15s; }
    .btn.primary { background: #F58634; color: #fff; }
    .btn.primary:hover:not(:disabled) { background: #e0751f; }
    .btn.primary:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn.secondary { background: var(--hover-bg, #f5f5f5); color: var(--text, #1a1a1a); border: 1px solid var(--border, #e5e5e5); }
    .btn.danger { background: #ef4444; color: #fff; }
    .btn.danger:hover:not(:disabled) { background: #dc2626; }
    .btn.danger:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-back { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border: 1px solid var(--border, #e5e5e5); border-radius: 6px; background: transparent; cursor: pointer; font-size: 0.8rem; color: var(--text-secondary, #666); }
    .btn-link { background: none; border: none; color: #F58634; font-weight: 600; cursor: pointer; font-size: 0.8rem; padding: 4px 0; }
    .btn-sm { padding: 4px 12px; border: 1px solid #F58634; border-radius: 6px; background: transparent; color: #F58634; font-size: 0.75rem; font-weight: 600; cursor: pointer; }
    .btn-sm:hover { background: #F58634; color: #fff; }
    .btn-icon-pdf {
      background: transparent; border: 1px solid #e0e0e0; border-radius: 4px; cursor: pointer;
      padding: 2px 4px; display: inline-flex; align-items: center; justify-content: center;
      transition: all .15s; vertical-align: middle;
    }
    .btn-icon-pdf:hover { background: #fef2f2; border-color: #fca5a5; }
    .td-comprobantes { text-align: center; white-space: nowrap; width: 30px; }
    .th-comprobantes { width: 30px; }
    .btn-icon { background: none; border: none; cursor: pointer; color: var(--text-secondary, #666); padding: 4px; }
    .btn-remove-mp {
      display: inline-flex; align-items: center; justify-content: center;
      width: 36px; height: 40px; margin-bottom: 22px; flex: 0 0 auto;
      background: none; border: none; border-radius: 8px; cursor: pointer;
      color: var(--mat-sys-error, #d32f2f); transition: background .15s;
    }
    .btn-remove-mp:hover { background: rgba(211,47,47,.1); }
    .btn-remove-mp mat-icon { font-size: 20px; width: 20px; height: 20px; line-height: 20px; }

    /* Search status */
    .search-status { display: flex; align-items: center; gap: 8px; padding: 10px; font-size: 0.85rem; color: var(--text-secondary, #666); }
    .loading-box { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 40px; font-size: 0.9rem; color: var(--text-secondary, #666); }

    /* Spinner */
    .spinner { width: 24px; height: 24px; border: 3px solid var(--border, #e5e5e5); border-top-color: #F58634; border-radius: 50%; animation: spin .6s linear infinite; }
    .spinner.sm { width: 16px; height: 16px; border-width: 2px; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Cliente found/new */
    .cliente-found, .cliente-new { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; margin-bottom: 12px; }
    .cliente-found { background: var(--success-bg, #f0fdf4); border: 1px solid var(--success-border, #bbf7d0); }
    .btn-edit-cliente { margin-left: auto; display: flex; align-items: center; gap: 4px; padding: 4px 10px; border: 1px solid var(--border, #d1d5db); border-radius: 6px; background: var(--card-bg, #fff); color: var(--text-secondary, #64748b); font-size: 12px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: all .15s; }
    .btn-edit-cliente:hover { border-color: #F58634; color: #F58634; }
    .cliente-new { background: var(--orange-bg, #fff7ed); border: 1px solid var(--orange-border, #fed7aa); }
    .cliente-info { display: flex; flex-direction: column; }
    .cliente-info strong { font-size: 0.9rem; color: var(--text, #1a1a1a); }
    .cliente-info span { font-size: 0.8rem; color: var(--text-secondary, #666); }

    .profile-badge { padding: 6px 12px; border-radius: 6px; font-size: 0.75rem; font-weight: 600; margin-bottom: 12px; }
    .profile-badge.extranjero { background: var(--info-bg, #dbeafe); color: var(--info-text, #1e40af); }

    /* NIT toggle */
    /* La celda del NIT alinea su contenido abajo, a la altura del input vecino. */
    .nit-field { display: flex; flex-direction: column; justify-content: flex-end; }
    .nit-toggle-row { display: flex; align-items: flex-end; gap: 8px; }
    /* Toggle "Sin/Con NIT": mismo botón redondeado de 40px que el resto,
       alineado a la altura del input de NIT. */
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
      position: relative; transition: background .15s;
    }
    .nit-toggle.active .nit-toggle-track { background: #F58634; }
    .nit-toggle-thumb {
      position: absolute; top: 2px; left: 2px; width: 12px; height: 12px;
      border-radius: 50%; background: #fff; transition: transform .15s;
    }
    .nit-toggle.active .nit-toggle-thumb { transform: translateX(12px); }
    .nit-input { flex: 1; min-width: 100px; }

    .empleo-toggle { display: flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.8rem; color: var(--text-secondary, #666); font-weight: 600; padding: 8px 0; user-select: none; }

    /* Pago section */
    .pago-section { margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border, #e5e5e5); }
    .subsection-title { font-size: 0.85rem; font-weight: 700; margin: 0 0 10px; color: var(--text-secondary, #666); }

    /* Prev destinatarios */
    .prev-destinatarios h3 { font-size: 0.85rem; font-weight: 600; margin: 0 0 8px; color: var(--text-secondary, #666); }
    .prev-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
    .prev-item { padding: 10px 12px; border: 1px solid var(--border, #e5e5e5); border-radius: 8px; cursor: pointer; transition: all .15s; }
    .prev-item:hover { border-color: #F58634; }
    .prev-item.selected { border-color: #F58634; background: var(--orange-bg, #fff7ed); }
    .prev-item strong { display: block; font-size: 0.85rem; color: var(--text, #1a1a1a); }
    .prev-item span { font-size: 0.75rem; color: var(--text-secondary, #666); }

    /* Resumen de operación con la misma jerarquía visual de Remesas. */
    .comision-card { background: var(--card-bg, #fff); border-radius: 12px; padding: 16px; margin: 16px 0; border: 1px solid #dbe2ea; }
    .comision-title { font-size: 15px; font-weight: 700; color: #14213d; margin: 0 0 12px; }
    .transfer-summary { border: 1px solid #e2e8f0; border-radius: 9px; background: #fff; overflow: hidden; }
    .transfer-line { min-height: 52px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 14px; }
    .transfer-line + .transfer-line { border-top: 1px solid #edf0f4; }
    .transfer-line-send { display: block; }
    .transfer-line-send > .comision-details { margin: 9px 0 2px 30px; padding: 8px 0 2px 12px; border-top: 1px solid #edf0f4; border-left: 2px solid #f1dfcb; }
    .transfer-description { display: flex; align-items: center; gap: 10px; min-width: 0; }
    .country-flag { display: inline-flex; width: 20px; height: 14px; flex: 0 0 auto; }
    .country-flag svg { display: block; width: 100%; height: 100%; }
    .transfer-description > div > strong { display: block; color: #14213d; font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; }
    .transfer-description small { display: block; margin-top: 2px; color: #64748b; font-size: 11px; }
    .transfer-equivalent { display: flex; align-items: center; gap: 7px; padding-left: 12px; text-align: right; }
    .transfer-equivalent > div { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
    .transfer-equivalent small { color: #64748b; font-size: 10px; }
    .transfer-equivalent strong { color: #334155; font-size: 13px; }
    .transfer-total { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 11px 14px; background: #f8f7f4; border-top: 1px solid #e9e5df; }
    .transfer-total > span { display: inline-flex; align-items: center; gap: 6px; color: #334155; font-size: 12px; font-weight: 600; }
    .transfer-total > strong { color: #263b5a; font-size: 16px; font-variant-numeric: tabular-nums; }
    .fee-parent { position: relative; display: flex; align-items: center; gap: 12px; padding: 7px 10px; border-radius: 5px; background: #fff4e8; color: #14213d; font-size: 12px; font-weight: 700; }
    .fee-parent::before { content: ''; position: absolute; left: -15px; top: 50%; width: 13px; transform: translateX(5px); border-top: 1px dotted #d5a16e; }
    .fee-parent strong { margin-left: auto; font-size: 14px; }
    .fee-label { display: inline-flex; align-items: center; gap: 5px; }
    .fee-label mat-icon { width: 15px; height: 15px; font-size: 15px; line-height: 15px; color: #94a3b8; }
    .fee-children { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 14px; margin-left: 10px; padding: 0 0 3px 14px; border-left: 1px dotted #cbd5e1; }
    .fee-child { position: relative; min-width: 0; display: flex; flex-direction: column; gap: 3px; padding: 7px 4px; color: #64748b; font-size: 10px; }
    .fee-child::before { content: ''; position: absolute; left: -14px; top: 15px; width: 12px; border-top: 1px dotted #cbd5e1; }
    .fee-child strong { color: #334155; font-size: 12px; }

    /* UIF */
    .uif-section { background: var(--hover-bg, #f9fafb); border-radius: 8px; padding: 16px; margin: 12px 0; border: 1px solid var(--border, #e5e5e5); }
    .uif-section.has-alerts { border-color: var(--warning-border, #fbbf24); background: var(--warning-bg, #fffbeb); }
    .uif-section h3 { font-size: 0.85rem; font-weight: 600; margin: 0 0 8px; }
    .alertas-box { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
    .alerta { padding: 8px 12px; border-radius: 6px; font-size: 0.8rem; border: 1px solid var(--warning-border, #fbbf24); background: var(--warning-bg, #fef3c7); }
    .alerta.critico { border-color: var(--error-border, #ef4444); background: var(--error-bg, #fef2f2); color: var(--error-text, #991b1b); }
    .alerta.alto { border-color: var(--orange-border, #f97316); background: var(--orange-bg, #fff7ed); color: #9a3412; }
    .alerta-det { display: block; font-size: 0.75rem; margin-top: 2px; opacity: 0.8; }
    .senales-box { display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px; }
    .senal { padding: 6px 10px; border-radius: 6px; font-size: 0.8rem; }
    .senal.alto { background: var(--error-bg, #fef2f2); border: 1px solid var(--error-border, #fca5a5); }
    .senal.medio { background: var(--orange-bg, #fff7ed); border: 1px solid var(--orange-border, #fed7aa); }
    /* Encabezado de la verificación UIF */
    .uif-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
    .uif-head-icon { color: #F58634; background: var(--mat-sys-primary-container, #fde8d0); border-radius: 9px; padding: 7px; font-size: 22px; width: 22px; height: 22px; box-sizing: content-box; }
    .uif-head-txt { display: flex; flex-direction: column; }
    .uif-head-txt h3 { margin: 0; font-size: 0.9rem; font-weight: 700; color: var(--text, #373435); }
    .uif-head-txt small { font-size: 0.72rem; color: var(--text-secondary, #8a8a8a); }
    .uif-status { display: inline-flex; align-items: center; gap: 5px; margin-left: auto; padding: 5px 12px; border-radius: 999px; font-size: 0.78rem; font-weight: 700; }
    .uif-status mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .uif-status.ok { background: var(--success-bg, #f0fdf4); color: var(--success-text, #15803d); border: 1px solid var(--success-border, #bbf7d0); }
    .uif-status.warn { background: var(--warning-bg, #fffbeb); color: #b45309; border: 1px solid var(--warning-border, #fde68a); }
    .uif-status.blocked { background: var(--error-bg, #fef2f2); color: var(--error-text, #b91c1c); border: 1px solid var(--error-border, #fecaca); }

    /* Badges informativos */
    .uif-badges { display: flex; flex-wrap: wrap; gap: 8px; margin: 4px 0 2px; }
    .uif-badge { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 8px; font-size: 0.76rem; font-weight: 700; border: 1px solid transparent; }
    .uif-badge mat-icon { font-size: 15px; width: 15px; height: 15px; }
    .uif-badge.red { background: #fef2f2; color: #b91c1c; border-color: #fecaca; }
    .uif-badge.amber { background: #fffbeb; color: #b45309; border-color: #fde68a; }
    .uif-badge.blue { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
    .dd-block { padding: 10px; border-radius: 8px; background: var(--error-bg, #fef2f2); border: 2px solid var(--error-border, #ef4444); color: var(--error-text, #991b1b); font-size: 0.85rem; margin-top: 10px; }

    /* Cifras en tarjetas */
    .uif-stats { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
    .uif-stat { flex: 1 1 200px; display: flex; flex-direction: column; gap: 2px; background: var(--card-bg, #fff); border: 1px solid var(--border, #e8e8e8); border-radius: 10px; padding: 10px 14px; }
    .uif-stat span { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-secondary, #8a8a8a); }
    .uif-stat strong { font-size: 0.95rem; color: var(--text, #373435); font-variant-numeric: tabular-nums; }

    /* Formularios de cumplimiento con la misma presentación que Remesas. */
    .pcc08-section, .complemento-section {
      border: 1px solid var(--border, #e8e8e8); border-left: 4px solid #6b8eae; border-radius: 12px;
      padding: 14px 18px 0; margin: 10px 0 0; background: var(--card-bg, #fff);
    }
    .pcc08-section .form-row, .complemento-section .form-row { margin-bottom: 0; }
    .pcc08-section .form-row.three { align-items: flex-start; }
    .pcc08-title, .complemento-title {
      display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700;
      color: #315b7d; margin: 0 0 10px; line-height: 1.4;
    }
    .pcc08-title mat-icon, .complemento-title mat-icon { width: 18px; height: 18px; font-size: 18px; }
    .pcc08-additional { margin-top: 8px; }
  .beneficiary-lookup-row { display:flex; align-items:center; gap:10px; margin: -2px 0 10px; color:#64748b; font-size:12px; }
  .commission-toggle { display:flex; align-items:center; gap:9px; width:max-content; max-width:100%; margin:4px 0 14px; color:#334155; font-size:13px; cursor:pointer; }
  .commission-toggle input { width:16px; height:16px; accent-color:#2563eb; }
    .complemento-header { display: flex; align-items: center; justify-content: space-between; cursor: pointer; margin: 0 0 10px; }
    .complemento-header > mat-icon { color: #64748b; }
    .pep-subsection { padding-top: 0; margin-top: 10px; }
    .pep-subtitle { font-size: 12px; font-weight: 700; color: var(--text-secondary, #666); text-transform: uppercase; letter-spacing: .03em; margin: 0 0 12px; }
    .complemento-validation { padding: 8px 10px; margin: 4px 0 12px; border-radius: 6px; color: #64748b; background: #f8fafc; font-size: 12px; }

    /* Observaciones */
    .observaciones-section h3 { font-size: 0.85rem; font-weight: 600; margin: 0 0 10px; }
    .obs-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
    .obs-chip { padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; border: 1px solid var(--border, #e5e5e5); background: transparent; cursor: pointer; color: var(--text-secondary, #666); transition: all .15s; }
    .obs-chip.selected { background: #F58634; color: #fff; border-color: #F58634; }

    /* Métodos pago */
    .metodos-pago h3 { font-size: 0.85rem; font-weight: 600; margin: 0 0 10px; color: var(--text-secondary, #666); }
    .mp-row { display: flex; gap: 10px; align-items: flex-end; margin-bottom: 8px; flex-wrap: wrap; }
    .mp-row .field { min-width: 120px; flex: 1; }
    .mp-row > .mat-mdc-form-field { min-width: 120px; flex: 1 1 0; }

    /* Overlay / Dialog */
    .overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
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
    .cd-amounts { display: flex; gap: 10px; margin-top: 12px; }
    .cd-amt { flex: 1; display: flex; flex-direction: column; gap: 2px; background: var(--hover-bg, #f8f8f8); border-radius: 10px; padding: 9px 12px; }
    .cd-amt span { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-secondary, #8a8a8a); }
    .cd-amt b { font-size: 0.95rem; color: var(--text, #373435); font-variant-numeric: tabular-nums; }
    .cd-total { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; padding: 14px 18px; border-radius: 12px; background: linear-gradient(135deg, #F58634 0%, #e0701a 100%); color: #fff; box-shadow: 0 6px 16px rgba(245,134,52,.3); }
    .cd-total span { font-size: 0.74rem; text-transform: uppercase; letter-spacing: 0.6px; opacity: 0.92; }
    .cd-total strong { font-size: 1.55rem; font-weight: 800; font-variant-numeric: tabular-nums; }
    .cd-total strong small { font-size: 0.8rem; font-weight: 600; opacity: 0.85; }
    .cd-cambio { display: flex; align-items: center; justify-content: space-between; margin-top: 8px; padding: 11px 18px; border-radius: 12px; background: var(--success-bg, #f0fdf4); border: 1px solid var(--success-border, #bbf7d0); color: var(--success-text, #15803d); }
    .cd-cambio span { display: inline-flex; align-items: center; gap: 7px; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
    .cd-cambio span mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .cd-cambio strong { font-size: 1.15rem; font-weight: 800; font-variant-numeric: tabular-nums; }
    .confirm-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
    .confirm-actions .btn.primary { display: inline-flex; align-items: center; gap: 6px; }
    .confirm-actions .btn.primary mat-icon { font-size: 18px; width: 18px; height: 18px; }

    /* Resultado */
    .resultado-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
    .resultado-header h2 { margin: 0; font-size: 1.2rem; color: var(--success-text, #16a34a); }
    .resultado-header p { margin: 2px 0 0; font-size: 0.9rem; color: var(--text-secondary, #666); }
    .codigo-giro strong { font-size: 1.3rem; color: #F58634; }
    .resultado-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .rg-item { display: flex; flex-direction: column; gap: 2px; }
    .rg-item span { font-size: 0.7rem; color: var(--text-secondary, #666); text-transform: uppercase; }
    .rg-item strong { font-size: 0.95rem; color: var(--text, #1a1a1a); }
    .resultado-actions { display: flex; gap: 10px; }

    /* Pago de Giro Nacional */
    .pago-layout { display: grid; gap: 16px; }
    .pago-search-card, .pago-pending-card, .pago-detail-card { border-color: #e0e7f1; }
    .pago-section-heading { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .pago-heading-icon { width: 42px; height: 42px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 12px; color: #1765b3; background: #eaf3ff; }
    .pago-heading-icon.pending { color: #a94f08; background: #fff2e7; }
    .pago-heading-icon mat-icon { font-size: 22px; width: 22px; height: 22px; }
    .pago-section-heading h2, .pago-detail-title h2 { margin: 0; color: var(--text, #172b4d); font-size: 1rem; font-weight: 700; }
    .pago-section-heading p, .pago-doc-heading p { margin: 4px 0 0; color: var(--text-secondary, #7486a3); font-size: .8rem; }
    .pago-search-form { display: flex; align-items: flex-start; gap: 12px; margin: 20px 0 0 54px; max-width: 760px; }
    .pago-code-field { flex: 1 1 420px; }
    .pago-primary-btn { min-height: 48px; border-radius: 9px !important; background: #f58634 !important; color: #fff !important; font-weight: 700; letter-spacing: 0; }
    .pago-primary-btn mat-icon { margin-right: 6px; }
    .pago-search-btn { margin-top: 2px; min-width: 150px; }
    .pago-list-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; }
    .pago-count { display: inline-flex; align-items: center; justify-content: center; min-width: 28px; height: 26px; padding: 0 8px; margin-left: 4px; border-radius: 14px; background: #f0f4f9; color: #526985; font-size: .75rem; font-weight: 700; }
    .pago-refresh-btn { flex: 0 0 auto; }
    .pago-refresh-btn mat-icon { margin-right: 5px; }
    .pago-loading, .pago-empty { min-height: 140px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #7789a4; text-align: center; }
    .pago-loading { flex-direction: row; min-height: 100px; }
    .pago-empty mat-icon { width: 32px; height: 32px; font-size: 32px; color: #31a276; }
    .pago-empty strong { color: var(--text, #172b4d); font-size: .9rem; }
    .pago-empty span { font-size: .8rem; }
    .pago-pending-table-wrap { overflow-x: auto; border: 1px solid #e5ebf3; border-radius: 9px; }
    .pago-pending-table { width: 100%; min-width: 1120px; border-collapse: collapse; table-layout: auto; }
    .pago-pending-table th { padding: 11px 12px; background: #f5f7fa; border-bottom: 1px solid #dfe6ef; color: #71839b; font-size: .68rem; font-weight: 700; letter-spacing: .035em; text-align: left; text-transform: uppercase; white-space: nowrap; }
    .pago-pending-table td { height: 62px; padding: 9px 12px; border-bottom: 1px solid #e9eef5; color: #344b69; font-size: .78rem; vertical-align: middle; }
    .pago-pending-table tbody tr:last-child td { border-bottom: 0; }
    .pago-pending-table tbody tr:hover { background: #fbfcfe; }
    .pago-row-number { width: 46px; color: #8494a9 !important; text-align: center; }
    .pago-code { color: #315577; font-size: .8rem; font-weight: 700; white-space: nowrap; }
    .pago-date { color: #667c98 !important; white-space: nowrap; }
    .pago-agency, .pago-person { display: flex; align-items: center; gap: 6px; min-width: 125px; max-width: 230px; }
    .pago-agency { color: #607a99; white-space: nowrap; }
    .pago-agency mat-icon, .pago-person mat-icon { flex: 0 0 auto; width: 17px; height: 17px; color: #8698ae; font-size: 17px; }
    .pago-person { color: #273e5c; font-weight: 600; }
    .pago-method { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; min-width: 120px; }
    .pago-method-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 8px; border-radius: 14px; background: #eaf4ff; color: #286294; font-size: .7rem; font-weight: 700; white-space: nowrap; }
    .pago-method-badge.deposit { background: #eaf7ef; color: #27764d; }
    .pago-method-badge mat-icon { width: 15px; height: 15px; font-size: 15px; }
    .pago-method small { max-width: 200px; color: #71839b; font-size: .68rem; line-height: 1.3; overflow-wrap: anywhere; }
    .pago-align-right { text-align: right !important; white-space: nowrap; }
    .pago-pending-amount { margin: 0; color: #19385d; font-size: .94rem; line-height: 1.3; font-weight: 800; white-space: nowrap; }
    .pago-pending-amount small { color: #7186a3; font-size: .7rem; font-weight: 700; }
    .pago-proof-btn { width: 34px !important; height: 34px !important; color: #477cb8; }
    .pago-open-btn { color: #a65312 !important; border-color: #f2c5a0 !important; font-weight: 700; white-space: nowrap; }
    .pago-open-btn mat-icon { margin-right: 5px; }
    .pago-spin { animation: spin .9s linear infinite; }
    .pago-detail-heading { display: flex; align-items: center; gap: 12px; padding-bottom: 16px; border-bottom: 1px solid #e8edf4; }
    .pago-kicker { display: block; margin-bottom: 3px; color: #7d8fa8; font-size: .7rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
    .pago-detail-title { flex: 1; }
    .pago-detail-heading .giro-estado { margin: 0 4px 0 0; }
    .pago-back-btn { flex: 0 0 auto; }
    .pago-back-btn mat-icon { margin-right: 4px; }
    .giro-detalle { margin-top: 16px; }
    .pago-amount-banner { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 16px; padding: 17px 20px; border: 1px solid #cfe4f8; border-radius: 11px; background: #f3f8fe; }
    .pago-amount-banner div { display: flex; flex-direction: column; gap: 4px; }
    .pago-amount-banner span { color: #7386a1; font-size: .76rem; }
    .pago-amount-banner strong { color: #1769ae; font-size: 1.45rem; font-weight: 800; }
    .pago-amount-banner strong small { font-size: .8rem; }
    .pago-amount-banner .pago-bob-total { text-align: right; }
    .pago-amount-banner .pago-bob-total strong { color: #314d70; font-size: 1rem; }
    .giro-estado { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 700; margin-bottom: 12px; }
    .giro-estado.pendiente { background: var(--warning-bg, #fef3c7); color: var(--warning-text, #92400e); }
    .giro-estado.pagado { background: var(--success-bg, #d1fae5); color: var(--success-text, #065f46); }
    .giro-estado.devuelto { background: var(--error-bg, #fef2f2); color: var(--error-text, #991b1b); }
    .giro-info-grid { display: grid; grid-template-columns: repeat(4, minmax(150px, 1fr)); gap: 12px; margin-bottom: 18px; }
    .giro-info-grid div { position: relative; display: flex; flex-direction: column; gap: 4px; min-height: 84px; padding: 13px 12px 12px 42px; border: 1px solid #e8edf4; border-radius: 9px; background: #fff; }
    .giro-info-grid div > mat-icon { position: absolute; top: 13px; left: 12px; color: #8295ae; font-size: 19px; width: 19px; height: 19px; }
    .giro-info-grid span { font-size: 0.7rem; color: var(--text-secondary, #666); text-transform: uppercase; }
    .giro-info-grid strong { font-size: 0.85rem; color: var(--text, #1a1a1a); }
    .estado-msg { display: flex; align-items: center; gap: 9px; padding: 13px; border-radius: 8px; background: var(--hover-bg, #f5f5f5); font-size: 0.85rem; color: var(--text-secondary, #666); }
    .estado-msg mat-icon { color: #6b82a0; }
    .pago-doc-section { margin-top: 20px; padding: 16px; border: 1px solid #e4eaf2; border-radius: 11px; background: #fbfcfe; }
    .pago-doc-heading { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
    .pago-doc-heading .pago-heading-icon { width: 36px; height: 36px; border-radius: 10px; }
    .pago-doc-heading h3 { margin: 0; color: #243a58; font-size: .9rem; font-weight: 700; }
    .pago-doc-heading p { font-size: .75rem; }
    .pago-doc-fields { display: grid; grid-template-columns: minmax(180px, .9fr) minmax(220px, 1.2fr) minmax(150px, .75fr); gap: 12px; }
    .pago-doc-fields mat-form-field { width: 100%; }
    .pago-confirm-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-top: 16px; padding-top: 16px; border-top: 1px solid #e8edf4; }
    .pago-confirm-bar > span { display: flex; align-items: center; gap: 7px; color: #7185a0; font-size: .76rem; }
    .pago-confirm-bar > span mat-icon { color: #6f8db2; }
    .pago-confirm-btn { min-width: 178px; }
    .pago-success-card { display: flex; align-items: center; gap: 16px; padding: 22px; border-color: #c8ead8; background: linear-gradient(110deg, #f3fbf6, #fff 62%); }
    .pago-success-icon { width: 52px; height: 52px; display: grid; place-items: center; flex: 0 0 auto; border-radius: 16px; background: #dcf5e7; color: #16824f; }
    .pago-success-icon mat-icon { width: 30px; height: 30px; font-size: 30px; }
    .pago-success-copy { flex: 1; }
    .pago-success-copy h2 { margin: 0 0 4px; color: #176b45; font-size: 1.1rem; }
    .pago-success-copy p { margin: 0; color: #627b6e; font-size: .82rem; }
    .pago-success-amount { display: flex; flex-direction: column; gap: 4px; margin-right: 12px; text-align: right; }
    .pago-success-amount span { color: #71877b; font-size: .73rem; }
    .pago-success-amount strong { color: #176b45; font-size: 1.1rem; }

    /* Table */
    .table-wrapper { overflow-x: auto; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    .data-table th { text-align: left; padding: 8px 10px; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.3px; color: var(--text-secondary, #666); border-bottom: 2px solid var(--border, #e5e5e5); }
    .data-table td { padding: 8px 10px; border-bottom: 1px solid var(--border, #e5e5e5); color: var(--text, #1a1a1a); }
    .data-table tbody tr:hover { background: var(--hover-bg, #f9fafb); }
    .empty-state { text-align: center; padding: 24px; color: var(--text-secondary, #666); font-size: 0.85rem; }

    /* PDF Popup */
    .pdf-popup { background: var(--card-bg, #fff); border-radius: 12px; width: 90vw; max-width: 800px; height: 85vh; display: flex; flex-direction: column; overflow: hidden; }
    .pdf-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border, #e5e5e5); }
    .pdf-header h3 { margin: 0; font-size: 0.95rem; }
    .pdf-actions { display: flex; gap: 4px; }
    .pdf-loading { flex: 1; display: flex; align-items: center; justify-content: center; gap: 10px; }
    .pdf-iframe { flex: 1; border: none; }

    @media (max-width: 1050px) {
      .giro-info-grid { grid-template-columns: repeat(2, minmax(150px, 1fr)); }
    }
    @media (max-width: 760px) {
      .pago-search-form { margin-left: 0; }
      .pago-doc-fields { grid-template-columns: repeat(2, minmax(180px, 1fr)); }
      .pago-detail-heading { flex-wrap: wrap; }
      .pago-detail-title { min-width: 170px; }
      .pago-back-btn { margin-left: auto; }
      .pago-success-card { flex-wrap: wrap; }
      .pago-success-amount { text-align: left; margin-left: 68px; }
    }
    @media (max-width: 600px) {
      .pago-doc-fields, .giro-info-grid { grid-template-columns: 1fr; }
      .pago-search-form, .pago-confirm-bar { flex-direction: column; align-items: stretch; }
      .pago-search-btn, .pago-confirm-btn { width: 100%; }
      .pago-list-heading { align-items: flex-start; }
      .pago-refresh-btn { min-width: 44px; font-size: 0; }
      .pago-refresh-btn mat-icon { margin: 0; }
      .pago-amount-banner { align-items: flex-start; flex-direction: column; }
      .pago-amount-banner .pago-bob-total { text-align: left; }
      .pago-success-amount { margin-left: 0; }
      .steps { gap: 0; }
      .step-lbl { display: none; }
      .form-row.three > .field, .form-row.two > .field { min-width: 100%; }
      .mp-row { flex-direction: column; }
    }
  `],
})
export class GiroComponent implements OnInit, OnDestroy {
  readonly fondosErrorStateMatcher = new FondosErrorStateMatcher();
  readonly requiredValueErrorStateMatcher = new RequiredValueErrorStateMatcher();
  private giroSvc = inject(GiroService);
  private cambioSvc = inject(CambioService);
  private cajeroSvc = inject(CajeroService);
  private authSvc = inject(AuthService);
  private snack = inject(MatSnackBar);
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  tab: Tab = 'enviar';
  loading = true;

  // Enviar state
  step: Step = 'cliente';
  cat: Catalogos = { tipos_documento: [], expediciones: [], sexos: [], paises: [], estados_civiles: [], ocupaciones: [], actividades_economicas: [], departamentos: [], ciudades: [], defaults: { id_pais: 26 } } as any;
  agenciasDestino: AgenciaDestino[] = [];
  formasPagoCobro: any[] = [];
  cuentasBancarias: CuentaBancariaCobro[] = [];

  clienteDoc = { tipoDoc: '1', documento: '', expedicion: '0' };
  /** Documento del remitente como formulario reactivo; espeja a clienteDoc. */
  remitenteDocForm = this.fb.group({
    tipoDoc: ['1'],
    documento: ['', Validators.required],
    expedicion: ['0'],
  });
  cliente: ClienteInfo = this.emptyCliente();
  /** Datos de identidad del remitente como formulario reactivo; espeja a `cliente`. */
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
  clienteEncontrado: boolean | null = null;
  showClienteForm = false;
  buscandoCliente = false;
  selectedDpto = '0';
  ciudadesFiltradas: any[] = [];
  showEmpleoSection = false;
  showNitField = false;
  // Slider "Mismo número": activo por defecto, replica el celular en
  // Tel. Domicilio y Tel. Trabajo (y los bloquea mientras está activo).
  mismoNro = true;
  // Equivalente para el destinatario: replica el celular en su Teléfono.
  mismoNroDest = true;

  destinatario: any = this.emptyDestinatario();
  destinatariosPrevios: DestinatarioGiro[] = [];
  destinatarioSeleccionado: number | null = null;
  destinatarioNuevo = false;

  // Forma de pago giro
  entidadesFinancieras: EntidadFinanciera[] = [];
  formaPagoGiro: number = 0;
  bancoGiro = '0';
  cuentaDestinoGiro = '';

  /** Destinatario como formulario reactivo; espeja al objeto `destinatario`. */
  destinatarioForm = this.fb.group({
    nombres: ['', Validators.required],
    ape_pat: ['', Validators.required],
    ape_mat: [''],
    celular: [''],
    id_tipo_doc_identidad_d: [1 as number],
    num_doc_identidad_d: [''],
    id_expedicion_d: [0 as number],
    domicilio: [''],
    tel_dom: [''],
  });
  /** Forma de pago del giro como formulario reactivo. */
  pagoGiroForm = this.fb.group({
    formaPagoGiro: [0 as number],
    bancoGiro: ['0'],
    cuentaDestinoGiro: [''],
  });

  monedaEnvio = '2';
  monedaEntrega = '2';
  pagoComision = 0;
  montoEnvio = 0;
  /** Núcleo de la operación como formulario reactivo; espeja a monedaEnvio/montoEnvio. */
  operacionForm = this.fb.group({
    moneda: ['2', Validators.required],
    monto: [null as number | null, [Validators.required, Validators.min(1)]],
  });
  selectedAgenciaDestino = '';
  calculando = false;
  comisionResult: ComisionGiroResult | null = null;

  // UIF
  uifResult: UifGiroResponse | null = null;
  verificandoUif = false;
  requierePcc08 = false;
  esUsuarioHabitual = false;
  ddIncompleta = false;
  ddBloqueado = false;
  complemento: ComplementoData = this.emptyComplemento();
  showComplementoSection = false;
  expAnios = 0;
  expMeses = 0;
  expSecAnios = 0;
  expSecMeses = 0;
  expConAnios = 0;
  expConMeses = 0;
  ciudadesPccFiltradas: any[] = [];
  buscandoBeneficiario = false;
  beneficiarioFinalEncontrado = false;

  /**
   * Formulario reactivo de origen/destino de fondos y PCC-08 (piloto Material).
   * Los validadores `required` se activan/desactivan según `requierePcc08` y si
   * el dinero es de un tercero (`aplicarValidadoresFondos`).
   */
  fondosForm = this.fb.group({
    origen: [''],
    destinoPcc: [''],
    dinero_si: [1 as number],
    select_per: [1 as number],
    nombres_dd: [''],
    doc_nit_dd: [''],
    apellido_paterno_dd: [''],
    apellido_materno_dd: [''],
    tipo_doc_dd: [0 as number],
    act_eco_dd: [0 as number],
    domicilio_dd: [''],
    id_departamento: [0 as number],
    id_ciudad_pcc: [0 as number],
    telefono_dd: [''],
    zona_dd: [''],
  });
  observacionesPredefinidas = OBSERVACIONES_PREDEFINIDAS;
  senalesSeleccionadas: string[] = [];
  observacionesUif = '';

  /** Métodos de pago (forma de cobro) como FormArray dinámico. */
  metodosPagoArray = this.fb.array([this.nuevoMetodoGroup()]);
  get metodosPagoControls(): FormGroup[] { return this.metodosPagoArray.controls as FormGroup[]; }

  showConfirmDialog = false;
  registrando = false;
  private giroUuid: string | null = null;
  resultado: GiroResponse | null = null;

  // Pagar state
  codigoBusqueda = 0;
  buscandoGiro = false;
  giroBuscado: GiroBusqueda | null = null;
  pagoDestinatarioDoc = { tipo: 1, documento: '', expedicion: 0 };
  pagandoGiro = false;
  pagoGiro: any = null;
  girosPendientes: any[] = [];
  cargandoPendientes = false;

  // Devolver state
  codigoBusquedaDev = 0;
  buscandoGiroDev = false;
  giroBuscadoDev: GiroBusqueda | null = null;
  motivoDevolucion = '';
  devolviendoGiro = false;
  devolucionGiro: any = null;

  // PDF
  showPdfPopup = false;
  pdfPopupUrl: SafeResourceUrl | null = null;
  pdfPopupTitulo = '';
  pdfPopupLoading = false;
  private pdfBlobUrl: string | null = null;

  // Debounce
  private calcSubject = new Subject<void>();
  private calcSub!: Subscription;

  private readonly ocupacionToActividad: Record<number, number> = {
    0: 0, 1: 18, 2: 18, 3: 4, 4: 7, 5: 0, 6: 18, 7: 8, 8: 8, 9: 7,
    10: 16, 11: 8, 12: 20, 13: 20, 14: 20, 15: 16, 16: 15, 17: 14, 18: 21, 19: 13,
    20: 5, 21: 21, 22: 18, 23: 16, 24: 7, 25: 18, 26: 1, 27: 16, 28: 19, 29: 18,
    30: 20, 31: 15, 32: 18, 33: 8, 34: 20, 35: 8, 36: 20, 37: 18, 38: 4, 39: 9,
    40: 8, 41: 18, 42: 18, 43: 18, 44: 21, 45: 4, 46: 18, 47: 7, 48: 5, 49: 19,
    50: 15, 51: 14, 52: 21, 53: 4, 54: 9, 55: 9, 56: 12, 57: 11, 58: 15, 59: 0,
    60: 3, 61: 5, 62: 20, 63: 13, 64: 4, 65: 8, 66: 12, 67: 12, 68: 20, 69: 21,
    70: 14, 71: 18, 72: 3, 73: 9, 74: 17, 75: 15, 76: 18, 77: 18, 78: 20, 79: 20,
    80: 20, 81: 20, 82: 15, 83: 18, 84: 18, 85: 21, 86: 7, 87: 10, 88: 7, 89: 3,
    90: 8, 91: 18, 92: 20, 93: 18, 94: 15, 95: 20, 96: 15, 97: 21, 98: 5, 99: 17,
    100: 15, 101: 18, 102: 8, 103: 3, 104: 14, 105: 21, 106: 18, 107: 7, 108: 18, 109: 20,
    110: 8, 111: 21, 112: 20, 113: 20, 114: 15,
  };

  get stepIndex(): number {
    return ['cliente', 'destinatario', 'operacion', 'resultado'].indexOf(this.step);
  }

  get monedaAbr(): string {
    return this.monedaEnvio === '1' ? 'USD' : 'BOB';
  }
  get monedaEnvioAbr(): string { return this.monedaEnvio === '1' ? 'USD' : 'BOB'; }
  get monedaEntregaAbr(): string { return this.monedaEntrega === '1' ? 'USD' : 'BOB'; }

  get isExtranjero(): boolean {
    return +this.cliente.id_pais !== 26;
  }

  /** La expedición sólo aplica a Cédula de Identidad (id_tipo_doc 1). */
  get esCedula(): boolean {
    return +this.clienteDoc.tipoDoc === 1;
  }

  private readonly frecuentOcupaciones = ['COMERCIANTE', 'EMPLEADO', 'AMA DE CASA', 'CHOFER'];

  get sortedOcupaciones(): any[] {
    if (!this.cat.ocupaciones.length) return [];
    const freq = this.frecuentOcupaciones;
    return [...this.cat.ocupaciones].sort((a: any, b: any) => {
      const aIdx = freq.indexOf((a['descripcion'] || '').toUpperCase());
      const bIdx = freq.indexOf((b['descripcion'] || '').toUpperCase());
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return (a['descripcion'] || '').localeCompare(b['descripcion'] || '');
    });
  }

  onOcupacionChange(): void {
    const ocupId = +this.cliente.id_ocupacion;
    const actId = this.ocupacionToActividad[ocupId];
    if (actId !== undefined && actId > 0) {
      this.cliente.id_actividad_economica = actId;
    }
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
    if (this.showNitField && !this.cliente.nit?.trim()) {
      f.push('NIT');
    }
    return f;
  }

  get destinatarioReady(): boolean {
    if (!this.destinatario.nombres || !this.destinatario.ape_pat) return false;
    if (this.formaPagoGiro === 1 && (!this.bancoGiro || this.bancoGiro === '0' || !this.cuentaDestinoGiro.trim())) return false;
    return true;
  }

  get canRegister(): boolean {
    if (this.ddBloqueado) return false;
    if (!this.comisionResult) return false;
    if (+this.selectedAgenciaDestino <= 0) return false;
    // Con PCC-08 requerido, el formulario reactivo decide (origen/destino y, si
    // es dinero de tercero, los datos del tercero son obligatorios).
    if (this.fondosForm.get('origen')?.invalid || this.fondosForm.get('destinoPcc')?.invalid) return false;
    if (this.requierePcc08 && this.fondosForm.invalid) return false;
    if (this.uifResult?.requiere_formulario && !this.isComplementoValid) return false;
    return true;
  }

  get showApellidoCasada(): boolean {
    if (+this.cliente.id_sexo !== 2) return false;
    const estado = this.cat.estados_civiles.find(e => +e['id_estado_civil'] === +this.cliente.id_estado_civil);
    const desc = (estado?.['descripcion'] || '').toUpperCase();
    return desc.includes('CASAD') || desc.includes('VIUD');
  }

  get showActividadSecundaria(): boolean { return +this.complemento.c_actividad_secundaria_id > 0; }

  get showConyugeFields(): boolean {
    const estado = this.cat.estados_civiles.find(e => +e['id_estado_civil'] === +this.cliente.id_estado_civil);
    const desc = (estado?.['descripcion'] || '').toUpperCase();
    return desc.includes('CASAD') || desc.includes('UNION') || desc.includes('UNIÓN');
  }

  get isComplementoValid(): boolean {
    const c = this.complemento;
    if (+c.c_pais_residencia_id <= 0 || !c.c_ciudad_residencia.trim()) return false;
    if (+c.c_ingresos <= 0 || !c.c_fecha_ingreso) return false;
    if (c.c_dependiente_estado_anterior === 'S' &&
        (!c.c_entidad_trabajo_anterior.trim() || +c.c_cargo_trabajo_anterior_id <= 0 ||
         !c.c_fecha_inicio_trabajo_anterior || !c.c_fecha_fin_trabajo_anterior)) return false;
    if (c.c_dependiente_estado_actual === 'S' &&
        (!c.c_entidad_trabajo_actual.trim() || +c.c_cargo_trabajo_actual_id <= 0)) return false;
    if (this.showConyugeFields && (!c.c_nombres_conyugue.trim() || !c.c_apellido_paterno_conyugue.trim())) return false;
    return true;
  }

  toggleComplementoSection(): void {
    this.showComplementoSection = !this.showComplementoSection;
    if (this.showComplementoSection) {
      this.prefillComplementoFromCliente();
      if (!this.complemento.c_fecha_ingreso) this.onExpChange();
    }
  }

  onPccDepartamentoChange(id: number): void {
    const dpto = +id || 0;
    this.ciudadesPccFiltradas = dpto > 0
      ? (this.cat.ciudades || []).filter((c: any) => +c['id_departamento'] === dpto)
      : [];
    this.fondosForm.patchValue({ id_ciudad_pcc: 0 }, { emitEvent: false });
  }

  buscarBeneficiarioFinal(): void {
    const documento = String(this.fondosForm.value.doc_nit_dd ?? '').trim();
    if (!documento || this.buscandoBeneficiario) return;
    this.buscandoBeneficiario = true;
    this.beneficiarioFinalEncontrado = false;
    this.giroSvc.buscarBeneficiarioFinal(documento).subscribe({
      next: (beneficiario) => {
        this.buscandoBeneficiario = false;
        if (!beneficiario) {
          this.snack.open('No se encontró un beneficiario con ese documento. Complete sus datos manualmente.', 'OK', { duration: 4500 });
          return;
        }
        this.beneficiarioFinalEncontrado = true;
        this.fondosForm.patchValue({
          nombres_dd: beneficiario.nombres || '',
          apellido_paterno_dd: beneficiario.apellido_paterno || '',
          apellido_materno_dd: beneficiario.apellido_materno || '',
          tipo_doc_dd: +beneficiario.id_tipo_doc_identidad || 0,
          act_eco_dd: +beneficiario.id_actividad_economica || 0,
          domicilio_dd: beneficiario.domicilio || '',
          telefono_dd: beneficiario.telefono || '',
          zona_dd: beneficiario.zona || '',
          id_departamento: +beneficiario.id_departamento || 0,
          id_ciudad_pcc: +beneficiario.id_ciudad_pcc || 0,
        });
        this.onPccDepartamentoChange(+beneficiario.id_departamento || 0);
        this.fondosForm.patchValue({ id_ciudad_pcc: +beneficiario.id_ciudad_pcc || 0 });
        this.snack.open('Datos del beneficiario final cargados.', 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.buscandoBeneficiario = false;
        this.snack.open(err.message || 'No se pudo buscar el beneficiario final.', 'OK', { duration: 4500 });
      },
    });
  }

  onExpChange(): void {
    const years = Math.max(0, Math.floor(+this.expAnios || 0));
    const months = Math.max(0, Math.min(11, Math.floor(+this.expMeses || 0)));
    this.complemento.c_experiencia_trabajo = `${years} AÑOS ${months} MESES`;
    const date = new Date();
    date.setFullYear(date.getFullYear() - years);
    date.setMonth(date.getMonth() - months);
    this.complemento.c_fecha_ingreso = date.toISOString().slice(0, 10);
  }

  onExpSecChange(): void {
    const years = Math.max(0, Math.floor(+this.expSecAnios || 0));
    const months = Math.max(0, Math.min(11, Math.floor(+this.expSecMeses || 0)));
    this.complemento.c_experiencia_actividad_secundaria = `${years} AÑOS ${months} MESES`;
  }

  onExpConChange(): void {
    const years = Math.max(0, Math.floor(+this.expConAnios || 0));
    const months = Math.max(0, Math.min(11, Math.floor(+this.expConMeses || 0)));
    this.complemento.c_experiencia_trabajo_conyugue = `${years} AÑOS ${months} MESES`;
  }

  private prefillComplementoFromCliente(): void {
    this.complemento.c_pais_residencia_id = +this.cliente.id_pais || 26;
    const ciudad = this.cat.ciudades.find(c => +c['id_ciudad_pcc'] === +this.cliente.id_ciudad);
    if (ciudad) this.complemento.c_ciudad_residencia = ciudad['descripcion'] || '';
  }

  /** (Des)activa los `required` del formulario de fondos según el contexto UIF. */
  aplicarValidadoresFondos(): void {
    const req = this.requierePcc08;
    const tercero = req && this.fondosForm.get('dinero_si')!.value === 0;
    const set = (name: string, validators: any[]) => {
      const c = this.fondosForm.get(name)!;
      c.setValidators(validators);
      c.updateValueAndValidity({ emitEvent: false });
    };
    set('origen', req ? [Validators.required, Validators.minLength(20), Validators.maxLength(200)] : []);
    set('destinoPcc', req ? [Validators.required, Validators.minLength(20), Validators.maxLength(200)] : []);
    set('nombres_dd', tercero ? [Validators.required] : []);
    set('doc_nit_dd', tercero ? [Validators.required] : []);
    const natural = +(this.fondosForm.get('select_per')!.value ?? 1) === 1;
    set('apellido_paterno_dd', tercero && natural ? [Validators.required] : []);
    set('tipo_doc_dd', tercero && natural ? [Validators.required, Validators.min(1)] : []);
    set('domicilio_dd', tercero ? [Validators.required] : []);
    set('telefono_dd', tercero ? [Validators.required] : []);
    const terceroNatural = tercero && natural;
    set('act_eco_dd', terceroNatural ? [Validators.required, Validators.min(1)] : []);
    set('id_departamento', terceroNatural ? [Validators.required, Validators.min(1)] : []);
    set('id_ciudad_pcc', terceroNatural ? [Validators.required, Validators.min(1)] : []);
  }

  ngOnInit(): void {
    const qTab = this.route.snapshot.queryParamMap.get('tab');
    if (qTab === 'pagar' || qTab === 'devolver' || qTab === 'enviar') {
      this.tab = qTab;
      if (qTab === 'pagar') this.cargarGirosPendientes();
    }

    this.route.queryParamMap.subscribe(params => {
      const t = params.get('tab');
      if (t && (t === 'pagar' || t === 'devolver' || t === 'enviar') && t !== this.tab) {
        this.tab = t;
        if (t === 'pagar') this.cargarGirosPendientes();
      }
    });

    this.calcSub = this.calcSubject.pipe(debounceTime(600)).subscribe(() => this.calcularComision());

    // El formulario reactivo de la operación espeja a las props que usa el resto
    // de la lógica (cálculo de comisión, UIF, registro), así se migra la UI a
    // Material sin reescribir todo el flujo.
    this.operacionForm.get('moneda')!.valueChanges.subscribe(v => { this.monedaEnvio = v ?? '2'; this.onMonedaChange(); });
    this.operacionForm.get('monto')!.valueChanges.subscribe(v => { this.montoEnvio = +(v ?? 0); this.onMontoChange(); });
    this.remitenteDocForm.valueChanges.subscribe(v => {
      this.clienteDoc.tipoDoc = v.tipoDoc ?? '1';
      this.clienteDoc.documento = v.documento ?? '';
      this.clienteDoc.expedicion = v.expedicion ?? '0';
    });
    this.clienteForm.valueChanges.subscribe(v => {
      const c = this.cliente;
      c.nombres = v.nombres ?? ''; c.ape_pat = v.ape_pat ?? ''; c.ape_mat = v.ape_mat ?? '';
      c.celular = v.celular ?? ''; c.email = v.email ?? '';
      c.fecha_nacimiento = v.fecha_nacimiento ?? '';
      c.id_sexo = v.id_sexo ?? 1; c.id_pais = v.id_pais ?? 26;
      c.lugar_nacimiento = v.lugar_nacimiento ?? '';
      c.id_estado_civil = v.id_estado_civil ?? 1; c.id_ocupacion = v.id_ocupacion ?? 1;
      c.id_actividad_economica = v.id_actividad_economica ?? 1; c.id_ciudad = v.id_ciudad ?? 1;
      c.zona = v.zona ?? ''; c.domicilio = v.domicilio ?? '';
      c.tel_dom = v.tel_dom ?? ''; c.tel_trab = v.tel_trab ?? ''; c.nit = v.nit ?? '';
      c.e_trabajo = v.e_trabajo ?? ''; c.e_cargo = v.e_cargo ?? ''; c.e_direccion = v.e_direccion ?? '';
      this.selectedDpto = v.departamento ?? '0';
    });
    // Mientras "Mismo número" está activo, el celular se replica en los otros
    // dos teléfonos en cada cambio.
    this.clienteForm.get('celular')!.valueChanges.subscribe(cel => {
      if (this.mismoNro) {
        this.clienteForm.patchValue({ tel_dom: cel ?? '', tel_trab: cel ?? '' }, { emitEvent: true });
      }
    });
    this.destinatarioForm.valueChanges.subscribe(v => {
      const d = this.destinatario;
      d.nombres = v.nombres ?? ''; d.ape_pat = v.ape_pat ?? ''; d.ape_mat = v.ape_mat ?? '';
      d.celular = v.celular ?? ''; d.id_tipo_doc_identidad_d = v.id_tipo_doc_identidad_d ?? 1;
      d.num_doc_identidad_d = v.num_doc_identidad_d ?? ''; d.id_expedicion_d = v.id_expedicion_d ?? 0;
      d.domicilio = v.domicilio ?? ''; d.tel_dom = v.tel_dom ?? '';
    });
    // Replica el celular del destinatario en su Teléfono mientras el slider está activo.
    this.destinatarioForm.get('celular')!.valueChanges.subscribe(cel => {
      if (this.mismoNroDest) {
        this.destinatarioForm.patchValue({ tel_dom: cel ?? '' }, { emitEvent: true });
      }
    });
    this.pagoGiroForm.valueChanges.subscribe(v => {
      this.formaPagoGiro = v.formaPagoGiro ?? 0;
      this.bancoGiro = v.bancoGiro ?? '0';
      this.cuentaDestinoGiro = v.cuentaDestinoGiro ?? '';
    });

    forkJoin({
      catalogos: this.cambioSvc.catalogos(),
      agencias: this.giroSvc.agenciasDestino(),
      formasPagoCobro: this.cambioSvc.formasPagoCobro(),
      cuentasBancarias: this.cajeroSvc.cuentasBancariasCobro(),
      entidades: this.giroSvc.entidadesFinancieras(),
    }).subscribe({
      next: ({ catalogos, agencias, formasPagoCobro, cuentasBancarias, entidades }) => {
        this.cat = catalogos;
        this.agenciasDestino = agencias;
        this.formasPagoCobro = formasPagoCobro;
        this.cuentasBancarias = cuentasBancarias;
        this.entidadesFinancieras = entidades;
        this.loading = false;
      },
      error: (err) => {
        this.snack.open('Error al cargar datos: ' + err.message, 'OK', { duration: 5000 });
        this.loading = false;
      },
    });
  }

  ngOnDestroy(): void {
    this.calcSub?.unsubscribe();
    if (this.pdfBlobUrl) URL.revokeObjectURL(this.pdfBlobUrl);
  }

  switchTab(t: Tab): void {
    this.tab = t;
    if (t === 'pagar') this.cargarGirosPendientes();
  }

  // ─── Cliente ───────────────────────────────────────────────────────

  resetClienteSearch(): void {
    this.clienteEncontrado = null;
    this.showClienteForm = false;
  }

  toggleNit(): void {
    this.showNitField = !this.showNitField;
    if (!this.showNitField) {
      this.cliente.nit = '';
      this.clienteForm.patchValue({ nit: '' });
    }
    this.aplicarValidadorNit();
  }

  /** El NIT es obligatorio sólo cuando el toggle "Con NIT" está activo. */
  private aplicarValidadorNit(): void {
    const c = this.clienteForm.get('nit')!;
    c.setValidators(this.showNitField ? [Validators.required] : []);
    c.updateValueAndValidity({ emitEvent: false });
    if (this.showNitField) { c.markAsTouched(); }
  }

  buscarCliente(): void {
    const doc = this.clienteDoc.documento.trim();
    if (!doc || doc.length < 3) return;
    this.buscandoCliente = true;
    this.cambioSvc.buscarCliente(doc, +this.clienteDoc.tipoDoc, +this.clienteDoc.expedicion).subscribe({
      next: (c) => {
        this.buscandoCliente = false;
        if (c) {
          this.clienteEncontrado = true;
          this.cliente = { ...c };
          if (c.id_expedicion) this.clienteDoc.expedicion = c.id_expedicion.toString();
          this.showNitField = !!(c.nit && c.nit !== '0' && c.nit.trim());
          this.sincronizarClienteForm();
        } else {
          this.clienteEncontrado = false;
          this.cliente = this.emptyCliente();
          this.showNitField = false;
          this.cliente.num_doc_identidad = doc;
          this.cliente.id_tipo_doc_identidad = +this.clienteDoc.tipoDoc;
          this.sincronizarClienteForm();
          this.cliente.id_expedicion = +this.clienteDoc.expedicion;
        }
        this.showClienteForm = true;
        this.aplicarValidadorNit();
        // Mostrar de una los campos obligatorios (igual que Celular) al entrar.
        this.clienteForm.markAllAsTouched();
        // La vista ya no avanza por pasos: cargar los destinatarios apenas se
        // identifica al remitente para que el resto del formulario quede listo.
        this.cargarDestinatariosPrevios();
      },
      error: (err) => {
        this.buscandoCliente = false;
        Swal.fire({
          icon: 'warning',
          title: 'No se pudo buscar el cliente',
          text: err.message || 'Error buscando cliente',
          confirmButtonColor: '#F58634',
        });
      },
    });
  }

  /** Replica el número de celular en Tel. Domicilio y Tel. Trabajo. */
  private replicarCelular(): void {
    const cel = this.clienteForm.get('celular')!.value ?? '';
    this.clienteForm.patchValue({ tel_dom: cel, tel_trab: cel });
  }

  /** Alterna el slider "Mismo número". Al activarlo, copia el celular. */
  toggleMismoNro(): void {
    this.mismoNro = !this.mismoNro;
    if (this.mismoNro) { this.replicarCelular(); }
  }

  /** Replica el celular del destinatario en su Teléfono. */
  private replicarCelularDest(): void {
    const cel = this.destinatarioForm.get('celular')!.value ?? '';
    this.destinatarioForm.patchValue({ tel_dom: cel });
  }

  toggleMismoNroDest(): void {
    this.mismoNroDest = !this.mismoNroDest;
    if (this.mismoNroDest) { this.replicarCelularDest(); }
  }

  filterCiudades(): void {
    const dpto = +this.selectedDpto;
    this.ciudadesFiltradas = dpto > 0
      ? (this.cat.ciudades || []).filter((c: any) => +c['id_departamento'] === dpto)
      : [];
  }

  private cargarDestinatariosPrevios(): void {
    const doc = this.clienteDoc.documento.trim();
    if (!doc || doc.length < 3) return;

    this.giroSvc.destinatariosPorRemitente(
      doc,
      +this.clienteDoc.tipoDoc,
      +this.clienteDoc.expedicion,
    ).subscribe({
      next: (list) => {
        this.destinatariosPrevios = list;
        this.destinatarioNuevo = list.length === 0;
      },
      error: () => {
        // La búsqueda del cliente no debe bloquear el llenado manual del giro.
        this.destinatariosPrevios = [];
        this.destinatarioNuevo = true;
      },
    });
  }

  goToDestinatario(): void {
    this.cambioSvc.actualizarCliente({
      ...this.cliente,
      id_tipo_doc_identidad: +this.clienteDoc.tipoDoc,
      num_doc_identidad: this.clienteDoc.documento,
      id_expedicion: +this.clienteDoc.expedicion,
    }).subscribe({ error: () => {} });

    this.step = 'destinatario';
    // Marca los obligatorios del destinatario al entrar, para que el cajero
    // sepa cuáles completar (igual que en el remitente).
    this.destinatarioForm.markAllAsTouched();
    this.cargarDestinatariosPrevios();
  }

  // ─── Destinatario ──────────────────────────────────────────────────

  seleccionarDestinatarioPrevio(dp: DestinatarioGiro): void {
    this.destinatarioSeleccionado = dp.id_destinatario;
    this.destinatario = { ...dp };
    this.sincronizarDestinatarioForm();
  }

  goToOperacion(): void {
    this.step = 'operacion';
    if (this.montoEnvio > 0 && !this.comisionResult) {
      this.calcSubject.next();
    }
  }

  // ─── Operación ─────────────────────────────────────────────────────

  onMonedaChange(): void {
    this.comisionResult = null;
    this.uifResult = null;
    if (this.montoEnvio > 0) this.calcSubject.next();
  }

  programarCalculo(): void {
    if (this.montoEnvio > 0) this.calcSubject.next();
  }

  onMontoChange(): void {
    this.comisionResult = null;
    this.uifResult = null;
    if (this.montoEnvio > 0) {
      this.calcSubject.next();
    }
  }

  private calcularComision(): void {
    if (this.montoEnvio <= 0) return;
    this.calculando = true;
    this.giroSvc.calcularComision({
      id_moneda: +this.monedaEnvio,
      id_moneda_entrega: +this.monedaEntrega,
      monto: this.montoEnvio,
      incluir_comision: this.pagoComision,
    }).subscribe({
      next: (r) => {
        this.calculando = false;
        this.comisionResult = r;
        this.checkUif();
      },
      error: (err) => {
        this.calculando = false;
        this.snack.open(err.message || 'Error al calcular comisión', 'OK', { duration: 5000 });
      },
    });
  }

  private checkUif(): void {
    if (!this.clienteDoc.documento) return;
    this.verificandoUif = true;
    this.giroSvc.verificarUif({
      id_moneda: +this.monedaEnvio,
      monto: this.montoEnvio,
      documento: this.clienteDoc.documento,
      tipo_doc: +this.clienteDoc.tipoDoc,
      expedicion: +this.clienteDoc.expedicion,
    }).subscribe({
      next: (r) => {
        this.verificandoUif = false;
        this.uifResult = r;
        this.requierePcc08 = r.requiere_pcc08;
        this.aplicarValidadoresFondos();
        this.esUsuarioHabitual = !!r.usuario_habitual;
        this.ddIncompleta = !!r.dd_incompleta;
        this.ddBloqueado = !!r.dd_bloqueado;
      },
      error: () => { this.verificandoUif = false; },
    });
  }

  toggleObservacion(obs: string): void {
    const idx = this.senalesSeleccionadas.indexOf(obs);
    if (idx >= 0) this.senalesSeleccionadas.splice(idx, 1);
    else this.senalesSeleccionadas.push(obs);
  }

  // Métodos de pago
  cuentaKey(c: CuentaBancariaCobro): string {
    return `${c.id_entidad_financiera}|${c.num_cuenta_bancaria}`;
  }

  onSelectCuenta(mp: FormGroup, key: string): void {
    const [idEnt, numCta] = (key || '').split('|');
    const sel = this.cuentasBancarias.find(c => c.id_entidad_financiera === +idEnt && c.num_cuenta_bancaria === numCta);
    if (sel) {
      mp.patchValue({
        num_cuenta_bancaria: sel.num_cuenta_bancaria,
        id_entidad_financiera: sel.id_entidad_financiera,
        id_agencia: sel.id_agencia,
        id_moneda_cuenta: sel.id_moneda,
        id_tipo_cuenta_bancaria: sel.id_tipo_cuenta_bancaria,
      });
    }
  }

  addMetodoPago(): void { this.metodosPagoArray.push(this.nuevoMetodoGroup()); }
  removeMetodoPago(i: number): void { this.metodosPagoArray.removeAt(i); }

  getAgenciaDestinoLabel(): string {
    const a = this.agenciasDestino.find(x => x.id_agencia === +this.selectedAgenciaDestino);
    return a ? a.descripcion : '';
  }

  /** Cambio a devolver: sólo cuando el cobro es todo en efectivo y se ingresó
      un monto mayor al Total a Cobrar. En otros casos es 0. */
  get cambioEfectivo(): number {
    if (!this.comisionResult) return 0;
    const metodos = this.metodosPagoControls.map(g => ({
      forma: +g.get('id_forma_pago')!.value,
      monto: +(g.get('monto')!.value || 0),
    }));
    if (!metodos.length || !metodos.every(m => m.forma === 1)) return 0;
    const suma = metodos.reduce((s, m) => s + m.monto, 0);
    const dif = Math.round((suma - (+this.comisionResult.total_bob)) * 100) / 100;
    return dif > 0 ? dif : 0;
  }

  abrirConfirmDialog(): void {
    // Autocompleta el monto del único método sólo si está vacío (así se puede
    // dejar un monto mayor en efectivo para dar cambio).
    if (this.comisionResult && this.metodosPagoArray.length === 1) {
      const g = this.metodosPagoArray.at(0);
      if (!+(g.get('monto')!.value || 0)) {
        g.patchValue({ monto: this.comisionResult.total_bob });
      }
    }
    const err = this.validarFormaCobro();
    if (err) {
      Swal.fire({
        icon: 'warning',
        title: 'Revisá la Forma de Cobro',
        html: err,
        confirmButtonColor: '#F58634',
      });
      return;
    }
    this.showConfirmDialog = true;
  }

  /**
   * Valida la suma de los métodos de pago contra el Total a Cobrar.
   * - Sólo efectivo: se admite entregar de más (cambio), pero debe cubrir el total.
   * - QR / Transferencia / Mixta: la suma debe ser exactamente igual al total.
   * Devuelve un mensaje (HTML) con el problema, o `null` si está correcto.
   */
  private validarFormaCobro(): string | null {
    const total = Math.round((+(this.comisionResult?.total_bob ?? 0)) * 100) / 100;
    const metodos = this.metodosPagoControls.map(g => ({
      forma: +g.get('id_forma_pago')!.value,
      monto: +(g.get('monto')!.value || 0),
    }));
    const suma = Math.round(metodos.reduce((s, m) => s + m.monto, 0) * 100) / 100;
    const soloEfectivo = metodos.length > 0 && metodos.every(m => m.forma === 1);
    const bs = (n: number) => 'Bs ' + n.toFixed(2);

    if (soloEfectivo) {
      if (suma < total) {
        return `El efectivo ingresado (<b>${bs(suma)}</b>) no cubre el Total a Cobrar (<b>${bs(total)}</b>).`;
      }
      return null; // de más = cambio, permitido
    }
    // Con QR, Transferencia o pago mixto no se puede dar cambio: debe ser exacto.
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
          <p style="margin:12px 0 0;color:#777;font-size:12.5px">Ajustá los montos de los métodos para que la suma dé <b>${bs(total)}</b>.</p>
        </div>`;
    }
    return null;
  }

  private uuidGiro(): string {
    if (this.giroUuid) return this.giroUuid;
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      this.giroUuid = crypto.randomUUID();
    } else {
      this.giroUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
    return this.giroUuid;
  }

  confirmarRegistro(): void {
    if (!this.comisionResult || this.registrando) return;
    this.registrando = true;

    const obsCompletas = [...this.senalesSeleccionadas];
    if (this.observacionesUif.trim()) obsCompletas.push(this.observacionesUif.trim());

    this.giroSvc.registrarGiro({
      cliente: {
        ...this.cliente,
        id_tipo_doc_identidad: +this.clienteDoc.tipoDoc,
        num_doc_identidad: this.clienteDoc.documento,
        id_expedicion: +this.clienteDoc.expedicion,
        // Extranjero no usa ciudad; se envía un valor por defecto si quedó sin elegir.
        id_ciudad: this.isExtranjero && +this.cliente.id_ciudad <= 0 ? 1 : this.cliente.id_ciudad,
      },
      destinatario: {
        ...this.destinatario,
        id_entidad_financiera: this.formaPagoGiro === 1 ? +this.bancoGiro : 0,
        numero_cuenta: this.formaPagoGiro === 1 ? this.cuentaDestinoGiro.trim() : '',
      },
      operacion: {
        mon_rec: +this.monedaEnvio,
        mon_ent: +this.monedaEntrega,
        monto: this.montoEnvio,
        id_agencia_destino: +this.selectedAgenciaDestino,
        pago_comision: this.pagoComision,
        metodos_pago: this.metodosPagoArray.value,
        origen: this.fondosForm.value.origen,
        destino_pcc: this.fondosForm.value.destinoPcc,
        dinero_si: this.fondosForm.value.dinero_si,
        select_per: this.fondosForm.value.select_per,
        nombres_dd: this.fondosForm.value.nombres_dd,
        doc_nit_dd: this.fondosForm.value.doc_nit_dd,
        apellido_paterno_dd: this.fondosForm.value.apellido_paterno_dd,
        apellido_materno_dd: this.fondosForm.value.apellido_materno_dd,
        tipo_doc_dd: this.fondosForm.value.tipo_doc_dd,
        domicilio_dd: this.fondosForm.value.domicilio_dd,
        telefono_dd: this.fondosForm.value.telefono_dd,
        zona_dd: this.fondosForm.value.zona_dd,
        act_eco_dd: this.fondosForm.value.act_eco_dd,
        id_departamento: this.fondosForm.value.id_departamento,
        id_ciudad_pcc: this.fondosForm.value.id_ciudad_pcc,
        impresion_pcc08: this.requierePcc08 ? 'S' : 'N',
        observaciones_uif: obsCompletas.join(' | '),
        cuenta_bancaria: this.formaPagoGiro,
        complemento: this.uifResult?.requiere_formulario ? this.complemento : undefined,
      },
      comision: this.comisionResult,
      uuid: this.uuidGiro(),
    }).subscribe({
      next: (r) => {
        this.registrando = false;
        this.showConfirmDialog = false;
        this.resultado = r;
        this.step = 'resultado';
      },
      error: (err) => {
        this.registrando = false;
        this.showConfirmDialog = false;
        const msg = err.message || 'Error al registrar giro';
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

  nuevoGiro(): void {
    this.step = 'cliente';
    this.giroUuid = null;
    this.clienteDoc = { tipoDoc: '1', documento: '', expedicion: '0' };
    this.remitenteDocForm.reset({ tipoDoc: '1', documento: '', expedicion: '0' });
    this.cliente = this.emptyCliente();
    this.sincronizarClienteForm();
    this.clienteEncontrado = null;
    this.showClienteForm = false;
    this.selectedDpto = '0';
    this.ciudadesFiltradas = [];
    this.showEmpleoSection = false;
    this.destinatario = this.emptyDestinatario();
    this.destinatariosPrevios = [];
    this.destinatarioSeleccionado = null;
    this.destinatarioNuevo = false;
    this.formaPagoGiro = 0;
    this.bancoGiro = '0';
    this.cuentaDestinoGiro = '';
    this.sincronizarDestinatarioForm();
    this.pagoGiroForm.reset({ formaPagoGiro: 0, bancoGiro: '0', cuentaDestinoGiro: '' });
    this.monedaEnvio = '2';
    this.monedaEntrega = '2';
    this.pagoComision = 0;
    this.montoEnvio = 0;
    this.operacionForm.reset({ moneda: '2', monto: null });
    this.selectedAgenciaDestino = '';
    this.comisionResult = null;
    this.uifResult = null;
    this.requierePcc08 = false;
    this.beneficiarioFinalEncontrado = false;
    this.buscandoBeneficiario = false;
    this.esUsuarioHabitual = false;
    this.ddIncompleta = false;
    this.ddBloqueado = false;
    this.fondosForm.reset({ origen: '', destinoPcc: '', dinero_si: 1, select_per: 1, nombres_dd: '', doc_nit_dd: '', apellido_paterno_dd: '', apellido_materno_dd: '', tipo_doc_dd: 0, act_eco_dd: 0, domicilio_dd: '', id_departamento: 0, id_ciudad_pcc: 0, telefono_dd: '', zona_dd: '' });
    this.complemento = this.emptyComplemento();
    this.showComplementoSection = false;
    this.expAnios = this.expMeses = this.expSecAnios = this.expSecMeses = this.expConAnios = this.expConMeses = 0;
    this.ciudadesPccFiltradas = [];
    this.aplicarValidadoresFondos();
    this.senalesSeleccionadas = [];
    this.observacionesUif = '';
    this.metodosPagoArray.clear();
    this.metodosPagoArray.push(this.nuevoMetodoGroup());
    this.resultado = null;
    this.showConfirmDialog = false;
    this.registrando = false;
  }

  // ─── Pagar ─────────────────────────────────────────────────────────

  buscarGiroParaPago(): void {
    if (!this.codigoBusqueda || this.buscandoGiro) return;
    this.buscandoGiro = true;
    this.giroBuscado = null;
    this.giroSvc.buscarGiro(this.codigoBusqueda).subscribe({
      next: (g) => {
        this.buscandoGiro = false;
        this.giroBuscado = g;
        if (g.destinatario_doc) {
          this.pagoDestinatarioDoc.documento = g.destinatario_doc;
        }
      },
      error: (err) => {
        this.buscandoGiro = false;
        this.snack.open(err.message || 'Giro no encontrado', 'OK', { duration: 4000 });
      },
    });
  }

  confirmarPago(): void {
    if (!this.giroBuscado || this.pagandoGiro) return;
    this.pagandoGiro = true;
    this.giroSvc.pagarGiro({
      codigo: this.giroBuscado.codigo,
      destinatario_doc: {
        id_tipo_doc_identidad: +this.pagoDestinatarioDoc.tipo,
        num_doc_identidad: this.pagoDestinatarioDoc.documento,
        id_expedicion: +this.pagoDestinatarioDoc.expedicion,
      },
      uuid: this.uuidGiro(),
    }).subscribe({
      next: (r) => {
        this.pagandoGiro = false;
        this.pagoGiro = r;
        this.giroUuid = null;
      },
      error: (err) => {
        this.pagandoGiro = false;
        const msg = err.message || 'Error al pagar giro';
        const esBovCaja = /b[oó]veda|caja/i.test(msg);
        Swal.fire({
          icon: esBovCaja ? 'warning' : 'error',
          title: esBovCaja ? 'Sesión no disponible' : 'Error al pagar',
          text: msg,
          confirmButtonColor: '#F58634',
        });
      },
    });
  }

  resetPago(): void {
    this.codigoBusqueda = 0;
    this.giroBuscado = null;
    this.pagoGiro = null;
    this.pagandoGiro = false;
    this.pagoDestinatarioDoc = { tipo: 1, documento: '', expedicion: 0 };
    this.giroUuid = null;
    this.cargarGirosPendientes();
  }

  volverAListaPago(): void {
    this.giroBuscado = null;
    this.codigoBusqueda = 0;
    this.pagoDestinatarioDoc = { tipo: 1, documento: '', expedicion: 0 };
  }

  cargarGirosPendientes(): void {
    this.cargandoPendientes = true;
    this.giroSvc.girosPendientes().subscribe({
      next: (list) => {
        this.cargandoPendientes = false;
        this.girosPendientes = list;
      },
      error: () => { this.cargandoPendientes = false; },
    });
  }

  // ─── Devolver ──────────────────────────────────────────────────────

  buscarGiroParaDevolucion(): void {
    if (!this.codigoBusquedaDev || this.buscandoGiroDev) return;
    this.buscandoGiroDev = true;
    this.giroBuscadoDev = null;
    this.giroSvc.buscarGiro(this.codigoBusquedaDev).subscribe({
      next: (g) => {
        this.buscandoGiroDev = false;
        this.giroBuscadoDev = g;
      },
      error: (err) => {
        this.buscandoGiroDev = false;
        this.snack.open(err.message || 'Giro no encontrado', 'OK', { duration: 4000 });
      },
    });
  }

  confirmarDevolucion(): void {
    if (!this.giroBuscadoDev || this.devolviendoGiro || !this.motivoDevolucion.trim()) return;
    this.devolviendoGiro = true;
    this.giroSvc.devolverGiro({
      codigo: this.giroBuscadoDev.codigo,
      motivo: this.motivoDevolucion,
      uuid: this.uuidGiro(),
    }).subscribe({
      next: (r) => {
        this.devolviendoGiro = false;
        this.devolucionGiro = r;
        this.giroUuid = null;
      },
      error: (err) => {
        this.devolviendoGiro = false;
        const msg = err.message || 'Error al devolver giro';
        const esBovCaja = /b[oó]veda|caja/i.test(msg);
        Swal.fire({
          icon: esBovCaja ? 'warning' : 'error',
          title: esBovCaja ? 'Sesión no disponible' : 'Error al devolver',
          text: msg,
          confirmButtonColor: '#F58634',
        });
      },
    });
  }

  resetDevolucion(): void {
    this.codigoBusquedaDev = 0;
    this.giroBuscadoDev = null;
    this.devolucionGiro = null;
    this.devolviendoGiro = false;
    this.motivoDevolucion = '';
    this.giroUuid = null;
  }

  volverAListaDev(): void {
    this.giroBuscadoDev = null;
    this.codigoBusquedaDev = 0;
    this.motivoDevolucion = '';
  }

  // ─── PDF ───────────────────────────────────────────────────────────

  abrirComprobanteEnvioGiro(idGiro: number): void {
    this.pdfPopupTitulo = 'Comprobante de Envío';
    this.pdfPopupLoading = true;
    this.pdfPopupUrl = null;
    this.showPdfPopup = true;

    this.giroSvc.descargarComprobantePdf(idGiro).subscribe({
      next: (blob) => {
        if (this.pdfBlobUrl) URL.revokeObjectURL(this.pdfBlobUrl);
        this.pdfBlobUrl = URL.createObjectURL(blob);
        this.pdfPopupUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.pdfBlobUrl);
        this.pdfPopupLoading = false;
      },
      error: () => {
        this.pdfPopupLoading = false;
        this.showPdfPopup = false;
        this.snack.open('Error al generar el comprobante de envío', 'Cerrar', { duration: 3000 });
      },
    });
  }

  abrirPdfPopup(tipo: 'comprobante' | 'factura'): void {
    if (!this.resultado) return;
    this.pdfPopupTitulo = tipo === 'comprobante' ? 'Comprobante de Giro' : 'Factura de Comisión';
    this.pdfPopupLoading = true;
    this.pdfPopupUrl = null;
    this.showPdfPopup = true;

    const obs = tipo === 'comprobante'
      ? this.giroSvc.descargarComprobantePdf(this.resultado.id_giro)
      : this.giroSvc.descargarFacturaPdf(this.resultado.id_giro);

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
        this.snack.open(`Error al generar PDF`, 'Cerrar', { duration: 3000 });
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
    if (this.pdfBlobUrl) { URL.revokeObjectURL(this.pdfBlobUrl); this.pdfBlobUrl = null; }
    this.pdfPopupUrl = null;
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  /** Refleja en el formulario reactivo los datos de identidad de `cliente`. */
  /** Refleja en el formulario reactivo los datos del objeto `destinatario`. */
  private sincronizarDestinatarioForm(): void {
    const d = this.destinatario;
    // "Mismo número" activo si el teléfono está vacío o ya coincide con el celular.
    const dcel = d.celular ?? '', dtel = d.tel_dom ?? '';
    this.mismoNroDest = !dtel || dtel === dcel;
    this.destinatarioForm.patchValue({
      nombres: d.nombres ?? '', ape_pat: d.ape_pat ?? '', ape_mat: d.ape_mat ?? '',
      celular: d.celular ?? '', id_tipo_doc_identidad_d: d.id_tipo_doc_identidad_d ?? 1,
      num_doc_identidad_d: d.num_doc_identidad_d ?? '', id_expedicion_d: d.id_expedicion_d ?? 0,
      domicilio: d.domicilio ?? '', tel_dom: d.tel_dom ?? '',
    }, { emitEvent: false });
  }

  /** Inicia la carga de un destinatario nuevo (vacía el objeto y el formulario). */
  nuevoDestinatario(): void {
    this.destinatarioNuevo = true;
    this.destinatarioSeleccionado = null;
    this.destinatario = this.emptyDestinatario();
    this.sincronizarDestinatarioForm();
  }

  private sincronizarClienteForm(): void {
    const c = this.cliente;
    // "Mismo número" activo si los otros teléfonos están vacíos o ya coinciden
    // con el celular; si difieren (cliente existente), se desactiva para no pisarlos.
    const cel = c.celular ?? '', td = c.tel_dom ?? '', tt = c.tel_trab ?? '';
    this.mismoNro = (!td && !tt) || (td === cel && tt === cel);
    this.clienteForm.patchValue({
      nombres: c.nombres ?? '', ape_pat: c.ape_pat ?? '', ape_mat: c.ape_mat ?? '',
      celular: c.celular ?? '', email: c.email ?? '',
      fecha_nacimiento: c.fecha_nacimiento ?? '',
      id_sexo: c.id_sexo ?? 1, id_pais: c.id_pais ?? 26,
      lugar_nacimiento: c.lugar_nacimiento ?? '',
      id_estado_civil: c.id_estado_civil ?? 1, id_ocupacion: c.id_ocupacion ?? 1,
      id_actividad_economica: c.id_actividad_economica ?? 1, id_ciudad: c.id_ciudad ?? 1,
      zona: c.zona ?? '', domicilio: c.domicilio ?? '',
      tel_dom: c.tel_dom ?? '', tel_trab: c.tel_trab ?? '', nit: c.nit ?? '',
      e_trabajo: c.e_trabajo ?? '', e_cargo: c.e_cargo ?? '', e_direccion: c.e_direccion ?? '',
      departamento: this.selectedDpto ?? '0',
    }, { emitEvent: false });
  }

  private emptyCliente(): ClienteInfo {
    return {
      id_tipo_doc_identidad: 1, num_doc_identidad: '', id_expedicion: 0,
      nombres: '', ape_pat: '', ape_mat: '', id_sexo: 1,
      fecha_nacimiento: '', id_pais: 26, lugar_nacimiento: '',
      id_estado_civil: 1, id_ocupacion: 1, id_actividad_economica: 1,
      id_ciudad: 0, zona: '', domicilio: '', tel_dom: '', tel_trab: '',
      celular: '', e_trabajo: '', e_cargo: '', e_direccion: '', nit: '', email: '',
    };
  }

  emptyDestinatario(): any {
    return {
      id_destinatario: 0, nombres: '', ape_pat: '', ape_mat: '',
      id_tipo_doc_identidad_d: 1, num_doc_identidad_d: '', id_expedicion_d: 0,
      domicilio: '', tel_dom: '', celular: '',
    };
  }

  private emptyPcc08(): any {
    return { dinero_si: 1, select_per: 1, nombres_dd: '', doc_nit_dd: '', domicilio_dd: '', telefono_dd: '', zona_dd: '' };
  }

  private emptyComplemento(): ComplementoData {
    return {
      c_apellido_casada: '', c_pais_residencia_id: 26, c_ciudad_residencia: '',
      c_ingresos: 0, c_fecha_ingreso: '', c_experiencia_trabajo: '',
      c_actividad_secundaria_id: 0, c_ingresos_actividad_secundaria: 0,
      c_experiencia_actividad_secundaria: '', c_referencias_bancarias: '',
      c_referencias_comerciales: '', c_referencias_personales: '',
      c_dependiente_estado_anterior: 'N', c_entidad_trabajo_anterior: '',
      c_fecha_inicio_trabajo_anterior: '', c_fecha_fin_trabajo_anterior: '',
      c_cargo_trabajo_anterior_id: 1, c_dependiente_estado_actual: 'N',
      c_entidad_trabajo_actual: '', c_cargo_trabajo_actual_id: 1,
      c_nombres_conyugue: '', c_apellido_paterno_conyugue: '', c_apellido_materno_conyugue: '',
      c_apellido_casada_conyugue: '', c_profesion_conyugue_id: 0,
      c_actividad_principal_conyugue_id: 0, c_actividad_secundaria_conyugue_id: 0,
      c_lugar_trabajo_conyugue: '', c_cargo_conyugue_id: 0,
      c_ingreso_mensual_conyugue: 0, c_experiencia_trabajo_conyugue: '',
    };
  }

  private emptyMetodoPago(): any {
    return {
      id_forma_pago: 1, monto: 0, referencia: '', observaciones: '',
      num_cuenta_bancaria: '', id_entidad_financiera: 0, id_agencia: 0,
      id_moneda_cuenta: 0, id_tipo_cuenta_bancaria: 0, _cuentaKey: '',
    };
  }

  /** Grupo reactivo de un método de pago; `monto` obligatorio (> 0). */
  private nuevoMetodoGroup(): FormGroup {
    return this.fb.group({
      id_forma_pago: [1 as any],
      monto: [0, [Validators.required, Validators.min(0.01)]],
      referencia: [''],
      observaciones: [''],
      _cuentaKey: [''],
      num_cuenta_bancaria: [''],
      id_entidad_financiera: [0],
      id_agencia: [0],
      id_moneda_cuenta: [0],
      id_tipo_cuenta_bancaria: [0],
    });
  }
}
