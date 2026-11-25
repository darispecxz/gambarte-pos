import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../environments/environment';
import { Envelope } from './models';

export type WhatsAppDocumentType = 'FACTURA_CAMBIO' | 'FACTURA_REMESA' | 'COMPROBANTE_REMESA' | 'COMPROBANTE_PAGO_REMESA';
export interface WhatsAppPreview { phone: string; test_mode: boolean; }
export interface WhatsAppResult { status: 'PROCESSING' | 'ACCEPTED' | 'UNKNOWN'; duplicate: boolean; }

@Injectable({ providedIn: 'root' })
export class WhatsAppDocumentService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBase + '/notificaciones/whatsapp';

  availability() {
    return this.http.get<Envelope<{enabled: boolean}>>(this.base + '/availability').pipe(map(r => r.data.enabled));
  }
  preview(type: WhatsAppDocumentType, id: number) {
    return this.http.post<Envelope<WhatsAppPreview>>(this.base + '/preview', {type, id}).pipe(map(r => r.data));
  }
  send(type: WhatsAppDocumentType, id: number, phone: string) {
    return this.http.post<Envelope<WhatsAppResult>>(this.base + '/send', {type, id, phone, consent: true}).pipe(map(r => r.data));
  }
}
