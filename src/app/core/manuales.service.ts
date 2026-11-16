import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Envelope } from './models';

export interface ManualLectura {
  manual_key: string;
  version: string;
  leido_en: string;
}

export interface SeguimientoManual {
  cod_usuario: number;
  login: string;
  cajero: string;
  id_agencia: number;
  agencia: string;
  manual_key: string | null;
  version: string | null;
  leido_en: string | null;
}

export interface VideoManualInfo {
  disponible: boolean;
  nombre: string | null;
  tamano_bytes: number | null;
  actualizado_en: string | null;
  max_size_mb: number;
}

@Injectable({ providedIn: 'root' })
export class ManualesService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBase}/manuales/lecturas`;
  private readonly videosBase = `${environment.apiBase}/manuales/videos`;

  videoInfo(manualKey: string): Observable<Envelope<VideoManualInfo>> {
    return this.http.get<Envelope<VideoManualInfo>>(`${this.videosBase}/${encodeURIComponent(manualKey)}/info`);
  }

  video(manualKey: string): Observable<Blob> {
    return this.http.get(`${this.videosBase}/${encodeURIComponent(manualKey)}`, { responseType: 'blob' });
  }

  subirVideo(manualKey: string, archivo: File): Observable<Envelope<{ manual_key: string; nombre: string; tamano_bytes: number; actualizado_en: string }>> {
    const datos = new FormData();
    datos.append('manual_key', manualKey);
    datos.append('video', archivo);
    return this.http.post<Envelope<{ manual_key: string; nombre: string; tamano_bytes: number; actualizado_en: string }>>(this.videosBase, datos);
  }

  mias(): Observable<ManualLectura[]> {
    return this.http.get<Envelope<ManualLectura[]>>(`${this.base}/mias`)
      .pipe(map(response => response.success ? response.data : []));
  }

  marcarLeido(manualKey: string, version = '1'): Observable<ManualLectura> {
    return this.http.post<Envelope<ManualLectura>>(this.base, { manual_key: manualKey, version })
      .pipe(map(response => {
        if (!response.success) throw new Error(response.message ?? 'No se pudo registrar la lectura.');
        return response.data;
      }));
  }

  seguimiento(manualKey = '', agencyId = ''): Observable<SeguimientoManual[]> {
    let params = new HttpParams();
    if (manualKey) params = params.set('manual', manualKey);
    if (agencyId) params = params.set('agencia', agencyId);
    return this.http.get<Envelope<SeguimientoManual[]>>(`${this.base}/seguimiento`, { params })
      .pipe(map(response => response.success ? response.data : []));
  }
}
