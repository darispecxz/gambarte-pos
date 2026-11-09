import { Component, inject, OnInit, OnDestroy, QueryList, ViewChildren } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormsModule, NgModel } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ErrorStateMatcher } from '@angular/material/core';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { CambioService } from '../../core/cambio.service';
import { RemesaService, DestinoInfo, DestinatarioInfo, ComisionResult, RemesaResponse, ComisionPreferencial, UifRemesaResponse, CompraUsdResult, BancoChile, FormaPagoChile, FormaPagoCobro, MetodoPago } from '../../core/remesa.service';
import { AuthService } from '../../core/auth.service';
import { SearchableSelectComponent } from '../../shared/searchable-select.component';
import { TelInputComponent } from '../../shared/tel-input.component';
import { CajeroService } from '../../core/cajero.service';
import { ClienteInfo, Catalogos, CuentaBancariaCobro, ComplementoData } from '../../core/models';
import { forkJoin, Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import Swal from 'sweetalert2';

type Step = 'cliente' | 'destinatario' | 'operacion' | 'resultado';

class FondosErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: AbstractControl | null): boolean {
    return !control || String(control.value ?? '').trim().length < 5;
  }
}

class RequiredValueErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: AbstractControl | null): boolean {
    const value = control?.value;
    if (value === null || value === undefined) return true;
    if (typeof value === 'number') return value <= 0;
    if (typeof value === 'string') return value.trim().length === 0 || value.trim() === '0';
    return false;
  }
}

@Component({
  selector: 'app-remesa',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, MatSnackBarModule,
    MatFormFieldModule, MatInputModule, TextFieldModule, MatSelectModule, MatIconModule, MatSlideToggleModule,
    SearchableSelectComponent, TelInputComponent,
  ],
  template: `
    <div class="remesa-page">

      <!-- ===== HEADER STRIP ===== -->
      <div class="header-strip no-print">
        <div class="header-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        </div>
        <div class="header-text">
          <h1>Giro Internacional</h1>
          <span>Envío de dinero al exterior</span>
        </div>
        <a class="manual-help" routerLink="/manuales/giro-internacional" [queryParams]="{tipo:'enviar'}">？ Manual de ayuda</a>
      </div>

      <!-- Steps indicator -->
      <div class="steps no-print">
        <div class="step" [class.active]="step === 'cliente'" [class.done]="stepIndex > 0">
          <span class="step-num">1</span><span class="step-lbl">Cliente</span>
        </div>
        <div class="step-line" [class.done]="stepIndex > 0"></div>
        <div class="step" [class.active]="step === 'destinatario'" [class.done]="stepIndex > 1">
          <span class="step-num">2</span><span class="step-lbl">Destinatario</span>
        </div>
        <div class="step-line" [class.done]="stepIndex > 1"></div>
        <div class="step" [class.active]="step === 'operacion'" [class.done]="stepIndex > 2">
          <span class="step-num">3</span><span class="step-lbl">Operación</span>
        </div>
        <div class="step-line" [class.done]="stepIndex > 2"></div>
        <div class="step" [class.active]="step === 'resultado'">
          <span class="step-num">4</span><span class="step-lbl">Resultado</span>
        </div>
      </div>

      <!-- ===== LOADING ===== -->
      @if (loading) {
        <div class="loading-box">
          <div class="spinner"></div>
          <span>Cargando...</span>
        </div>
      }

      <!-- ===== STEP 1: CLIENTE ===== -->
      @if (!loading && (step === 'cliente' || step === 'destinatario')) {
        <div class="section-card">
          <div class="section-header">
            <h2 class="section-title">Datos del Remitente</h2>
          </div>

          <div class="form-row three">
<mat-form-field appearance="outline">
              <mat-label>Tipo Documento</mat-label>
              <mat-select [(ngModel)]="clienteDoc.tipoDoc" (selectionChange)="resetClienteSearch()">
                @for (t of cat.tipos_documento; track t['id_tipo_doc_identidad']) {
                  <mat-option [value]="t['id_tipo_doc_identidad']">{{ t['descripcion'] }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Nro. Documento</mat-label>
              <mat-icon matPrefix>badge</mat-icon>
              <input matInput type="text" [(ngModel)]="clienteDoc.documento"
                     (blur)="buscarCliente()" placeholder="Ej: 12345678"
                     autocomplete="off" required>
              @if (clienteBusquedaIntentada && !clienteDoc.documento.trim()) { <mat-error>El número de documento es obligatorio</mat-error> }
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Expedición</mat-label>
              <mat-icon matPrefix>place</mat-icon>
              <mat-select [(ngModel)]="clienteDoc.expedicion" (selectionChange)="buscarCliente()">
                <mat-option value="0" disabled>Seleccione</mat-option>
                @for (e of cat.expediciones; track e['id_expedicion']) {
                  <mat-option [value]="e['id_expedicion']">{{ e['descripcion'] }}</mat-option>
                }
              </mat-select>
              @if (clienteBusquedaIntentada && !+clienteDoc.expedicion) { <mat-error>Seleccione la expedición</mat-error> }
            </mat-form-field>
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
                <button class="btn-edit-cliente" (click)="toggleClienteForm()" [title]="showClienteForm ? 'Ocultar formulario' : 'Editar datos'">
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
              <div class="form-row three">
                <mat-form-field appearance="outline"><mat-label>Nombres *</mat-label><mat-icon matPrefix>person</mat-icon>
                  <input matInput type="text" [(ngModel)]="cliente.nombres" autocomplete="off" required>
                  @if (clienteCampoInvalido(cliente.nombres)) { <mat-error>Los nombres son obligatorios</mat-error> }
                </mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Apellido Paterno *</mat-label>
                  <input matInput type="text" [(ngModel)]="cliente.ape_pat" autocomplete="off" required>
                  @if (clienteCampoInvalido(cliente.ape_pat)) { <mat-error>El apellido paterno es obligatorio</mat-error> }
                </mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Apellido Materno</mat-label>
                  <input matInput type="text" [(ngModel)]="cliente.ape_mat" autocomplete="off">
                </mat-form-field>
              </div>
              <div class="form-row three">
                <mat-form-field appearance="outline"><mat-label>Fecha Nacimiento *</mat-label><mat-icon matPrefix>event</mat-icon>
                  <input matInput type="date" [(ngModel)]="cliente.fecha_nacimiento" required>
                  @if (clienteCampoInvalido(cliente.fecha_nacimiento)) { <mat-error>La fecha de nacimiento es obligatoria</mat-error> }
                </mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Sexo</mat-label>
                  <mat-select [(ngModel)]="cliente.id_sexo">
                    @for (s of cat.sexos; track s['id_sexo']) {
                      <mat-option [value]="s['id_sexo']">{{ s['descripcion'] }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Pais {{ isExtranjero ? '*' : '' }}</mat-label><mat-icon matPrefix>public</mat-icon>
                  <app-searchable-select
                    [items]="cat.paises"
                    valueKey="id_pais"
                    labelKey="descripcion"
                    placeholder="Buscar pais..."
                    required
                    [(ngModel)]="cliente.id_pais">
                  </app-searchable-select>
                  @if (isExtranjero && clienteCampoInvalido(cliente.id_pais, true)) { <mat-error>Seleccione un país</mat-error> }
                </mat-form-field>
              </div>
              <div class="form-row three">
                <mat-form-field appearance="outline"><mat-label>Lugar Nacimiento</mat-label><mat-icon matPrefix>place</mat-icon>
                  <input matInput type="text" [(ngModel)]="cliente.lugar_nacimiento" autocomplete="off">
                </mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Estado Civil</mat-label>
                  <mat-select [(ngModel)]="cliente.id_estado_civil">
                    @for (ec of cat.estados_civiles; track ec['id_estado_civil']) {
                      <mat-option [value]="ec['id_estado_civil']">{{ ec['descripcion'] }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Ocupacion</mat-label><mat-icon matPrefix>work_outline</mat-icon>
                  <app-searchable-select
                    [items]="sortedOcupaciones"
                    valueKey="id_ocupacion"
                    labelKey="descripcion"
                    placeholder="Buscar ocupacion..."
                    [(ngModel)]="cliente.id_ocupacion"
                    (selectionChange)="onOcupacionChange()">
                  </app-searchable-select>
                </mat-form-field>
              </div>
              @if (!isExtranjero) {
                <div class="form-row three">
                  <mat-form-field appearance="outline">
                    <mat-label>Actividad Economica *</mat-label><mat-icon matPrefix>category</mat-icon>
                    <app-searchable-select
                      [items]="cat.actividades_economicas"
                      valueKey="id_actividad_economica"
                      labelKey="descripcion"
                      placeholder="Buscar actividad..."
                      required
                      [(ngModel)]="cliente.id_actividad_economica">
                    </app-searchable-select>
                    @if (clienteCampoInvalido(cliente.id_actividad_economica, true)) { <mat-error>Seleccione una actividad económica</mat-error> }
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Departamento</mat-label>
                    <mat-select [(ngModel)]="selectedDpto" (selectionChange)="filterCiudades()">
                      <mat-option value="0">Seleccione</mat-option>
                      @for (d of cat.departamentos; track d['id_departamento']) {
                        <mat-option [value]="d['id_departamento']">{{ d['descripcion'] }}</mat-option>
                      }
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Ciudad *</mat-label><mat-icon matPrefix>location_city</mat-icon>
                    <app-searchable-select
                      [items]="ciudadesFiltradas"
                      valueKey="id_ciudad_pcc"
                      labelKey="descripcion"
                      placeholder="Buscar ciudad..."
                      required
                      [(ngModel)]="cliente.id_ciudad">
                    </app-searchable-select>
                    @if (clienteCampoInvalido(cliente.id_ciudad, true)) { <mat-error>Seleccione una ciudad</mat-error> }
                  </mat-form-field>
                </div>
                <div class="form-row two">
                  <mat-form-field appearance="outline"><mat-label>Zona</mat-label><mat-icon matPrefix>map</mat-icon>
                    <input matInput type="text" [(ngModel)]="cliente.zona" autocomplete="off">
                  </mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Domicilio *</mat-label><mat-icon matPrefix>home</mat-icon>
                    <input matInput type="text" [(ngModel)]="cliente.domicilio" autocomplete="off" required>
                    @if (clienteCampoInvalido(cliente.domicilio)) { <mat-error>El domicilio es obligatorio</mat-error> }
                  </mat-form-field>
                </div>
              } @else {
                <div class="form-row two">
                  <mat-form-field appearance="outline">
                    <mat-label>Actividad Economica</mat-label><mat-icon matPrefix>category</mat-icon>
                    <app-searchable-select
                      [items]="cat.actividades_economicas"
                      valueKey="id_actividad_economica"
                      labelKey="descripcion"
                      placeholder="Buscar actividad..."
                      [(ngModel)]="cliente.id_actividad_economica">
                    </app-searchable-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Domicilio (pais de origen)</mat-label><mat-icon matPrefix>home</mat-icon>
                    <input matInput type="text" [(ngModel)]="cliente.domicilio" autocomplete="off"
                           placeholder="Direccion en su pais o alojamiento temporal">
                  </mat-form-field>
                </div>
              }
              <div class="form-row three">
                <div class="cel-col">
                  <button type="button" class="nit-toggle" [class.active]="mismoNro" (click)="toggleMismoNro()"
                          title="Repetir el celular en Tel. Domicilio y Tel. Trabajo">
                    <span class="nit-toggle-track"><span class="nit-toggle-thumb"></span></span>
                    Mismo número
                  </button>
                  <mat-form-field appearance="outline">
                    <mat-label>Celular</mat-label>
                    <mat-icon matPrefix>smartphone</mat-icon>
                    <app-tel-input required [(ngModel)]="cliente.celular" (ngModelChange)="onClienteCelularChange($event)"></app-tel-input>
                    @if (clienteCampoInvalido(cliente.celular)) { <mat-error>El celular es obligatorio</mat-error> }
                  </mat-form-field>
                </div>
                @if (!mismoNro) {
                  <mat-form-field appearance="outline"><mat-label>Tel. Domicilio</mat-label><mat-icon matPrefix>call</mat-icon>
                    <app-tel-input [(ngModel)]="cliente.tel_dom"></app-tel-input>
                  </mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Tel. Trabajo</mat-label><mat-icon matPrefix>call</mat-icon>
                    <app-tel-input [(ngModel)]="cliente.tel_trab"></app-tel-input>
                  </mat-form-field>
                }
                @if (!mismoNro) { <div class="form-break"></div> }
                <mat-form-field appearance="outline"><mat-label>Email (opcional)</mat-label><mat-icon matPrefix>mail</mat-icon>
                  <input matInput type="email" [(ngModel)]="cliente.email" autocomplete="off"
                         placeholder="correo@ejemplo.com">
                </mat-form-field>
              </div>
              <div class="form-row three">
                @if (!isExtranjero) {
                  <div class="field nit-field">
                    <label>NIT</label>
                    <div class="nit-toggle-row">
                      <button type="button" class="nit-toggle" [class.active]="showNitField" (click)="toggleNit()">
                        <span class="nit-toggle-track"><span class="nit-toggle-thumb"></span></span>
                        {{ showNitField ? 'Con NIT' : 'Sin NIT' }}
                      </button>
                      @if (showNitField) {
                        <mat-form-field appearance="outline"><mat-label>NIT</mat-label><mat-icon matPrefix>receipt_long</mat-icon>
                          <input matInput type="text" [(ngModel)]="cliente.nit" autocomplete="off" placeholder="Ingrese NIT" class="nit-input" required>
                          @if (clienteCampoInvalido(cliente.nit)) { <mat-error>El NIT es obligatorio</mat-error> }
                        </mat-form-field>
                      }
                    </div>
                  </div>
                }
              </div>
              <!-- Datos de empleo visibles, igual que en Giro Nacional. -->
              @if (!isExtranjero) {
                <div class="form-row three">
                  <mat-form-field appearance="outline"><mat-label>Lugar de Trabajo</mat-label><mat-icon matPrefix>business</mat-icon>
                    <input matInput type="text" [(ngModel)]="cliente.e_trabajo" autocomplete="off">
                  </mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Cargo</mat-label><mat-icon matPrefix>badge</mat-icon>
                    <input matInput type="text" [(ngModel)]="cliente.e_cargo" autocomplete="off">
                  </mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Direccion Trabajo</mat-label><mat-icon matPrefix>location_on</mat-icon>
                    <input matInput type="text" [(ngModel)]="cliente.e_direccion" autocomplete="off">
                  </mat-form-field>
                </div>
              }
            </div>
          }

          @if (clienteEncontrado !== null) {
            @if (!clienteReady && !showClienteForm && camposFaltantesCliente.length) {
              <div class="campos-faltantes">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>Faltan: {{ camposFaltantesCliente.join(', ') }}</span>
                @if (!showClienteForm) {
                  <button class="btn-link-inline" (click)="mostrarFormularioCliente()">Completar datos</button>
                }
              </div>
            }
          }
        </div>
      }

      <!-- ===== STEP 2: DESTINATARIO ===== -->
      @if (step === 'destinatario') {
        <div class="section-card">
          <div class="section-header">
            <h2 class="section-title">Datos del Beneficiario (Destinatario)</h2>
            <button class="btn-back" (click)="step = 'cliente'">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
              Volver
            </button>
          </div>

          <!-- Destinatarios previos del remitente -->
          @if (destinatariosPrevios.length > 0) {
            <div class="previos-section">
              <div class="previos-toolbar">
                <div>
                  <div class="previos-label">Destinatarios anteriores de este cliente</div>
                  <small>Selecciona un contacto guardado o registra uno nuevo.</small>
                </div>
                <button class="btn-contactos" (click)="abrirDestinatariosDialog()">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 2.5-5 6-5s6 2 6 5"/><path d="M16 11a3 3 0 1 0 0-6"/><path d="M16 15c3 0 5 2 5 5"/></svg>
                  {{ destinatarioSeleccionado ? 'Cambiar destinatario' : 'Abrir libreta' }}
                </button>
              </div>
              @if (destinatarioSeleccionado) {
                <div class="contacto-seleccionado">
                  <span class="contacto-avatar">{{ (destinatarioSeleccionado.nombres || '?').charAt(0) }}</span>
                  <div><strong>{{ destinatarioSeleccionado.nombres }} {{ destinatarioSeleccionado.ape_pat }}</strong><small>{{ destinatarioSeleccionado.num_doc_identidad_d }} · {{ destinatarioSeleccionado.celular || 'Sin celular' }}</small></div>
                  <span class="contacto-check">✓ Seleccionado</span>
                </div>
              } @else if (destinatarioNuevo) {
                <div class="nuevo-contacto-hint">Nuevo destinatario · completa los datos del formulario</div>
              }
            </div>
          }

          @if (showDestinatariosDialog) {
            <div class="contactos-overlay" (click)="cerrarDestinatariosDialog()">
              <section class="contactos-dialog" (click)="$event.stopPropagation()">
                <header class="contactos-header">
                  <div><span class="contactos-kicker">LIBRETA DE CONTACTOS</span><h3>Destinatarios anteriores</h3><p>Elige un destinatario guardado para completar sus datos.</p></div>
                  <button class="dialog-close" (click)="cerrarDestinatariosDialog()" aria-label="Cerrar">×</button>
                </header>
                <div class="contactos-search">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <input type="text" [(ngModel)]="destinatarioBusqueda" placeholder="Buscar por nombre, documento o celular" autocomplete="off">
                </div>
                <div class="contactos-lista">
                  @for (dp of destinatariosFiltrados; track dp.id_destinatario) {
                    <button class="contacto-card" [class.selected]="destinatarioSeleccionado?.id_destinatario === dp.id_destinatario" (click)="seleccionarDestinatarioPrevio(dp)">
                      <span class="contacto-avatar">{{ (dp.nombres || '?').charAt(0) }}</span>
                      <span class="contacto-card-main"><strong>{{ dp.nombres }} {{ dp.ape_pat }} {{ dp.ape_mat }}</strong><small>Documento: {{ dp.num_doc_identidad_d || 'Sin documento' }}</small><small>{{ dp.celular || 'Sin celular' }} · {{ dp.domicilio || 'Sin domicilio' }}</small></span>
                      <span class="contacto-card-arrow">›</span>
                    </button>
                  } @empty {
                    <div class="contactos-empty">No hay destinatarios que coincidan con la búsqueda.</div>
                  }
                </div>
                <footer class="contactos-footer">
                  <button class="btn-secondary" (click)="cerrarDestinatariosDialog()">Cancelar</button>
                  <button class="btn-primary" (click)="nuevoDestinatario()">+ Nuevo destinatario</button>
                </footer>
              </section>
            </div>
          }

          <div class="form-row three">
                <mat-form-field appearance="outline"><mat-label>Nombres *</mat-label><mat-icon matPrefix>person</mat-icon>
                  <input matInput type="text" [(ngModel)]="destinatario.nombres" autocomplete="off">
                </mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Apellido Paterno *</mat-label>
                  <input matInput type="text" [(ngModel)]="destinatario.ape_pat" autocomplete="off">
                </mat-form-field>
                <mat-form-field appearance="outline"><mat-label>Apellido Materno</mat-label>
                  <input matInput type="text" [(ngModel)]="destinatario.ape_mat" autocomplete="off">
                </mat-form-field>
          </div>
          <div class="form-row three">
            <mat-form-field appearance="outline"><mat-label>Celular</mat-label><mat-icon matPrefix>smartphone</mat-icon>
              <input matInput type="text" [(ngModel)]="destinatario.celular" autocomplete="off">
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Domicilio</mat-label><mat-icon matPrefix>home</mat-icon>
              <input matInput type="text" [(ngModel)]="destinatario.domicilio" autocomplete="off">
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Email (opcional)</mat-label><mat-icon matPrefix>mail</mat-icon>
              <input matInput type="email" [(ngModel)]="destinatario.email" autocomplete="off"
                     placeholder="correo@ejemplo.com">
            </mat-form-field>
          </div>
          <div class="form-row three">
            <mat-form-field appearance="outline"><mat-label>Documento Destinatario</mat-label><mat-icon matPrefix>badge</mat-icon>
              <input matInput type="text" [(ngModel)]="destinatario.num_doc_identidad_d" autocomplete="off">
            </mat-form-field>
          </div>

          <!-- Pago en Chile -->
          <div class="pago-chile-section">
            <h3 class="subsection-title">Forma de Pago en Chile</h3>
            <div class="form-row three">
              <div class="field">
                <label>Método de Pago *</label>
                <mat-form-field appearance="outline"><mat-label>Método de Pago *</mat-label><mat-icon matPrefix>payments</mat-icon>
                <mat-select [(ngModel)]="formaPagoChile" (selectionChange)="onFormaPagoChileChange()">
                  @for (fp of formasPagoChile; track fp.id) {
                    <mat-option [value]="fp.id">{{ fp.descripcion }}</mat-option>
                  }
                </mat-select>
                </mat-form-field>
              </div>
              @if (formaPagoChile === 2) {
                <div class="field">
                  <label>Banco Destino *</label>
                  <mat-form-field appearance="outline"><mat-label>Banco Destino *</mat-label><mat-icon matPrefix>account_balance</mat-icon>
                  <mat-select [(ngModel)]="bancoChile">
                    <mat-option value="0" disabled>Seleccione banco</mat-option>
                    @for (b of bancosChile; track b.id) {
                      <mat-option [value]="b.id">{{ b.nombre }}</mat-option>
                    }
                  </mat-select>
                  </mat-form-field>
                </div>
                <mat-form-field appearance="outline">
                  <mat-label>Nro. Cuenta *</mat-label>
                  <mat-icon matPrefix>account_balance_wallet</mat-icon>
                  <input matInput type="text" [(ngModel)]="cuentaDestinoChile" autocomplete="off" placeholder="Número de cuenta">
                </mat-form-field>
              }
            </div>
          </div>

        </div>
      }

      <!-- ===== STEP 3: OPERACIÓN ===== -->
      @if (step === 'operacion' || (step === 'destinatario' && destinatarioReady)) {
        <div class="section-card">
          <div class="section-header">
            <h2 class="section-title">Datos de la Operación</h2>
            <button class="btn-back" (click)="step = 'destinatario'">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
              Volver
            </button>
          </div>

          <!-- Buscar cotización -->
          <div class="cotizacion-search">
            <div class="cot-input-row">
              <mat-form-field appearance="outline" class="cot-field">
                <mat-label>Código de cotización</mat-label>
                <mat-icon matPrefix>confirmation_number</mat-icon>
                <input matInput type="text" [(ngModel)]="codigoCotizacion" placeholder="Ej. COT-2026-001"
                       autocomplete="off" class="cot-input" (keyup.enter)="buscarCotizacion()">
                <mat-hint>Ingresa el código proporcionado por la mesa de cambios</mat-hint>
              </mat-form-field>
              <button class="btn-apply-cot" (click)="buscarCotizacion()" [disabled]="buscandoCotizacion || !codigoCotizacion.trim()">
                @if (buscandoCotizacion) {
                  <div class="spinner sm"></div>
                } @else {
                  <mat-icon>check_circle</mat-icon>
                  Aplicar Cotización
                }
              </button>
            </div>
            @if (cotizacionAplicada) {
              <div class="cot-badge">
                Cotización {{ cotizacionAplicada.codigo }} aplicada — válida hasta {{ cotizacionAplicada.valido_hasta }}
              </div>
            }
          </div>

          <div class="form-row three">
            <mat-form-field appearance="outline"><mat-label>Moneda a Enviar *</mat-label><mat-icon matPrefix>payments</mat-icon>
              <mat-select [(ngModel)]="monedaEnvio" (selectionChange)="onMonedaChange()" [disabled]="!!cotizacionAplicada" [errorStateMatcher]="requiredValueErrorStateMatcher" required>
                <mat-option value="1">USD - Dólares</mat-option>
                <mat-option value="2">BOB - Bolivianos</mat-option>
              </mat-select>
              @if (monedaEnvio === '0') { <mat-error>Seleccione la moneda a enviar</mat-error> }
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Destino *</mat-label><mat-icon matPrefix>public</mat-icon>
              <mat-select [(ngModel)]="selectedDestino" (selectionChange)="onDestinoChange()" [errorStateMatcher]="requiredValueErrorStateMatcher" required>
                <mat-option value="0" disabled>Seleccione</mat-option>
                @for (d of destinos; track d.id_destino) {
                  <mat-option [value]="d.id_destino">{{ d.descripcion }}</mat-option>
                }
              </mat-select>
              @if (selectedDestino === '0') { <mat-error>Seleccione un destino</mat-error> }
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Modo de Ingreso</mat-label>
              <mat-select [(ngModel)]="modoMonto" (selectionChange)="onModoMontoChange()">
                <mat-option value="directo">Monto a Enviar ({{ monedaAbr || '...' }})</mat-option>
                <mat-option value="equiv_clp">Equivalente en CLP</mat-option>
                <mat-option value="equiv_usd" [disabled]="monedaEnvio === '1'">Equivalente en USD</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="form-row three">
            <mat-form-field appearance="outline"><mat-label>{{ montoLabel }}</mat-label><mat-icon matPrefix>attach_money</mat-icon>
              <input matInput type="number" [(ngModel)]="montoEnvio" step="0.01" min="0"
                     class="monto-input" [placeholder]="montoPlaceholder" autocomplete="off"
                     (input)="onMontoChange()">
            </mat-form-field>
            <mat-form-field appearance="outline"><mat-label>Tipo de Comisión</mat-label>
              <mat-select [(ngModel)]="tipoComision" (selectionChange)="onTipoComisionChange()">
                <mat-option value="0">Habitual</mat-option>
                @for (p of comisionesPreferenciales; track p.id) {
                  <mat-option [value]="p.id">{{ p.descripcion }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            @if (monedaEnvio === '1' || monedaEnvio === '2') {
              <div class="field">
                <label class="toggle-label">Incluir Comisión</label>
                <div class="comision-toggle-wrap">
                  <mat-slide-toggle class="comision-toggle" [checked]="incluirComision === 1"
                                    (change)="incluirComision = $event.checked ? 1 : 0; onIncluirComisionChange()">
                    {{ incluirComision === 1 ? 'Sí, incluida en el monto' : 'No, se cobra por separado' }}
                  </mat-slide-toggle>
                </div>
              </div>
            }
            @if (monedaEnvio === '1') {
              <div class="field">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="compraUsd">
                  Registrar compra USD
                </label>
                @if (compraUsd && tcOficialVenta > 0) {
                  <span class="tc-badge">TC Oficial Venta: {{ tcOficialVenta | number:'1.4-4' }}</span>
                }
                @if (compraUsd) {
                  <label class="checkbox-label" style="margin-top:6px">
                    <input type="checkbox" [(ngModel)]="compraConNit">
                    Facturar con NIT
                  </label>
                  @if (compraConNit) {
                    <input type="text" [(ngModel)]="nitCompra" placeholder="NIT del cliente"
                           style="margin-top:4px" autocomplete="off">
                  }
                }
              </div>
            }
          </div>

          <!-- El resumen económico queda antes de los controles regulatorios. -->
          @if (comisionResult) {
            <div class="comision-card">
              <h3 class="comision-title">Resumen de la operación</h3>
              <div class="transfer-summary">
                <div class="transfer-line transfer-line-send">
                  <div class="transfer-description"><span class="country-flag" role="img" aria-label="Bolivia"><svg viewBox="0 0 24 16" aria-hidden="true"><path fill="#D52B1E" d="M2 1h20v4.67H2z"/><path fill="#F9E300" d="M2 5.67h20v4.66H2z"/><path fill="#007934" d="M2 10.33h20V15H2z"/><rect x="1.5" y=".5" width="21" height="15" rx="2" fill="none" stroke="#d1d5db"/></svg></span><div><strong>{{ comisionResult.monto_enviado_x | number:'1.2-2' }} {{ monedaAbr }}</strong><small>Tú envías desde Bolivia</small></div></div>
                  <div class="comision-details">
                    @if (monedaEnvio !== '2' || comisionResult.tipo_cambio_comercial) {
                      <h5 class="comision-breakdown-label">Equivalencias y tipo de cambio</h5>
                      <div class="comision-grid">
                        @if (monedaEnvio !== '2') {
                          <div class="com-item"><span class="com-label">Equivalente del envío</span><span class="com-value">{{ comisionResult.monto_enviado_bob | number:'1.2-2' }} BOB</span></div>
                        }
                        @if (comisionResult.tipo_cambio_comercial) {
                          <div class="com-item"><span class="com-label">T.C. Comercial CLP/BOB</span><span class="com-value">{{ comisionResult.tipo_cambio_comercial | number:'1.2-5' }}</span></div>
                        }
                      </div>
                    }
                    <div class="fees-breakdown">
                      <div class="fee-parent">
                        <span class="fee-label"><mat-icon>point_of_sale</mat-icon>Comisión total</span>
                        <strong>{{ comisionResult.bob.comision_total | number:'1.2-2' }} BOB</strong>
                        @if (monedaEnvio === '1') { <small>{{ comisionResult.moneda_x.comision_total | number:'1.2-2' }} USD</small> }
                      </div>
                      <div class="fee-children">
                        <div class="fee-child"><span class="fee-label"><mat-icon>percent</mat-icon>Comisión Gambarte</span><strong>{{ comisionResult.bob.comision_gambarte | number:'1.2-2' }} BOB</strong>@if (monedaEnvio === '1') { <small>{{ comisionResult.moneda_x.comision_gambarte | number:'1.2-2' }} USD</small> }</div>
                        <div class="fee-child"><span class="fee-label"><mat-icon>currency_exchange</mat-icon>Gastos corresponsal</span><strong>{{ comisionResult.bob.gastos_corresponsal | number:'1.2-2' }} BOB</strong>@if (monedaEnvio === '1') { <small>{{ comisionResult.moneda_x.gastos_corresponsal | number:'1.2-2' }} USD</small> }</div>
                        <div class="fee-child"><span class="fee-label"><mat-icon>receipt_long</mat-icon>IVA</span><strong>{{ comisionResult.bob.iva | number:'1.2-2' }} BOB</strong>@if (monedaEnvio === '1') { <small>{{ comisionResult.moneda_x.iva | number:'1.2-2' }} USD</small> }</div>
                        @if (comisionResult.bob.itf !== null) {
                          <div class="fee-child fee-extra"><span>ITF (impuesto)</span><strong>{{ comisionResult.bob.itf | number:'1.2-2' }} BOB</strong>@if (monedaEnvio === '1') { <small>{{ comisionResult.moneda_x.itf | number:'1.2-2' }} USD</small> }</div>
                        }
                      </div>
                    </div>
                  </div>
                </div>
                <div class="transfer-line">
                  <div class="transfer-description"><span class="country-flag" role="img" aria-label="Chile"><svg viewBox="0 0 24 16" aria-hidden="true"><path fill="#fff" d="M2 1h20v7H2z"/><path fill="#D52B1E" d="M2 8h20v7H2z"/><path fill="#0039A6" d="M2 1h8v7H2z"/><path fill="#fff" d="m6 2.2.75 1.5 1.65.24-1.2 1.16.28 1.64L6 5.97l-1.48.77.28-1.64L3.6 3.94l1.65-.24z"/><rect x="1.5" y=".5" width="21" height="15" rx="2" fill="none" stroke="#d1d5db"/></svg></span><div><strong>{{ (comisionResult.total_clp || 0) | number:'1.0-0' }} CLP</strong><small>La otra persona recibe en Chile</small>
                    @if (comisionResult.tipo_cambio_clp) {
                      <small class="transfer-rate">1 USD = <strong>{{ comisionResult.tipo_cambio_clp | number:'1.2-4' }} CLP</strong></small>
                    }
                  </div></div>
                  @if (comisionResult.equivalente_usd != null && monedaEnvio !== '1') {
                    <div class="transfer-equivalent">
                      <span class="country-flag" role="img" aria-label="Estados Unidos"><svg viewBox="0 0 24 16" aria-hidden="true"><path fill="#fff" d="M1 1h22v14H1z"/><path fill="#B22234" d="M1 1h22v1.08H1zm0 2.16h22v1.08H1zm0 2.16h22V6.4H1zm0 2.16h22v1.08H1zm0 2.16h22v1.08H1zm0 2.16h22v1.08H1zm0 2.16h22V15H1z"/><path fill="#3C3B6E" d="M1 1h10v7H1z"/><circle cx="3" cy="2.5" r=".35" fill="#fff"/><circle cx="5.5" cy="2.5" r=".35" fill="#fff"/><circle cx="8" cy="2.5" r=".35" fill="#fff"/><circle cx="4.25" cy="4.5" r=".35" fill="#fff"/><circle cx="6.75" cy="4.5" r=".35" fill="#fff"/><circle cx="3" cy="6.5" r=".35" fill="#fff"/><circle cx="5.5" cy="6.5" r=".35" fill="#fff"/><circle cx="8" cy="6.5" r=".35" fill="#fff"/><rect x=".5" y=".5" width="23" height="15" rx="2" fill="none" stroke="#d1d5db"/></svg></span>
                      <div><small>Equivalente USD *</small><strong>{{ comisionResult.equivalente_usd | number:'1.2-2' }} USD</strong></div>
                    </div>
                  }
                </div>
                <div class="transfer-total">
                  <span><span class="country-flag" role="img" aria-label="Bolivia"><svg viewBox="0 0 24 16" aria-hidden="true"><path fill="#D52B1E" d="M2 1h20v4.67H2z"/><path fill="#F9E300" d="M2 5.67h20v4.66H2z"/><path fill="#007934" d="M2 10.33h20V15H2z"/><rect x="1.5" y=".5" width="21" height="15" rx="2" fill="none" stroke="#d1d5db"/></svg></span> Total a cobrar al cliente</span>
                  <strong>{{ comisionResult.bob.total_operacion | number:'1.2-2' }} BOB</strong>
                  @if (monedaEnvio === '1') {
                    <small>{{ comisionResult.moneda_x.total_operacion | number:'1.2-2' }} USD</small>
                  }
                </div>
              </div>
            </div>
          }

          <div class="uif-highlights">
          <!-- UIF STATUS -->
          @if (uifResult) {
            <div class="uif-status" [class.uif-ok]="!requierePcc08 && !uifResult.requiere_formulario"
                 [class.uif-warn]="uifResult.requiere_formulario && !requierePcc08"
                 [class.uif-danger]="requierePcc08">
              <div class="uif-icon">
                @if (!requierePcc08 && !uifResult.requiere_formulario) {
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                } @else {
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                }
              </div>
              <div class="uif-text">
                @if (!requierePcc08 && !uifResult.requiere_formulario) {
                  <strong>Dentro de límites UIF</strong>
                } @else if (requierePcc08) {
                  <strong>Requiere PCC-08 (Declaración de fondos)</strong>
                } @else {
                  <strong>Requiere Formulario Complemento</strong>
                }
                <span>Dolarizado: USD {{ uifResult.dolarizado | number:'1.2-2' }} ·
                  {{ uifResult.operaciones_previas.cantidad }} ops en {{ uifResult.operaciones_previas.dias_ventana }} días
                  (USD {{ uifResult.operaciones_previas.total_dolarizado | number:'1.2-2' }})
                  · Umbral PCC-08: USD {{ uifResult.umbrales.pcc08_unica | number:'1.0-0' }}
                </span>
              </div>
            </div>
          } @else if (verificandoUif) {
            <div class="uif-status uif-checking">
              <div class="spinner sm"></div>
              <span>Verificando controles UIF...</span>
            </div>
          }

          <!-- ===== USUARIO HABITUAL ===== -->
          @if (esUsuarioHabitual) {
            <div class="uif-status uif-warn">
              <div class="uif-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <div class="uif-text">
                <strong>Usuario Habitual (Art. 37)</strong>
                <span>3+ operaciones en 30 días — requiere Debida Diligencia completa</span>
              </div>
            </div>
          }
          </div>

          <!-- ALERTAS LISTAS DE CONTROL -->
          @if (uifResult && uifResult.alertas.length > 0) {
            @for (alerta of uifResult.alertas; track alerta.tipo) {
              <div class="alerta-control" [class.alerta-critico]="alerta.nivel === 'critico'"
                   [class.alerta-alto]="alerta.nivel === 'alto'">
                <div class="alerta-icon">
                  @if (alerta.nivel === 'critico') {
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  } @else {
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  }
                </div>
                <div class="alerta-text">
                  <strong>{{ alerta.mensaje }}</strong>
                  @if (alerta.detalle) {
                    <span>{{ alerta.detalle }}</span>
                  }
                </div>
                <span class="alerta-badge">{{ alerta.tipo }}</span>
              </div>
            }
          }

          <!-- ===== SEÑALES DE ALERTA ===== -->
          @if (uifResult && uifResult.senales_alerta && uifResult.senales_alerta.length > 0) {
            <div class="senales-section">
              <h4 class="senales-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Señales de Alerta Detectadas
              </h4>
              @for (senal of uifResult.senales_alerta; track senal.codigo) {
                <div class="senal-item" [class.senal-alto]="senal.nivel === 'alto'"
                     [class.senal-medio]="senal.nivel === 'medio'">
                  <span class="senal-badge">{{ senal.nivel | uppercase }}</span>
                  <span>{{ senal.mensaje }}</span>
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

          <!-- Control de fondos: campos generales y datos PCC-08 condicionales en un solo panel. -->
          <div class="pcc08-section">
            <h3 class="pcc08-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              Control de fondos
            </h3>
            <div class="form-row three">
              <mat-form-field appearance="outline" floatLabel="always">
                <mat-label>Origen de Fondos *</mat-label><mat-icon matPrefix>login</mat-icon>
                <textarea matInput cdkTextareaAutosize cdkAutosizeMinRows="1" cdkAutosizeMaxRows="6"
                          [errorStateMatcher]="fondosErrorStateMatcher" [(ngModel)]="origen" #origenControl="ngModel"
                          required minlength="5" maxlength="200" rows="1"
                          placeholder="Describa el origen de los fondos (mín. 5 caracteres)" autocomplete="off"></textarea>
                @if (origenControl.invalid) { <mat-error>@if (!origenControl.value?.trim()) { Indique el origen de los fondos } @else { Ingrese al menos 5 caracteres }</mat-error> }
              </mat-form-field>
              <mat-form-field appearance="outline" floatLabel="always">
                <mat-label>Destino de Fondos *</mat-label><mat-icon matPrefix>logout</mat-icon>
                <textarea matInput cdkTextareaAutosize cdkAutosizeMinRows="1" cdkAutosizeMaxRows="6"
                          [errorStateMatcher]="fondosErrorStateMatcher" [(ngModel)]="destinoPcc" #destinoPccControl="ngModel"
                          required minlength="5" maxlength="200" rows="1"
                          placeholder="Describa el destino de los fondos (mín. 5 caracteres)" autocomplete="off"></textarea>
                @if (destinoPccControl.invalid) { <mat-error>@if (!destinoPccControl.value?.trim()) { Indique el destino de los fondos } @else { Ingrese al menos 5 caracteres }</mat-error> }
              </mat-form-field>
              @if (requierePcc08) {
                <mat-form-field appearance="outline">
                  <mat-label>¿Dinero propio?</mat-label>
                  <mat-select [(ngModel)]="pcc08.dinero_si">
                    <mat-option [value]="1">Sí</mat-option>
                    <mat-option [value]="0">No (a nombre de tercero)</mat-option>
                  </mat-select>
                </mat-form-field>
              }
            </div>
          @if (requierePcc08) {
            <div class="pcc08-additional">
              @if (pcc08.dinero_si === 0) {
                <div class="form-row three">
                  <mat-form-field appearance="outline">
                    <mat-label>Tipo de Persona</mat-label>
                    <mat-select [(ngModel)]="pcc08.select_per">
                      <mat-option [value]="1">Persona Natural</mat-option>
                      <mat-option [value]="2">Persona Jurídica</mat-option>
                    </mat-select>
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>{{ pcc08.select_per === 2 ? 'Razon Social' : 'Nombre Completo' }} *</mat-label>
                    <input matInput [(ngModel)]="pcc08.nombres_dd" autocomplete="off">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>{{ pcc08.select_per === 2 ? 'NIT' : 'Documento' }} *</mat-label>
                    <input matInput [(ngModel)]="pcc08.doc_nit_dd" autocomplete="off">
                  </mat-form-field>
                </div>
                <div class="form-row three">
                  <mat-form-field appearance="outline">
                    <mat-label>Domicilio *</mat-label><mat-icon matPrefix>home</mat-icon>
                    <input matInput [(ngModel)]="pcc08.domicilio_dd" autocomplete="off">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Telefono *</mat-label><mat-icon matPrefix>call</mat-icon>
                    <input matInput [(ngModel)]="pcc08.telefono_dd" autocomplete="off">
                  </mat-form-field>
                  <mat-form-field appearance="outline">
                    <mat-label>Zona</mat-label>
                    <input matInput [(ngModel)]="pcc08.zona_dd" autocomplete="off">
                  </mat-form-field>
                </div>
              }
            </div>
          }
          </div>

          @if (requiereFormulario) {
            <div class="complemento-section">
              <div class="complemento-header" (click)="showComplementoSection = !showComplementoSection">
                <h3 class="complemento-title">
                  <mat-icon>description</mat-icon>
                  Formulario Complemento UIF
                </h3>
                <mat-icon>{{ showComplementoSection ? 'expand_less' : 'expand_more' }}</mat-icon>
              </div>
              @if (showComplementoSection) {
                <div class="form-row three">
                  @if (showApellidoCasada) {
                    <mat-form-field appearance="outline"><mat-label>Apellido de Casada</mat-label>
                      <input matInput [(ngModel)]="complemento.c_apellido_casada" autocomplete="off">
                    </mat-form-field>
                  }
                  <mat-form-field appearance="outline"><mat-label>País de Residencia *</mat-label><mat-icon matPrefix>public</mat-icon>
                    <app-searchable-select [items]="cat.paises" valueKey="id_pais" labelKey="descripcion" placeholder="Buscar país..." [(ngModel)]="complemento.c_pais_residencia_id" required></app-searchable-select>
                    @if (+complemento.c_pais_residencia_id <= 0) { <mat-error>Seleccione el país de residencia</mat-error> }
                  </mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Ciudad de Residencia *</mat-label><mat-icon matPrefix>location_city</mat-icon>
                    <input matInput [(ngModel)]="complemento.c_ciudad_residencia" #ciudadResidenciaControl="ngModel" [errorStateMatcher]="requiredValueErrorStateMatcher" required autocomplete="off">
                    @if (ciudadResidenciaControl.invalid) { <mat-error>Ingrese la ciudad de residencia</mat-error> }
                  </mat-form-field>
                </div>
                <div class="form-row four">
                  <mat-form-field appearance="outline" floatLabel="always"><mat-label>Ingresos Mensuales *</mat-label>
                    <span matTextPrefix>Bs&nbsp;</span><input matInput type="number" [(ngModel)]="complemento.c_ingresos" #ingresosControl="ngModel" [errorStateMatcher]="requiredValueErrorStateMatcher" required min="0.01" step="0.01" style="text-align:right">
                    @if (ingresosControl.invalid) { <mat-error>Ingrese un monto mayor que 0</mat-error> }
                  </mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Experiencia — Años</mat-label>
                    <input matInput type="number" [(ngModel)]="expAnios" min="0" max="50" (input)="onExpChange()">
                  </mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Experiencia — Meses</mat-label>
                    <input matInput type="number" [(ngModel)]="expMeses" min="0" max="11" (input)="onExpChange()">
                  </mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Fecha de Ingreso *</mat-label><mat-icon matPrefix>event</mat-icon>
                    <input matInput readonly [errorStateMatcher]="requiredValueErrorStateMatcher" [ngModel]="complemento.c_fecha_ingreso" #fechaIngresoControl="ngModel" required>
                    @if (fechaIngresoControl.invalid) { <mat-error>Complete la experiencia laboral para calcular la fecha</mat-error> }
                  </mat-form-field>
                </div>
                <div class="form-row" [class.four]="showActividadSecundaria">
                  <mat-form-field appearance="outline" floatLabel="always"><mat-label>Actividad Secundaria</mat-label><mat-icon matPrefix>category</mat-icon>
                    <app-searchable-select [items]="cat.actividades_economicas" valueKey="id_actividad_economica" labelKey="descripcion" placeholder="Buscar actividad..." nullOption="Ninguna" [(ngModel)]="complemento.c_actividad_secundaria_id"></app-searchable-select>
                  </mat-form-field>
                  @if (showActividadSecundaria) {
                    <mat-form-field appearance="outline" floatLabel="always"><mat-label>Ingresos Act. Sec.</mat-label>
                      <span matTextPrefix>Bs&nbsp;</span><input matInput type="number" [(ngModel)]="complemento.c_ingresos_actividad_secundaria" min="0" step="0.01" style="text-align:right">
                    </mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Exp. Sec. Años</mat-label>
                      <input matInput type="number" [(ngModel)]="expSecAnios" min="0" max="50" (input)="onExpSecChange()">
                    </mat-form-field>
                    <mat-form-field appearance="outline"><mat-label>Exp. Sec. Meses</mat-label>
                      <input matInput type="number" [(ngModel)]="expSecMeses" min="0" max="11" (input)="onExpSecChange()">
                    </mat-form-field>
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
                    <mat-form-field appearance="outline"><mat-label>¿Fue dependiente del Estado? *</mat-label>
                      <mat-select [(ngModel)]="complemento.c_dependiente_estado_anterior" [errorStateMatcher]="requiredValueErrorStateMatcher" required><mat-option value="N">No</mat-option><mat-option value="S">Sí</mat-option></mat-select>
                    </mat-form-field>
                    @if (complemento.c_dependiente_estado_anterior === 'S') {
                      <mat-form-field appearance="outline"><mat-label>Entidad donde trabajó *</mat-label><input matInput [(ngModel)]="complemento.c_entidad_trabajo_anterior" [errorStateMatcher]="requiredValueErrorStateMatcher" required><mat-error>Indique la entidad donde trabajó</mat-error></mat-form-field>
                    }
                  </div>
                  @if (complemento.c_dependiente_estado_anterior === 'S') {
                    <div class="form-row three">
                      <mat-form-field appearance="outline"><mat-label>Fecha Inicio *</mat-label><input matInput type="date" [(ngModel)]="complemento.c_fecha_inicio_trabajo_anterior" [errorStateMatcher]="requiredValueErrorStateMatcher" required><mat-error>Seleccione la fecha de inicio</mat-error></mat-form-field>
                      <mat-form-field appearance="outline"><mat-label>Fecha Fin *</mat-label><input matInput type="date" [(ngModel)]="complemento.c_fecha_fin_trabajo_anterior" [errorStateMatcher]="requiredValueErrorStateMatcher" required><mat-error>Seleccione la fecha de fin</mat-error></mat-form-field>
                      <mat-form-field appearance="outline"><mat-label>Cargo *</mat-label>
                        <mat-select [(ngModel)]="complemento.c_cargo_trabajo_anterior_id" [errorStateMatcher]="requiredValueErrorStateMatcher" required><mat-option [value]="0">Seleccione</mat-option>@for (cargo of cat.cargos; track cargo['id']) {<mat-option [value]="cargo['id']">{{ cargo['descripcion'] }}</mat-option>}</mat-select><mat-error>Seleccione el cargo</mat-error>
                      </mat-form-field>
                    </div>
                  }
                </div>
                <div class="pep-subsection">
                  <h4 class="pep-subtitle">Dependiente del Estado — Actual</h4>
                  <div class="form-row two">
                    <mat-form-field appearance="outline"><mat-label>¿Es dependiente del Estado? *</mat-label>
                      <mat-select [(ngModel)]="complemento.c_dependiente_estado_actual" [errorStateMatcher]="requiredValueErrorStateMatcher" required><mat-option value="N">No</mat-option><mat-option value="S">Sí</mat-option></mat-select>
                    </mat-form-field>
                    @if (complemento.c_dependiente_estado_actual === 'S') {
                      <mat-form-field appearance="outline"><mat-label>Entidad donde trabaja *</mat-label><input matInput [(ngModel)]="complemento.c_entidad_trabajo_actual" [errorStateMatcher]="requiredValueErrorStateMatcher" required><mat-error>Indique la entidad donde trabaja</mat-error></mat-form-field>
                    }
                  </div>
                  @if (complemento.c_dependiente_estado_actual === 'S') {
                    <div class="form-row two"><mat-form-field appearance="outline"><mat-label>Cargo *</mat-label>
                      <mat-select [(ngModel)]="complemento.c_cargo_trabajo_actual_id" [errorStateMatcher]="requiredValueErrorStateMatcher" required><mat-option [value]="0">Seleccione</mat-option>@for (cargo of cat.cargos; track cargo['id']) {<mat-option [value]="cargo['id']">{{ cargo['descripcion'] }}</mat-option>}</mat-select><mat-error>Seleccione el cargo</mat-error>
                    </mat-form-field></div>
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
                      <mat-form-field appearance="outline"><mat-label>Actividad Principal</mat-label><mat-select [(ngModel)]="complemento.c_actividad_principal_conyugue_id"><mat-option [value]="0">Seleccione</mat-option>@for (ae of cat.actividades_economicas; track ae['id_actividad_economica']) {<mat-option [value]="ae['id_actividad_economica']">{{ ae['descripcion'] }}</mat-option>}</mat-select></mat-form-field>
                    </div>
                    <div class="form-row three">
                      <mat-form-field appearance="outline"><mat-label>Actividad Secundaria</mat-label><mat-select [(ngModel)]="complemento.c_actividad_secundaria_conyugue_id"><mat-option [value]="0">Ninguna</mat-option>@for (ae of cat.actividades_economicas; track ae['id_actividad_economica']) {<mat-option [value]="ae['id_actividad_economica']">{{ ae['descripcion'] }}</mat-option>}</mat-select></mat-form-field>
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
              }
            </div>
          }

          @if (comisionResult) {
            <div class="form-section">
              <h4 class="form-section-title"><mat-icon>payments</mat-icon> Forma de cobro al cliente <span>Registre cómo recibe caja el total de la operación.</span></h4>
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
                      <mat-label>Monto</mat-label><span matTextPrefix>Bs&nbsp;</span>
                      <input matInput type="number" [(ngModel)]="mp.monto" step="0.01" min="0" style="text-align:right">
                    </mat-form-field>
                    @if (mp.id_forma_pago !== 1) {
                      <mat-form-field appearance="outline">
                        <mat-label>Cuenta Bancaria</mat-label><mat-icon matPrefix>account_balance</mat-icon>
                        <mat-select [(ngModel)]="mp._cuentaKey" (ngModelChange)="onSelectCuenta(mp, $event)">
                          <mat-option value="">Seleccione</mat-option>
                          @for (cb of cuentasBancarias; track cuentaKey(cb)) {
                            @if (cb.moneda === 'BOB') {
                              <mat-option [value]="cuentaKey(cb)">{{ cb.entidad }} · {{ cb.num_cuenta_bancaria }} ({{ cb.tipo_cuenta }})</mat-option>
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
                    <span class="cobro-total" [class.cobro-ok]="totalMetodosPago === comisionResult.bob.total_operacion"
                          [class.cobro-err]="totalMetodosPago !== comisionResult.bob.total_operacion">
                      Suma: {{ totalMetodosPago | number:'1.2-2' }} / {{ comisionResult.bob.total_operacion | number:'1.2-2' }} BOB
                    </span>
                  }
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button class="btn-secondary" (click)="step = 'destinatario'">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
                Volver
              </button>
              @if (!cotizacionAplicada) {
                <button class="btn-accent" (click)="generarCotizacion()"
                        [disabled]="!canRegister || generandoCotizacion">
                  @if (generandoCotizacion) {
                    <div class="spinner sm"></div>
                  } @else {
                    Cotizar
                  }
                </button>
              }
              <button class="btn-primary" (click)="abrirConfirmDialog()"
                      [disabled]="!canRegister || registrando">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                Registrar Remesa
              </button>
            </div>
          }
        </div>

        <!-- ===== CONFIRM DIALOG ===== -->
        @if (showConfirmDialog) {
          <div class="overlay" (click)="showConfirmDialog = false">
            <div class="confirm-modal" (click)="$event.stopPropagation()">
              <div class="confirm-heading">
                <div class="confirm-heading-icon"><mat-icon>send</mat-icon></div>
                <div><h3 class="confirm-title">Confirmar envío de remesa</h3><p>Revise los datos y los importes antes de registrar.</p></div>
              </div>
              <div class="confirm-body">
                <div class="confirm-row">
                  <span class="confirm-label"><mat-icon>person</mat-icon>Remitente</span>
                  <strong>{{ cliente.nombres }} {{ cliente.ape_pat }}</strong>
                </div>
                <div class="confirm-row">
                  <span class="confirm-label"><mat-icon>badge</mat-icon>Documento</span>
                  <strong>{{ clienteDoc.documento }}</strong>
                </div>
                <div class="confirm-row">
                  <span class="confirm-label"><mat-icon>groups</mat-icon>Beneficiario</span>
                  <strong>{{ destinatario.nombres }} {{ destinatario.ape_pat }}</strong>
                </div>
                <div class="confirm-row">
                  <span class="confirm-label"><mat-icon>public</mat-icon>Agencia destino</span>
                  <strong>{{ getDestinoLabel() }}</strong>
                </div>
                <div class="confirm-row">
                  <span class="confirm-label"><mat-icon>payments</mat-icon>Pago en Chile</span>
                  <strong>{{ formaPagoChile === 2 ? 'Depósito a Cuenta' : 'Efectivo Ventanilla' }}</strong>
                </div>
                @if (formaPagoChile === 2) {
                  <div class="confirm-row">
                    <span class="confirm-label"><mat-icon>account_balance</mat-icon>Banco / Cuenta</span>
                    <strong>{{ getBancoChileLabel() }} - {{ cuentaDestinoChile }}</strong>
                  </div>
                }
                <div class="confirm-row">
                  <span class="confirm-label"><mat-icon>currency_exchange</mat-icon>Moneda de envío</span>
                  <strong>{{ monedaAbr }}</strong>
                </div>
                @if (incluirComision === 1 && modoMonto !== 'directo') {
                  <div class="confirm-row">
                    <span class="confirm-label"><mat-icon>edit_note</mat-icon>Monto ingresado</span>
                    <strong>{{ montoEnvio | number:'1.2-2' }} {{ modoMonto === 'equiv_clp' ? 'CLP' : modoMonto === 'equiv_usd' ? 'USD' : monedaAbr }}</strong>
                  </div>
                }
                <div class="confirm-row">
                  <span class="confirm-label"><mat-icon>send</mat-icon>{{ incluirComision === 1 ? 'Monto real enviado' : 'Monto a enviar' }}</span>
                  <strong>{{ comisionResult!.monto_enviado_x | number:'1.2-2' }} {{ monedaAbr }}</strong>
                </div>
                @if (monedaAbr === 'USD' && comisionResult!.monto_enviado_bob) {
                  <div class="confirm-row">
                  <span class="confirm-label"><mat-icon>currency_exchange</mat-icon>Equivalente BOB *</span>
                    <strong>{{ comisionResult!.monto_enviado_bob | number:'1.2-2' }} BOB</strong>
                  </div>
                }
                <div class="confirm-row accent-row">
                  <span class="confirm-label"><mat-icon>account_balance_wallet</mat-icon>Beneficiario recibe</span>
                  <strong>{{ (comisionResult!.total_clp || 0) | number:'1.0-0' }} CLP</strong>
                </div>
                @if (comisionResult!.equivalente_usd && monedaAbr !== 'USD') {
                  <div class="confirm-row">
                  <span class="confirm-label"><mat-icon>currency_exchange</mat-icon>Equivalente USD *</span>
                    <strong>{{ comisionResult!.equivalente_usd | number:'1.2-2' }} USD</strong>
                  </div>
                }
                <div class="confirm-row">
                  <span class="confirm-label"><mat-icon>percent</mat-icon>Comisión{{ incluirComision === 1 ? ' (incluida)' : '' }}</span>
                  <strong>{{ comisionResult!.bob.comision_total | number:'1.2-2' }} BOB</strong>
                </div>
                <div class="confirm-row highlight-row">
                  <span class="confirm-label"><mat-icon>point_of_sale</mat-icon>Total a cobrar al cliente</span>
                  <strong>{{ comisionResult!.bob.total_operacion | number:'1.2-2' }} BOB</strong>
                </div>
                @if (compraUsd && monedaEnvio === '1') {
                  <div class="confirm-row accent-row">
                    <span>Compra USD</span>
                    <strong>{{ comisionResult!.monto_enviado_x | number:'1.2-2' }} USD &#64; {{ tcOficialVenta | number:'1.4-4' }}</strong>
                  </div>
                  <div class="confirm-row">
                    <span>Equivalente Compra</span>
                    <strong>{{ (comisionResult!.monto_enviado_x * tcOficialVenta) | number:'1.2-2' }} BOB</strong>
                  </div>
                }
                @if (requierePcc08) {
                  <div class="confirm-row uif-row">
                    <span>PCC-08</span>
                    <strong>Se generará declaración de fondos</strong>
                  </div>
                }
                @if (uifResult && uifResult.alertas.length > 0) {
                  @for (a of uifResult.alertas; track a.tipo) {
                    <div class="confirm-row uif-row">
                      <span>{{ a.tipo }}</span>
                      <strong>{{ a.mensaje }}</strong>
                    </div>
                  }
                }
              </div>

              <div class="confirm-actions">
                <button class="btn-secondary" (click)="showConfirmDialog = false">Cancelar</button>
                <button class="btn-primary" (click)="confirmarRegistro()" [disabled]="registrando">
                  @if (registrando) {
                    <div class="spinner sm white"></div>
                    Registrando...
                  } @else {
                    Confirmar
                  }
                </button>
              </div>
            </div>
          </div>
        }
      }

      <!-- ===== STEP 4: RESULTADO ===== -->
      @if (step === 'resultado' && resultado) {
        <!-- ── Screen view (hidden on print) ── -->
        <div class="section-card result-card no-print">
          <div class="result-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <h2 class="result-title">Remesa Registrada</h2>
          <div class="result-grid">
            <div class="result-item"><span class="result-label">Nro. Remesa</span><span class="result-value">#{{ resultado.id_remesa }}</span></div>
            <div class="result-item"><span class="result-label">Código</span><span class="result-value">{{ resultado.codigo }}</span></div>
            <div class="result-item"><span class="result-label">Correlativo</span><span class="result-value">{{ resultado.correlativo }}</span></div>
            <div class="result-item"><span class="result-label">Fecha</span><span class="result-value">{{ resultado.fecha }}</span></div>
            <div class="result-item"><span class="result-label">Remitente</span><span class="result-value sm">{{ resultado.cliente_nombre }}</span></div>
            <div class="result-item"><span class="result-label">Beneficiario</span><span class="result-value sm">{{ resultado.destinatario_nombre }}</span></div>
            @if (resultado.destinatario_doc) {
              <div class="result-item"><span class="result-label">Doc. Beneficiario</span><span class="result-value sm">{{ resultado.destinatario_doc }}</span></div>
            }
            <div class="result-item"><span class="result-label">Agencia</span><span class="result-value sm">{{ resultado.agencia }}</span></div>
            <div class="result-item"><span class="result-label">Destino</span><span class="result-value">CHILE - {{ resultado.destino }}</span></div>
            <div class="result-item"><span class="result-label">Pago en Chile</span><span class="result-value sm">{{ resultado.forma_pago_chile }}</span></div>
            @if (resultado.banco_chile) {
              <div class="result-item"><span class="result-label">Banco Chile</span><span class="result-value sm">{{ resultado.banco_chile }}</span></div>
            }
            <div class="result-item">
              <span class="result-label">Recibido [{{ resultado.moneda_enviada_abr || resultado.moneda_enviada }}]</span>
              <span class="result-value big">{{ resultado.monto | number:'1.2-2' }}</span>
            </div>
            <div class="result-item entrega-item">
              <span class="result-label">Por Entregar [CLP]</span>
              <span class="result-value big accent">{{ (resultado.total_clp || 0) | number:'1.0-0' }}</span>
            </div>
            @if (resultado.mon_rec === 2 && resultado.total_clp && resultado.tipo_cambio_clp) {
              <div class="result-item"><span class="result-label">Equivalente USD *</span><span class="result-value">{{ (resultado.total_clp / resultado.tipo_cambio_clp) | number:'1.2-2' }}</span></div>
            }
            <div class="result-item">
              <span class="result-label">Comisión [BOB]{{ resultado.pago_comision === 1 ? ' (incluida)' : '' }}</span>
              <span class="result-value">{{ resultado.comision_bob | number:'1.2-2' }}</span>
            </div>
            <div class="result-item"><span class="result-label">Total BOB</span><span class="result-value big">{{ resultado.total_bob | number:'1.2-2' }}</span></div>
            <div class="result-footnote full-width">(*) Montos Referenciales</div>
          </div>
          @if (resultado.factura) {
            <div class="factura-section">
              <div class="factura-header">Factura Electrónica</div>
              <div class="result-grid">
                <div class="result-item"><span class="result-label">Nro. Factura</span><span class="result-value">{{ resultado.factura.numero_factura }}</span></div>
                <div class="result-item"><span class="result-label">Estado</span><span class="result-value">{{ resultado.factura.estado }}</span></div>
                @if (resultado.factura.cuf) {
                  <div class="result-item full-width"><span class="result-label">CUF</span><span class="result-value cuf">{{ resultado.factura.cuf }}</span></div>
                }
              </div>
            </div>
          }
          @if (resultado.compra_usd) {
            <div class="factura-section compra-section">
              <div class="factura-header">Compra USD</div>
              <div class="result-grid">
                <div class="result-item"><span class="result-label">Monto USD</span><span class="result-value">{{ resultado.compra_usd.monto_usd | number:'1.2-2' }}</span></div>
                <div class="result-item"><span class="result-label">TC Oficial Venta</span><span class="result-value">{{ resultado.compra_usd.tc_oficial_venta | number:'1.4-4' }}</span></div>
                <div class="result-item"><span class="result-label">Total BOB</span><span class="result-value">{{ resultado.compra_usd.total_bob | number:'1.2-2' }}</span></div>
                @if (resultado.compra_usd.factura?.numero_factura) {
                  <div class="result-item"><span class="result-label">Factura Compra</span><span class="result-value">{{ resultado.compra_usd.factura.numero_factura }}</span></div>
                }
              </div>
            </div>
          }
          <div class="form-actions">
            <button class="btn-secondary" (click)="abrirPdfPopup('comprobante')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
              Comprobante
            </button>
            <button class="btn-secondary" (click)="abrirPdfPopup('factura')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              Factura
            </button>
            <button class="btn-primary" (click)="nuevaRemesa()">Nueva Remesa</button>
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

    .remesa-page { margin: 0; }

    /* ===== HEADER STRIP ===== */
    .header-strip {
      display: flex; align-items: center; gap: 12px; padding: 12px 16px;
      background: var(--card-bg, #fff); border-radius: 10px; margin-bottom: 16px;
      border: 1px solid var(--border, #e5e5e5);
    }
    .header-icon {
      width: 40px; height: 40px; border-radius: 10px; display: flex;
      align-items: center; justify-content: center; background: #F58634; color: #fff; flex-shrink: 0;
    }
    .header-text h1 { font-size: 1.15rem; font-weight: 700; margin: 0; color: var(--text-primary, #1a1a1a); }
    .header-text span { font-size: 0.8rem; color: var(--text-secondary, #666); }
    .manual-help { display: inline-flex; align-items: center; gap: 6px; margin-left: auto; padding: 8px 12px; border: 1px solid #f1c49e; border-radius: 8px; color: #a4510d; background: #fffaf5; font-size: 11px; font-weight: 700; text-decoration: none; white-space: nowrap; }
    .manual-help:hover { background: #fff0e2; }

    .steps {
      display: flex; align-items: center; justify-content: center; gap: 0; margin-bottom: 16px;
    }
    .step {
      display: flex; align-items: center; gap: 6px;
      padding: 6px 12px; border-radius: 6px;
    }
    .step-num {
      width: 24px; height: 24px; border-radius: 50%; background: var(--border, #e5e5e5);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.75rem; font-weight: 700; color: var(--text-secondary, #666);
    }
    .step-lbl { font-size: 0.8rem; color: var(--text-secondary, #666); font-weight: 500; }
    .step.active .step-num { background: #F58634; color: #fff; }
    .step.active .step-lbl { color: #F58634; font-weight: 700; }
    .step.done .step-num { background: #16a34a; color: #fff; }
    .step.done .step-lbl { color: var(--text-secondary, #666); }
    .step-line {
      flex: 0 0 24px; height: 2px; background: var(--border, #e5e5e5);
    }
    .step-line.done { background: #16a34a; }

    /* ===== LOADING ===== */
    .loading-box {
      display: flex; align-items: center; justify-content: center; gap: 12px;
      padding: 60px 0; color: var(--text-secondary, #64748b); font-size: 14px;
    }

    /* ===== SECTION CARD ===== */
    .section-card {
      background: var(--card-bg, #fff); border: 1px solid var(--border, #e5e7eb); border-radius: 14px;
      padding: 24px; margin-bottom: 16px;
    }
    .section-header {
      display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;
    }
    .section-title { font-size: 17px; font-weight: 700; color: var(--text-primary, #14213d); margin: 0; }

    /* ===== FORM ===== */
    .form-row { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
    .form-break { flex-basis: 100%; height: 0; margin: 0; padding: 0; }
    .form-row.two > .field { flex: 1; min-width: 200px; }
    .form-row.three > .field { flex: 1; min-width: 150px; }
    .form-row > mat-form-field,
    .form-row > app-searchable-select,
    .form-row > .input-with-btn,
    .form-row > .cel-col,
    .form-row > .field,
    .form-row .ff-contents > .mat-mdc-form-field,
    .form-row .ff-contents > app-searchable-select { flex: 1 1 0; min-width: 150px; }
    .form-row.two > mat-form-field,
    .form-row.two > app-searchable-select,
    .form-row.two > .input-with-btn { min-width: 200px; }
    .form-row > mat-form-field { width: auto; }
    .remesa-page mat-form-field > label { display: none; }
    .form-row mat-form-field .mat-mdc-text-field-wrapper { background: var(--card-bg, #fff); }
    /* Mantener la densidad nativa de Material, igual que Cambio y Giro. */
    .form-row > mat-form-field .mat-mdc-form-field-infix { min-height: unset; }
    .field > mat-form-field { width: 100%; }
    .field:has(> mat-form-field) > label { display: none; }
    .field:has(> mat-form-field) { gap: 0; }
    .field > mat-form-field .mat-mdc-text-field-wrapper { background: var(--card-bg, #fff); }
    .cliente-form .mat-mdc-form-field, .form-row .mat-mdc-form-field { margin-bottom: 0; }
    .form-row .cel-col { display: flex; flex-direction: row; align-items: flex-end; gap: 8px; min-width: 250px; }
    .form-row .cel-col > .mat-mdc-form-field { flex: 1 1 auto; min-width: 0; }

    .field label {
      display: block; font-size: 11.5px; font-weight: 600; color: var(--text-secondary, #64748b);
      margin-bottom: 4px; text-transform: uppercase; letter-spacing: .03em;
    }
    .field label.highlight { color: #F5820A; }
    .field input, .field select, .field textarea {
      width: 100%; padding: 9px 12px; border: 1px solid var(--border, #d1d5db); border-radius: 8px;
      font-size: 14px; color: var(--text-primary, #1e293b); background: var(--card-bg, #fff); outline: none; box-sizing: border-box; text-transform: uppercase;
      font-family: inherit;
    }
    .field input:focus, .field select:focus, .field textarea:focus {
      border-color: #F5820A; box-shadow: 0 0 0 3px rgba(245,130,10,.12);
    }
    .field textarea { resize: vertical; min-height: 50px; }
    .monto-input { font-weight: 600; font-size: 15px !important; }

    .input-with-btn { display: flex; gap: 6px; align-items: stretch; }
    .input-with-btn input { flex: 1; min-width: 0; }
    .btn-copy-tel {
      padding: 0 10px; border: 1px solid var(--border, #d1d5db); border-radius: 8px;
      background: var(--hover-bg, #f8fafc); color: var(--text-secondary, #64748b); font-size: 11px; font-weight: 600;
      cursor: pointer; white-space: nowrap; font-family: inherit;
    }
    .btn-copy-tel:hover { background: #e0f2fe; color: #0369a1; border-color: #93c5fd; }

    /* NIT toggle */
    .nit-toggle-row { display: flex; align-items: center; gap: 8px; }
    .nit-toggle {
      display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px;
      border: 1px solid var(--border, #e5e5e5); border-radius: 6px; background: var(--card-bg, #fff);
      cursor: pointer; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary, #666);
      white-space: nowrap; transition: all .15s;
    }
    .nit-toggle.active { border-color: #F58634; color: #F58634; background: var(--orange-bg, #fff7ed); }
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

    /* Celular igual al formulario de Giro Nacional. */
    .cel-col { display: flex; flex-direction: row; align-items: flex-end; gap: 8px; min-width: 0; }
    .cel-col > .mat-mdc-form-field { flex: 1 1 auto; min-width: 0; }
    .cel-col > .nit-toggle {
      height: 40px; margin-bottom: 22px; padding: 0 12px; gap: 8px;
      border-color: var(--mat-sys-primary, #F58634); color: var(--mat-sys-primary, #F58634);
      border-radius: 8px; background: var(--card-bg, #fff);
    }
    .cel-col > .nit-toggle.active { background: var(--mat-sys-primary-container, #fde8d0); }

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

    /* ===== DESTINATARIOS PREVIOS ===== */
    .previos-section { margin-bottom: 16px; }
    .previos-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 14px; border: 1px solid #e5eaf0; border-radius: 10px; background: #f8fafc; }
    .previos-label { font-size: 12px; color: var(--text-primary, #1e293b); font-weight: 700; margin-bottom: 3px; }
    .previos-toolbar small { color: var(--text-secondary, #64748b); font-size: 11px; }
    .btn-contactos { display: inline-flex; align-items: center; gap: 7px; border: 1px solid #f5820a; border-radius: 8px; padding: 8px 12px; background: #fff7ed; color: #c2410c; font: 600 12px inherit; cursor: pointer; white-space: nowrap; }
    .btn-contactos:hover { background: #ffedd5; }
    .contacto-seleccionado { display: flex; align-items: center; gap: 10px; margin-top: 8px; padding: 10px 12px; border: 1px solid #bbf7d0; border-radius: 9px; background: #f0fdf4; }
    .contacto-seleccionado div, .contacto-card-main { display: flex; flex-direction: column; min-width: 0; text-align: left; }
    .contacto-seleccionado strong, .contacto-card-main strong { color: #14213d; font-size: 13px; }
    .contacto-seleccionado small, .contacto-card-main small { color: #64748b; font-size: 11px; margin-top: 2px; }
    .contacto-avatar { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 34px; width: 34px; height: 34px; border-radius: 50%; background: #ffedd5; color: #c2410c; font-weight: 800; font-size: 14px; }
    .contacto-check { margin-left: auto; color: #15803d; font-size: 11px; font-weight: 700; white-space: nowrap; }
    .nuevo-contacto-hint { margin-top: 8px; padding: 9px 12px; border: 1px dashed #fdba74; border-radius: 8px; color: #9a3412; background: #fff7ed; font-size: 11px; }
    .contactos-overlay { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(15, 23, 42, .45); }
    .contactos-dialog { width: min(620px, 100%); max-height: min(680px, 90vh); display: flex; flex-direction: column; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 16px; background: #fff; box-shadow: 0 24px 70px rgba(15, 23, 42, .24); }
    .contactos-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 20px 22px 14px; border-bottom: 1px solid #eef2f7; }
    .contactos-kicker { color: #f5820a; font-size: 10px; font-weight: 800; letter-spacing: .06em; }
    .contactos-header h3 { margin: 4px 0 3px; color: #14213d; font-size: 20px; }
    .contactos-header p { margin: 0; color: #64748b; font-size: 12px; }
    .dialog-close { width: 30px; height: 30px; border: 0; border-radius: 7px; background: #f1f5f9; color: #64748b; font-size: 22px; line-height: 1; cursor: pointer; }
    .dialog-close:hover { background: #fee2e2; color: #b91c1c; }
    .contactos-search { display: flex; align-items: center; gap: 8px; margin: 14px 22px 10px; padding: 9px 11px; border: 1px solid #dbe3ec; border-radius: 8px; color: #94a3b8; }
    .contactos-search:focus-within { border-color: #f5820a; box-shadow: 0 0 0 3px rgba(245, 130, 10, .12); }
    .contactos-search input { width: 100%; border: 0; outline: 0; color: #1e293b; font: 13px inherit; }
    .contactos-lista { display: flex; flex-direction: column; gap: 8px; overflow-y: auto; padding: 2px 22px 16px; }
    .contacto-card { display: flex; align-items: center; gap: 11px; width: 100%; padding: 11px 12px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; text-align: left; cursor: pointer; font-family: inherit; transition: border-color .15s, background .15s, transform .15s; }
    .contacto-card:hover { border-color: #fbbf24; background: #fffbeb; transform: translateY(-1px); }
    .contacto-card.selected { border-color: #f5820a; background: #fff7ed; }
    .contacto-card-arrow { margin-left: auto; color: #94a3b8; font-size: 24px; line-height: 1; }
    .contactos-empty { padding: 28px 12px; color: #64748b; text-align: center; font-size: 13px; }
    .contactos-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px 18px; border-top: 1px solid #eef2f7; }

    /* ===== COMISION CARD ===== */
    .comision-card {
      background: var(--card-bg, #fff); border: 1px solid var(--border, #dbe2ea); border-radius: 12px;
      padding: 16px; margin: 16px 0;
    }
    .comision-title {
      font-size: 15px; font-weight: 700; color: var(--text-primary, #14213d); margin: 0 0 12px;
    }
    .comision-grid {
      display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px;
    }
    .com-item {
      min-width: 0; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;
    }
    .transfer-summary { border: 1px solid #e2e8f0; border-radius: 9px; background: #fff; overflow: hidden; }
    .transfer-line { min-height: 52px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 14px; }
    .transfer-line + .transfer-line { border-top: 1px solid #edf0f4; }
    .transfer-line-send { display: block; }
    .transfer-line-send > .comision-details { margin: 9px 0 2px 30px; padding: 8px 0 0 12px; border-top: 1px solid #edf0f4; border-left: 2px solid #f1dfcb; }
    .transfer-description { display: flex; align-items: center; gap: 10px; }
    .transfer-description .country-flag { margin: 0; }
    .country-flag { display: inline-flex; width: 20px; height: 14px; margin-right: 5px; vertical-align: -2px; flex: 0 0 auto; }
    .country-flag svg { display: block; width: 100%; height: 100%; }
    .transfer-description > div > strong { display: block; color: var(--text-primary, #14213d); font-size: 16px; font-weight: 700; }
    .transfer-description small { display: block; margin-top: 2px; color: var(--text-secondary, #64748b); font-size: 11px; }
    .transfer-equivalent { display: flex; align-items: center; gap: 7px; padding-left: 12px; text-align: right; }
    .transfer-equivalent .country-flag { margin: 0; }
    .transfer-equivalent > div { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; }
    .transfer-equivalent small { color: var(--text-secondary, #64748b); font-size: 10px; }
    .transfer-equivalent strong { color: var(--text-primary, #334155); font-size: 13px; }
    .transfer-rate { margin-top: 3px; color: var(--text-secondary, #64748b); font-size: 10px !important; }
    .transfer-rate strong { color: var(--text-primary, #14213d); text-decoration: underline; }
    .transfer-total { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 11px 14px; background: #f8f7f4; border-top: 1px solid #e9e5df; }
    .transfer-total > span { color: var(--text-primary, #334155); font-size: 12px; font-weight: 600; }
    .transfer-total > strong { color: #263b5a; font-size: 16px; }
    .transfer-total > small { color: var(--text-secondary, #64748b); font-size: 11px; }
    .comision-details { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border, #e2e8f0); }
    .comision-breakdown-title { margin: 0 0 6px; color: var(--text-primary, #14213d); font-size: 12px; font-weight: 700; }
    .comision-breakdown-label { margin: 10px 0 4px; color: var(--text-secondary, #64748b); font-size: 10px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
    .comision-details .comision-grid { gap: 0 16px; }
    .comision-details .com-item { padding: 8px 2px; border: 0; border-bottom: 1px solid #edf0f4; border-radius: 0; background: transparent; }
    .fees-breakdown { background: transparent; }
    .fee-parent { position: relative; display: flex; align-items: center; gap: 12px; padding: 7px 10px; border-radius: 5px; background: #fff4e8; color: var(--text-primary, #14213d); font-size: 12px; font-weight: 700; }
    .fee-parent::before { content: ''; position: absolute; left: -15px; top: 50%; width: 13px; transform: translateX(5px); border-top: 1px dotted #d5a16e; }
    .fee-parent strong { margin-left: auto; font-size: 14px; }
    .fee-parent small, .fee-child small { color: var(--text-secondary, #64748b); font-size: 10px; }
    .fee-label { display: inline-flex; align-items: center; gap: 5px; }
    .fee-label mat-icon { width: 15px; height: 15px; font-size: 15px; line-height: 15px; color: #94a3b8; }
    .fee-children { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0 14px; margin-left: 10px; padding: 0 0 3px 14px; border-left: 1px dotted #cbd5e1; }
    .fee-child { position: relative; min-width: 0; display: flex; flex-direction: column; gap: 3px; padding: 7px 4px; color: var(--text-secondary, #64748b); font-size: 10px; }
    .fee-child::before { content: ''; position: absolute; left: -14px; top: 15px; width: 12px; border-top: 1px dotted #cbd5e1; }
    .fee-child strong { color: var(--text-primary, #334155); font-size: 12px; }
    .fee-extra { color: #8a5a26; }
    .com-footnote { font-size: 11px; color: var(--text-muted, #94a3b8); margin-top: 10px; font-style: italic; }
    .com-label { display: block; font-size: 11px; color: var(--text-secondary, #64748b); font-weight: 600; text-transform: uppercase; margin-bottom: 2px; }
    .com-value { font-size: 15px; font-weight: 700; color: var(--text-primary, #14213d); }
    .com-value.big { font-size: 18px; color: #b45309; }
    .com-value-alt { display: block; font-size: 12px; font-weight: 600; color: #0369a1; margin-top: 2px; }
    .com-value-alt.big-alt { font-size: 15px; color: #0369a1; }

    /* ===== PAGO CHILE SECTION ===== */
    .pago-chile-section {
      margin-top: 16px; padding-top: 16px;
      border-top: 1px dashed #e2e8f0;
    }
    .subsection-title {
      font-size: 14px; font-weight: 700; color: var(--text-primary, #1e293b);
      margin: 0 0 10px 0;
    }

    /* ===== COTIZACIÓN ===== */
    .cotizacion-search {
      margin-bottom: 16px; padding: 14px 16px 12px;
      background: linear-gradient(135deg, #f8fbff, #f0f9ff); border: 1px solid #bae6fd; border-radius: 10px;
    }
    .cot-input-row { display: flex; gap: 12px; align-items: flex-start; }
    .cot-field { flex: 1; min-width: 0; }
    .cot-input { text-transform: uppercase; letter-spacing: .04em; font-weight: 600; }
    .btn-apply-cot { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 48px; margin-top: 2px; padding: 0 16px; border: 1px solid #f5820a; border-radius: 8px; background: #f5820a; color: #fff; font: 700 12px inherit; cursor: pointer; white-space: nowrap; box-shadow: 0 2px 5px rgba(245, 130, 10, .2); transition: background .15s, box-shadow .15s; }
    .btn-apply-cot:hover:not(:disabled) { background: #e87505; box-shadow: 0 4px 10px rgba(245, 130, 10, .25); }
    .btn-apply-cot:disabled { opacity: .55; cursor: not-allowed; box-shadow: none; }
    .btn-apply-cot mat-icon { width: 17px; height: 17px; font-size: 17px; }
    .cot-badge {
      display: flex; align-items: center; gap: 6px; margin-top: 9px; padding: 8px 11px; background: #ecfdf5;
      border: 1px solid #bbf7d0; border-radius: 7px; font-size: 12px; font-weight: 600; color: #166534;
    }
    .btn-accent {
      padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer;
      font-weight: 600; font-size: 13px; color: #fff; background: #0369a1;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .btn-accent:hover { background: #0284c7; }
    .btn-accent:disabled { opacity: .5; cursor: not-allowed; }
    .btn-sm { padding: 6px 12px; font-size: 12px; }

    /* ===== FORMA DE COBRO ===== */
    .form-section { margin: 16px 0; }
    .form-section-title {
      display: flex; align-items: center; gap: 7px; font-size: 14px; font-weight: 700; color: var(--text-primary, #14213d); margin: 0 0 10px;
    }
    .form-section-title > mat-icon { color: #F5820A; }
    .form-section-title > span { color: var(--text-secondary, #64748b); font-size: 12px; font-weight: 400; margin-left: 3px; }
    .cobro-section {
      padding: 14px 16px; background: var(--card-bg, #fff); border-radius: 12px;
      border: 1px solid var(--border, #e8e8e8);
    }
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

    /* ===== COMISIÓN ===== */
    .toggle-label { display: block; margin: 0 0 2px; color: var(--text-secondary, #64748b); font-size: 11px; font-weight: 700; text-align: center; text-transform: uppercase; }
    .comision-toggle-wrap { min-height: 36px; display: flex; align-items: center; justify-content: center; padding: 0; margin-top: -3px; }
    .comision-toggle { font-size: 13px; font-weight: 600; color: var(--text-primary, #14213d); }

    /* ===== UIF STATUS ===== */
    .uif-highlights { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin: 8px 0 12px; }
    .uif-highlights .uif-status { min-width: 0; align-items: center; gap: 8px; padding: 7px 10px; margin: 0; border-radius: 6px; }
    .uif-highlights .uif-danger { background: #fffafa; border: 1px solid #f3d4d1; border-left: 3px solid #dc6258; }
    .uif-highlights .uif-warn { background: #fffdf7; border: 1px solid #f1e4c5; border-left: 3px solid #d69a39; }
    .uif-highlights .uif-icon svg { width: 16px; height: 16px; }
    .uif-highlights .uif-text { min-width: 0; gap: 1px; }
    .uif-highlights .uif-text strong { font-size: 12px; }
    .uif-highlights .uif-text span { font-size: 11px; line-height: 1.3; }
    .uif-status {
      display: flex; align-items: flex-start; gap: 10px; padding: 10px 14px;
      border-radius: 8px; margin-bottom: 14px; font-size: 13px;
    }
    .uif-ok { background: var(--success-bg, #f0fdf4); border: 1px solid var(--success-border, #bbf7d0); color: var(--success-text, #15803d); }
    .uif-warn { background: var(--warning-bg, #fffbeb); border: 1px solid var(--warning-border, #fde68a); color: var(--warning-text, #92400e); }
    .uif-danger { background: var(--error-bg, #fef2f2); border: 1px solid var(--error-border, #fecaca); color: var(--error-text, #b91c1c); }
    .uif-checking { background: var(--hover-bg, #f8fafc); border: 1px solid var(--border, #e2e8f0); color: var(--text-secondary, #64748b); }
    .uif-icon { flex-shrink: 0; margin-top: 1px; }
    .uif-text { display: flex; flex-direction: column; gap: 2px; }
    .uif-text strong { font-size: 13px; }
    .uif-text span { font-size: 12px; opacity: .8; }

    /* ===== FORMULARIO COMPLEMENTO UIF ===== */
    .complemento-section {
      border: 1px solid var(--border, #e8e8e8); border-left: 4px solid #6b8eae; border-radius: 12px;
      padding: 14px 18px 0; margin: 10px 0 0; background: var(--card-bg, #fff);
    }
    .complemento-header { display: flex; align-items: center; justify-content: space-between; cursor: pointer; margin: 0 0 10px; }
    .complemento-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #315b7d; margin: 0; padding: 2px 0; line-height: 1.4; }
    .complemento-section .form-row { margin-bottom: 0; }
    .pep-subsection { padding-top: 0; margin-top: 10px; }
    .pep-subtitle {
      font-size: 12px; font-weight: 700; color: var(--text-secondary, #666);
      text-transform: uppercase; letter-spacing: .03em; margin: 0 0 12px;
    }

    /* ===== PCC-08 SECTION ===== */
    .pcc08-section {
      border: 1px solid var(--border, #e8e8e8); border-left: 4px solid #6b8eae; border-radius: 12px;
      padding: 14px 18px 0; margin: 10px 0 0; background: var(--card-bg, #fff);
    }
    .pcc08-section .form-row { margin-bottom: 0; }
    .pcc08-section > .form-row.three { align-items: flex-start; }
    .pcc08-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 14px; font-weight: 700; color: #315b7d; margin: 0 0 10px;
    }
    .pcc08-additional { margin-top: 8px; padding-top: 0; }
    .pcc08-subtitle { display: flex; align-items: center; gap: 7px; margin: 0 0 8px; color: #7f3c35; font-size: 12px; font-weight: 700; }
    .pcc08-subtitle svg { width: 15px; height: 15px; color: #c76a50; }

    /* ===== ALERTAS LISTAS DE CONTROL ===== */
    .alerta-control {
      display: flex; align-items: flex-start; gap: 10px; padding: 10px 14px;
      border-radius: 8px; margin-bottom: 8px; font-size: 13px;
    }
    .alerta-alto { background: var(--warning-bg, #fffbeb); border: 1px solid var(--warning-border, #fde68a); color: var(--warning-text, #92400e); }
    .alerta-critico { background: var(--error-bg, #fef2f2); border: 2px solid #f87171; color: var(--error-text, #991b1b); }
    .alerta-icon { flex-shrink: 0; margin-top: 1px; }
    .alerta-text { display: flex; flex-direction: column; gap: 2px; flex: 1; }
    .alerta-text strong { font-size: 13px; }
    .alerta-text span { font-size: 12px; opacity: .85; }
    .alerta-badge {
      flex-shrink: 0; font-size: 10px; font-weight: 800; letter-spacing: .5px;
      padding: 2px 8px; border-radius: 4px; background: rgba(0,0,0,.08);
    }
    .alerta-critico .alerta-badge { background: var(--error-border, #fca5a5); color: #7f1d1d; }
    .alerta-alto .alerta-badge { background: var(--warning-border, #fde68a); color: #78350f; }

    .uif-row { background: var(--error-bg, #fef2f2); }
    .uif-row span { color: var(--error-text, #b91c1c); }
    .uif-row strong { color: var(--error-text, #b91c1c); font-size: 12px; }

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

    /* ===== COMPRA USD ===== */
    .checkbox-label {
      display: flex; align-items: center; gap: 8px; font-size: 13px;
      font-weight: 600; color: var(--text-primary, #1e293b); cursor: pointer;
    }
    .checkbox-label input[type="checkbox"] {
      width: 16px; height: 16px; accent-color: #F5820A; cursor: pointer;
    }
    .tc-badge {
      display: inline-block; font-size: 12px; font-weight: 700;
      padding: 3px 10px; border-radius: 6px; margin-top: 4px;
      background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0;
    }
    .compra-section {
      border-color: #d1fae5 !important;
    }
    .compra-section .factura-header {
      background: #ecfdf5 !important; color: #065f46 !important;
    }

    .btn-calcular {
      display: inline-flex; align-items: center; gap: 8px; width: 100%;
      padding: 9px 16px; border: 2px solid #F5820A; border-radius: 8px;
      background: var(--card-bg, #fff); color: #F5820A; font-size: 14px; font-weight: 600;
      cursor: pointer; font-family: inherit; justify-content: center;
    }
    .btn-calcular:hover:not(:disabled) { background: var(--orange-bg, #fff8f0); }
    .btn-calcular:disabled { opacity: .5; cursor: not-allowed; }

    /* ===== ACTIONS ===== */
    .form-actions {
      display: flex; justify-content: flex-end; gap: 10px;
      padding-top: 16px; border-top: 1px solid var(--border-light, #f1f5f9); margin-top: 16px;
    }
    .btn-primary {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 10px 22px; background: #F5820A; color: #fff; border: none;
      border-radius: 9px; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit;
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
      border-radius: 9px; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit;
    }
    .btn-secondary:hover { background: var(--hover-bg, #f8fafc); color: var(--text-primary, #14213d); }
    .btn-back {
      display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px;
      background: transparent; border: 1px solid var(--border, #d1d5db); border-radius: 7px;
      color: var(--text-secondary, #64748b); font-size: 13px; cursor: pointer; font-family: inherit;
    }
    .btn-back:hover { background: var(--hover-bg, #f8fafc); color: var(--text-primary, #14213d); }

    /* ===== CONFIRM OVERLAY ===== */
    .overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 100;
      display: flex; align-items: center; justify-content: center;
    }
    .confirm-modal {
      background: var(--card-bg, #fff); border-radius: 16px; padding: 24px; width: 540px; max-width: 92vw;
      max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,.2);
    }
    .confirm-heading { display: flex; align-items: center; gap: 11px; margin-bottom: 16px; }
    .confirm-heading-icon { flex: 0 0 38px; width: 38px; height: 38px; display: grid; place-items: center; border-radius: 10px; background: #ffedd5; color: #F5820A; }
    .confirm-heading-icon mat-icon { width: 21px; height: 21px; font-size: 21px; }
    .confirm-title {
      font-size: 16px; font-weight: 700; color: var(--text-primary, #14213d); margin: 0;
    }
    .confirm-heading p { color: var(--text-secondary, #64748b); font-size: 12px; margin: 3px 0 0; }
    .confirm-body { margin-bottom: 20px; }
    .confirm-row {
      display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px 10px;
      border: 1px solid var(--border-light, #f1f5f9); border-radius: 7px; margin-bottom: 4px; font-size: 13px;
    }
    .confirm-row > span { color: var(--text-secondary, #64748b); }
    .confirm-row strong { color: var(--text-primary, #14213d); text-align: right; overflow-wrap: anywhere; }
    .confirm-label { display: inline-flex; align-items: center; gap: 7px; }
    .confirm-label mat-icon { flex: 0 0 auto; width: 17px; height: 17px; font-size: 17px; color: #94a3b8; }
    .confirm-row.highlight-row { background: #f97316; border-color: #f97316; padding: 12px; border-radius: 9px; margin: 8px 0; }
    .confirm-row.highlight-row .confirm-label, .confirm-row.highlight-row strong { color: #fff; }
    .confirm-row.highlight-row .confirm-label mat-icon { color: #ffedd5; }
    .confirm-row.highlight-row strong { font-size: 21px; }
    .confirm-row.accent-row { background: #ecfdf5; border-color: #bbf7d0; padding: 9px 10px; margin: 6px 0; }
    .confirm-row.accent-row strong { color: #16a34a; font-size: 16px; }
    .confirm-actions { display: flex; gap: 10px; justify-content: flex-end; position: sticky; bottom: -24px; padding: 12px 0 0; background: var(--card-bg, #fff); }

    /* ===== RESULT ===== */
    .result-card { text-align: center; }
    .result-icon { margin-bottom: 12px; }
    .result-title { font-size: 20px; font-weight: 700; color: #16a34a; margin: 0 0 20px; }
    .result-grid {
      display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px; text-align: left;
    }
    .result-item { background: var(--hover-bg, #f8fafc); border-radius: 10px; padding: 14px; }
    .result-item.full-width { grid-column: 1 / -1; }
    .result-label {
      display: block; font-size: 11px; font-weight: 600; color: var(--text-muted, #94a3b8);
      text-transform: uppercase; letter-spacing: .04em; margin-bottom: 4px;
    }
    .result-value { font-size: 16px; font-weight: 700; color: var(--text-primary, #14213d); }
    .result-value.big { font-size: 22px; color: #F5820A; }
    .result-value.accent { color: #16a34a; }
    .entrega-item { background: #ecfdf5 !important; border: 1px solid #a7f3d0; }
    .result-footnote { font-size: 11px; color: var(--text-muted, #94a3b8); font-style: italic; padding: 8px 14px; }
    .result-value.sm { font-size: 13px; }
    .result-value.cuf { font-size: 11px; word-break: break-all; font-family: monospace; font-weight: 500; }
    .factura-section { margin-top: 16px; padding-top: 16px; border-top: 1px dashed var(--border, #cbd5e1); }
    .factura-header {
      font-size: 13px; font-weight: 700; color: var(--text-primary, #14213d); text-transform: uppercase;
      letter-spacing: .05em; margin-bottom: 12px;
    }

    /* ===== SPINNER ===== */
    .spinner {
      width: 28px; height: 28px; border: 3px solid var(--border, #e5e7eb); border-top-color: #F5820A;
      border-radius: 50%; animation: spin .7s linear infinite;
    }
    .spinner.sm { width: 16px; height: 16px; border-width: 2px; }
    .spinner.white { border-color: rgba(255,255,255,.3); border-top-color: #fff; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ===== PDF POPUP ===== */
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

    /* ===== RECEIPT (print only) ===== */
    .receipt-header, .receipt-footer { display: none; }

    @media (max-width: 1000px) {
      .fee-children { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    /* ===== MOBILE ===== */
    @media (max-width: 700px) {
      .uif-highlights { grid-template-columns: 1fr; }
      .form-row.two > *, .form-row.three > * { flex-basis: 100%; min-width: 100%; }
      .form-row .cel-col { flex-wrap: wrap; }
      .form-row .cel-col > .mat-mdc-form-field { min-width: calc(100% - 125px); }
      .result-grid, .comision-grid { grid-template-columns: 1fr 1fr; }
      .fee-children { grid-template-columns: 1fr 1fr; }
      .transfer-line { padding: 10px 12px; }
      .transfer-line-send > .comision-details { margin-left: 4px; padding-left: 9px; }
      .transfer-total { flex-wrap: wrap; }
      .transfer-equivalent { padding-left: 6px; }
      .form-section-title { align-items: flex-start; flex-wrap: wrap; }
      .form-section-title > span { flex-basis: 100%; margin-left: 31px; }
      .confirm-modal { width: 100%; padding: 18px; max-height: 94vh; }
      .confirm-row { align-items: flex-start; font-size: 12px; }
      .confirm-row strong { max-width: 58%; }
      .steps { display: none; }
      .header-strip { gap: 10px; }
    }

  `],
})
export class RemesaComponent implements OnInit, OnDestroy {
  readonly fondosErrorStateMatcher = new FondosErrorStateMatcher();
  readonly requiredValueErrorStateMatcher = new RequiredValueErrorStateMatcher();
  @ViewChildren(NgModel) private ngModelControls!: QueryList<NgModel>;
  private remesaSvc = inject(RemesaService);
  private cambioSvc = inject(CambioService);
  private cajeroSvc = inject(CajeroService);
  private sanitizer = inject(DomSanitizer);
  private auth = inject(AuthService);

  private calcTrigger$ = new Subject<void>();
  private calcSub?: Subscription;
  private snack = inject(MatSnackBar);

  loading = true;
  step: Step = 'cliente';
  destinos: DestinoInfo[] = [];
  cat: Catalogos = {
    tipos_documento: [], expediciones: [], monedas: [],
    sexos: [], estados_civiles: [], ocupaciones: [],
    actividades_economicas: [], paises: [], departamentos: [], ciudades: [],
    cargos: [],
    defaults: { id_pais: 26, id_departamento: 0 },
  };

  // Step 1: Cliente
  clienteDoc = { tipoDoc: 1, documento: '', expedicion: '0' };
  cliente: ClienteInfo = this.emptyCliente();
  clienteEncontrado: boolean | null = null;
  clienteBusquedaIntentada = false;
  buscandoCliente = false;
  showClienteForm = false;
  selectedDpto = '0';
  ciudadesFiltradas: any[] = [];
  showNitField = false;
  mismoNro = true;

  // Step 2: Destinatario
  destinatario = this.emptyDestinatario();
  destinatariosPrevios: DestinatarioInfo[] = [];
  destinatarioSeleccionado: DestinatarioInfo | null = null;
  destinatarioNuevo = false;
  showDestinatariosDialog = false;
  destinatarioBusqueda = '';

  get destinatariosFiltrados(): DestinatarioInfo[] {
    const q = this.destinatarioBusqueda.trim().toLowerCase();
    if (!q) return this.destinatariosPrevios;
    return this.destinatariosPrevios.filter(dp => [
      dp.nombres, dp.ape_pat, dp.ape_mat, dp.num_doc_identidad_d, dp.celular, dp.domicilio,
    ].some(value => String(value ?? '').toLowerCase().includes(q)));
  }

  // Pago Chile
  bancosChile: BancoChile[] = [];
  formasPagoChile: FormaPagoChile[] = [];
  formaPagoChile = 1;
  bancoChile = '0';
  cuentaDestinoChile = '';

  // Step 3: Operación
  monedaEnvio = '0';
  selectedDestino = '0';
  montoEnvio = 0;
  tipoComision = '0';
  comisionesPreferenciales: ComisionPreferencial[] = [];
  comisionResult: ComisionResult | null = null;
  calculando = false;
  origen = '';
  destinoPcc = '';
  modoMonto: 'directo' | 'equiv_clp' | 'equiv_usd' = 'directo';
  incluirComision = 0;

  // Compra USD
  compraUsd = false;
  compraConNit = false;
  nitCompra = '';
  tcOficialVenta = 0;

  // UIF
  uifResult: UifRemesaResponse | null = null;
  verificandoUif = false;
  requierePcc08 = false;
  requiereFormulario = false;
  esUsuarioHabitual = false;
  ddIncompleta = false;
  ddBloqueado = false;
  pcc08 = this.emptyPcc08();
  complemento: ComplementoData = this.emptyComplemento();
  showComplementoSection = false;
  expAnios = 0;
  expMeses = 0;
  expSecAnios = 0;
  expSecMeses = 0;
  expConAnios = 0;
  expConMeses = 0;

  // Cobro (Bolivia)
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

  // Cotización
  codigoCotizacion = '';
  buscandoCotizacion = false;
  generandoCotizacion = false;
  cotizacionAplicada: { id: number; codigo: string; valido_hasta: string } | null = null;

  // General
  showConfirmDialog = false;
  registrando = false;

  /**
   * Identificador de idempotencia de la remesa en curso.
   *
   * Se genera UNA vez por remesa y se reutiliza en cada reintento. Antes se
   * generaba un uuid nuevo en cada click de "Confirmar", lo que anulaba el
   * replay del backend (`CajeroRemesaService::registrarRemesa()` consulta
   * `pos_operacion_log` por uuid): si la petición se procesaba pero la respuesta
   * se perdía, reintentar emitía una SEGUNDA remesa real, con doble factura y
   * doble asiento. Se limpia solo en `nuevaRemesa()`.
   */
  private remesaUuid: string | null = null;

  private uuidRemesa(): string {
    if (this.remesaUuid) return this.remesaUuid;

    // `crypto.randomUUID` exige contexto seguro (HTTPS o localhost); si el POS se
    // sirve por HTTP en red interna no existe, así que hay fallback.
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      this.remesaUuid = crypto.randomUUID();
    } else {
      this.remesaUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }

    return this.remesaUuid;
  }
  resultado: RemesaResponse | null = null;

  // PDF Popup
  showPdfPopup = false;
  pdfPopupUrl: SafeResourceUrl | null = null;
  pdfPopupTitulo = '';
  pdfPopupLoading = false;
  private pdfBlobUrl: string | null = null;

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

  private readonly frecuentOcupaciones = ['COMERCIANTE', 'EMPLEADO', 'AMA DE CASA', 'CHOFER'];

  get stepIndex(): number {
    return ['cliente', 'destinatario', 'operacion', 'resultado'].indexOf(this.step);
  }

  get monedaAbr(): string {
    const m: Record<string, string> = { '1': 'USD', '2': 'BOB', '3': 'CLP' };
    return m[this.monedaEnvio] || '';
  }

  get isExtranjero(): boolean {
    return +this.cliente.id_pais !== 26;
  }

  get tieneNit(): boolean {
    return (this.cliente.nit ?? '').trim().length > 0;
  }

  get clienteReady(): boolean {
    return this.camposFaltantesCliente.length === 0;
  }

  /** Los errores se muestran cuando se está completando un cliente nuevo o incompleto. */
  get mostrarErroresCliente(): boolean {
    return this.showClienteForm && this.clienteEncontrado !== null;
  }

  clienteCampoInvalido(value: unknown, numeric = false): boolean {
    if (!this.mostrarErroresCliente) return false;
    if (numeric) return Number(value ?? 0) <= 0;
    return value === null || value === undefined || String(value).trim().length === 0;
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
      if (+this.clienteDoc.expedicion === 0) f.push('Expedición');
      if (!this.cliente.domicilio?.trim()) f.push('Domicilio');
      if (+this.cliente.id_actividad_economica <= 0) f.push('Actividad Económica');
      if (+this.cliente.id_ciudad <= 0) f.push('Ciudad');
    }
    return f;
  }

  get destinatarioReady(): boolean {
    if (!this.destinatario.nombres || !this.destinatario.ape_pat) return false;
    if (this.formaPagoChile === 2 && (!this.bancoChile || this.bancoChile === '0' || !this.cuentaDestinoChile.trim())) return false;
    return true;
  }

  get montoLabel(): string {
    if (this.modoMonto === 'equiv_clp') return 'Monto Equivalente en CLP';
    if (this.modoMonto === 'equiv_usd') return 'Monto Equivalente en USD';
    return `Monto a Enviar (${this.monedaAbr || '...'})`;
  }

  get montoPlaceholder(): string {
    if (this.modoMonto === 'equiv_clp') return 'Ej: 1000000';
    if (this.modoMonto === 'equiv_usd') return 'Ej: 100.00';
    return '0.00';
  }

  get showApellidoCasada(): boolean {
    if (+this.cliente.id_sexo !== 2) return false;
    const estado = this.cat.estados_civiles.find(e => +e['id_estado_civil'] === +this.cliente.id_estado_civil);
    const desc = (estado?.['descripcion'] || '').toUpperCase();
    return desc.includes('CASAD') || desc.includes('VIUD');
  }

  get showActividadSecundaria(): boolean {
    return +this.complemento.c_actividad_secundaria_id > 0;
  }

  get showConyugeFields(): boolean {
    const estado = this.cat.estados_civiles.find(e => +e['id_estado_civil'] === +this.cliente.id_estado_civil);
    const desc = (estado?.['descripcion'] || '').toUpperCase();
    return desc.includes('CASAD') || desc.includes('UNION') || desc.includes('UNIÓN');
  }

  get canCalculate(): boolean {
    return this.monedaEnvio !== '0' && this.selectedDestino !== '0' && this.montoEnvio > 0;
  }

  get canRegister(): boolean {
    if (this.ddBloqueado) return false;
    if (!this.comisionResult || this.origen.length < 5 || this.destinoPcc.length < 5) return false;
    if (this.requiereFormulario && !this.isComplementoValid) return false;
    if (this.requierePcc08 && this.pcc08.dinero_si === 0) {
      if (!this.pcc08.nombres_dd) return false;
      if (!this.pcc08.doc_nit_dd) return false;
      if (!this.pcc08.domicilio_dd) return false;
      if (!this.pcc08.telefono_dd) return false;
    }
    return true;
  }

  get isComplementoValid(): boolean {
    if (+this.complemento.c_pais_residencia_id <= 0) return false;
    if (!this.complemento.c_ciudad_residencia.trim()) return false;
    if (+this.complemento.c_ingresos <= 0 || !this.complemento.c_fecha_ingreso) return false;
    if (this.complemento.c_dependiente_estado_anterior === 'S' &&
        (!this.complemento.c_entidad_trabajo_anterior.trim() || +this.complemento.c_cargo_trabajo_anterior_id <= 0 ||
         !this.complemento.c_fecha_inicio_trabajo_anterior || !this.complemento.c_fecha_fin_trabajo_anterior)) return false;
    if (this.complemento.c_dependiente_estado_actual === 'S' &&
        (!this.complemento.c_entidad_trabajo_actual.trim() || +this.complemento.c_cargo_trabajo_actual_id <= 0)) return false;
    if (this.showConyugeFields && (!this.complemento.c_nombres_conyugue.trim() || !this.complemento.c_apellido_paterno_conyugue.trim())) return false;
    return true;
  }

  onExpChange(): void {
    const years = Math.max(0, Math.floor(this.expAnios));
    const months = Math.max(0, Math.min(11, Math.floor(this.expMeses)));
    this.complemento.c_experiencia_trabajo = `${years} AÑOS ${months} MESES`;
    const date = new Date();
    date.setFullYear(date.getFullYear() - years);
    date.setMonth(date.getMonth() - months);
    this.complemento.c_fecha_ingreso = date.toISOString().slice(0, 10);
  }

  onExpSecChange(): void {
    const years = Math.max(0, Math.floor(this.expSecAnios));
    const months = Math.max(0, Math.min(11, Math.floor(this.expSecMeses)));
    this.complemento.c_experiencia_actividad_secundaria = `${years} AÑOS ${months} MESES`;
  }

  onExpConChange(): void {
    const years = Math.max(0, Math.floor(this.expConAnios));
    const months = Math.max(0, Math.min(11, Math.floor(this.expConMeses)));
    this.complemento.c_experiencia_trabajo_conyugue = `${years} AÑOS ${months} MESES`;
  }

  private prefillComplementoFromCliente(): void {
    this.complemento.c_pais_residencia_id = +this.cliente.id_pais || 26;
    const ciudad = this.cat.ciudades.find(c => +c['id_ciudad_pcc'] === +this.cliente.id_ciudad);
    if (ciudad) this.complemento.c_ciudad_residencia = ciudad['descripcion'] || '';
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

  ngOnInit(): void {
    forkJoin({
      destinos: this.remesaSvc.destinos(),
      catalogos: this.cambioSvc.catalogos(),
      preferenciales: this.remesaSvc.comisionesPreferenciales(),
      bancosChile: this.remesaSvc.bancosChile(),
      formasPagoChile: this.remesaSvc.formasPagoChile(),
      formasPagoCobro: this.remesaSvc.formasPagoCobro(),
      cuentasBancarias: this.cajeroSvc.cuentasBancariasCobro(),
    }).subscribe({
      next: ({ destinos, catalogos, preferenciales, bancosChile, formasPagoChile, formasPagoCobro, cuentasBancarias }) => {
        this.destinos = destinos;
        this.cat = catalogos;
        this.comisionesPreferenciales = preferenciales;
        this.bancosChile = bancosChile;
        this.formasPagoChile = formasPagoChile;
        this.formasPagoCobro = formasPagoCobro;
        this.cuentasBancarias = cuentasBancarias;
        this.loading = false;
      },
      error: (err) => {
        this.snack.open('Error al cargar datos: ' + err.message, 'OK', { duration: 5000 });
        this.loading = false;
      },
    });

    this.calcSub = this.calcTrigger$.pipe(debounceTime(600)).subscribe(() => {
      if (this.canCalculate) this.calcularComision();
    });
  }

  ngOnDestroy(): void {
    this.calcSub?.unsubscribe();
  }

  // ─── Step 1: Cliente ──────────────────────

  buscarCliente(): void {
    this.clienteBusquedaIntentada = true;
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
          this.showClienteForm = false;
          this.showNitField = !!(found.nit && found.nit !== '0' && found.nit.trim());
                this.sincronizarMismoNro();
                this.goToDestinatario();
        } else {
          this.cliente = this.emptyCliente();
          this.cliente.id_tipo_doc_identidad = +this.clienteDoc.tipoDoc;
          this.cliente.num_doc_identidad = doc;
          this.cliente.id_expedicion = exp;
          this.clienteEncontrado = false;
          this.showNitField = false;
          this.showClienteForm = true;
          this.mismoNro = true;
          this.marcarCamposClienteComoTocados();
          if (this.cat.defaults?.id_departamento) {
            this.selectedDpto = String(this.cat.defaults.id_departamento);
            this.filterCiudades();
          }
        }
      },
      error: () => {
        this.buscandoCliente = false;
        this.snack.open('Error al buscar cliente', 'OK', { duration: 3000 });
      },
    });
  }

  resetClienteSearch(): void {
    this.clienteEncontrado = null;
    this.clienteBusquedaIntentada = false;
    this.showClienteForm = false;
    this.mismoNro = true;
  }

  toggleClienteForm(): void {
    this.showClienteForm = !this.showClienteForm;
    if (this.showClienteForm) this.marcarCamposClienteComoTocados();
  }

  mostrarFormularioCliente(): void {
    this.showClienteForm = true;
    this.marcarCamposClienteComoTocados();
  }

  /** Igual que Giro Nacional: al mostrar los datos, marcar controles para que Material pinte los inválidos. */
  private marcarCamposClienteComoTocados(): void {
    setTimeout(() => this.ngModelControls?.forEach(control => control.control.markAsTouched()), 0);
  }

  toggleNit(): void {
    this.showNitField = !this.showNitField;
    if (!this.showNitField) {
      this.cliente.nit = '';
    }
  }

  filterCiudades(): void {
    const dpto = +this.selectedDpto;
    this.ciudadesFiltradas = dpto
      ? this.cat.ciudades.filter(c => +c['id_departamento'] === dpto)
      : this.cat.ciudades;
  }

  private replicarCelular(): void {
    this.cliente.tel_dom = this.cliente.celular ?? '';
    this.cliente.tel_trab = this.cliente.celular ?? '';
  }

  onClienteCelularChange(celular: string): void {
    this.cliente.celular = celular ?? '';
    if (this.mismoNro) this.replicarCelular();
  }

  toggleMismoNro(): void {
    this.mismoNro = !this.mismoNro;
    if (this.mismoNro) this.replicarCelular();
  }

  private sincronizarMismoNro(): void {
    const celular = this.cliente.celular ?? '';
    const telDom = this.cliente.tel_dom ?? '';
    const telTrab = this.cliente.tel_trab ?? '';
    this.mismoNro = (!telDom && !telTrab) || (telDom === celular && telTrab === celular);
  }

  onOcupacionChange(): void {
    const ocupId = +this.cliente.id_ocupacion;
    const actId = this.ocupacionToActividad[ocupId];
    if (actId !== undefined) {
      this.cliente.id_actividad_economica = actId;
    }
  }

  goToDestinatario(): void {
    this.cliente.id_tipo_doc_identidad = +this.clienteDoc.tipoDoc;
    this.cliente.num_doc_identidad = this.clienteDoc.documento.trim().toUpperCase();
    this.cliente.id_expedicion = +this.clienteDoc.expedicion;

    this.cambioSvc.actualizarCliente(this.cliente).subscribe({ error: () => {} });

    this.step = 'destinatario';

    this.remesaSvc.destinatariosPorRemitente(
      this.clienteDoc.documento.trim(),
      +this.clienteDoc.tipoDoc,
      +this.clienteDoc.expedicion
    ).subscribe({
      next: (list) => { this.destinatariosPrevios = list; },
      error: () => { this.destinatariosPrevios = []; },
    });
  }

  // ─── Step 2: Destinatario ──────────────────

  abrirDestinatariosDialog(): void {
    this.destinatarioBusqueda = '';
    this.showDestinatariosDialog = true;
  }

  cerrarDestinatariosDialog(): void {
    this.showDestinatariosDialog = false;
  }

  seleccionarDestinatarioPrevio(dp: DestinatarioInfo): void {
    this.showDestinatariosDialog = false;
    this.destinatarioSeleccionado = dp;
    this.destinatarioNuevo = false;
    this.destinatario = {
      id_destinatario: dp.id_destinatario,
      nombres: dp.nombres,
      ape_pat: dp.ape_pat,
      ape_mat: dp.ape_mat,
      id_tipo_doc_identidad_d: dp.id_tipo_doc_identidad_d,
      num_doc_identidad_d: dp.num_doc_identidad_d,
      id_expedicion_d: dp.id_expedicion_d,
      domicilio: dp.domicilio,
      tel_dom: dp.tel_dom,
      tel_trab: dp.tel_trab,
      celular: dp.celular,
      cuenta: dp.cuenta,
      email: (dp as any).email || '',
      id_banco_chile: dp.id_banco_chile ?? null,
    };
    if (dp.id_banco_chile) {
      this.bancoChile = String(dp.id_banco_chile);
      this.formaPagoChile = 2;
      this.cuentaDestinoChile = dp.cuenta || '';
    } else {
      this.bancoChile = '0';
      this.cuentaDestinoChile = '';
    }
  }

  nuevoDestinatario(): void {
    this.showDestinatariosDialog = false;
    this.destinatarioSeleccionado = null;
    this.destinatarioNuevo = true;
    this.destinatario = this.emptyDestinatario();
  }

  goToOperacion(): void {
    this.step = 'operacion';
    this.comisionResult = null;
  }

  // ─── Step 3: Operación ──────────────────

  onMonedaChange(): void {
    this.comisionResult = null;
    this.uifResult = null;
    this.requierePcc08 = false;
    this.requiereFormulario = false;
    this.compraUsd = false;
    this.compraConNit = false;
    this.nitCompra = this.cliente.nit || '';
    // Envíos en BOB se cotizan por defecto con la comisión incluida.
    // El cajero todavía puede cambiarlo manualmente si corresponde.
    this.incluirComision = this.monedaEnvio === '2' ? 1 : 0;
    if (this.monedaEnvio === '1' && this.modoMonto === 'equiv_usd') {
      this.modoMonto = 'directo';
    }
    if (this.monedaEnvio === '1' && this.tcOficialVenta === 0) {
      this.remesaSvc.tcOficialVenta().subscribe(r => this.tcOficialVenta = r.tc_oficial_venta);
    }
    this.triggerAutoCalc();
  }

  onModoMontoChange(): void {
    this.comisionResult = null;
    this.uifResult = null;
    this.requierePcc08 = false;
    this.requiereFormulario = false;
    this.montoEnvio = 0;
  }

  onMontoChange(): void {
    this.comisionResult = null;
    this.triggerAutoCalc();
  }

  onDestinoChange(): void {
    this.comisionResult = null;
    this.triggerAutoCalc();
  }

  onTipoComisionChange(): void {
    this.comisionResult = null;
    this.triggerAutoCalc();
  }

  onIncluirComisionChange(): void {
    this.comisionResult = null;
    this.triggerAutoCalc();
  }

  private triggerAutoCalc(): void {
    this.calcTrigger$.next();
  }

  calcularComision(): void {
    if (!this.canCalculate) return;
    this.calculando = true;
    this.comisionResult = null;

    if (this.modoMonto === 'directo') {
      this.enviarCalculo(this.montoEnvio);
      return;
    }

    this.remesaSvc.cotizacionChile(+this.selectedDestino).subscribe({
      next: (cot) => {
        if (!cot.success || !cot.valor) {
          this.calculando = false;
          this.snack.open('No se pudo obtener cotización Chile', 'OK', { duration: 5000 });
          return;
        }
        const moneda = +this.monedaEnvio;

        if (moneda === 2) {
          this.resolverEquivalenteBob(cot.valor);
          return;
        }

        let montoReal = this.montoEnvio;
        if (this.modoMonto === 'equiv_clp' && moneda === 1) {
          montoReal = Math.round((this.montoEnvio / cot.valor) * 100) / 100;
        }
        this.enviarCalculo(montoReal);
      },
      error: (err) => {
        this.calculando = false;
        this.snack.open(err.message || 'Error al obtener cotización', 'OK', { duration: 5000 });
      },
    });
  }

  private resolverEquivalenteBob(tcClpUsd: number): void {
    this.remesaSvc.calcularComision({
      tipo_comision: +this.tipoComision,
      id_moneda: 2,
      id_operacion: 16,
      monto: 1000,
      id_destino: +this.selectedDestino,
      incluir_comision: this.incluirComision,
    }).subscribe({
      next: (probe) => {
        if (probe.error || !probe.equivalente_usd) {
          this.calculando = false;
          this.snack.open(probe.error || 'Error obteniendo tipo de cambio', 'OK', { duration: 5000 });
          return;
        }
        const tcBobUsd = 1000 / probe.equivalente_usd;
        let targetUsd: number;
        if (this.modoMonto === 'equiv_clp') {
          targetUsd = this.montoEnvio / tcClpUsd;
        } else {
          targetUsd = this.montoEnvio;
        }
        const realBob = Math.round(targetUsd * tcBobUsd * 100) / 100;
        this.enviarCalculo(realBob);
      },
      error: (err) => {
        this.calculando = false;
        this.snack.open(err.message || 'Error al obtener tipo de cambio', 'OK', { duration: 5000 });
      },
    });
  }

  private enviarCalculo(monto: number): void {
    this.remesaSvc.calcularComision({
      tipo_comision: +this.tipoComision,
      id_moneda: +this.monedaEnvio,
      id_operacion: 16,
      monto,
      id_destino: +this.selectedDestino,
      incluir_comision: this.incluirComision,
    }).subscribe({
      next: (r) => {
        this.calculando = false;
        if (r.error) {
          this.snack.open(r.error, 'OK', { duration: 5000 });
        } else {
          const totalAnterior = this.comisionResult?.bob.total_operacion ?? 0;
          this.comisionResult = r;
          if (this.metodosPago.length === 1 &&
              (!this.metodosPago[0].monto || Math.abs(this.metodosPago[0].monto - totalAnterior) <= 0.01)) {
            this.metodosPago[0].monto = r.bob.total_operacion;
          }
          this.checkUif(r.monto_enviado_x);
        }
      },
      error: (err) => {
        this.calculando = false;
        this.snack.open(err.message || 'Error al calcular comisión', 'OK', { duration: 5000 });
      },
    });
  }

  abrirConfirmDialog(): void {
    if (this.comisionResult && this.metodosPago.length === 1) {
      this.metodosPago[0].monto = this.comisionResult.bob.total_operacion;
    }
    const errorCobro = this.validarFormaCobro();
    if (errorCobro) {
      Swal.fire({ icon: 'warning', title: 'Revisá la Forma de Cobro', html: errorCobro, confirmButtonColor: '#F58634' });
      return;
    }
    this.showConfirmDialog = true;
  }

  private validarFormaCobro(): string | null {
    const total = Math.round((+(this.comisionResult?.bob.total_operacion ?? 0)) * 100) / 100;
    const metodos = this.metodosPago.map(m => ({ forma: +m.id_forma_pago, monto: +(m.monto || 0) }));
    const suma = Math.round(metodos.reduce((acc, m) => acc + m.monto, 0) * 100) / 100;
    const soloEfectivo = metodos.length > 0 && metodos.every(m => m.forma === 1);
    const bs = (monto: number) => `Bs ${monto.toFixed(2)}`;
    if (soloEfectivo) return suma >= total ? null : `El efectivo ingresado (<b>${bs(suma)}</b>) no cubre el total (<b>${bs(total)}</b>).`;
    if (suma === total) return null;
    const diferencia = Math.round((suma - total) * 100) / 100;
    const descripcion = diferencia > 0 ? `${bs(diferencia)} de más` : `Faltan ${bs(-diferencia)}`;
    return `La suma de los métodos debe coincidir exactamente con el total de <b>${bs(total)}</b>. ${descripcion}.`;
  }

  generarCotizacion(): void {
    if (!this.comisionResult) return;
    this.generandoCotizacion = true;
    this.remesaSvc.crearCotizacion({
      id_moneda: +this.monedaEnvio,
      id_destino: +this.selectedDestino,
      monto: this.montoEnvio,
      tipo_comision: +this.tipoComision,
      incluir_comision: this.incluirComision,
      snapshot: this.comisionResult,
    }).subscribe({
      next: (res) => {
        this.generandoCotizacion = false;
        this.snack.open(`Cotización generada: ${res.codigo} — Válida hasta ${res.valido_hasta}`, 'OK', { duration: 8000 });
      },
      error: (err) => {
        this.generandoCotizacion = false;
        this.snack.open(err.message || 'Error al generar cotización', 'OK', { duration: 5000 });
      },
    });
  }

  buscarCotizacion(): void {
    const codigo = this.codigoCotizacion.trim();
    if (!codigo) return;
    this.buscandoCotizacion = true;
    this.remesaSvc.buscarCotizacion(codigo).subscribe({
      next: (cot) => {
        this.buscandoCotizacion = false;
        const totalAnterior = this.comisionResult?.bob.total_operacion ?? 0;
        this.monedaEnvio = String(cot.id_moneda);
        this.selectedDestino = String(cot.id_destino);
        this.montoEnvio = cot.monto;
        this.tipoComision = String(cot.tipo_comision);
        this.incluirComision = cot.incluir_comision;
        this.comisionResult = cot.snapshot;
        if (this.metodosPago.length === 1 &&
            (!this.metodosPago[0].monto || Math.abs(this.metodosPago[0].monto - totalAnterior) <= 0.01)) {
          this.metodosPago[0].monto = cot.snapshot.bob.total_operacion;
        }
        this.cotizacionAplicada = { id: cot.id, codigo: cot.codigo, valido_hasta: cot.valido_hasta };
        this.snack.open(`Cotización ${cot.codigo} aplicada.`, 'OK', { duration: 4000 });
      },
      error: (err) => {
        this.buscandoCotizacion = false;
        this.snack.open(err.message || 'Cotización no válida', 'OK', { duration: 5000 });
      },
    });
  }

  confirmarRegistro(): void {
    if (!this.comisionResult) return;
    this.registrando = true;

    const uuid = this.uuidRemesa();

    const montoReal = this.comisionResult.monto_enviado_x;
    const montoRealBob = this.comisionResult.monto_enviado_bob;

    const dest = {
      ...this.destinatario,
      id_banco_chile: this.formaPagoChile === 2 ? +this.bancoChile : null,
      cuenta: this.formaPagoChile === 2 ? this.cuentaDestinoChile.trim() : (this.destinatario.cuenta || ''),
    };

    this.remesaSvc.registrarRemesa({
      id_operacion: 16,
      cliente: this.cliente,
      destinatario: dest,
      operacion: {
        mon_rec: +this.monedaEnvio,
        mon_ent: +this.monedaEnvio,
        monto: montoReal,
        tipo_cambio: 1,
        total_cambio: montoReal,
        id_destino: +this.selectedDestino,
        tipo_cambio_clp: this.comisionResult.tipo_cambio_clp || 0,
        total_clp: this.comisionResult.total_clp || 0,
        origen: this.origen,
        destino_pcc: this.destinoPcc,
        dinero_si: this.requierePcc08 ? this.pcc08.dinero_si : 1,
        select_per: this.requierePcc08 && this.pcc08.dinero_si === 0 ? this.pcc08.select_per : 0,
        nombres_dd: this.pcc08.nombres_dd,
        doc_nit_dd: this.pcc08.doc_nit_dd,
        domicilio_dd: this.pcc08.domicilio_dd,
        telefono_dd: this.pcc08.telefono_dd,
        zona_dd: this.pcc08.zona_dd,
        impresion_pcc08: this.requierePcc08 ? 'S' : 'N',
        pago_comision: this.incluirComision,
        // Necesario para que el servidor recalcule la comisión con la MISMA tarifa
        // con la que se mostró al cajero (se envía igual a /calcular-comision).
        tipo_comision: +this.tipoComision,
        monto_bob: montoRealBob,
        compra_usd: this.compraUsd && this.monedaEnvio === '1',
        nit_compra: this.compraUsd && this.compraConNit && this.nitCompra.trim() ? this.nitCompra.trim() : '',
        metodos_pago: this.metodosPago.map(m => ({
          id_forma_pago: m.id_forma_pago,
          monto: m.monto,
          referencia: m.referencia,
          observaciones: '',
          num_cuenta_bancaria: m.num_cuenta_bancaria || null,
          id_entidad_financiera: m.id_entidad_financiera || null,
          id_agencia: m.id_agencia || null,
          id_moneda_cuenta: m.id_moneda_cuenta || null,
          id_tipo_cuenta_bancaria: m.id_tipo_cuenta_bancaria || null,
        })),
        id_forma_pago_chile: this.formaPagoChile,
      },
      comision: this.comisionResult,
      complemento: this.requiereFormulario ? this.complemento : undefined,
      id_cotizacion: this.cotizacionAplicada?.id || null,
      uuid,
    }).subscribe({
      next: (res) => {
        this.registrando = false;
        this.showConfirmDialog = false;
        this.resultado = res;
        this.step = 'resultado';
        Swal.fire({ icon: 'success', title: 'Remesa registrada', text: 'La remesa se registró correctamente', confirmButtonColor: '#F58634' });
      },
      error: (err) => {
        this.registrando = false;
        this.showConfirmDialog = false;
        const msg = err.message || 'Error al registrar la remesa';
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

  // ─── UIF ──────────────────────

  checkUif(montoReal: number): void {
    this.verificandoUif = true;
    this.uifResult = null;

    this.remesaSvc.verificarUif({
      id_moneda: +this.monedaEnvio,
      monto: montoReal,
      documento: this.clienteDoc.documento,
      tipo_doc: +this.clienteDoc.tipoDoc,
      expedicion: +this.clienteDoc.expedicion,
    }).subscribe({
      next: (res) => {
        this.verificandoUif = false;
        this.uifResult = res;
        this.requierePcc08 = res.requiere_pcc08;
        this.requiereFormulario = res.requiere_formulario;
        this.esUsuarioHabitual = res.usuario_habitual ?? false;
        this.ddIncompleta = res.dd_incompleta ?? false;
        this.ddBloqueado = res.dd_bloqueado ?? false;
        if (this.requiereFormulario) {
          this.showComplementoSection = true;
          this.prefillComplementoFromCliente();
        }
      },
      error: () => {
        this.verificandoUif = false;
      },
    });
  }

  // ─── Helpers ──────────────────

  getDestinoLabel(): string {
    const d = this.destinos.find(x => x.id_destino === +this.selectedDestino);
    return d?.descripcion || '';
  }

  get totalMetodosPago(): number {
    return this.metodosPago.reduce((s, m) => s + (m.monto || 0), 0);
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

  getBancoChileLabel(): string {
    const b = this.bancosChile.find(x => x.id === +this.bancoChile);
    return b ? b.nombre : '';
  }

  onFormaPagoChileChange(): void {
    if (this.formaPagoChile !== 2) {
      this.bancoChile = '0';
      this.cuentaDestinoChile = '';
    }
  }

  nuevaRemesa(): void {
    this.step = 'cliente';
    this.remesaUuid = null;
    this.clienteDoc = { tipoDoc: 1, documento: '', expedicion: '0' };
    this.cliente = this.emptyCliente();
    this.clienteEncontrado = null;
    this.showClienteForm = false;
    this.selectedDpto = '0';
    this.ciudadesFiltradas = [];
    this.destinatario = this.emptyDestinatario();
    this.destinatariosPrevios = [];
    this.destinatarioSeleccionado = null;
    this.destinatarioNuevo = false;
    this.showDestinatariosDialog = false;
    this.destinatarioBusqueda = '';
    this.monedaEnvio = '0';
    this.selectedDestino = '0';
    this.montoEnvio = 0;
    this.tipoComision = '0';
    this.comisionResult = null;
    this.origen = '';
    this.destinoPcc = '';
    this.modoMonto = 'directo';
    this.incluirComision = 0;
    this.uifResult = null;
    this.verificandoUif = false;
    this.requierePcc08 = false;
    this.requiereFormulario = false;
    this.esUsuarioHabitual = false;
    this.ddIncompleta = false;
    this.ddBloqueado = false;
    this.pcc08 = this.emptyPcc08();
    this.complemento = this.emptyComplemento();
    this.showComplementoSection = false;
    this.expAnios = this.expMeses = this.expSecAnios = this.expSecMeses = this.expConAnios = this.expConMeses = 0;
    this.compraUsd = false;
    this.compraConNit = false;
    this.nitCompra = '';
    this.formaPagoChile = 1;
    this.bancoChile = '0';
    this.cuentaDestinoChile = '';
    this.metodosPago = [this.emptyMetodoPago()];
    this.codigoCotizacion = '';
    this.cotizacionAplicada = null;
    this.generandoCotizacion = false;
    this.buscandoCotizacion = false;
    this.resultado = null;
    this.showConfirmDialog = false;
    this.registrando = false;
  }

  abrirPdfPopup(tipo: 'comprobante' | 'factura'): void {
    if (!this.resultado) return;
    this.pdfPopupTitulo = tipo === 'comprobante' ? 'Comprobante de Envío' : 'Factura de Comisión';
    this.pdfPopupLoading = true;
    this.pdfPopupUrl = null;
    this.showPdfPopup = true;

    const obs = tipo === 'comprobante'
      ? this.remesaSvc.descargarComprobantePdf(this.resultado.id_remesa)
      : this.remesaSvc.descargarFacturaPdf(this.resultado.id_remesa);

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
        this.snack.open(`Error al generar ${tipo === 'comprobante' ? 'el comprobante' : 'la factura'} PDF`, 'Cerrar', { duration: 3000 });
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

  private emptyCliente(): ClienteInfo {
    const defaults = this.cat?.defaults;
    return {
      id_tipo_doc_identidad: 1, num_doc_identidad: '', id_expedicion: 0,
      nombres: '', ape_pat: '', ape_mat: '', id_sexo: 1,
      fecha_nacimiento: '', id_pais: defaults?.id_pais || 26, lugar_nacimiento: '',
      id_estado_civil: 1, id_ocupacion: 1, id_actividad_economica: 1,
      id_ciudad: 1, zona: '', domicilio: '', tel_dom: '', tel_trab: '',
      celular: '', e_trabajo: '', e_cargo: '', e_direccion: '', nit: '', email: '',
    };
  }

  private emptyDestinatario(): any {
    return {
      id_destinatario: 0, nombres: '', ape_pat: '', ape_mat: '',
      id_tipo_doc_identidad_d: 1, num_doc_identidad_d: '', id_expedicion_d: 0,
      domicilio: '', tel_dom: '', tel_trab: '', celular: '', cuenta: '', email: '',
      id_banco_chile: null,
    };
  }

  private emptyPcc08() {
    return {
      dinero_si: 1,
      select_per: 1,
      nombres_dd: '',
      doc_nit_dd: '',
      domicilio_dd: '',
      telefono_dd: '',
      zona_dd: '',
    };
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
}
