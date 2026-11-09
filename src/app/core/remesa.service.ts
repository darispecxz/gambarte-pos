import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Envelope, ClienteInfo, ComplementoData } from './models';

export interface DestinoInfo {
  id_destino: number;
  descripcion: string;
  estado: string;
}

export interface DestinatarioInfo {
  id_destinatario: number;
  nombres: string;
  ape_pat: string;
  ape_mat: string;
  id_tipo_doc_identidad_d: number;
  num_doc_identidad_d: string;
  id_expedicion_d: number;
  domicilio: string;
  tel_dom: string;
  tel_trab: string;
  celular: string;
  cuenta: string;
  id_banco_chile?: number | null;
}

export interface ComisionDesglose {
  comision_total: number;
  gastos_corresponsal: number;
  comision_gambarte: number;
  itf: number | null;
  iva: number;
  it: number;
  total_operacion: number;
}

export interface ComisionResult {
  porcentaje: ComisionDesglose;
  bob: ComisionDesglose;
  moneda_x: ComisionDesglose;
  monto_enviado_bob: number;
  monto_enviado_x: number;
  is_preferencial: boolean;
  tipo_cambio_clp?: number;
  tipo_cambio_comercial?: number;
  total_clp?: number;
  equivalente_usd?: number;
  error?: string;
}

export interface CotizacionChile {
  success: boolean;
  valor: number;
  source: string;
}

export interface RemesaResponse {
  id_remesa: number;
  codigo: number;
  correlativo: number;
  id_operacion: number;
  moneda_enviada: string;
  moneda_enviada_abr: string;
  moneda_recibida_abr: string;
  mon_rec: number;
  mon_ent: number;
  monto: number;
  destino: string;
  comision_bob: number;
  total_bob: number;
  total_clp: number;
  tipo_cambio_clp: number;
  fecha: string;
  agencia: string;
  cliente_nombre: string;
  destinatario_nombre: string;
  destinatario_doc: string;
  destinatario_cuenta: string;
  pago_comision: number;
  forma_pago_chile: string;
  banco_chile: string | null;
  cuenta_destino_chile: string | null;
  factura: any;
  compra_usd: CompraUsdResult | null;
  cod_agencia: string;
  login_usuario: string;
  corresponsal_bob: number;
  comision_gambarte_bob: number;
  iva_bob: number;
  concepto: string;
  equivalente_usd: number | null;
}

export interface CompraUsdResult {
  id_cambio: number;
  tc_oficial_venta: number;
  monto_usd: number;
  total_bob: number;
  factura: any;
}

export interface TcOficialVentaResponse {
  tc_oficial_venta: number;
  moneda: string;
}

export interface BancoChile {
  id: number;
  nombre: string;
  nombre_corto: string;
}

export interface FormaPagoChile {
  id: number;
  descripcion: string;
  requiere_cuenta: number;
}

export interface FormaPagoCobro {
  id: number;
  descripcion: string;
  codigo: string;
}

export interface MetodoPago {
  id_forma_pago: number;
  monto: number;
  referencia: string;
  observaciones: string;
}

export interface ComisionPreferencial {
  id: number;
  descripcion: string;
  id_moneda: number;
  porcentaje: number;
}

export interface AlertaControl {
  tipo: 'PEP' | 'LISTA_RIESGO' | 'PEP_REGISTRADO';
  nivel: 'alto' | 'critico';
  mensaje: string;
  detalle: string;
}

export interface UifRemesaSenal {
  codigo: string;
  mensaje: string;
  nivel: 'critico' | 'alto' | 'medio' | 'bajo';
}

export interface UifRemesaResponse {
  dolarizado: number;
  tipo_cambio_oficial: number;
  requiere_formulario: boolean;
  requiere_pcc08: boolean;
  operaciones_previas: {
    cantidad: number;
    total_dolarizado: number;
    dias_ventana: number;
  };
  umbrales: {
    formulario_unica: number;
    pcc08_unica: number;
    formulario_multiples: number;
    pcc08_multiples: number;
  };
  alertas: AlertaControl[];
  usuario_habitual?: boolean;
  senales_alerta?: UifRemesaSenal[];
  dd_incompleta?: boolean;
  dd_bloqueado?: boolean;
}

export interface HistorialRemesaRecord {
  id: number;
  codigo: number;
  correlativo: string;
  remitente: string;
  destinatario: string;
  destino: string;
  moneda: string;
  monto: number;
  tipoCambio: number;
  totalCambio: number;
  montoBob: number;
  comision: number;
  comisionBob: number;
  porcentajeComision: number;
  comisionGambarteBob: number;
  gastosCorresponsalBob: number;
  ivaBob: number;
  totalBob: number;
  fecha: string;
  estado: number;
  estadoDesc: string;
  subtipo: string;
  subtipoDesc: string;
  formaPago: number;
  formaPagoDesc: string;
  idPago: number | null;
}

export interface CotizacionRemesaRecord {
  id: number;
  codigo: string;
  moneda: string;
  destino: string;
  monto: number;
  estado: string;
  validoHasta: string;
  aplicadaEn: number | null;
  createdAt: string;
}

export interface RemesaPendientePago {
  codigo: number;
  remitente: string;
  destinatario: string;
  monto: number;
  moneda: string;
  fecha: string;
  origen: string;
  destino: string;
}

export interface RemesaBusquedaPago {
  codigo: number;
  remitente: string;
  destinatario: string;
  docDestinatario: string;
  tipoDocDestinatario?: number | null;
  expedicionDestinatario?: number | null;
  bancoDestinatario?: string;
  cuentaDestinatario?: string;
  monto: number;
  moneda: string;
  origen: string;
  destino: string;
  fecha: string;
  estado: number;
  estadoDesc: string;
  idOperacion: number;
  idDestino: number;
  yaPagada: boolean;
  fechaPago?: string;
}

export interface PreprocesarRemesasResult {
  procesadas: number[];
  omitidas: { codigo: number; motivo: string }[];
  total: number;
}

export interface ReporteRemesaRecord {
  codigo: number;
  monto: number;
  moneda: string;
  fechaEnvio: string;
  remitente: string;
  destinatario: string;
  docDestinatario: string;
  origen: string;
  destino: string;
  estado: number;
  estadoDesc: string;
  idPago: number | null;
  fechaPago: string | null;
  formaPago: number | null;
  formaPagoDesc: string | null;
  cajero: string | null;
  agenciaPago: string | null;
  fechaPreproceso: string | null;
}

export interface PreprocesoRemesaRecord {
  codigo: number;
  cajero: string;
  fechaInicio: string;
  remitente: string;
  destinatario: string;
  monto: number;
  moneda: string;
  origen: string;
  destino: string;
  fechaRemesa: string;
  agenciaPago: string;
  banco: string;
  numCuenta: string;
}

@Injectable({ providedIn: 'root' })
export class RemesaService {
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

  destinos(): Observable<DestinoInfo[]> {
    return this.unwrap(this.http.get<Envelope<DestinoInfo[]>>(`${this.base}/destinos`));
  }

  buscarDestinatario(documento: string, tipoDoc: number, expedicion: number): Observable<DestinatarioInfo | null> {
    const params = new HttpParams()
      .set('documento', documento)
      .set('tipo_doc', tipoDoc.toString())
      .set('expedicion', expedicion.toString());
    return this.unwrap(this.http.get<Envelope<DestinatarioInfo | null>>(`${this.base}/buscar-destinatario`, { params }));
  }

  destinatariosPorRemitente(documento: string, tipoDoc: number, expedicion: number): Observable<DestinatarioInfo[]> {
    const params = new HttpParams()
      .set('documento', documento)
      .set('tipo_doc', tipoDoc.toString())
      .set('expedicion', expedicion.toString());
    return this.unwrap(this.http.get<Envelope<DestinatarioInfo[]>>(`${this.base}/destinatarios-remitente`, { params }));
  }

  cotizacionChile(idDestino: number): Observable<CotizacionChile> {
    const params = new HttpParams().set('id_destino', idDestino.toString());
    return this.unwrap(this.http.get<Envelope<CotizacionChile>>(`${this.base}/cotizacion-chile`, { params }));
  }

  calcularComision(data: {
    tipo_comision: number;
    id_moneda: number;
    id_operacion: number;
    monto: number;
    id_destino: number;
    incluir_comision?: number;
  }): Observable<ComisionResult> {
    return this.unwrap(this.http.post<Envelope<ComisionResult>>(`${this.base}/calcular-comision`, data));
  }

  registrarRemesa(body: {
    id_operacion: number;
    cliente: ClienteInfo;
    destinatario: any;
    operacion: any;
    comision: ComisionResult;
    complemento?: ComplementoData;
    id_cotizacion?: number | null;
    uuid: string;
  }): Observable<RemesaResponse> {
    return this.unwrap(this.http.post<Envelope<RemesaResponse>>(`${this.base}/registrar-remesa`, body));
  }

  verificarUif(data: {
    id_moneda: number;
    monto: number;
    documento: string;
    tipo_doc: number;
    expedicion: number;
  }): Observable<UifRemesaResponse> {
    return this.unwrap(this.http.post<Envelope<UifRemesaResponse>>(`${this.base}/verificar-uif-remesa`, data));
  }

  comisionesPreferenciales(): Observable<ComisionPreferencial[]> {
    return this.unwrap(this.http.get<Envelope<ComisionPreferencial[]>>(`${this.base}/comisiones-preferenciales`));
  }

  tcOficialVenta(): Observable<TcOficialVentaResponse> {
    return this.unwrap(this.http.get<Envelope<TcOficialVentaResponse>>(`${this.base}/tc-oficial-venta`));
  }

  bancosChile(): Observable<BancoChile[]> {
    return this.unwrap(this.http.get<Envelope<BancoChile[]>>(`${this.base}/bancos-chile`));
  }

  formasPagoChile(): Observable<FormaPagoChile[]> {
    return this.unwrap(this.http.get<Envelope<FormaPagoChile[]>>(`${this.base}/formas-pago-chile`));
  }

  formasPagoCobro(): Observable<FormaPagoCobro[]> {
    return this.unwrap(this.http.get<Envelope<FormaPagoCobro[]>>(`${this.base}/formas-pago-cobro`));
  }

  crearCotizacion(data: {
    id_moneda: number;
    id_destino: number;
    monto: number;
    tipo_comision: number;
    incluir_comision: number;
    snapshot: ComisionResult;
  }): Observable<{ codigo: string; valido_hasta: string; horas: number }> {
    return this.unwrap(this.http.post<Envelope<{ codigo: string; valido_hasta: string; horas: number }>>(`${this.base}/cotizacion-remesa`, data));
  }

  buscarCotizacion(codigo: string): Observable<{
    id: number; codigo: string; id_moneda: number; id_destino: number;
    monto: number; tipo_comision: number; incluir_comision: number;
    snapshot: ComisionResult; valido_hasta: string;
  }> {
    const params = new HttpParams().set('codigo', codigo);
    return this.unwrap(this.http.get<Envelope<any>>(`${this.base}/buscar-cotizacion-remesa`, { params }));
  }

  comprobanteRemesa(id: number): Observable<any> {
    return this.unwrap(this.http.get<Envelope<any>>(`${this.base}/comprobante-remesa/${id}`));
  }

  comprobantePdfUrl(id: number): string {
    return `${this.base}/comprobante-remesa-pdf/${id}`;
  }

  descargarComprobantePdf(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/comprobante-remesa-pdf/${id}`, { responseType: 'blob' });
  }

  descargarFacturaPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/factura-remesa-pdf/${id}`, { responseType: 'blob' });
  }

  historialRemesa(desde: string, hasta?: string, estado?: number, codigo?: number): Observable<HistorialRemesaRecord[]> {
    let params = new HttpParams().set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    if (estado !== undefined && estado !== null) params = params.set('estado', estado.toString());
    if (codigo !== undefined && codigo !== null) params = params.set('codigo', codigo.toString());
    return this.unwrap(this.http.get<Envelope<HistorialRemesaRecord[]>>(`${this.base}/historial-remesa`, { params }));
  }

  cotizacionesRemesa(estado?: string): Observable<CotizacionRemesaRecord[]> {
    let params = new HttpParams();
    if (estado) params = params.set('estado', estado);
    return this.unwrap(this.http.get<Envelope<CotizacionRemesaRecord[]>>(`${this.base}/cotizaciones-remesa`, { params }));
  }

  // ─── Pago de Remesas ──────────────────────────────────────────────

  remesasPendientesPago(tipoPago?: number): Observable<RemesaPendientePago[]> {
    let params = new HttpParams();
    if (tipoPago !== undefined) params = params.set('tipo_pago', tipoPago.toString());
    return this.unwrap(this.http.get<Envelope<RemesaPendientePago[]>>(`${this.base}/remesas-pendientes`, { params }));
  }

  buscarRemesaPago(codigo: number): Observable<RemesaBusquedaPago> {
    return this.unwrap(this.http.get<Envelope<RemesaBusquedaPago>>(`${this.base}/buscar-remesa/${codigo}`));
  }

  preprocesarRemesas(codigos: number[], uuid: string): Observable<PreprocesarRemesasResult> {
    return this.unwrap(this.http.post<Envelope<PreprocesarRemesasResult>>(`${this.base}/preprocesar-remesas`, { codigos, uuid }));
  }

  pagarRemesa(body: { codigo: number; destinatario_doc: any; tipo_pago: number; datos_bancarios?: any; uuid: string }): Observable<any> {
    return this.unwrap(this.http.post<Envelope<any>>(`${this.base}/pagar-remesa`, body));
  }

  reporteRemesas(desde: string, hasta?: string, estado?: number, codigo?: number, tipoPago?: number): Observable<ReporteRemesaRecord[]> {
    let params = new HttpParams().set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    if (estado !== undefined && estado !== null) params = params.set('estado', estado.toString());
    if (codigo !== undefined && codigo !== null) params = params.set('codigo', codigo.toString());
    if (tipoPago !== undefined && tipoPago !== null) params = params.set('tipo_pago', tipoPago.toString());
    return this.unwrap(this.http.get<Envelope<ReporteRemesaRecord[]>>(`${this.base}/reporte-remesas`, { params }));
  }

  confirmarPreproceso(body: { codigo: number; uuid: string }): Observable<any> {
    return this.unwrap(this.http.post<Envelope<any>>(`${this.base}/confirmar-preproceso`, body));
  }

  preprocesosActivos(): Observable<PreprocesoRemesaRecord[]> {
    return this.unwrap(this.http.get<Envelope<PreprocesoRemesaRecord[]>>(`${this.base}/preprocesos-activos`));
  }

  descargarComprobanteEnvioChilePdf(codigo: number): Observable<Blob> {
    return this.http.get(`${this.base}/comprobante-envio-chile-pdf/${codigo}`, { responseType: 'blob' });
  }

  descargarComprobantePagoPdf(idPago: number): Observable<Blob> {
    return this.http.get(`${this.base}/comprobante-pago-remesa-pdf/${idPago}`, { responseType: 'blob' });
  }

  enviarComprobantePagoEmail(idPago: number, email: string): Observable<any> {
    return this.unwrap(this.http.post<Envelope<any>>(`${this.base}/enviar-comprobante-pago-remesa`, { id_pago: idPago, email }));
  }

  subirBoletaPagoRemesa(codigo: number, file: File): Observable<any> {
    const fd = new FormData();
    fd.append('codigo', codigo.toString());
    fd.append('comprobante', file);
    return this.unwrap(this.http.post<Envelope<any>>(`${this.base}/subir-boleta-pago-remesa`, fd));
  }
}
