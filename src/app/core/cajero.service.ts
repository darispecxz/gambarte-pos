import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Envelope, CajaInfo, Denominacion, DisponibilidadInfo,
  AperturaResponse, CierreResponse, DenominacionInput,
  MovimientoResponse, CajaDestino, BovedaInfo, EgresoInfo, MovimientoCajaInfo,
  CuentaBancariaCobro, AsientoAutorizado,
} from './models';

@Injectable({ providedIn: 'root' })
export class CajeroService {
  private http = inject(HttpClient);
  private base = `${environment.apiBase}/cajero`;

  private unwrap<T>(o: Observable<Envelope<T>>): Observable<T> {
    return o.pipe(map(r => {
      if (!r || !r.success) throw new Error(r?.message ?? 'Error de la API');
      return r.data;
    }));
  }

  misCajas(): Observable<CajaInfo[]> {
    return this.unwrap(this.http.get<Envelope<CajaInfo[]>>(`${this.base}/mis-cajas`));
  }

  denominaciones(idMoneda?: number): Observable<Denominacion[]> {
    let params = new HttpParams();
    if (idMoneda) params = params.set('id_moneda', idMoneda.toString());
    return this.unwrap(this.http.get<Envelope<Denominacion[]>>(`${this.base}/denominaciones`, { params }));
  }

  disponibilidad(idCaja: number, fecha?: string): Observable<DisponibilidadInfo> {
    let params = new HttpParams().set('id_caja', idCaja.toString());
    if (fecha) params = params.set('fecha', fecha);
    return this.unwrap(this.http.get<Envelope<DisponibilidadInfo>>(`${this.base}/disponibilidad`, { params }));
  }

  apertura(idCaja: number, montos: DenominacionInput[]): Observable<AperturaResponse> {
    return this.unwrap(this.http.post<Envelope<AperturaResponse>>(`${this.base}/apertura`, {
      id_caja: idCaja,
      montos,
    }));
  }

  cierre(idCaja: number, montos: DenominacionInput[]): Observable<CierreResponse> {
    return this.unwrap(this.http.post<Envelope<CierreResponse>>(`${this.base}/cierre`, {
      id_caja: idCaja,
      montos,
    }));
  }

  cierreConApertura(idCaja: number, montos: DenominacionInput[]): Observable<CierreResponse> {
    return this.unwrap(this.http.post<Envelope<CierreResponse>>(`${this.base}/cierre-con-apertura`, {
      id_caja: idCaja,
      montos,
    }));
  }

  // --- Movimientos de caja ---

  solicitarFondos(idCaja: number, monto: number, concepto: string, cortes: DenominacionInput[]): Observable<MovimientoResponse> {
    return this.unwrap(this.http.post<Envelope<MovimientoResponse>>(`${this.base}/solicitar-fondos`, {
      id_caja: idCaja, monto, concepto, cortes,
    }));
  }

  traspasoBoveda(idCaja: number, monto: number, concepto: string, cortes: DenominacionInput[]): Observable<MovimientoResponse> {
    return this.unwrap(this.http.post<Envelope<MovimientoResponse>>(`${this.base}/traspaso-boveda`, {
      id_caja: idCaja, monto, concepto, cortes,
    }));
  }

  traspasoCajero(idCajaOrigen: number, idCajaDestino: number, monto: number, concepto: string, cortes: DenominacionInput[]): Observable<MovimientoResponse> {
    return this.unwrap(this.http.post<Envelope<MovimientoResponse>>(`${this.base}/traspaso-cajero`, {
      id_caja_origen: idCajaOrigen, id_caja_destino: idCajaDestino, monto, concepto, cortes,
    }));
  }

  transferenciaBoveda(idBovedaOrigen: number, idBovedaDestino: number, monto: number, concepto: string, cortes: DenominacionInput[]): Observable<MovimientoResponse> {
    return this.unwrap(this.http.post<Envelope<MovimientoResponse>>(`${this.base}/transferencia-boveda`, {
      id_boveda_origen: idBovedaOrigen, id_boveda_destino: idBovedaDestino, monto, concepto, cortes,
    }));
  }

  transferenciaCajaAgencia(idCaja: number, idAgenciaDestino: number, idBovedaDestino: number, monto: number, concepto: string, cortes: DenominacionInput[]): Observable<MovimientoResponse> {
    return this.unwrap(this.http.post<Envelope<MovimientoResponse>>(`${this.base}/transferencia-caja-agencia`, {
      id_caja: idCaja, id_agencia_destino: idAgenciaDestino, id_boveda_destino: idBovedaDestino, monto, concepto, cortes,
    }));
  }

  egreso(idCaja: number, monto: number, concepto: string, origen: string, beneficiario: string, categoria: string): Observable<MovimientoResponse> {
    return this.unwrap(this.http.post<Envelope<MovimientoResponse>>(`${this.base}/egreso`, {
      id_caja: idCaja, monto, concepto, origen, beneficiario, categoria,
    }));
  }

  subirComprobanteEgreso(idEgreso: number, file: File): Observable<{ path: string }> {
    const fd = new FormData();
    fd.append('id_egreso', idEgreso.toString());
    fd.append('comprobante', file);
    return this.unwrap(this.http.post<Envelope<{ path: string }>>(`${this.base}/subir-comprobante-egreso`, fd));
  }

  egresosPendientes(desde?: string, hasta?: string): Observable<EgresoInfo[]> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.unwrap(this.http.get<Envelope<EgresoInfo[]>>(`${this.base}/egresos-pendientes`, { params }));
  }

  movimientosCaja(idCaja: number, desde?: string, hasta?: string): Observable<MovimientoCajaInfo[]> {
    let params = new HttpParams().set('id_caja', idCaja.toString());
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.unwrap(this.http.get<Envelope<MovimientoCajaInfo[]>>(`${this.base}/movimientos-caja`, { params }));
  }

  aprobarEgreso(idEgreso: number, observaciones: string): Observable<{ id_egreso: number; estado: string }> {
    return this.unwrap(this.http.post<Envelope<{ id_egreso: number; estado: string }>>(`${this.base}/aprobar-egreso`, {
      id_egreso: idEgreso, observaciones,
    }));
  }

  rechazarEgreso(idEgreso: number, observaciones: string): Observable<MovimientoResponse> {
    return this.unwrap(this.http.post<Envelope<MovimientoResponse>>(`${this.base}/rechazar-egreso`, {
      id_egreso: idEgreso, observaciones,
    }));
  }

  ingreso(idCaja: number, monto: number, concepto: string, origenIngreso: string, entregadoPor: string, categoria: string): Observable<MovimientoResponse> {
    return this.unwrap(this.http.post<Envelope<MovimientoResponse>>(`${this.base}/ingreso`, {
      id_caja: idCaja, monto, concepto, origen_ingreso: origenIngreso, entregado_por: entregadoPor, categoria,
    }));
  }

  subirComprobanteIngreso(uuid: string, file: File): Observable<{ path: string }> {
    const fd = new FormData();
    fd.append('uuid', uuid);
    fd.append('comprobante', file);
    return this.unwrap(this.http.post<Envelope<{ path: string }>>(`${this.base}/subir-comprobante-ingreso`, fd));
  }

  subirComprobanteTransaccionBancaria(uuid: string, file: File): Observable<{ path: string }> {
    const fd = new FormData();
    fd.append('uuid', uuid);
    fd.append('comprobante', file);
    return this.unwrap(this.http.post<Envelope<{ path: string }>>(`${this.base}/subir-comprobante-transaccion-bancaria`, fd));
  }

  transaccionBancaria(idCaja: number, tipo: string, monto: number, referencia: string, concepto: string): Observable<MovimientoResponse> {
    return this.unwrap(this.http.post<Envelope<MovimientoResponse>>(`${this.base}/transaccion-bancaria`, {
      id_caja: idCaja, tipo, monto, referencia, concepto,
    }));
  }

  cajasDestino(idMoneda: number): Observable<CajaDestino[]> {
    const params = new HttpParams().set('id_moneda', idMoneda.toString());
    return this.unwrap(this.http.get<Envelope<CajaDestino[]>>(`${this.base}/cajas-destino`, { params }));
  }

  bovedasDisponibles(): Observable<BovedaInfo[]> {
    return this.unwrap(this.http.get<Envelope<BovedaInfo[]>>(`${this.base}/bovedas-disponibles`));
  }

  cuentasBancariasCobro(): Observable<CuentaBancariaCobro[]> {
    return this.unwrap(this.http.get<Envelope<CuentaBancariaCobro[]>>(`${this.base}/cuentas-bancarias-cobro`));
  }

  buscarAsientoAutorizado(tipo: 'E' | 'I', numero: number): Observable<AsientoAutorizado> {
    const params = new HttpParams().set('tipo', tipo).set('numero', numero.toString());
    return this.unwrap(this.http.get<Envelope<AsientoAutorizado>>(`${this.base}/buscar-asiento-autorizado`, { params }));
  }

  completarEgresoAutorizado(idCaja: number, numero: number, glosa: string, monto: number, idMoneda: number): Observable<MovimientoResponse> {
    return this.unwrap(this.http.post<Envelope<MovimientoResponse>>(`${this.base}/completar-egreso-autorizado`, {
      id_caja: idCaja, numero, glosa, monto, id_moneda: idMoneda,
    }));
  }

  completarIngresoAutorizado(idCaja: number, numero: number, glosa: string, monto: number, idMoneda: number): Observable<MovimientoResponse> {
    return this.unwrap(this.http.post<Envelope<MovimientoResponse>>(`${this.base}/completar-ingreso-autorizado`, {
      id_caja: idCaja, numero, glosa, monto, id_moneda: idMoneda,
    }));
  }
}
