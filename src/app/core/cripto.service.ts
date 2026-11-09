import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Envelope } from './models';

export interface CriptoActivo {
  id: number; simbolo: string; nombre: string; red: string; contrato?: string | null;
  decimales: number; tasa_compra_bob: number; tasa_venta_bob: number;
  comision_porcentaje: number; direccion_recepcion?: string | null; activo: number;
  saldo_tesoreria: number; reservado: number; disponible: number;
}
export interface CriptoCaja { id_caja: number; num_caja: number; moneda: string; agencia: string; }
export interface CriptoBinancePayConfig { qr_data_url: string | null; }
export interface CriptoPayMovement {
  id: number; transaction_id: string; order_id?: string; order_type: string; transaction_time: string;
  amount: number; currency: string; payer_binance_id?: string | null; receptor_verificado: boolean;
  note_code?: string | null; nota_binance?: string | null; conciliacion_metodo?: 'AUTOMATICA' | 'MANUAL' | null;
  id_operacion?: number | null; confirmado_at?: string | null; candidate_count: number;
  candidate_operation_id?: number | null; candidate_operation?: { id: number; cantidad_cripto: number; monto_bob: number; created_at: string; num_caja: number; cod_usuario_cajero: number } | null;
}
export interface CriptoPaySyncStatus {
  last_success_at: string | null; last_error_at: string | null; last_error: string | null;
  last_records: number; updated_at: string; api_configured: boolean; receiver_configured: boolean;
}
export interface CriptoPayPendingOperation {
  id: number; codigo_referencia: string | null; cantidad_cripto: number; monto_bob: number;
  created_at: string; simbolo: string; red: string; num_caja: number;
}
export interface CriptoOperacion {
  id: number; uuid: string; tipo: 'COMPRA' | 'VENTA'; estado: string; cod_usuario_cajero?: number;
  cantidad_cripto: number; tasa_bob: number; comision_bob: number; monto_bob: number;
  simbolo: string; red: string; direccion_cliente?: string; direccion_tesoreria?: string;
  hash_transaccion?: string; concepto?: string; num_caja: number; usuario?: string;
  codigo_referencia?: string | null;
  created_at: string; fecha_confirmacion?: string;
  eventos?: { accion: string; estado_anterior?: string | null; estado_nuevo: string; cod_usuario: number; referencia?: string | null; motivo?: string | null; created_at: string }[];
}

@Injectable({ providedIn: 'root' })
export class CriptoService {
  private http = inject(HttpClient);
  private base = `${environment.apiBase}/cajero/cripto`;

  private unwrap<T>(o: Observable<Envelope<T>>): Observable<T> {
    return o.pipe(map(r => { if (!r?.success) throw new Error(r?.message ?? 'Error de la API'); return r.data; }));
  }

  catalogo(): Observable<CriptoActivo[]> { return this.unwrap(this.http.get<Envelope<CriptoActivo[]>>(`${this.base}/catalogo`)); }
  binancePayQr(): Observable<CriptoBinancePayConfig> { return this.unwrap(this.http.get<Envelope<CriptoBinancePayConfig>>(`${this.base}/configuracion/binance-pay-qr`)); }
  binancePayHistory(): Observable<CriptoPayMovement[]> { return this.unwrap(this.http.get<Envelope<CriptoPayMovement[]>>(`${this.base}/pay/historial`)); }
  binancePaySyncStatus(): Observable<CriptoPaySyncStatus | null> { return this.unwrap(this.http.get<Envelope<CriptoPaySyncStatus | null>>(`${this.base}/pay/sincronizacion`)); }
  binancePayPendingOperations(): Observable<CriptoPayPendingOperation[]> { return this.unwrap(this.http.get<Envelope<CriptoPayPendingOperation[]>>(`${this.base}/pay/operaciones-pendientes`)); }
  vincularBinancePayManual(transactionId: string, operationId: number): Observable<unknown> {
    return this.unwrap(this.http.post<Envelope<unknown>>(`${this.base}/pay/vincular-manual`, { transaction_id: transactionId, id_operacion: operationId }));
  }
  guardarBinancePayQr(file: File): Observable<unknown> {
    const body = new FormData();
    body.append('qr', file, file.name);
    return this.unwrap(this.http.post<Envelope<unknown>>(`${this.base}/configuracion/binance-pay-qr`, body));
  }
  cajas(): Observable<CriptoCaja[]> { return this.unwrap(this.http.get<Envelope<CriptoCaja[]>>(`${this.base}/cajas`)); }
  listar(f: { desde?: string; hasta?: string; estado?: string; tipo?: string } = {}): Observable<CriptoOperacion[]> {
    let params = new HttpParams();
    Object.entries(f).forEach(([k, v]) => { if (v) params = params.set(k, v); });
    return this.unwrap(this.http.get<Envelope<CriptoOperacion[]>>(`${this.base}/operaciones`, { params }));
  }
  detalle(id: number): Observable<CriptoOperacion> { return this.unwrap(this.http.get<Envelope<CriptoOperacion>>(`${this.base}/operaciones/${id}`)); }
  crear(body: Record<string, unknown>): Observable<unknown> { return this.unwrap(this.http.post<Envelope<unknown>>(`${this.base}/operaciones`, body)); }
  guardarActivo(body: Record<string, unknown>): Observable<unknown> { return this.unwrap(this.http.post<Envelope<unknown>>(`${this.base}/activos`, body)); }
  ajustar(id: number, cantidad: number, motivo: string): Observable<unknown> { return this.unwrap(this.http.post<Envelope<unknown>>(`${this.base}/activos/${id}/ajuste`, { cantidad, motivo })); }
  confirmarRecepcion(id: number, referencia: string, transactionId?: string): Observable<unknown> {
    const body = transactionId ? { transaction_id: transactionId } : { referencia };
    return this.unwrap(this.http.post<Envelope<unknown>>(`${this.base}/operaciones/${id}/confirmar-recepcion`, body));
  }
  confirmarCobro(id: number): Observable<unknown> { return this.unwrap(this.http.post<Envelope<unknown>>(`${this.base}/operaciones/${id}/confirmar-cobro`, {})); }
  pagarBob(id: number): Observable<unknown> { return this.unwrap(this.http.post<Envelope<unknown>>(`${this.base}/operaciones/${id}/pagar-bob`, {})); }
  confirmarEnvio(id: number, referencia: string): Observable<unknown> { return this.unwrap(this.http.post<Envelope<unknown>>(`${this.base}/operaciones/${id}/confirmar-envio`, { referencia })); }
  rechazar(id: number, motivo: string): Observable<unknown> { return this.unwrap(this.http.post<Envelope<unknown>>(`${this.base}/operaciones/${id}/rechazar`, { motivo })); }
  cancelar(id: number, motivo: string): Observable<unknown> { return this.unwrap(this.http.post<Envelope<unknown>>(`${this.base}/operaciones/${id}/cancelar`, { motivo })); }
}
