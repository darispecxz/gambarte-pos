import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Envelope, CotizacionInfo, ClienteInfo, Catalogos,
  CambioResponse, OperacionCambioInput, UifCheckResponse,
  HistorialResponse, HistorialDetail, ComplementoData,
  EstadoSiat,
} from './models';
import { FormaPagoCobro } from './remesa.service';

@Injectable({ providedIn: 'root' })
export class CambioService {
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

  cotizaciones(): Observable<CotizacionInfo[]> {
    return this.unwrap(this.http.get<Envelope<CotizacionInfo[]>>(`${this.base}/cotizaciones`));
  }

  buscarCliente(documento: string, tipoDoc: number, expedicion: number): Observable<ClienteInfo | null> {
    const params = new HttpParams()
      .set('documento', documento)
      .set('tipo_doc', tipoDoc.toString())
      .set('expedicion', expedicion.toString());
    return this.unwrap(this.http.get<Envelope<ClienteInfo | null>>(`${this.base}/buscar-cliente`, { params }));
  }

  actualizarCliente(cliente: ClienteInfo): Observable<{ id: number }> {
    return this.unwrap(this.http.post<Envelope<{ id: number }>>(`${this.base}/actualizar-cliente`, { cliente }));
  }

  catalogos(): Observable<Catalogos> {
    return this.unwrap(this.http.get<Envelope<Catalogos>>(`${this.base}/catalogos`));
  }

  registrarCambio(
    idOperacion: number,
    cliente: ClienteInfo,
    operacion: OperacionCambioInput,
    uuid: string,
    metodosPago: {
      id_forma_pago: number; monto: number; referencia: string;
      num_cuenta_bancaria?: string; id_entidad_financiera?: number;
      id_agencia?: number; id_moneda_cuenta?: number; id_tipo_cuenta_bancaria?: number;
    }[] = [{ id_forma_pago: 1, monto: 0, referencia: '' }],
    complemento?: ComplementoData,
  ): Observable<CambioResponse> {
    const body: any = {
      id_operacion: idOperacion,
      cliente,
      operacion,
      uuid,
      metodos_pago: metodosPago.map(m => ({
        id_forma_pago: m.id_forma_pago,
        monto: m.monto,
        referencia: m.referencia,
        num_cuenta_bancaria: m.num_cuenta_bancaria || null,
        id_entidad_financiera: m.id_entidad_financiera || null,
        id_agencia: m.id_agencia || null,
        id_moneda_cuenta: m.id_moneda_cuenta || null,
        id_tipo_cuenta_bancaria: m.id_tipo_cuenta_bancaria || null,
      })),
    };
    if (complemento) body.complemento = complemento;
    return this.unwrap(this.http.post<Envelope<CambioResponse>>(`${this.base}/registrar-cambio`, body));
  }

  calcularCambioUif(data: {
    id_operacion: number;
    id_moneda: number;
    monto: number;
    documento: string;
    tipo_doc: number;
    expedicion: number;
  }): Observable<UifCheckResponse> {
    return this.unwrap(this.http.post<Envelope<UifCheckResponse>>(`${this.base}/calcular-cambio`, data));
  }

  comprobante(id: number): Observable<any> {
    return this.unwrap(this.http.get<Envelope<any>>(`${this.base}/comprobante/${id}`));
  }

  historial(desde: string, hasta?: string, operacion?: number): Observable<HistorialResponse> {
    let params = new HttpParams().set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    if (operacion) params = params.set('operacion', operacion.toString());
    return this.unwrap(this.http.get<Envelope<HistorialResponse>>(`${this.base}/historial`, { params }));
  }

  historialDetalle(id: number): Observable<HistorialDetail> {
    return this.unwrap(this.http.get<Envelope<HistorialDetail>>(`${this.base}/historial/${id}`));
  }

  estadoSiat(): Observable<EstadoSiat> {
    return this.unwrap(this.http.get<Envelope<EstadoSiat>>(`${this.base}/estado-siat`));
  }

  descargarFacturaPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/factura-cambio-pdf/${id}`, { responseType: 'blob' });
  }

  formasPagoCobro(): Observable<FormaPagoCobro[]> {
    return this.unwrap(this.http.get<Envelope<FormaPagoCobro[]>>(`${this.base}/formas-pago-cobro`));
  }
}
