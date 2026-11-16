import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { Envelope } from './models';

export interface TasaVigente {
  id_agencia: number; agencia: string; id_moneda: number; moneda: string; moneda_desc: string;
  compra_bob: number | null; venta_bob: number | null; compra_usd: number | null; venta_usd: number | null;
  valor_base_compra: number; valor_base_venta: number; actualizada: string | null; estado: string;
}

export interface AuditoriaCotizacion {
  id_moneda: number; id_operacion: number; id_agencia: number; moneda: string; agencia: string;
  valor_base: number; fecha_creacion: string; usuario: string; operacion: 'compra' | 'venta';
}

export interface GestionCotizacionesData {
  tasas: TasaVigente[];
  auditoria: AuditoriaCotizacion[];
  agencias: { id_agencia: number; agencia: string }[];
  resumen: { monedas_activas: number; ultima_actualizacion: string | null; cambios_hoy: number; alertas: number };
  agencia_seleccionada: number | null;
}

export interface MonedaProgramada {
  id_moneda: number; moneda: string; moneda_desc: string; bandera?: string | null;
  compra_actual: number; venta_actual: number;
}
export interface CotizacionProgramadaRecord {
  id_cotizacion: number; id_agencia: number; agencia: string; abreviatura: string;
  fecha_aplicacion: string; hora_aplicacion: string; estado: 'P' | 'A' | 'I'; estado_texto: string;
  observaciones: string; usuario_registro: string; fec_creacion: string; fec_modificacion?: string | null; total_monedas: number;
}
export interface CotizacionProgramadaDetalle {
  cabecera: CotizacionProgramadaRecord;
  detalles: Array<{
    id_moneda: number; moneda: string; moneda_desc: string; bandera?: string | null;
    compra: number; venta: number; diferencial: number;
  }>;
}
export interface CotizacionesProgramadasPage {
  registros: CotizacionProgramadaRecord[];
  monedas: MonedaProgramada[];
  total: number;
  pagina: number;
  por_pagina: number;
}

@Injectable({ providedIn: 'root' })
export class CotizacionGestionService {
  private http = inject(HttpClient);
  private base = `${environment.apiBase}/cajero/gestion-cotizaciones`;

  private unwrap<T>(request: Observable<Envelope<T>>): Observable<T> {
    return request.pipe(
      catchError(err => throwError(() => new Error(err.error?.message || err.message || 'Error de conexión'))),
      map(response => {
        if (!response?.success) throw new Error(response?.message || 'Error de la API');
        return response.data;
      }),
    );
  }

  dashboard(idAgencia?: number): Observable<GestionCotizacionesData> {
    let params = new HttpParams();
    if (idAgencia) params = params.set('id_agencia', idAgencia);
    return this.unwrap(this.http.get<Envelope<GestionCotizacionesData>>(this.base, { params }));
  }

  actualizar(data: { id_agencia: number; id_moneda: number; compra_bob: number; venta_bob: number; todas_agencias?: boolean }): Observable<GestionCotizacionesData> {
    return this.unwrap(this.http.put<Envelope<GestionCotizacionesData>>(this.base, data));
  }

  programadas(estado = '', busqueda = '', pagina = 1, porPagina = 10): Observable<CotizacionesProgramadasPage> {
    let params = new HttpParams();
    if (estado) params = params.set('estado', estado);
    if (busqueda) params = params.set('busqueda', busqueda);
    params = params.set('pagina', pagina).set('por_pagina', porPagina);
    return this.unwrap(this.http.get<Envelope<CotizacionesProgramadasPage>>(`${environment.apiBase}/cajero/cotizaciones-programadas`, { params }));
  }

  crearProgramada(data: { id_agencia?: number; fecha_aplicacion: string; hora_aplicacion: string; observaciones: string; cotizaciones: { id_moneda: number; compra: number; venta: number }[] }): Observable<{ id_cotizacion: number }> {
    return this.unwrap(this.http.post<Envelope<{ id_cotizacion: number }>>(`${environment.apiBase}/cajero/cotizaciones-programadas`, data));
  }

  detalleProgramada(id: number): Observable<CotizacionProgramadaDetalle> {
    return this.unwrap(this.http.get<Envelope<CotizacionProgramadaDetalle>>(`${environment.apiBase}/cajero/cotizaciones-programadas/${id}`));
  }

  descargarProgramadaPdf(id: number): Observable<Blob> {
    return this.http.get(`${environment.apiBase}/cajero/cotizaciones-programadas/${id}/pdf`, { responseType: 'blob' });
  }
}
