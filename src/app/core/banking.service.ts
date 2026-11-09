import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Operaciones de bancos: cuentas, traspasos, depósitos/retiros y cheques.
 *
 * Consume el módulo `Bancos` de la API (`/api/banking/ops/...`). El backend es
 * quien valida fondos, estados y agencia; aquí solo se transporta.
 */

export interface Envelope<T> { success: boolean; data: T; message: string | null; errors: unknown[]; }

export interface CuentaBanco {
  id_agencia: number;
  agencia: string;
  agencia_abr: string;
  cod_agencia: string;
  id_entidad: number;
  entidad: string;
  entidad_desc: string;
  id_tipo_cuenta: number;
  tipo_cuenta: string;
  tipo_cuenta_abr: string;
  num_cuenta: string;
  id_moneda: number;
  moneda: string;
  codsubcuenta: string;
  saldo: number;
  propia: boolean;
}

export interface Traspaso {
  id: number;
  uuid: string;
  id_agencia_origen: number;
  agencia_origen: string;
  agencia_origen_abr: string;
  id_entidad_origen: number;
  entidad_origen: string;
  id_tipo_cuenta_origen: number;
  num_cuenta_origen: string;
  id_agencia_destino: number;
  agencia_destino: string;
  agencia_destino_abr: string;
  id_entidad_destino: number;
  entidad_destino: string;
  num_cuenta_destino: string;
  id_moneda: number;
  moneda: string;
  monto: number;
  documento_origen: string | null;
  documento_destino: string | null;
  glosa: string | null;
  observaciones: string | null;
  estado: 'P' | 'A' | 'X' | 'R';
  estado_label: string;
  usuario_origen: string | null;
  usuario_destino: string | null;
  fecha: string;
  fec_recepcion: string | null;
  fec_reversion: string | null;
  comprobante_path: string | null;
  comprobante_nombre: string | null;
}

export interface DepositoBanco {
  id: number;
  uuid: string;
  tipo: 'D' | 'R';
  id_agencia: number;
  id_caja: number | null;
  id_entidad: number;
  id_tipo_cuenta: number;
  num_cuenta: string;
  id_moneda: number;
  monto: number;
  monto_bob: number | null;
  tipo_cambio: number | null;
  referencia: string | null;
  glosa: string | null;
  estado: string;
  created_at: string;
  entidad?: string;
  moneda?: string;
  num_caja?: number | null;
  usuario?: string | null;
  comprobante_path?: string | null;
  comprobante_nombre?: string | null;
}

export interface Chequera {
  id_chequera: number;
  id_agencia: number;
  id_entidad: number;
  entidad: string;
  id_moneda: number;
  moneda: string;
  num_cuenta: string;
  cantidad: number;
  numero_ini: string;
  total: number;
  disponibles: number;
  en_circulacion: number;
  cobrados: number;
  anulados: number;
}

export interface Cheque {
  id_chequera: number;
  id_cheque: number;
  numero: number;
  estado: 'I' | 'A' | 'E' | 'T' | 'C' | 'N';
  estado_label: string;
  monto: number | null;
  concepto: string | null;
  num_cuenta: string | null;
  id_entidad: number | null;
  entidad: string | null;
  id_agencia: number | null;
  id_categoria: number | null;
  categoria: string | null;
  fecha_registro: string | null;
  fecha_modificacion: string | null;
  envio_pendiente: number;
  /** Adjuntos (anverso/reverso) ya resueltos por la API: evita un N+1 desde el POS. */
  adjuntos?: { anverso: Adjunto | null; reverso: Adjunto | null };
}

export interface EnvioCheque {
  id: number;
  uuid: string;
  id_chequera: number;
  id_cheque: number;
  id_agencia_origen: number;
  id_agencia_destino: number;
  observaciones: string | null;
  estado: 'P' | 'R' | 'X';
  fec_envio: string;
  monto: number | null;
  concepto_obs: string | null;
  agencia_origen_desc: string;
  agencia_origen_abr: string;
  categoria: string | null;
  entidad: string;
  moneda: string;
  num_cuenta: string;
  comprobante_path?: string | null;
  comprobante_nombre?: string | null;
}

export interface CategoriaCheque { id: number; descripcion: string; abreviatura: string; }
export interface AgenciaOpcion { id_agencia: number; descripcion: string; abreviatura?: string; }

export interface MovimientoBanco {
  id_agencia: number;
  id_entidad: number;
  id_tipo_cuenta: number;
  num_cuenta: string;
  id_moneda: number;
  entidad: string;
  moneda: string;
  fecha: string;
  conciliacion: string;
  tipo: string;
  glosa: string | null;
  usuario: string | null;
  comprobante_path?: string | null;
  comprobante_nombre?: string | null;
  comprobante_url?: string | null;
  monto: number;
  signo: 'C' | 'D';
  clave: string;
}

export interface CuentaBancaEstado {
  id_agencia: number;
  id_entidad: number;
  id_tipo_cuenta: number;
  num_cuenta: string;
  id_moneda: number;
  entidad: string;
  moneda: string;
  clave: string;
  saldo_actual: number;
  estado: 'sin_abrir' | 'abierta' | 'cerrada';
  saldo_apertura: number | null;
  hora_apertura: string | null;
  saldo_cierre: number | null;
  hora_cierre: string | null;
  glosa_apertura: string | null;
  glosa_cierre: string | null;
  diferencia: number | null;
  descuadrado: boolean;
  /** Arrastre del último arqueo anterior a hoy (referencia). */
  saldo_anterior: number | null;
  fecha_anterior: string | null;
  tipo_anterior: 'A' | 'C' | null;
  sin_arqueo_anterior: boolean;
}

/** Grupo de arqueo: todas las cuentas de una entidad en una misma moneda. */
export interface GrupoBanca {
  id_entidad: number;
  entidad: string;
  id_moneda: number;
  moneda: string;
  cuentas: string[];
  claves: string[];
  saldo_total: number;
  estado: 'sin_abrir' | 'abierta' | 'cerrada' | 'parcial';
  total: number;
  abiertas: number;
  cerradas: number;
  puede_abrir: boolean;
  puede_cerrar: boolean;
}

export interface EstadoBanca {
  fecha: string;
  agencia: number;
  cuentas: CuentaBancaEstado[];
  grupos: GrupoBanca[];
  resumen: {
    total: number; sin_abrir: number; abiertas: number; cerradas: number;
    descuadradas: number; sin_arqueo_anterior: number; esta_abierta: boolean;
  };
}

/** Resultado del cierre, cuenta por cuenta. */
export interface DetalleCierreBanca {
  clave: string;
  num_cuenta: string;
  moneda: string;
  esperado: number;
  contado: number;
  diferencia: number;
  descuadrado: boolean;
  motivo: string | null;
  glosa: string;
}

export interface Adjunto { path: string; nombre: string; }

// ── Conciliación por extractos ────────────────────────────────────────
export interface ConciliacionMovObel {
  fecha: string | null; monto: number | null; conciliacion: string | null;
  tipo: string | null; glosa: string | null; usuario: string | null;
}
export interface ConciliacionLinea {
  fecha: string | null; hora: string | null; descripcion: string | null;
  referencia: string | null; documento: string | null;
  monto: number | null; saldo: number | null;
  estado: 'conciliado' | 'dudoso' | 'no_registrado';
  obel: ConciliacionMovObel | null;
}
export interface TipoAccion { codigo: string; nombre: string; }
export interface ConciliacionResultado {
  banco: { clave: string; nombre: string };
  extracto: {
    desde: string | null; hasta: string | null; moneda: string | null; numero_cuenta: string | null;
    saldo_inicial: number | null; saldo_final: number | null;
    total_debitos: number | null; total_creditos: number | null;
  };
  advertencias: string[];
  resumen: { total: number; conciliados: number; dudosos: number; no_registrados: number; solo_obel: number };
  lineas: ConciliacionLinea[];
  solo_obel: ConciliacionMovObel[];
  tipos_accion: TipoAccion[];
}

@Injectable({ providedIn: 'root' })
export class BankingService {
  private http = inject(HttpClient);
  private base = `${environment.apiBase}/banking/ops`;

  private unwrap<T>(o: Observable<Envelope<T>>): Observable<T> {
    return o.pipe(map(r => {
      if (!r || !r.success) throw new Error(r?.message ?? 'Error de la API');
      return r.data;
    }));
  }

  // ── Cuentas ─────────────────────────────────────────────────────────
  cuentas(todas = false): Observable<{ agencia: number; total: number; cuentas: CuentaBanco[] }> {
    let params = new HttpParams();
    if (todas) params = params.set('todas', '1');
    return this.unwrap(this.http.get<Envelope<any>>(`${this.base}/cuentas`, { params }));
  }

  /** Todas las agencias: los traspasos son inter-agencia. */
  agencias(): Observable<{ total: number; agencias: AgenciaOpcion[] }> {
    return this.unwrap(this.http.get<Envelope<any>>(`${this.base}/agencias`));
  }

  // ── Traspasos ───────────────────────────────────────────────────────
  traspasos(filtros: { estado?: string; desde?: string; hasta?: string } = {}): Observable<{ total: number; traspasos: Traspaso[] }> {
    let params = new HttpParams();
    if (filtros.estado) params = params.set('estado', filtros.estado);
    if (filtros.desde) params = params.set('desde', filtros.desde);
    if (filtros.hasta) params = params.set('hasta', filtros.hasta);
    return this.unwrap(this.http.get<Envelope<any>>(`${this.base}/traspasos`, { params }));
  }

  traspasosPendientes(): Observable<{ total: number; traspasos: Traspaso[] }> {
    return this.unwrap(this.http.get<Envelope<any>>(`${this.base}/traspasos/pendientes`));
  }

  registrarTraspaso(body: {
    uuid: string;
    id_agencia_origen: number; id_entidad_origen: number; id_tipo_cuenta_origen: number; num_cuenta_origen: string;
    id_agencia_destino: number; id_entidad_destino: number; id_tipo_cuenta_destino: number; num_cuenta_destino: string;
    id_moneda: number; monto: number; documento: string; observaciones?: string;
  }): Observable<any> {
    return this.unwrap(this.http.post<Envelope<any>>(`${this.base}/traspasos`, body));
  }

  aceptarTraspaso(id: number, documento: string): Observable<any> {
    return this.unwrap(this.http.post<Envelope<any>>(`${this.base}/traspasos/${id}/aceptar`, { documento }));
  }

  rechazarTraspaso(id: number, motivo: string): Observable<any> {
    return this.unwrap(this.http.post<Envelope<any>>(`${this.base}/traspasos/${id}/rechazar`, { motivo }));
  }

  revertirTraspaso(id: number, motivo: string): Observable<any> {
    return this.unwrap(this.http.post<Envelope<any>>(`${this.base}/traspasos/${id}/revertir`, { motivo }));
  }

  // ── Depósitos y retiros ─────────────────────────────────────────────
  depositos(filtros: { desde?: string; hasta?: string } = {}): Observable<{ total: number; depositos: DepositoBanco[] }> {
    let params = new HttpParams();
    if (filtros.desde) params = params.set('desde', filtros.desde);
    if (filtros.hasta) params = params.set('hasta', filtros.hasta);
    return this.unwrap(this.http.get<Envelope<any>>(`${this.base}/depositos`, { params }));
  }

  registrarDeposito(body: {
    uuid: string; tipo: 'D' | 'R'; id_caja: number; monto: number;
    id_entidad: number; id_tipo_cuenta: number; num_cuenta: string; id_moneda: number;
    referencia?: string; glosa?: string;
  }): Observable<any> {
    return this.unwrap(this.http.post<Envelope<any>>(`${this.base}/depositos`, body));
  }

  // ── Movimientos bancarios (con filtros) ─────────────────────────────
  movimientos(f: {
    desde?: string; hasta?: string; cuenta?: string; entidad?: number; moneda?: number; limite?: number;
    conciliacion?: string; monto_min?: number | null; monto_max?: number | null; texto?: string;
  } = {}): Observable<{ total: number; totales: { cargos: number; abonos: number; neto: number }; saldo_periodo?: { desde: string; hasta: string; saldo_inicial: number; saldo_final: number } | null; movimientos: MovimientoBanco[] }> {
    let params = new HttpParams();
    for (const [k, v] of Object.entries(f)) {
      if (v !== undefined && v !== null && v !== '') params = params.set(k, String(v));
    }
    return this.unwrap(this.http.get<Envelope<any>>(`${this.base}/movimientos`, { params }));
  }

  // ── Apertura / cierre de banca ──────────────────────────────────────
  estadoBanca(): Observable<EstadoBanca> {
    return this.unwrap(this.http.get<Envelope<EstadoBanca>>(`${this.base}/banca/estado`));
  }

  /**
   * `message` es el del sobre de la API, no del `data`. El componente lo muestra
   * tal cual porque resume cuántas cuentas se abrieron/cerraron y cuáles se
   * omitieron (por ejemplo, cuentas ya cerradas dentro del grupo).
   */
  abrirBanca(
    cuentas: string[],
    montos: { [clave: string]: number } = {},
    glosas: { [clave: string]: string } = {},
  ): Observable<{
    abiertas: string[]; detalle: any[]; omitidas: string[]; faltantes: string[]; fecha: string; message?: string;
  }> {
    return this.unwrap(this.http.post<Envelope<any>>(`${this.base}/banca/abrir`, { cuentas, montos, glosas }));
  }

  cerrarBanca(
    cuentas: string[],
    montos: { [clave: string]: number } = {},
    glosas: { [clave: string]: string } = {},
  ): Observable<{
    cerradas: string[]; detalle: DetalleCierreBanca[]; omitidas: string[]; fecha: string; message?: string;
  }> {
    return this.unwrap(this.http.post<Envelope<any>>(`${this.base}/banca/cerrar`, { cuentas, montos, glosas }));
  }

  // ── Comprobantes adjuntos ───────────────────────────────────────────
  /** Sube el comprobante de un traspaso, depósito o envío de cheque. */
  subirComprobante(tipo: 'traspasos' | 'depositos' | 'cheques/envios', id: number, file: File): Observable<any> {
    const fd = new FormData();
    fd.append('comprobante', file);
    return this.unwrap(this.http.post<Envelope<any>>(`${this.base}/${tipo}/${id}/comprobante`, fd));
  }

  /** Sube el anverso o reverso de un cheque. */
  subirImagenCheque(idChequera: number, idCheque: number, cara: 'anverso' | 'reverso', file: File): Observable<any> {
    const fd = new FormData();
    fd.append('imagen', file);
    fd.append('id_chequera', String(idChequera));
    fd.append('id_cheque', String(idCheque));
    fd.append('cara', cara);
    return this.unwrap(this.http.post<Envelope<any>>(`${this.base}/cheques/imagen`, fd));
  }

  /** Adjuntos (anverso/reverso) de un cheque. */
  adjuntosCheque(idChequera: number, idCheque: number): Observable<{ anverso: Adjunto | null; reverso: Adjunto | null }> {
    const params = new HttpParams()
      .set('id_chequera', String(idChequera))
      .set('id_cheque', String(idCheque));
    return this.unwrap(this.http.get<Envelope<any>>(`${this.base}/cheques/adjuntos`, { params }));
  }

  /**
   * URL para ver un comprobante.
   *
   * El POS y la API están en dominios distintos, así que el archivo se sirve por
   * un endpoint en lugar de exponer la ruta del storage.
   */
  urlComprobante(path: string): string {
    return `${this.base}/comprobante?path=${encodeURIComponent(path)}`;
  }

  descargarComprobante(path: string): Observable<Blob> {
    const params = new HttpParams().set('path', path);
    return this.http.get(`${this.base}/comprobante`, { params, responseType: 'blob' });
  }

  // ── Cheques ─────────────────────────────────────────────────────────
  chequesCatalogos(): Observable<{ categorias: CategoriaCheque[]; destinos: AgenciaOpcion[] }> {
    return this.unwrap(this.http.get<Envelope<any>>(`${this.base}/cheques/catalogos`));
  }

  chequeras(): Observable<{ total: number; chequeras: Chequera[] }> {
    return this.unwrap(this.http.get<Envelope<any>>(`${this.base}/cheques/chequeras`));
  }

  cheques(idChequera: number, estado?: string): Observable<{ total: number; cheques: Cheque[] }> {
    let params = new HttpParams().set('id_chequera', idChequera.toString());
    if (estado) params = params.set('estado', estado);
    return this.unwrap(this.http.get<Envelope<any>>(`${this.base}/cheques`, { params }));
  }

  chequesAgencia(estado?: string): Observable<{ total: number; cheques: Cheque[] }> {
    let params = new HttpParams();
    if (estado) params = params.set('estado', estado);
    return this.unwrap(this.http.get<Envelope<any>>(`${this.base}/cheques/agencia`, { params }));
  }

  emitirCheque(body: {
    uuid: string; id_chequera: number; id_cheque: number; monto: number;
    concepto: string; id_categoria: number;
  }): Observable<any> {
    return this.unwrap(this.http.post<Envelope<any>>(`${this.base}/cheques/emitir`, body));
  }

  enviarCheque(body: {
    id_chequera: number; id_cheque: number; id_agencia_destino: number;
    id_categoria?: number; observaciones?: string;
  }): Observable<any> {
    return this.unwrap(this.http.post<Envelope<any>>(`${this.base}/cheques/enviar`, body));
  }

  enviosPendientes(): Observable<{ total: number; envios: EnvioCheque[] }> {
    return this.unwrap(this.http.get<Envelope<any>>(`${this.base}/cheques/envios`));
  }

  recibirCheque(id: number): Observable<any> {
    return this.unwrap(this.http.post<Envelope<any>>(`${this.base}/cheques/envios/${id}/recibir`, {}));
  }

  rechazarEnvio(id: number, motivo: string): Observable<any> {
    return this.unwrap(this.http.post<Envelope<any>>(`${this.base}/cheques/envios/${id}/rechazar`, { motivo }));
  }

  cobrarCheque(body: { id_chequera: number; id_cheque: number; id_caja: number; tercero?: string }): Observable<any> {
    return this.unwrap(this.http.post<Envelope<any>>(`${this.base}/cheques/cobrar`, body));
  }

  anularCheque(body: { id_chequera: number; id_cheque: number; motivo: string }): Observable<any> {
    return this.unwrap(this.http.post<Envelope<any>>(`${this.base}/cheques/anular`, body));
  }

  revertirAnulacion(body: { id_chequera: number; id_cheque: number; motivo: string }): Observable<any> {
    return this.unwrap(this.http.post<Envelope<any>>(`${this.base}/cheques/revertir-anulacion`, body));
  }

  // ── Conciliación por extractos ──────────────────────────────────────
  conciliacionCatalogos(): Observable<{ bancos: { clave: string; nombre: string }[]; tipos_accion: TipoAccion[] }> {
    return this.unwrap(this.http.get<Envelope<any>>(`${this.base}/conciliacion/catalogos`));
  }

  /** Sube un extracto (PDF) de una cuenta y lo concilia contra OBEL. */
  conciliarExtracto(cuenta: CuentaBanco, file: File): Observable<ConciliacionResultado> {
    const fd = new FormData();
    fd.append('extracto', file);
    fd.append('id_agencia', String(cuenta.id_agencia));
    fd.append('id_entidad', String(cuenta.id_entidad));
    fd.append('id_tipo_cuenta', String(cuenta.id_tipo_cuenta));
    fd.append('num_cuenta', cuenta.num_cuenta);
    fd.append('id_moneda', String(cuenta.id_moneda));
    return this.unwrap(this.http.post<Envelope<any>>(`${this.base}/conciliacion/extracto`, fd));
  }

  /** Registra en OBEL una línea del extracto que no estaba conciliada. */
  registrarConciliacion(body: {
    id_agencia: number; id_entidad: number; id_tipo_cuenta: number; num_cuenta: string; id_moneda: number;
    codsubcuenta: string; linea: ConciliacionLinea; tipo_accion: string; motivo: string; razon?: string;
  }): Observable<any> {
    return this.unwrap(this.http.post<Envelope<any>>(`${this.base}/conciliacion/registrar`, body));
  }

  /** uuid v4 con fallback (crypto.randomUUID exige contexto seguro). */
  static uuid(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
