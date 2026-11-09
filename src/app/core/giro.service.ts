import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Envelope } from './models';

export interface AgenciaDestino {
  id_agencia: number;
  cod_agencia: string;
  descripcion: string;
}

export interface DestinatarioGiro {
  id_destinatario: number;
  nombres: string;
  ape_pat: string;
  ape_mat: string;
  id_tipo_doc_identidad_d: number;
  num_doc_identidad_d: string;
  id_expedicion_d: number;
  domicilio: string;
  celular: string;
  tel_dom: string;
}

export interface ComisionGiroResult {
  comision: number;
  comision_bob: number;
  itf: number;
  itf_bob: number;
  iva_bob: number;
  it_bob: number;
  total: number;
  total_bob: number;
  total_cambio: number;
  tipo_cambio: number;
  moneda: number;
  moneda_entrega?: number;
  monto: number;
}

export interface UifGiroResponse {
  bolivianizado: number;
  tipo_cambio_oficial: number;
  requiere_formulario: boolean;
  requiere_pcc08: boolean;
  operaciones_previas: {
    cantidad: number;
    total_bolivianizado: number;
    dias_ventana: number;
  };
  umbrales: {
    formulario_unica: number;
    pcc08_unica: number;
    formulario_multiples: number;
    pcc08_multiples: number;
  };
  alertas: { tipo: string; nivel: string; mensaje: string; detalle: string }[];
  usuario_habitual?: boolean;
  senales_alerta?: { codigo: string; mensaje: string; nivel: string }[];
  dd_incompleta?: boolean;
  dd_bloqueado?: boolean;
}

export interface GiroResponse {
  id_giro: number;
  codigo: number;
  correlativo_agencia: number;
  correlativo_destino: number;
  moneda: string;
  moneda_entrega?: string;
  mon_rec: number;
  mon_ent?: number;
  monto: number;
  comision: number;
  comision_bob: number;
  itf: number;
  itf_bob: number;
  total: number;
  total_bob: number;
  total_cambio: number;
  tipo_cambio: number;
  fecha: string;
  agencia_origen: string;
  agencia_destino: string;
  cliente_nombre: string;
  destinatario_nombre: string;
  pago_comision: number;
  factura: any;
  cod_agencia: string;
  login_usuario: string;
}

export interface GiroBusqueda {
  id_giro: number;
  codigo: number;
  estado: number;
  estadoDesc: string;
  monto: number;
  comision: number;
  comision_bob: number;
  itf: number;
  total: number;
  total_bob: number;
  total_cambio: number;
  tipo_cambio: number;
  moneda: string;
  moneda_entrega?: string;
  mon_rec: number;
  remitente: string;
  remitente_doc: string;
  destinatario: string;
  destinatario_doc: string;
  destinatario_celular: string;
  id_agencia_origen: number;
  id_agencia_destino: number;
  agencia_origen: string;
  agencia_destino: string;
  fecha: string;
  cuenta_bancaria: number;
}

export interface EntidadFinanciera {
  id: number;
  nombre: string;
  nombre_corto: string;
}

export interface GiroPendiente {
  id: number;
  codigo: number;
  remitente: string;
  destinatario: string;
  destinatario_doc: string;
  moneda: string;
  monto: number;
  totalBob: number;
  agencia_origen: string;
  agencia_destino: string;
  fecha: string;
  cuenta_bancaria: number;
  formaPagoDesc: string;
  entidad_financiera?: string | null;
  numero_cuenta?: string | null;
}

export interface HistorialGiroRecord {
  id: number;
  codigo: number;
  correlativo: string;
  remitente: string;
  destinatario: string;
  agencia_origen: string;
  agencia_destino: string;
  moneda: string;
  monto: number;
  comision: number;
  comisionBob: number;
  total: number;
  totalBob: number;
  fecha: string;
  estado: number;
  estadoDesc: string;
  cuenta_bancaria: number;
  cuentaBancaria: number;
  formaPagoDesc: string;
  bancoCuenta: string | null;
  bancoNombre: string | null;
}

@Injectable({ providedIn: 'root' })
export class GiroService {
  private http = inject(HttpClient);
  private base = `${environment.apiBase}/cajero`;

  private unwrap<T>(o: Observable<Envelope<T>>): Observable<T> {
    return o.pipe(
      catchError(err => throwError(() => new Error(err.error?.message || err.message || 'Error de conexión'))),
      map(r => {
        if (!r || !r.success) throw new Error(r?.message ?? 'Error de la API');
        return r.data;
      }),
    );
  }

  agenciasDestino(): Observable<AgenciaDestino[]> {
    return this.unwrap(this.http.get<Envelope<AgenciaDestino[]>>(`${this.base}/agencias-destino`));
  }

  entidadesFinancieras(): Observable<EntidadFinanciera[]> {
    return this.unwrap(this.http.get<Envelope<EntidadFinanciera[]>>(`${this.base}/entidades-financieras`));
  }

  destinatariosPorRemitente(documento: string, tipoDoc: number, expedicion: number): Observable<DestinatarioGiro[]> {
    const params = new HttpParams()
      .set('documento', documento)
      .set('tipo_doc', tipoDoc.toString())
      .set('expedicion', expedicion.toString());
    return this.unwrap(this.http.get<Envelope<DestinatarioGiro[]>>(`${this.base}/destinatarios-giro`, { params }));
  }

  buscarBeneficiarioFinal(documento: string): Observable<any | null> {
    const params = new HttpParams().set('documento', documento.trim());
    return this.unwrap(this.http.get<Envelope<any | null>>(`${this.base}/beneficiario-final`, { params }));
  }

  verificarUif(data: {
    id_moneda: number;
    monto: number;
    documento: string;
    tipo_doc: number;
    expedicion: number;
  }): Observable<UifGiroResponse> {
    return this.unwrap(this.http.post<Envelope<UifGiroResponse>>(`${this.base}/verificar-uif-giro`, data));
  }

  calcularComision(data: {
    id_moneda: number;
    id_moneda_entrega?: number;
    monto: number;
    incluir_comision?: number;
  }): Observable<ComisionGiroResult> {
    return this.unwrap(this.http.post<Envelope<ComisionGiroResult>>(`${this.base}/calcular-comision-giro`, data));
  }

  registrarGiro(body: {
    cliente: any;
    destinatario: any;
    operacion: any;
    comision: ComisionGiroResult;
    uuid: string;
  }): Observable<GiroResponse> {
    return this.unwrap(this.http.post<Envelope<GiroResponse>>(`${this.base}/registrar-giro`, body));
  }

  pagarGiro(body: {
    codigo: number;
    destinatario_doc: any;
    uuid: string;
  }): Observable<{ id_giro: number; codigo: number; monto: number; fecha_pago: string }> {
    return this.unwrap(this.http.post<Envelope<any>>(`${this.base}/pagar-giro`, body));
  }

  devolverGiro(body: {
    codigo: number;
    motivo: string;
    uuid: string;
  }): Observable<{ id_giro: number; codigo: number; monto: number; motivo: string; fecha_devolucion: string }> {
    return this.unwrap(this.http.post<Envelope<any>>(`${this.base}/devolver-giro`, body));
  }

  buscarGiro(codigo: number): Observable<GiroBusqueda> {
    return this.unwrap(this.http.get<Envelope<GiroBusqueda>>(`${this.base}/buscar-giro/${codigo}`));
  }

  girosPendientes(): Observable<GiroPendiente[]> {
    return this.unwrap(this.http.get<Envelope<GiroPendiente[]>>(`${this.base}/giros-pendientes`));
  }

  historialGiros(desde: string, hasta?: string, estado?: number, codigo?: string): Observable<HistorialGiroRecord[]> {
    let params = new HttpParams().set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    if (estado !== undefined && estado !== null) params = params.set('estado', estado.toString());
    if (codigo) params = params.set('codigo', codigo);
    return this.unwrap(this.http.get<Envelope<HistorialGiroRecord[]>>(`${this.base}/historial-giro`, { params }));
  }

  comprobantePdfUrl(id: number): string {
    return `${this.base}/comprobante-giro-pdf/${id}`;
  }

  descargarComprobantePdf(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/comprobante-giro-pdf/${id}`, { responseType: 'blob' });
  }

  descargarFacturaPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/factura-giro-pdf/${id}`, { responseType: 'blob' });
  }
}
