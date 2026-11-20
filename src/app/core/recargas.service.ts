import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RecargaPendiente {
  id_detalle_recarga: number;
  id_recarga: number;
  codigo: string;
  id_proveedor: number;
  celular: string;
  monto_bob: string;
  fec_crea_recarga: string;
  estado: number;
}

export interface RecargaLinea {
  id_linea: number;
  id_proveedor: number;
  numero: string;
  saldo_bob: string;
}

type Envelope<T> = { success: boolean; data: T; message?: string };

@Injectable({ providedIn: 'root' })
export class RecargasService {
  private http = inject(HttpClient);
  private base = `${environment.apiBase}/cajero/recargas`;

  private unwrap<T>(response: Observable<Envelope<T>>): Observable<T> {
    return response.pipe(map(r => {
      if (!r?.success) throw new Error(r?.message || 'Error de integración');
      return r.data;
    }));
  }

  pendientes() { return this.unwrap(this.http.get<Envelope<RecargaPendiente[]>>(`${this.base}/pendientes`)); }
  modo() { return this.unwrap(this.http.get<Envelope<{ simulated: boolean }>>(`${this.base}/modo`)); }
  lineas() { return this.unwrap(this.http.get<Envelope<RecargaLinea[]>>(`${this.base}/lineas`)); }
  reservar(id: number, requestId: string) {
    return this.unwrap(this.http.post<Envelope<{ token: string; expires_at: string }>>(`${this.base}/${id}/reservar`, { request_id: requestId }));
  }
  confirmar(id: number, requestId: string, token: string, lineId: number, glosa: string, comprobante: File) {
    const form = new FormData();
    form.append('request_id', requestId);
    form.append('token', token);
    form.append('id_linea', String(lineId));
    form.append('glosa', glosa);
    form.append('comprobante', comprobante, comprobante.name);
    return this.unwrap(this.http.post<Envelope<{ estado: string }>>(`${this.base}/${id}/confirmar`, form));
  }
  liberar(id: number, requestId: string, token: string) {
    return this.unwrap(this.http.post<Envelope<{ estado: string }>>(`${this.base}/${id}/liberar`, { request_id: requestId, token }));
  }
}
