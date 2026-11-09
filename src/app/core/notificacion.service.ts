import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Envelope } from './models';

export interface Notificacion {
  id_notificacion: number;
  codigo: string;
  tipo: string;
  urgencia: 'critica' | 'alta' | 'media' | 'baja';
  titulo: string;
  mensaje: string;
  datos: any;
  id_agencia: number | null;
  id_rol_destino: number | null;
  leida: number;
  leida_por: string | null;
  fec_lectura: string | null;
  fec_creacion: string;
}

export interface NotificacionConteo {
  total: number;
  critica: number;
  alta: number;
  media: number;
  baja: number;
}

@Injectable({ providedIn: 'root' })
export class NotificacionService {
  private http = inject(HttpClient);
  private base = `${environment.apiBase}/notificaciones`;

  private unwrap<T>(o: Observable<Envelope<T>>): Observable<T> {
    return o.pipe(map(r => {
      if (!r || !r.success) throw new Error(r?.message ?? 'Error de la API');
      return r.data;
    }));
  }

  listar(filtros?: { tipo?: string; urgencia?: string; leida?: number; limit?: number; offset?: number }): Observable<Notificacion[]> {
    let params = new HttpParams();
    if (filtros?.tipo) params = params.set('tipo', filtros.tipo);
    if (filtros?.urgencia) params = params.set('urgencia', filtros.urgencia);
    if (filtros?.leida !== undefined) params = params.set('leida', filtros.leida.toString());
    if (filtros?.limit) params = params.set('limit', filtros.limit.toString());
    if (filtros?.offset) params = params.set('offset', filtros.offset.toString());
    return this.unwrap(this.http.get<Envelope<Notificacion[]>>(this.base, { params }));
  }

  contarNoLeidas(): Observable<NotificacionConteo> {
    return this.unwrap(this.http.get<Envelope<NotificacionConteo>>(`${this.base}/no-leidas`));
  }

  marcarLeida(id: number): Observable<void> {
    return this.unwrap(this.http.post<Envelope<void>>(`${this.base}/leer`, { id_notificacion: id }));
  }

  marcarTodasLeidas(tipo?: string): Observable<void> {
    const body: any = {};
    if (tipo) body.tipo = tipo;
    return this.unwrap(this.http.post<Envelope<void>>(`${this.base}/leer-todas`, body));
  }
}
