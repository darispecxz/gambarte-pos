import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Envelope } from './models';

export interface PreferenciasCuenta { apariencia: 'light' | 'dark' | 'system'; inicio: 'dashboard' | 'caja' | 'cambio'; menu_compacto: boolean; }
export interface FirmaCuenta { nombre: string; mime: string; actualizada_en: string; }
export interface CuentaPos { configuracion: PreferenciasCuenta; firma: FirmaCuenta | null; }

@Injectable({ providedIn: 'root' })
export class CuentaService {
  private http = inject(HttpClient);
  private base = `${environment.apiBase}/cajero/cuenta`;
  private unwrap<T>(request: Observable<Envelope<T>>): Observable<T> { return request.pipe(map(r => { if (!r.success) throw new Error(r.message || 'No se pudo completar la operación'); return r.data; })); }
  obtener(): Observable<CuentaPos> { return this.unwrap(this.http.get<Envelope<CuentaPos>>(this.base)); }
  guardar(configuracion: PreferenciasCuenta): Observable<CuentaPos> { return this.unwrap(this.http.put<Envelope<CuentaPos>>(this.base, { configuracion })); }
  subirFirma(firma: File): Observable<CuentaPos> { const data = new FormData(); data.append('firma', firma); return this.unwrap(this.http.post<Envelope<CuentaPos>>(`${this.base}/firma`, data)); }
}
